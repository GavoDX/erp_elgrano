export const correoModel = (db) => ({
  factura: (id) => db.get('SELECT * FROM facturas WHERE id=?', [id]),
  items: (id) => db.all('SELECT * FROM factura_items WHERE factura_id=? ORDER BY id', [id]),
  historial: (id) =>
    db.all(
      'SELECT id,destinatario,estado,message_id,error,fecha FROM correo_envios WHERE factura_id=? ORDER BY id DESC',
      [id],
    ),
  porClave: (key) => db.get('SELECT * FROM correo_envios WHERE request_key=?', [key]),
  pendiente: (factura, dest) =>
    db.get(
      "SELECT id FROM correo_envios WHERE factura_id=? AND destinatario=? AND estado IN ('ENVIANDO','INCIERTO')",
      [factura, dest],
    ),
  crear: (values) =>
    db.run(
      'INSERT INTO correo_envios(factura_id,usuario_id,destinatario,estado,request_key,fecha) VALUES (?,?,?,?,?,?)',
      values,
    ),
  terminar: (id, estado, messageId, error) =>
    db.run('UPDATE correo_envios SET estado=?,message_id=?,error=? WHERE id=?', [
      estado,
      messageId,
      error,
      id,
    ]),
});
