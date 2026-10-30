export type Rol = 'administrador' | 'cajero' | 'compras' | 'almacen' | 'rrhh' | 'contador';
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: string;
}
export interface Credenciales {
  correo: string;
  contrasena: string;
}
export interface RespuestaLogin {
  token: string;
  nombre: string;
  rol: Rol;
  usuario: Usuario;
  expiresAt: number;
}
