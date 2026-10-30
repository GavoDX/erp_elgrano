import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { authController } from '../controllers/auth.controller.js';
export function authRoutes(service) {
  const r = Router(),
    c = authController(service);
  r.post(
    ['/login', '/auth/login'],
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: { error: 'Demasiados intentos. Espera 15 minutos.' },
    }),
    c.login,
  );
  r.get('/auth/me', authenticate(service), c.me);
  r.post('/auth/logout', authenticate(service), c.logout);
  // Alta solo por administrador; no se puede elegir un rol mediante registro público.
  r.post(
    ['/registro', '/auth/registro'],
    authenticate(service),
    authorize('administrador'),
    c.registro,
  );
  return r;
}
