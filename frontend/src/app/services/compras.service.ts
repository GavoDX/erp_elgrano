import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { OrdenCompra, Proveedor, NuevaOrden } from '../models/compras.model';
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private api = inject(ApiService);
  getOrdenes() {
    return this.api.get<OrdenCompra[]>('/compras/ordenes');
  }
  getProveedores() {
    return this.api.get<Proveedor[]>('/compras/proveedores');
  }
  guardarProveedor(data: Partial<Proveedor>) {
    return data.id
      ? this.api.put('/compras/proveedores/' + data.id, data)
      : this.api.post('/compras/proveedores', data);
  }
  crearOrden(data: NuevaOrden) {
    return this.api.post('/compras/ordenes', data);
  }
  recibir(id: number) {
    return this.api.post<{ mensaje: string }>('/compras/ordenes/' + id + '/recibir', {});
  }
  cancelar(id: number) {
    return this.api.post('/compras/ordenes/' + id + '/cancelar', {});
  }
}
