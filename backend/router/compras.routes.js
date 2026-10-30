import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { comprasController } from '../controllers/compras.controller.js';
export function comprasRoutes(service) {
  const r = Router(),
    c = comprasController(service);
  r.get('/ordenes', c.ordenes);
  r.get('/proveedores', c.proveedores);
  r.post('/proveedores', c.proveedor);
  r.put('/proveedores/:id', c.proveedor);
  r.post('/ordenes', c.crear);
  r.post('/ordenes/:id/recibir', c.recibir);
  r.post('/ordenes/:id/cancelar', c.cancelar);
  return r;
}
