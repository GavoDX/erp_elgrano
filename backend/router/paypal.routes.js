import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { paypalController } from '../controllers/paypal.controller.js';
export function paypalRoutes(service) {
  const r = Router(),
    c = paypalController(service);
  r.get('/config', c.configuracion);
  r.get('/ordenes', c.pendientes);
  r.post('/ordenes', c.crear);
  r.post('/ordenes/:id/capturar', c.capturar);
  r.post('/ordenes/:id/cancelar', c.cancelar);
  return r;
}
