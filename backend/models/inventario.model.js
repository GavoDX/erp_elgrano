import { quantity, money } from './base.model.js';
export const publicInsumo = (r) => ({
  id: r.id,
  nombre: r.nombre,
  categoria: r.categoria,
  unidad: r.unidad,
  stockActual: quantity(r.stock_miles),
  stockReservado: quantity(r.reservado_miles),
  stockDisponible: quantity(r.stock_miles - r.reservado_miles),
  stockMinimo: quantity(r.minimo_miles),
  valorUnitario: money(r.costo_centavos),
});
export const inventarioModel = (db) => ({
  all: async () =>
    (await db.all('SELECT * FROM insumos WHERE activo=1 ORDER BY id')).map(publicInsumo),
  byId: (id) => db.get('SELECT * FROM insumos WHERE id=? AND activo=1', [id]),
  movements: () =>
    db.all(
      'SELECT m.*,i.nombre,i.unidad FROM inventario_movimientos m JOIN insumos i ON i.id=m.insumo_id ORDER BY m.id DESC LIMIT 200',
    ),
});
