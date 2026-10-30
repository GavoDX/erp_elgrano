export interface Movimiento {
  id: number;
  fecha: string;
  concepto: string;
  categoria: string;
  tipo: 'Ingreso' | 'Egreso';
  monto: number;
  referencia: string | null;
}
export interface ResumenFinanzas {
  ingresos: number;
  egresos: number;
  balance: number;
  cuentasPorPagar: number;
}
