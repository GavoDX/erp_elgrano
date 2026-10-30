import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Empleado, Nomina } from '../models/rrhh.model';
@Injectable({ providedIn: 'root' })
export class RrhhService {
  private api = inject(ApiService);
  getEmpleados() {
    return this.api.get<Empleado[]>('/rrhh/empleados');
  }
  guardar(data: Partial<Empleado>) {
    return data.id
      ? this.api.put('/rrhh/empleados/' + data.id, data)
      : this.api.post('/rrhh/empleados', data);
  }
  nominas() {
    return this.api.get<Nomina[]>('/rrhh/nominas');
  }
  pagar(id: number, periodo: string) {
    return this.api.post<{ mensaje: string }>('/rrhh/empleados/' + id + '/nominas', { periodo });
  }
}
