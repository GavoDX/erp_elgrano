import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { finanzasController } from '../controllers/finanzas.controller.js';
export function finanzasRoutes(service) {
  const r = Router(),
    c = finanzasController(service);
  r.get('/movimientos', c.movimientos);
  r.get('/resumen', c.resumen);
  r.post('/movimientos', c.crear);
  return r;
}
