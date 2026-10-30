import { publicFactura, money, quantity } from './base.model.js';
export const ventasModel = (db) => ({
  async productos() {
    const rows = await db.all('SELECT * FROM productos WHERE activo=1 ORDER BY id');
    const recipes = await db.all(
      'SELECT r.*,i.stock_miles,i.reservado_miles,i.nombre FROM recetas r JOIN insumos i ON i.id=r.insumo_id',
    );
    return rows.map((p) => {
      const parts = recipes.filter((r) => r.producto_id === p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        precio: money(p.precio_centavos),
        stockDisponible: parts.length
          ? Math.min(
              ...parts.map((r) =>
                Math.floor((r.stock_miles - r.reservado_miles) / r.cantidad_miles),
              ),
            )
          : 0,
        receta: parts.map((r) => ({
          insumoId: r.insumo_id,
          nombre: r.nombre,
          cantidad: quantity(r.cantidad_miles),
        })),
      };
    });
  },
  facturas: async () =>
    (await db.all('SELECT * FROM facturas ORDER BY id DESC LIMIT 200')).map(publicFactura),
  async detalle(id) {
    const f = await db.get('SELECT * FROM facturas WHERE id=?', [id]);
    return f
      ? {
          ...publicFactura(f),
          items: await db.all(
            'SELECT nombre,cantidad,precio_centavos/100.0 AS precioUnitario FROM factura_items WHERE factura_id=?',
            [id],
          ),
        }
      : null;
  },
});
