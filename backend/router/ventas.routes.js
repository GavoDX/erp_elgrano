import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { correoController } from '../controllers/correo.controller.js';
import { rateLimit } from 'express-rate-limit';
import { ventasController } from '../controllers/ventas.controller.js';
export function ventasRoutes(service, correo) {
  const r = Router(),
    c = ventasController(service);
  const mail = correoController(correo);
  r.get('/correo/config', mail.configuracion);
  r.get('/facturas/:id/xml', mail.xml);
  r.get('/facturas/:id/correos', mail.historial);
  r.post(
    '/facturas/:id/correo',
    rateLimit({
      windowMs: 900000,
      limit: 30,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Demasiados envíos. Intenta más tarde.' },
    }),
    mail.enviar,
  );
  r.get('/productos', c.productos);
  r.get('/facturas', c.facturas);
  r.get('/facturas/:id', c.detalle);
  r.post('/facturas', c.cobrar);
  r.post('/productos', authorize('administrador'), c.guardarProducto);
  r.put('/productos/:id', authorize('administrador'), c.guardarProducto);
  return r;
}
