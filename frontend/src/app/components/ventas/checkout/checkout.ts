import {
  Component,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  signal,
  input,
  output,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PaypalService } from '../../../services/paypal.service';
import { mensajeError } from '../../../services/api.service';
import { Factura } from '../../../models/ventas.model';
interface PaymentSession {
  start(options: { presentationMode: string }, order: Promise<{ orderId: string }>): Promise<void>;
}
interface PaypalSdk {
  findEligibleMethods(options: {
    currencyCode: string;
  }): Promise<{ isEligible(method: string): boolean }>;
  createPayPalOneTimePaymentSession(options: {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }): PaymentSession;
}
declare const paypal: {
  createInstance(options: {
    clientId: string;
    components: string[];
    pageType: string;
  }): Promise<PaypalSdk>;
};
// Sigue el flujo createInstance → elegibilidad → sesión → crear/capturar del PDF adjunto.
@Component({
  selector: 'app-checkout',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements AfterViewInit, OnDestroy {
  private paypalService = inject(PaypalService);
  private zone = inject(NgZone);
  productos = input.required<{ id: number; cantidad: number }[]>();
  pagado = output<Factura>();
  cambio = output<void>();
  bloqueado = output<boolean>();
  mensaje = signal('Preparando PayPal…');
  listo = signal(false);
  busy = signal(false);
  private sesion?: PaymentSession;
  private ordenId = '';
  private destroyed = false;
  async ngAfterViewInit() {
    try {
      const config = await firstValueFrom(this.paypalService.configuracion());
      if (!config.enabled) {
        this.mensaje.set(
          'Para habilitar PayPal agrega tus credenciales Sandbox en .env y reinicia la API.',
        );
        return;
      }
      await this.paypalService.cargarSdk(config.environment);
      if (this.destroyed) return;
      const sdk = await paypal.createInstance({
        clientId: config.clientId,
        components: ['paypal-payments'],
        pageType: 'checkout',
      });
      const metodos = await sdk.findEligibleMethods({ currencyCode: 'MXN' });
      if (this.destroyed) return;
      if (!metodos.isEligible('paypal')) {
        this.mensaje.set('PayPal no está disponible para este comprador.');
        return;
      }
      this.sesion = sdk.createPayPalOneTimePaymentSession({
        onApprove: async (data: { orderId: string }) => {
          try {
            const resultado = await firstValueFrom(this.paypalService.capturarOrden(data.orderId));
            this.zone.run(() => {
              this.mensaje.set(resultado.mensaje);
              this.liberar();
              if (resultado.factura) this.pagado.emit(resultado.factura);
              this.cambio.emit();
            });
          } catch (e) {
            this.zone.run(() => {
              this.mensaje.set(mensajeError(e) + ' Usa Verificar pago en órdenes pendientes.');
              this.liberar();
              this.cambio.emit();
            });
          }
        },
        onCancel: () => {
          void this.cancelar();
        },
        onError: () =>
          this.zone.run(() => {
            this.mensaje.set(
              'Error al procesar el pago. Revisa las órdenes pendientes antes de volver a pagar.',
            );
            this.liberar();
            this.cambio.emit();
          }),
      });
      this.listo.set(true);
      this.mensaje.set(
        'Selecciona PayPal para pagar. Se aplica el total calculado por el servidor.',
      );
    } catch (e) {
      if (!this.destroyed) this.mensaje.set(mensajeError(e));
    }
  }
  async pagar() {
    if (this.busy() || !this.sesion || !this.productos().length) return;
    this.busy.set(true);
    this.bloqueado.emit(true);
    this.ordenId = '';
    const productos = this.productos().map((p) => ({ ...p }));
    try {
      await this.sesion.start(
        { presentationMode: 'auto' },
        firstValueFrom(this.paypalService.crearOrden(productos)).then((orden) => {
          this.ordenId = orden.id;
          this.zone.run(() => this.cambio.emit());
          return { orderId: orden.id };
        }),
      );
    } catch (e) {
      this.zone.run(() => {
        this.mensaje.set(mensajeError(e) + ' Revisa las órdenes pendientes.');
        this.liberar();
        this.cambio.emit();
      });
    }
  }
  private async cancelar() {
    try {
      if (this.ordenId) await firstValueFrom(this.paypalService.cancelarOrden(this.ordenId));
      this.zone.run(() => this.mensaje.set('Pago cancelado.'));
    } catch (e) {
      this.zone.run(() => this.mensaje.set(mensajeError(e) + ' Revisa las órdenes pendientes.'));
    } finally {
      this.zone.run(() => {
        this.liberar();
        this.cambio.emit();
      });
    }
  }
  private liberar() {
    this.busy.set(false);
    if (!this.destroyed) this.bloqueado.emit(false);
  }
  ngOnDestroy() {
    this.destroyed = true;
  }
}
