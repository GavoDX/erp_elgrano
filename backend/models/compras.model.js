import { money, quantity } from './base.model.js';
export const comprasModel = (db) => ({
  proveedores: () => db.all('SELECT * FROM proveedores WHERE activo=1 ORDER BY id'),
  async ordenes() {
    const orders = await db.all(
      'SELECT o.*,p.nombre AS proveedor FROM ordenes_compra o JOIN proveedores p ON p.id=o.proveedor_id ORDER BY o.id DESC',
    );
    const items = await db.all(
      'SELECT c.*,i.nombre,i.unidad FROM compra_items c JOIN insumos i ON i.id=c.insumo_id',
    );
    return orders.map((o) => ({
      ...o,
      orden: `OC-${o.id}`,
      total: money(o.total_centavos),
      insumos: items
        .filter((i) => i.orden_id === o.id)
        .map((i) => `${quantity(i.cantidad_miles)} ${i.unidad} ${i.nombre}`)
        .join(', '),
    }));
  },
});
