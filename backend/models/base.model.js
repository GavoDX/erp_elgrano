export const now = () => new Date().toISOString();
export const money = (centavos) => Number(centavos) / 100;
export const quantity = (miles) => Number(miles) / 1000;
export const publicFactura = (r) => ({ ...r, total: money(r.total_centavos) });
