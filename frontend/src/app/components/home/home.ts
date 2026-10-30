import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/api.service';
@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  auth = inject(AuthService);
  mensaje = signal('');
  busy = signal(false);
  nuevo = { nombre: '', correo: '', contrasena: '', rol: 'cajero' };
  links = [
    {
      path: '/ventas',
      label: 'Ventas y facturación',
      description: 'Catálogo, pedidos y PayPal',
      roles: ['administrador', 'cajero'],
    },
    {
      path: '/compras',
      label: 'Compras y proveedores',
      description: 'Pedidos, recepción y contactos',
      roles: ['administrador', 'compras'],
    },
    {
      path: '/inventario',
      label: 'Inventario y almacén',
      description: 'Insumos, existencias y movimientos',
      roles: ['administrador', 'compras', 'almacen'],
    },
    {
      path: '/rrhh',
      label: 'Recursos humanos',
      description: 'Personal, turnos y nómina',
      roles: ['administrador', 'rrhh'],
    },
    {
      path: '/finanzas',
      label: 'Contabilidad y finanzas',
      description: 'Ingresos, egresos y balance',
      roles: ['administrador', 'contador'],
    },
  ];
  registrar() {
    this.busy.set(true);
    this.mensaje.set('');
    this.auth.registrarUsuario(this.nuevo).subscribe({
      next: () => {
        this.busy.set(false);
        this.mensaje.set('Usuario registrado.');
        this.nuevo = { nombre: '', correo: '', contrasena: '', rol: 'cajero' };
      },
      error: (e) => {
        this.busy.set(false);
        this.mensaje.set(mensajeError(e));
      },
    });
  }
}
