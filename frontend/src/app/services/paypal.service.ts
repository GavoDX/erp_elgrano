import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ConfigPaypal, OrdenPaypal, ResultadoPaypal } from '../models/ventas.model';
@Injectable({ providedIn: 'root' })
export class PaypalService {
  private api = inject(ApiService);
  private loading?: Promise<void>;
  configuracion() {
    return this.api.get<ConfigPaypal>('/paypal/config');
  }
  crearOrden(productos: { id: number; cantidad: number }[]) {
    return this.api.post<{ id: string; total: number }>('/paypal/ordenes', { productos });
  }
  capturarOrden(id: string) {
    return this.api.post<ResultadoPaypal>(`/paypal/ordenes/${encodeURIComponent(id)}/capturar`, {});
  }
  cancelarOrden(id: string) {
    return this.api.post<{ mensaje: string }>(
      `/paypal/ordenes/${encodeURIComponent(id)}/cancelar`,
      {},
    );
  }
  pendientes() {
    return this.api.get<OrdenPaypal[]>('/paypal/ordenes');
  }
  cargarSdk(environment: 'sandbox' | 'live') {
    if (!this.loading)
      this.loading = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src =
          environment === 'live'
            ? 'https://www.paypal.com/web-sdk/v6/core'
            : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          this.loading = undefined;
          reject(new Error('No se pudo cargar PayPal.'));
        };
        document.head.append(script);
      });
    return this.loading;
  }
}
