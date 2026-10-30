import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Movimiento, ResumenFinanzas } from '../models/finanzas.model';
@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private api = inject(ApiService);
  getMovimientos() {
    return this.api.get<Movimiento[]>('/finanzas/movimientos');
  }
  resumen() {
    return this.api.get<ResumenFinanzas>('/finanzas/resumen');
  }
  crear(data: Partial<Movimiento>) {
    return this.api.post('/finanzas/movimientos', data);
  }
}
