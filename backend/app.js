import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { authenticate, authorize } from './middleware/auth.js';
import { authRoutes } from './router/auth.routes.js';
import { inventarioRoutes } from './router/inventario.routes.js';
import { ventasRoutes } from './router/ventas.routes.js';
import { comprasRoutes } from './router/compras.routes.js';
import { rrhhRoutes } from './router/rrhh.routes.js';
import { finanzasRoutes } from './router/finanzas.routes.js';
import { paypalRoutes } from './router/paypal.routes.js';
export function createApp(services, db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://*.paypal.com', 'https://*.paypalobjects.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://*.paypal.com', 'https://*.paypalobjects.com'],
          connectSrc: ["'self'", 'https://*.paypal.com', 'https://*.paypalobjects.com'],
          frameSrc: ['https://*.paypal.com', 'https://*.paypalobjects.com'],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(
    cors({
      origin: config.origin,
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (_q, s, n) => {
    s.set('Cache-Control', 'no-store');
    n();
  });
  app.get('/api/health', async (_q, s) => {
    await db.get('SELECT 1 AS ok');
    s.json({ status: 'ok', db: db.dialect });
  });
  app.use('/api', authRoutes(services.auth));
  app.use(
    '/api/ventas',
    authenticate(services.auth),
    authorize('administrador', 'cajero'),
    ventasRoutes(services.ventas, services.correo),
  );
  app.use(
    '/api/paypal',
    authenticate(services.auth),
    authorize('administrador', 'cajero'),
    paypalRoutes(services.paypal),
  );
  app.use(
    '/api/inventario',
    authenticate(services.auth),
    authorize('administrador', 'almacen', 'compras'),
    inventarioRoutes(services.inventario),
  );
  app.use(
    '/api/compras',
    authenticate(services.auth),
    authorize('administrador', 'compras'),
    comprasRoutes(services.compras),
  );
  app.use(
    '/api/rrhh',
    authenticate(services.auth),
    authorize('administrador', 'rrhh'),
    rrhhRoutes(services.rrhh),
  );
  app.use(
    '/api/finanzas',
    authenticate(services.auth),
    authorize('administrador', 'contador'),
    finanzasRoutes(services.finanzas),
  );
  app.use('/api', (_q, s) => s.status(404).json({ error: 'Ruta no encontrada.' }));
  const browser = fileURLToPath(new URL('../frontend/dist/mi-proyecto/browser', import.meta.url));
  if (existsSync(browser)) {
    app.use(express.static(browser));
    app.get('/{*path}', (_q, s) => s.sendFile(browser + '/index.html'));
  }
  app.use((err, _q, res, _next) => {
    let status = err.status || 500,
      message = err.message;
    if (
      ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY'].includes(
        err.code,
      ) ||
      /UNIQUE constraint failed/.test(message)
    ) {
      status = 409;
      message = 'Ese registro ya existe.';
    }
    if (err.type === 'entity.parse.failed') {
      status = 400;
      message = 'JSON inválido.';
    }
    if (status >= 500 && status !== 502 && status !== 503) {
      console.error('API:', err.code || err.message);
      message = 'No se pudo completar la operación. Revisa el servidor y la base de datos.';
    }
    res.status(status).json({ error: message, mensaje: message });
  });
  return app;
}
