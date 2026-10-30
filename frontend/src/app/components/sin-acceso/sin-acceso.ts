import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-sin-acceso',
  templateUrl: './sin-acceso.html',
  styleUrl: './sin-acceso.css',
})
export class SinAcceso {
  readonly auth = inject(AuthService);
}
