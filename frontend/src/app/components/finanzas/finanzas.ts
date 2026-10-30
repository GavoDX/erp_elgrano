import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FinanzasService } from '../../services/finanzas.service';
import { Movimiento, ResumenFinanzas } from '../../models/finanzas.model';
import { mensajeError } from '../../services/api.service';
import { exportCsv } from '../../services/export-csv';
@Component({
  selector: 'app-finanzas',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './finanzas.html',
  styleUrl: './finanzas.css',
})
export class Finanzas implements OnInit {
  private service = inject(FinanzasService);
  movimientos = signal<Movimiento[]>([]);
  resumen = signal<ResumenFinanzas>({ ingresos: 0, egresos: 0, balance: 0, cuentasPorPagar: 0 });
  busy = signal(false);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  modal = false;
  form: Partial<Movimiento> = {};
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    forkJoin({
      movimientos: this.service.getMovimientos(),
      resumen: this.service.resumen(),
    }).subscribe({
      next: (d) => {
        this.movimientos.set(d.movimientos);
        this.resumen.set(d.resumen);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  abrir() {
    this.form = { concepto: '', categoria: 'Gastos generales', tipo: 'Egreso', monto: 0 };
    this.modal = true;
    this.error.set('');
  }
  guardar() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service.crear(this.form).subscribe({
      next: () => {
        this.busy.set(false);
        this.modal = false;
        this.mensaje.set('Movimiento registrado.');
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
      'finanzas.csv',
      ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto MXN', 'Referencia'],
      this.movimientos().map((m) => [
        m.fecha,
        m.concepto,
        m.categoria,
        m.tipo,
        m.monto,
        m.referencia || 'Manual',
      ]),
    );
  }
}
