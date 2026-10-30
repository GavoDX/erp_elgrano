import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { inventarioController } from '../controllers/inventario.controller.js';
export function inventarioRoutes(service) {
  const r = Router(),
    c = inventarioController(service);
  r.get('/insumos', c.listar);
  r.get('/movimientos', c.movimientos);
  r.post('/insumos', c.crear);
  r.put('/insumos/:id', c.actualizar);
  r.post('/insumos/:id/ajustes', c.ajustar);
  return r;
}
