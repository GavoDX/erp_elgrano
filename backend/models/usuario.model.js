export function usuarioModel(db) {
  return {
    byEmail: (correo) => db.get('SELECT * FROM usuarios WHERE correo = ?', [correo]),
    byId: (id) => db.get('SELECT * FROM usuarios WHERE id = ?', [id]),
    revoke: (id) =>
      db.run('UPDATE usuarios SET session_version = session_version + 1 WHERE id = ?', [id]),
    insert: (u) =>
      db.run('INSERT INTO usuarios(nombre,correo,password_hash,rol) VALUES (?,?,?,?)', [
        u.nombre,
        u.correo,
        u.password_hash,
        u.rol,
      ]),
  };
}
