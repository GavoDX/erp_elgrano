export interface Insumo {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  stockActual: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  valorUnitario: number;
}
export interface MovimientoInventario {
  id: number;
  nombre: string;
  unidad: string;
  cantidad_miles: number;
  motivo: string;
  fecha: string;
}
