export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  categoria: string;
}
export interface OrdenCompra {
  id: number;
  orden: string;
  proveedor: string;
  insumos: string;
  fecha: string;
  total: number;
  estado: 'Pendiente' | 'Recibida' | 'Cancelada';
}
export interface NuevaOrden {
  proveedorId: number;
  items: { insumoId: number; cantidad: number; costoUnitario: number }[];
}
