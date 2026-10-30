import { comprasModel } from '../models/compras.model.js';
import { text, cents, miles, id, exists } from '../middleware/validate.js';
import { fail } from './auth.service.js';
import { now } from '../models/base.model.js';
export const comprasService = (db) => ({
  ordenes: () => comprasModel(db).ordenes(),
  proveedores: () => comprasModel(db).proveedores(),
  async proveedor(b, providerId) {
    const args = [
      text(b.nombre, 'Nombre'),
      text(b.contacto, 'Contacto', 150),
      text(b.categoria, 'Categoría', 80),
    ];
    return db.transaction(async (tx) => {
      if (providerId) {
        const n = id(providerId);
        exists(await tx.get('SELECT id FROM proveedores WHERE id=?', [n]));
        await tx.run('UPDATE proveedores SET nombre=?,contacto=?,categoria=? WHERE id=?', [
          ...args,
          n,
        ]);
        return { id: n };
      }
      return {
        id: (
          await tx.run('INSERT INTO proveedores(nombre,contacto,categoria) VALUES (?,?,?)', args)
        ).id,
      };
    });
  },
  async crear(b, user) {
    const proveedor = id(b.proveedorId);
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 100)
      throw fail(400, 'Agrega de 1 a 100 insumos.');
    const items = b.items.map((i) => ({
      id: id(i.insumoId),
      cantidad: miles(i.cantidad),
      costo: cents(i.costoUnitario),
    }));
    return db.transaction(async (tx) => {
      exists(
        await tx.get('SELECT id FROM proveedores WHERE id=? AND activo=1', [proveedor]),
        'Proveedor',
      );
      for (const i of items)
        exists(await tx.get('SELECT id FROM insumos WHERE id=? AND activo=1', [i.id]), 'Insumo');
      const total = items.reduce((s, i) => s + Math.round((i.cantidad * i.costo) / 1000), 0);
      const r = await tx.run(
        'INSERT INTO ordenes_compra(proveedor_id,fecha,total_centavos,usuario_id) VALUES (?,?,?,?)',
        [proveedor, now(), total, user.id],
      );
      for (const i of items)
        await tx.run(
          'INSERT INTO compra_items(orden_id,insumo_id,cantidad_miles,costo_centavos) VALUES (?,?,?,?)',
          [r.id, i.id, i.cantidad, i.costo],
        );
      return { id: r.id, orden: `OC-${r.id}`, total: total / 100, estado: 'Pendiente' };
    });
  },
  async recibir(orderId, user) {
    return db.transaction(async (tx) => {
      const o = exists(
        await tx.get('SELECT * FROM ordenes_compra WHERE id=?', [id(orderId)]),
        'Orden',
      );
      if (o.estado === 'Recibida') return { mensaje: 'La orden ya había sido recibida.' };
      if (o.estado !== 'Pendiente') throw fail(409, 'La orden está cancelada.');
      const items = await tx.all('SELECT * FROM compra_items WHERE orden_id=?', [o.id]);
      for (const i of items) {
        await tx.run('UPDATE insumos SET stock_miles=stock_miles+?,costo_centavos=? WHERE id=?', [
          i.cantidad_miles,
          i.costo_centavos,
          i.insumo_id,
        ]);
        await tx.run(
          'INSERT INTO inventario_movimientos(insumo_id,fecha,cantidad_miles,motivo,usuario_id) VALUES (?,?,?,?,?)',
          [i.insumo_id, now(), i.cantidad_miles, `Recepción OC-${o.id}`, user.id],
        );
      }
      await tx.run("UPDATE ordenes_compra SET estado='Recibida' WHERE id=?", [o.id]);
      await tx.run(
        'INSERT INTO movimientos(fecha,concepto,categoria,tipo,monto_centavos,referencia,usuario_id) VALUES (?,?,?,?,?,?,?)',
        [
          now(),
          `Pago de compra OC-${o.id}`,
          'Compras',
          'Egreso',
          o.total_centavos,
          `compra:${o.id}`,
          user.id,
        ],
      );
      return { mensaje: 'Compra recibida, pagada y sumada al inventario.' };
    });
  },
  async cancelar(orderId) {
    return db.transaction(async (tx) => {
      const o = exists(
        await tx.get('SELECT * FROM ordenes_compra WHERE id=?', [id(orderId)]),
        'Orden',
      );
      if (o.estado === 'Recibida') throw fail(409, 'No se puede cancelar una compra recibida.');
      await tx.run("UPDATE ordenes_compra SET estado='Cancelada' WHERE id=?", [o.id]);
      return { mensaje: 'Orden cancelada.' };
    });
  },
});
