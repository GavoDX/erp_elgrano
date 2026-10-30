import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { InventarioService } from '../../services/inventario.service';
import { Insumo, MovimientoInventario } from '../../models/inventario.model';
import { mensajeError } from '../../services/api.service';
import { exportCsv } from '../../services/export-csv';
@Component({
  selector: 'app-inventario',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario implements OnInit {
  private service = inject(InventarioService);
  insumos = signal<Insumo[]>([]);
  movimientos = signal<MovimientoInventario[]>([]);
  error = signal('');
  mensaje = signal('');
  busy = signal(false);
  cargando = signal(true);
  busqueda = signal('');
  modal = '';
  form: Partial<Insumo> = {};
  seleccionado?: Insumo;
  ajuste = { cantidad: 0, motivo: '' };
  verHistorial = false;
  filtrados = computed(() =>
    this.insumos().filter((i) =>
      (i.nombre + ' ' + i.categoria).toLowerCase().includes(this.busqueda().toLowerCase()),
    ),
  );
  stockBajo = computed(
    () => this.insumos().filter((i) => i.stockDisponible < i.stockMinimo).length,
  );
  valorInventario = computed(() =>
    this.insumos().reduce((s, i) => s + i.stockActual * i.valorUnitario, 0),
  );
  reservas = computed(() => this.insumos().filter((i) => i.stockReservado > 0).length);
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    forkJoin({
      insumos: this.service.getInsumos(),
      movimientos: this.service.movimientos(),
    }).subscribe({
      next: (d) => {
        this.insumos.set(d.insumos);
        this.movimientos.set(d.movimientos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  nivel(i: Insumo) {
    return i.stockMinimo > 0 ? Math.min((i.stockDisponible / (i.stockMinimo * 2)) * 100, 100) : 100;
  }
  estado(i: Insumo) {
    return i.stockDisponible < i.stockMinimo ? 'Bajo' : 'OK';
  }
  abrir(i?: Insumo) {
    this.form = i
      ? { ...i }
      : {
          nombre: '',
          categoria: '',
          unidad: 'pz',
          stockActual: 0,
          stockMinimo: 1,
          valorUnitario: 1,
        };
    this.modal = 'insumo';
    this.error.set('');
  }
  ajustar(i: Insumo) {
    this.seleccionado = i;
    this.ajuste = { cantidad: 0, motivo: '' };
    this.modal = 'ajuste';
    this.error.set('');
  }
  guardar() {
    this.ejecutar(this.service.guardar(this.form), 'Insumo guardado.');
  }
  guardarAjuste() {
    if (this.seleccionado)
      this.ejecutar(this.service.ajustar(this.seleccionado.id, this.ajuste), 'Ajuste registrado.');
  }
  ejecutar(operation: Observable<unknown>, message: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    operation.subscribe({
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
  exportar() {
    exportCsv(
      'inventario.csv',
      [
        'Nombre',
        'Categoría',
        'Stock',
        'Reservado',
        'Disponible',
        'Mínimo',
        'Unidad',
        'Valor unitario',
      ],
      this.filtrados().map((i) => [
        i.nombre,
        i.categoria,
        i.stockActual,
        i.stockReservado,
        i.stockDisponible,
        i.stockMinimo,
        i.unidad,
        i.valorUnitario,
      ]),
    );
  }
}
