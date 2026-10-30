import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Insumo, MovimientoInventario } from '../models/inventario.model';
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private api = inject(ApiService);
  getInsumos() {
    return this.api.get<Insumo[]>('/inventario/insumos');
  }
  guardar(data: Partial<Insumo>) {
    return data.id
      ? this.api.put('/inventario/insumos/' + data.id, data)
      : this.api.post('/inventario/insumos', data);
  }
  ajustar(id: number, data: { cantidad: number; motivo: string }) {
    return this.api.post('/inventario/insumos/' + id + '/ajustes', data);
  }
  movimientos() {
    return this.api.get<MovimientoInventario[]>('/inventario/movimientos');
  }
}
