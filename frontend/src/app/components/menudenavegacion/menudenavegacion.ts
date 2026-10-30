import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/api.service';
@Component({
  selector: 'app-menudenavegacion',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menudenavegacion.html',
  styleUrl: './menudenavegacion.css',
})
export class Menudenavegacion {
  readonly auth = inject(AuthService);
  readonly closing = signal(false);
  readonly error = signal('');
  links = [
    { path: '/home', label: 'Inicio', roles: [] },
    { path: '/ventas', label: 'Ventas', roles: ['administrador', 'cajero'] },
    { path: '/compras', label: 'Compras', roles: ['administrador', 'compras'] },
    { path: '/inventario', label: 'Inventario', roles: ['administrador', 'almacen', 'compras'] },
    { path: '/rrhh', label: 'RRHH', roles: ['administrador', 'rrhh'] },
    { path: '/finanzas', label: 'Finanzas', roles: ['administrador', 'contador'] },
  ];
  logout() {
    if (this.closing()) return;
    this.closing.set(true);
    this.error.set('');
    this.auth.cerrarSesion().subscribe({
      next: () => this.closing.set(false),
      error: (e) => {
        this.closing.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
