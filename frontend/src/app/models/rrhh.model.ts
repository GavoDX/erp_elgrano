export interface Empleado {
  id: number;
  nombre: string;
  puesto: string;
  turno: string;
  estado: 'Activo' | 'En descanso' | 'Baja';
  salario: number;
  correo: string;
}
export interface Nomina {
  id: number;
  nombre: string;
  periodo: string;
  monto: number;
  fecha: string;
}
