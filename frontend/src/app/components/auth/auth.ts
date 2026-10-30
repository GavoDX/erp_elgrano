import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/api.service';
@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  correo = '';
  password = '';
  busy = signal(false);
  error = signal('');
  aviso =
    this.route.snapshot.queryParamMap.get('sesion') === 'vencida'
      ? 'Tu sesión terminó. Inicia sesión nuevamente.'
      : '';
  iniciarSesion(event: Event) {
    event.preventDefault();
    if (this.busy()) return;
    const datos = new FormData(event.target as HTMLFormElement);
    const usuario = {
      correo: String(datos.get('correo') || ''),
      contrasena: String(datos.get('password') || ''),
    };
    this.busy.set(true);
    this.error.set('');
    this.authService.login(usuario).subscribe({
      next: (respuesta) => {
        this.authService.guardarToken(respuesta.token, respuesta.rol);
        this.busy.set(false);
        this.password = '';
        void this.router.navigate(['/home']);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
