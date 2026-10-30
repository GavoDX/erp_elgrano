import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService),
    router = inject(Router);
  if (!auth.estaAutenticado()) return router.createUrlTree(['/login']);
  const roles = (route.data['roles'] ?? route.data['rolesPermitidos'] ?? []) as string[];
  return auth.tieneRol(roles) || router.createUrlTree(['/sin-acceso']);
};
