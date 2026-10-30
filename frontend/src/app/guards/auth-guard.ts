import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService),
    router = inject(Router);
  if (!auth.estaAutenticado()) return router.createUrlTree(['/login']);
  return auth.verify().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
