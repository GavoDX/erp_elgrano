import { fail } from '../services/auth.service.js';
export const authenticate = (service) => async (req, res, next) => {
  try {
    req.usuario = await service.authenticate(req.headers.authorization);
    next();
  } catch (e) {
    next(e);
  }
};
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol))
      return next(fail(403, 'No tienes permisos para acceder a este recurso.'));
    next();
  };
