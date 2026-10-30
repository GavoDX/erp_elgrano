import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RrhhService } from '../../services/rrhh.service';
import { Empleado, Nomina } from '../../models/rrhh.model';
import { mensajeError } from '../../services/api.service';
@Component({
  selector: 'app-rrhh',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './rrhh.html',
  styleUrl: './rrhh.css',
})
export class Rrhh implements OnInit {
  private service = inject(RrhhService);
  empleados = signal<Empleado[]>([]);
  nominas = signal<Nomina[]>([]);
  busy = signal(false);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  modal = '';
  form: Partial<Empleado> = {};
  seleccionado?: Empleado;
  periodo = new Date().toISOString().slice(0, 7);
  dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  turnos = ['Matutino', 'Vespertino', 'Fin de semana'];
  activos = computed(() => this.empleados().filter((e) => e.estado === 'Activo').length);
  salarioTotal = computed(() =>
    this.empleados()
      .filter((e) => e.estado !== 'Baja')
      .reduce((s, e) => s + e.salario, 0),
  );
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    forkJoin({ empleados: this.service.getEmpleados(), nominas: this.service.nominas() }).subscribe(
      {
        next: (d) => {
          this.empleados.set(d.empleados);
          this.nominas.set(d.nominas);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      },
    );
  }
  enTurno(turno: string) {
    return (
      this.empleados()
        .filter((e) => e.estado !== 'Baja' && e.turno === turno)
        .map((e) => e.nombre)
        .join(', ') || 'Sin personal'
    );
  }
  abrir(e?: Empleado) {
    this.form = e
      ? { ...e }
      : { nombre: '', puesto: '', turno: 'Matutino', estado: 'Activo', salario: 9000, correo: '' };
    this.modal = 'empleado';
    this.error.set('');
  }
  nomina(e: Empleado) {
    this.seleccionado = e;
    this.modal = 'nomina';
    this.error.set('');
  }
  guardar() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.service
      .guardar(this.form)
      .subscribe({ next: () => this.completo('Empleado guardado.'), error: (e) => this.fallo(e) });
  }
  pagar() {
    if (this.busy() || !this.seleccionado) return;
    this.busy.set(true);
    this.error.set('');
    this.service
      .pagar(this.seleccionado.id, this.periodo)
      .subscribe({ next: (d) => this.completo(d.mensaje), error: (e) => this.fallo(e) });
  }
  completo(m: string) {
    this.busy.set(false);
    this.modal = '';
    this.mensaje.set(m);
    this.cargar();
  }
  fallo(e: unknown) {
    this.busy.set(false);
    this.error.set(mensajeError(e));
  }
}
