import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { VentasService } from '../../services/ventas.service';
import { InventarioService } from '../../services/inventario.service';
import { PaypalService } from '../../services/paypal.service';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../services/api.service';
import { Producto, Factura, ItemPedido, OrdenPaypal, EnvioCorreo } from '../../models/ventas.model';
import { Insumo } from '../../models/inventario.model';
import { Checkout } from './checkout/checkout';
@Component({
  selector: 'app-ventas',
  imports: [DecimalPipe, FormsModule, Checkout],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas implements OnInit {
  private service = inject(VentasService);
  private inventario = inject(InventarioService);
  private paypalService = inject(PaypalService);
  readonly auth = inject(AuthService);
  productos = signal<Producto[]>([]);
  facturas = signal<Factura[]>([]);
  pendientes = signal<OrdenPaypal[]>([]);
  insumos = signal<Insumo[]>([]);
  pedido = signal<ItemPedido[]>([]);
  categoriaActiva = signal('Todos');
  metodoPago = signal('Efectivo');
  error = signal('');
  mensaje = signal('');
  cargando = signal(true);
  cobrando = signal(false);
  paypalBusy = signal(false);
  modal = false;
  form: Partial<Producto> = {};
  detalle = signal<Factura | null>(null);
  correo = { correo: '', nombre: '' };
  correoBusy = signal(false);
  correoMensaje = signal('');
  correoError = signal('');
  envios = signal<EnvioCorreo[]>([]);
  private correoKey = '';
  private paymentKey = '';
  private paymentBody = '';
  categorias = computed(() => ['Todos', ...new Set(this.productos().map((p) => p.categoria))]);
  productosFiltrados = computed(() =>
    this.categoriaActiva() === 'Todos'
      ? this.productos()
      : this.productos().filter((p) => p.categoria === this.categoriaActiva()),
  );
  subtotal = computed(
    () => this.pedido().reduce((s, i) => s + Math.round(i.precio * 100) * i.cantidad, 0) / 100,
  );
  descuento = computed(() => Math.round(this.subtotal() * 100 * 0.1) / 100);
  total = computed(() => this.subtotal() - this.descuento());
  productosPaypal = computed(() => this.pedido().map((i) => ({ id: i.id, cantidad: i.cantidad })));
  metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia', 'PayPal'];
  ngOnInit() {
    this.cargar();
    if (this.auth.obtenerRol() === 'administrador')
      this.inventario.getInsumos().subscribe({
        next: (i) => this.insumos.set(i),
        error: (e) => this.error.set(mensajeError(e)),
      });
  }
  cargar() {
    forkJoin({
      productos: this.service.getProductos(),
      facturas: this.service.getFacturas(),
      pendientes: this.paypalService.pendientes(),
    }).subscribe({
      next: (d) => {
        this.productos.set(d.productos);
        this.facturas.set(d.facturas);
        this.pendientes.set(d.pendientes);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  agregarProducto(p: Producto) {
    if (this.cobrando() || this.paypalBusy()) return;
    const current = this.pedido().find((i) => i.id === p.id);
    if ((current?.cantidad || 0) >= p.stockDisponible) {
      this.error.set('No hay más unidades disponibles de este producto.');
      return;
    }
    this.pedido.update((items) =>
      current
        ? items.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...items, { ...p, cantidad: 1 }],
    );
  }
  quitarProducto(id: number) {
    if (this.cobrando() || this.paypalBusy()) return;
    this.pedido.update((items) => items.filter((i) => i.id !== id));
  }
  seleccionarMetodo(m: string) {
    if (!this.cobrando() && !this.paypalBusy()) this.metodoPago.set(m);
  }
  cobrar() {
    if (
      this.cobrando() ||
      this.paypalBusy() ||
      !this.pedido().length ||
      this.metodoPago() === 'PayPal'
    )
      return;
    const data = {
        cliente: 'Consumidor final',
        metodo: this.metodoPago(),
        items: this.productosPaypal(),
      },
      body = JSON.stringify(data);
    // El mismo intento conserva la clave para reintentar después de una respuesta perdida.
    if (this.paymentBody !== body || !this.paymentKey) {
      this.paymentKey = crypto.randomUUID();
      this.paymentBody = body;
    }
    this.cobrando.set(true);
    this.error.set('');
    this.service.crearFactura(data, this.paymentKey).subscribe({
      next: (f) => {
        this.cobrando.set(false);
        this.completado(f);
        this.paymentKey = '';
        this.paymentBody = '';
      },
      error: (e) => {
        this.cobrando.set(false);
        this.error.set(mensajeError(e));
        this.cargar();
      },
    });
  }
  completado(f: Factura) {
    this.pedido.set([]);
    this.mensaje.set(`Venta ${f.folio} confirmada: $${f.total.toFixed(2)} MXN.`);
    this.cargar();
  }
  verDetalle(f: Factura) {
    this.correo = { correo: '', nombre: f.cliente === 'Consumidor final' ? '' : f.cliente };
    this.correoMensaje.set('');
    this.correoError.set('');
    this.envios.set([]);
    this.correoKey = '';
    this.cargarEnvios(f.id);
    this.service.detalle(f.id).subscribe({
      next: (d) => this.detalle.set(d),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
  cargarEnvios(id: number) {
    this.service
      .historialCorreo(id)
      .subscribe({
        next: (d) => this.envios.set(d),
        error: (e) => this.correoError.set(mensajeError(e)),
      });
  }
  descargarXml() {
    const f = this.detalle();
    if (!f) return;
    this.service.descargarXml(f.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = f.folio + '.xml';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (e) => this.correoError.set(mensajeError(e)),
    });
  }
  enviarCorreo() {
    const f = this.detalle();
    if (!f || this.correoBusy()) return;
    if (!this.correoKey) this.correoKey = crypto.randomUUID();
    this.correoBusy.set(true);
    this.correoMensaje.set('');
    this.correoError.set('');
    this.service.enviarCorreo(f.id, this.correo, this.correoKey).subscribe({
      next: (r) => {
        this.correoBusy.set(false);
        this.correoMensaje.set(r.mensaje);
        this.cargarEnvios(f.id);
        this.correoKey = '';
      },
      error: (e) => {
        this.correoBusy.set(false);
        this.correoError.set(mensajeError(e));
        this.cargarEnvios(f.id);
        this.correoKey = '';
      },
    });
  }
  verificar(o: OrdenPaypal) {
    if (this.cobrando()) return;
    this.cobrando.set(true);
    this.error.set('');
    this.paypalService.capturarOrden(o.id).subscribe({
      next: (d) => {
        this.cobrando.set(false);
        this.mensaje.set(d.mensaje);
        if (d.factura) this.pedido.set([]);
        this.cargar();
      },
      error: (e) => {
        this.cobrando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
  cancelar(o: OrdenPaypal) {
    if (this.cobrando()) return;
    this.cobrando.set(true);
    this.error.set('');
    this.paypalService.cancelarOrden(o.id).subscribe({
      next: (d) => {
        this.cobrando.set(false);
        this.mensaje.set(d.mensaje);
        this.cargar();
      },
      error: (e) => {
        this.cobrando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
  abrirProducto(p?: Producto) {
    this.form = p
      ? { ...p, receta: p.receta.map((r) => ({ ...r })) }
      : {
          nombre: '',
          categoria: 'Bebidas calientes',
          precio: 1,
          receta: [{ insumoId: this.insumos()[0]?.id || 0, cantidad: 1 }],
        };
    this.modal = true;
    this.error.set('');
  }
  agregarInsumo() {
    this.form.receta?.push({ insumoId: this.insumos()[0]?.id || 0, cantidad: 1 });
  }
  guardarProducto() {
    if (this.cobrando()) return;
    this.cobrando.set(true);
    this.error.set('');
    this.service.guardarProducto(this.form).subscribe({
      next: () => {
        this.cobrando.set(false);
        this.modal = false;
        this.mensaje.set('Producto y receta guardados.');
        this.cargar();
      },
      error: (e) => {
        this.cobrando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
