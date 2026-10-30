import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { rrhhController } from '../controllers/rrhh.controller.js';
export function rrhhRoutes(service) {
  const r = Router(),
    c = rrhhController(service);
  r.get('/empleados', c.empleados);
  r.post('/empleados', c.guardar);
  r.put('/empleados/:id', c.guardar);
  r.get('/nominas', c.nominas);
  r.post('/empleados/:id/nominas', c.pagar);
  return r;
}
