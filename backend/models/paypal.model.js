export const paypalModel = (db) => ({
  byId: (id) => db.get('SELECT * FROM paypal_ordenes WHERE id=?', [id]),
  pendientes: (user) =>
    db.all(
      "SELECT id,estado,total_centavos/100.0 AS total,moneda,fecha FROM paypal_ordenes WHERE usuario_id=? AND estado IN ('CREADA','PENDIENTE') ORDER BY fecha DESC",
      [user.id],
    ),
});
