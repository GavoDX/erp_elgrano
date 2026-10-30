import { randomUUID } from 'node:crypto';
import { ventasModel } from '../models/ventas.model.js';
import { text, id, choice, cents, miles, exists } from '../middleware/validate.js';
import { fail } from './auth.service.js';
import { now, publicFactura } from '../models/base.model.js';
export async function cotizar(tx, items) {
  if (!Array.isArray(items) || !items.length || items.length > 100)
    throw fail(400, 'Selecciona de 1 a 100 productos.');
  const merged = new Map();
  for (const item of items) {
    const productId = id(item.id);
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 100)
      throw fail(400, 'Cantidad inválida.');
    merged.set(productId, (merged.get(productId) || 0) + item.cantidad);
  }
  let subtotal = 0;
  const detalle = [],
    consumos = new Map();
  for (const [productId, cantidad] of merged) {
    if (cantidad > 100) throw fail(400, 'Máximo 100 unidades por producto.');
    const p = exists(
      await tx.get('SELECT * FROM productos WHERE id=? AND activo=1', [productId]),
      'Producto',
    );
    const receta = await tx.all('SELECT * FROM recetas WHERE producto_id=?', [productId]);
    if (!receta.length) throw fail(409, `Configura la receta de ${p.nombre} antes de venderlo.`);
    subtotal += p.precio_centavos * cantidad;
    detalle.push({ id: p.id, nombre: p.nombre, cantidad, precio_centavos: p.precio_centavos });
    for (const r of receta)
      consumos.set(r.insumo_id, (consumos.get(r.insumo_id) || 0) + r.cantidad_miles * cantidad);
  }
  for (const [insumoId, cantidad] of consumos) {
    const row = exists(await tx.get('SELECT * FROM insumos WHERE id=?', [insumoId]));
    if (row.stock_miles - row.reservado_miles < cantidad)
      throw fail(409, `Stock insuficiente: ${row.nombre}.`);
  }
  const descuento = Math.round(subtotal * 0.1);
  return {
    items: detalle,
    consumos: [...consumos].map(([id, cantidad]) => ({ id, cantidad })),
    subtotal,
    descuento,
    total: subtotal - descuento,
  };
}
export async function registrarVenta(
  tx,
  quote,
  metodo,
  user,
  key,
  cliente = 'Consumidor final',
  reserved = false,
) {
  const old = await tx.get('SELECT * FROM facturas WHERE request_key=?', [key]);
  if (old) return publicFactura(old);
  const folio = 'V-' + randomUUID().slice(0, 8).toUpperCase(),
    fecha = now();
  const r = await tx.run(
    'INSERT INTO facturas(folio,cliente,fecha,total_centavos,metodo,usuario_id,request_key) VALUES (?,?,?,?,?,?,?)',
    [folio, cliente, fecha, quote.total, metodo, user.id, key],
  );
  for (const item of quote.items)
    await tx.run(
      'INSERT INTO factura_items(factura_id,producto_id,nombre,cantidad,precio_centavos) VALUES (?,?,?,?,?)',
      [r.id, item.id, item.nombre, item.cantidad, item.precio_centavos],
    );
  for (const c of quote.consumos) {
    const result = reserved
      ? await tx.run(
          'UPDATE insumos SET stock_miles=stock_miles-?,reservado_miles=reservado_miles-? WHERE id=? AND stock_miles>=? AND reservado_miles>=?',
          [c.cantidad, c.cantidad, c.id, c.cantidad, c.cantidad],
        )
      : await tx.run(
          'UPDATE insumos SET stock_miles=stock_miles-? WHERE id=? AND stock_miles-reservado_miles>=?',
          [c.cantidad, c.id, c.cantidad],
        );
    if (!result.changes) throw fail(409, 'No hay existencias suficientes para finalizar.');
    await tx.run(
      'INSERT INTO inventario_movimientos(insumo_id,fecha,cantidad_miles,motivo,usuario_id) VALUES (?,?,?,?,?)',
      [c.id, fecha, -c.cantidad, `Venta ${folio}`, user.id],
    );
  }
  await tx.run(
    'INSERT INTO movimientos(fecha,concepto,categoria,tipo,monto_centavos,referencia,usuario_id) VALUES (?,?,?,?,?,?,?)',
    [fecha, `Venta ${folio}`, 'Ventas', 'Ingreso', quote.total, `venta:${r.id}`, user.id],
  );
  return publicFactura(await tx.get('SELECT * FROM facturas WHERE id=?', [r.id]));
}
export const ventasService = (db) => ({
  productos: () => ventasModel(db).productos(),
  facturas: () => ventasModel(db).facturas(),
  detalle: async (v) => exists(await ventasModel(db).detalle(id(v)), 'Venta'),
  async cobrar(b, user, key) {
    choice(b.metodo, ['Efectivo', 'Tarjeta', 'Transferencia'], 'Método');
    text(key, 'Idempotency-Key', 80);
    return db.transaction(async (tx) => {
      const scoped = `${user.id}:${key}`,
        old = await tx.get('SELECT * FROM facturas WHERE request_key=?', [scoped]);
      if (old) return publicFactura(old);
      return registrarVenta(
        tx,
        await cotizar(tx, b.items),
        b.metodo,
        user,
        scoped,
        b.cliente ? text(b.cliente, 'Cliente', 100) : 'Consumidor final',
      );
    });
  },
  async guardarProducto(b, productId) {
    const nombre = text(b.nombre, 'Nombre'),
      categoria = text(b.categoria, 'Categoría', 80),
      precio = cents(b.precio, 'Precio');
    if (!Array.isArray(b.receta) || !b.receta.length || b.receta.length > 30)
      throw fail(400, 'Agrega de 1 a 30 insumos a la receta.');
    const receta = b.receta.map((r) => ({ id: id(r.insumoId), cantidad: miles(r.cantidad) }));
    if (new Set(receta.map((r) => r.id)).size !== receta.length)
      throw fail(400, 'No repitas insumos en la receta.');
    return db.transaction(async (tx) => {
      for (const r of receta)
        exists(await tx.get('SELECT id FROM insumos WHERE id=? AND activo=1', [r.id]), 'Insumo');
      let product = id(productId || 1);
      if (productId) {
        exists(await tx.get('SELECT id FROM productos WHERE id=?', [product]));
        await tx.run('UPDATE productos SET nombre=?,categoria=?,precio_centavos=? WHERE id=?', [
          nombre,
          categoria,
          precio,
          product,
        ]);
        await tx.run('DELETE FROM recetas WHERE producto_id=?', [product]);
      } else
        product = (
          await tx.run('INSERT INTO productos(nombre,categoria,precio_centavos) VALUES (?,?,?)', [
            nombre,
            categoria,
            precio,
          ])
        ).id;
      for (const r of receta)
        await tx.run('INSERT INTO recetas(producto_id,insumo_id,cantidad_miles) VALUES (?,?,?)', [
          product,
          r.id,
          r.cantidad,
        ]);
      return { id: product, nombre, categoria, precio: b.precio };
    });
  },
});
