import { inventarioModel, publicInsumo } from '../models/inventario.model.js';
import { text, cents, miles, exists, id } from '../middleware/validate.js';
import { fail } from './auth.service.js';
import { now } from '../models/base.model.js';
export const inventarioService = (db) => ({
  listar: () => inventarioModel(db).all(),
  movimientos: () => inventarioModel(db).movements(),
  async crear(b, user) {
    const values = [
      text(b.nombre, 'Nombre'),
      text(b.categoria, 'Categoría', 80),
      text(b.unidad, 'Unidad', 20),
      miles(b.stockActual, 'Stock', 0),
      miles(b.stockMinimo, 'Mínimo', 0),
      cents(b.valorUnitario),
    ];
    return db.transaction(async (tx) => {
      const r = await tx.run(
        'INSERT INTO insumos(nombre,categoria,unidad,stock_miles,minimo_miles,costo_centavos) VALUES (?,?,?,?,?,?)',
        values,
      );
      await tx.run(
        'INSERT INTO inventario_movimientos(insumo_id,fecha,cantidad_miles,motivo,usuario_id) VALUES (?,?,?,?,?)',
        [r.id, now(), values[3], 'Alta de insumo', user.id],
      );
      return publicInsumo(await inventarioModel(tx).byId(r.id));
    });
  },
  async actualizar(insumoId, b) {
    return db.transaction(async (tx) => {
      const row = exists(await inventarioModel(tx).byId(id(insumoId)));
      await tx.run(
        'UPDATE insumos SET nombre=?,categoria=?,unidad=?,minimo_miles=?,costo_centavos=? WHERE id=?',
        [
          text(b.nombre, 'Nombre'),
          text(b.categoria, 'Categoría', 80),
          text(b.unidad, 'Unidad', 20),
          miles(b.stockMinimo, 'Mínimo', 0),
          cents(b.valorUnitario),
          row.id,
        ],
      );
      return publicInsumo(await inventarioModel(tx).byId(row.id));
    });
  },
  async ajustar(insumoId, b, user) {
    const amount = Math.round(Number(b.cantidad) * 1000);
    if (!Number.isSafeInteger(amount) || !amount || Math.abs(amount) > 1000000000)
      throw fail(400, 'Cantidad de ajuste inválida.');
    const motivo = text(b.motivo, 'Motivo', 180);
    return db.transaction(async (tx) => {
      const row = exists(await inventarioModel(tx).byId(id(insumoId)));
      if (row.stock_miles + amount < row.reservado_miles)
        throw fail(409, 'El ajuste dejaría stock negativo o afectaría reservas de PayPal.');
      await tx.run('UPDATE insumos SET stock_miles=stock_miles+? WHERE id=?', [amount, row.id]);
      await tx.run(
        'INSERT INTO inventario_movimientos(insumo_id,fecha,cantidad_miles,motivo,usuario_id) VALUES (?,?,?,?,?)',
        [row.id, now(), amount, motivo, user.id],
      );
      return publicInsumo(await inventarioModel(tx).byId(row.id));
    });
  },
});
