import { fail } from '../services/auth.service.js';
export const text = (v, label, max = 120) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max)
    throw fail(400, `${label} es obligatorio (máximo ${max} caracteres).`);
  return v.trim();
};
export const number = (v, label, min = 0, max = 10000000) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw fail(400, `${label} inválido.`);
  return v;
};
export const id = (v) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw fail(400, 'ID inválido.');
  return n;
};
export const cents = (v, label = 'Monto') => Math.round(number(v, label, 0.01, 10000000) * 100);
export const miles = (v, label = 'Cantidad', min = 0.001) =>
  Math.round(number(v, label, min, 1000000) * 1000);
export const choice = (v, values, label) => {
  if (!values.includes(v)) throw fail(400, `${label} inválido.`);
  return v;
};
export const email = (v) => {
  const s = text(v, 'Correo', 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw fail(400, 'Correo inválido.');
  return s;
};
export const exists = (row, label = 'Registro') => {
  if (!row) throw fail(404, `${label} no encontrado.`);
  return row;
};
