import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { Credenciales, RespuestaLogin, Usuario } from '../models/auth.model';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly usuario = signal<Usuario | null>(null);
  private tokenValue: string | null = null;
  private expiresAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    try {
      const raw = sessionStorage.getItem('elgrano-sesion');
      if (raw) {
        const s = JSON.parse(raw) as RespuestaLogin;
        if (s.expiresAt > Date.now() && s.usuario && s.token) this.save(s);
        else this.clear();
      }
    } catch {
      this.clear();
    }
  }
  private save(s: RespuestaLogin) {
    this.tokenValue = s.token;
    this.expiresAt = s.expiresAt;
    this.usuario.set(s.usuario);
    sessionStorage.setItem('elgrano-sesion', JSON.stringify(s));
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.expired(), Math.min(s.expiresAt - Date.now(), 2147483647));
  }
  login(usuario: Credenciales) {
    return this.api
      .post<RespuestaLogin>('/login', usuario)
      .pipe(tap((s) => this.guardarToken(s.token, s.rol, s.usuario, s.expiresAt)));
  }
  // Se guarda la sesión completa para conservar usuario, rol y vencimiento juntos.
  guardarToken(token: string, rol: string, usuario = this.usuario(), expiresAt = this.expiresAt) {
    if (!usuario || usuario.rol !== rol || !token || expiresAt <= Date.now()) {
      throw new Error('El servidor no devolvió una sesión válida.');
    }
    this.save({ token, rol: usuario.rol, nombre: usuario.nombre, usuario, expiresAt });
  }
  obtenerToken() {
    return this.tokenValue;
  }
  obtenerRol() {
    return this.usuario()?.rol ?? null;
  }
  estaAutenticado() {
    return !!this.tokenValue && this.expiresAt > Date.now();
  }
  tieneRol(rolesPermitidos: readonly string[]) {
    const rol = this.obtenerRol();
    return !!rol && (!rolesPermitidos.length || rolesPermitidos.includes(rol));
  }
  verify() {
    return this.api
      .get<{ usuario: Usuario }>('/auth/me')
      .pipe(tap((s) => this.usuario.set(s.usuario)));
  }
  cerrarSesion() {
    return this.api.post('/auth/logout', {}).pipe(
      tap(() => {
        this.clear();
        void this.router.navigate(['/login']);
      }),
    );
  }
  registrarUsuario(data: Credenciales & { nombre: string; rol: string }) {
    return this.api.post('/registro', data);
  }
  clear() {
    this.tokenValue = null;
    this.expiresAt = 0;
    this.usuario.set(null);
    clearTimeout(this.timer);
    try {
      sessionStorage.removeItem('elgrano-sesion');
    } catch {}
  }
  expired() {
    this.clear();
    void this.router.navigate(['/login'], { queryParams: { sesion: 'vencida' } });
  }
}
