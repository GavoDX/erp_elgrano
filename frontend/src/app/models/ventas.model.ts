export interface Receta {
  insumoId: number;
  cantidad: number;
  nombre?: string;
}
export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stockDisponible: number;
  receta: Receta[];
}
export interface ItemPedido extends Producto {
  cantidad: number;
}
export interface Factura {
  id: number;
  folio: string;
  cliente: string;
  fecha: string;
  total: number;
  metodo: string;
  items?: { nombre: string; cantidad: number; precioUnitario: number }[];
}
export interface NuevaFacturaPayload {
  cliente: string;
  metodo: string;
  items: { id: number; cantidad: number }[];
}
export interface OrdenPaypal {
  id: string;
  estado: string;
  total: number;
  moneda: string;
  fecha: string;
}
export interface ConfigPaypal {
  enabled: boolean;
  clientId: string;
  currency: string;
  environment: 'sandbox' | 'live';
}
export interface ResultadoPaypal {
  mensaje: string;
  factura?: Factura;
  pendiente?: boolean;
}

export interface EnvioCorreo {
  id: number;
  destinatario: string;
  estado: 'ENVIANDO' | 'ACEPTADO' | 'FALLIDO' | 'INCIERTO';
  message_id: string | null;
  error: string | null;
  fecha: string;
}
export interface ResultadoCorreo {
  estado: string;
  messageId: string;
  mensaje: string;
}
