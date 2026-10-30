import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  Producto,
  Factura,
  NuevaFacturaPayload,
  EnvioCorreo,
  ResultadoCorreo,
} from '../models/ventas.model';
@Injectable({ providedIn: 'root' })
export class VentasService {
  private api = inject(ApiService);
  getProductos() {
    return this.api.get<Producto[]>('/ventas/productos');
  }
  getFacturas() {
    return this.api.get<Factura[]>('/ventas/facturas');
  }
  detalle(id: number) {
    return this.api.get<Factura>('/ventas/facturas/' + id);
  }
  crearFactura(data: NuevaFacturaPayload, key: string) {
    return this.api.post<Factura>('/ventas/facturas', data, { 'Idempotency-Key': key });
  }
  descargarXml(id: number) {
    return this.api.blob('/ventas/facturas/' + id + '/xml');
  }
  historialCorreo(id: number) {
    return this.api.get<EnvioCorreo[]>('/ventas/facturas/' + id + '/correos');
  }
  enviarCorreo(id: number, data: { correo: string; nombre: string }, key: string) {
    return this.api.post<ResultadoCorreo>('/ventas/facturas/' + id + '/correo', data, {
      'Idempotency-Key': key,
    });
  }
  guardarProducto(data: Partial<Producto>) {
    return data.id
      ? this.api.put('/ventas/productos/' + data.id, data)
      : this.api.post('/ventas/productos', data);
  }
}
