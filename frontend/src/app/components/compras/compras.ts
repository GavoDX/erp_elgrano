import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { ComprasService } from '../../services/compras.service';
import { InventarioService } from '../../services/inventario.service';
import { OrdenCompra, Proveedor, NuevaOrden } from '../../models/compras.model';
import { Insumo } from '../../models/inventario.model';
import { mensajeError } from '../../services/api.service';
@Component({
  selector: 'app-compras',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras implements OnInit {
  private service = inject(ComprasService);
  private inventario = inject(InventarioService);
  ordenes = signal<OrdenCompra[]>([]);
  proveedores = signal<Proveedor[]>([]);
  insumos = signal<Insumo[]>([]);
  vistaProveedores = false;
  busy = signal(false);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  modal = '';
  proveedor: Partial<Proveedor> = {};
  orden: NuevaOrden = { proveedorId: 0, items: [] };
  pendientes = computed(() => this.ordenes().filter((o) => o.estado === 'Pendiente').length);
  recibidas = computed(() => this.ordenes().filter((o) => o.estado === 'Recibida').length);
  gastoTotal = computed(() =>
    this.ordenes()
      .filter((o) => o.estado === 'Recibida')
      .reduce((s, o) => s + o.total, 0),
  );
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    forkJoin({
      ordenes: this.service.getOrdenes(),
      proveedores: this.service.getProveedores(),
      insumos: this.inventario.getInsumos(),
    }).subscribe({
      next: (d) => {
        this.ordenes.set(d.ordenes);
        this.proveedores.set(d.proveedores);
        this.insumos.set(d.insumos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  abrirProveedor(p?: Proveedor) {
    this.proveedor = p ? { ...p } : { nombre: '', contacto: '', categoria: '' };
    this.modal = 'proveedor';
    this.error.set('');
  }
  abrirOrden() {
    this.orden = { proveedorId: this.proveedores()[0]?.id || 0, items: [] };
    this.agregar();
    this.modal = 'orden';
    this.error.set('');
  }
  agregar() {
    const i = this.insumos()[0];
    this.orden.items.push({
      insumoId: i?.id || 0,
      cantidad: 1,
      costoUnitario: i?.valorUnitario || 1,
    });
  }
  costo(index: number) {
    const row = this.orden.items[index];
    row.costoUnitario =
      this.insumos().find((i) => i.id === Number(row.insumoId))?.valorUnitario || 1;
  }
  total() {
    return this.orden.items.reduce(
      (s, i) => s + Math.round(i.cantidad * i.costoUnitario * 100) / 100,
      0,
    );
  }
  guardarProveedor() {
    this.ejecutar(this.service.guardarProveedor(this.proveedor), 'Proveedor guardado.');
  }
  guardarOrden() {
    this.ejecutar(
      this.service.crearOrden(this.orden),
      'Orden creada. Al recibirla se registrará su pago.',
    );
  }
  recibir(o: OrdenCompra) {
    this.ejecutar(
      this.service.recibir(o.id),
      'Compra recibida y pagada; inventario y finanzas actualizados.',
    );
  }
  cancelar(o: OrdenCompra) {
    this.ejecutar(this.service.cancelar(o.id), 'Orden cancelada.');
  }
  ejecutar(op: Observable<unknown>, message: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    op.subscribe({
      next: () => {
        this.busy.set(false);
        this.modal = '';
        this.mensaje.set(message);
        this.cargar();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
