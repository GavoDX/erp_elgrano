import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
export const config = {
  port: Number(process.env.PORT || 3000),
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
  driver: process.env.DB_DRIVER || 'sqlite',
  sqliteFile:
    process.env.SQLITE_FILE || fileURLToPath(new URL('../data/erp.sqlite', import.meta.url)),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_elgrano',
    decimalNumbers: true,
    dateStrings: true,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@sgrest.app',
    senderName: process.env.BREVO_SENDER_NAME || 'El Grano ERP',
    timeoutMs: 15000,
  },
  paypal: {
    environment: process.env.PAYPAL_ENV || 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    secret: process.env.PAYPAL_CLIENT_SECRET || '',
    currency: 'MXN',
  },
};
export function authConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres. Configúralo en .env.');
  if (process.env.NODE_ENV === 'production' && secret.includes('ejemplo'))
    throw new Error('Cambia JWT_SECRET antes de usar producción.');
  return { secret, expiresIn: process.env.JWT_EXPIRES_IN || '1h' };
}
