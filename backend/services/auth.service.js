import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { text, email, choice } from '../middleware/validate.js';
export const publicUser = ({ id, nombre, correo, rol, estado }) => ({
  id,
  nombre,
  correo,
  rol,
  estado,
});
export const fail = (status, message) => Object.assign(new Error(message), { status });
export function authService(users, config) {
  const options = { algorithm: 'HS256', issuer: 'el-grano-api', audience: 'el-grano-angular' };
  return {
    async login(correo, password) {
      if (
        typeof correo !== 'string' ||
        typeof password !== 'string' ||
        correo.length > 150 ||
        !password ||
        Buffer.byteLength(password) > 72 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
      )
        throw fail(400, 'Introduce un correo válido y una contraseña de hasta 72 bytes.');
      const user = await users.byEmail(correo.trim().toLowerCase());
      if (
        !user ||
        user.estado !== 'activo' ||
        !(await bcrypt.compare(password, user.password_hash))
      )
        throw fail(401, 'Correo o contraseña incorrectos, o cuenta inactiva.');
      const token = jwt.sign(
        { version: user.session_version, id: user.id, rol: user.rol },
        config.secret,
        { ...options, subject: String(user.id), expiresIn: config.expiresIn },
      );
      return {
        token,
        nombre: user.nombre,
        rol: user.rol,
        usuario: publicUser(user),
        expiresAt: jwt.decode(token).exp * 1000,
      };
    },
    async authenticate(header) {
      const match = /^Bearer ([^ ]+)$/.exec(header || '');
      if (!match) throw fail(401, 'Debes iniciar sesión.');
      let payload;
      try {
        payload = jwt.verify(match[1], config.secret, {
          algorithms: ['HS256'],
          issuer: options.issuer,
          audience: options.audience,
        });
      } catch {
        throw fail(401, 'La sesión venció o el token es inválido.');
      }
      if (!/^\d+$/.test(payload.sub || '')) throw fail(401, 'Sesión inválida.');
      const user = await users.byId(Number(payload.sub));
      if (!user || user.estado !== 'activo' || user.session_version !== payload.version)
        throw fail(401, 'La sesión fue revocada.');
      return publicUser(user);
    },
    async registrarUsuario(data) {
      const nombre = text(data.nombre, 'Nombre', 100),
        correo = email(data.correo);
      const rol = choice(
        data.rol,
        ['administrador', 'cajero', 'compras', 'almacen', 'rrhh', 'contador'],
        'Rol',
      );
      if (
        typeof data.contrasena !== 'string' ||
        data.contrasena.length < 8 ||
        Buffer.byteLength(data.contrasena) > 72
      )
        throw fail(400, 'Contraseña: de 8 caracteres a 72 bytes.');
      if (await users.byEmail(correo)) throw fail(409, 'El correo ya está registrado.');
      const result = await users.insert({
        nombre,
        correo,
        rol,
        password_hash: await bcrypt.hash(data.contrasena, 12),
      });
      return { id: result.id, nombre, correo, rol };
    },
    async logout(id) {
      await users.revoke(id);
    },
  };
}
