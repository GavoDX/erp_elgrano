import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService),
    secured = req.url.startsWith(environment.apiBaseUrl + '/') && !req.url.endsWith('/login');
  const token = auth.obtenerToken();
  if (secured && token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(
    catchError((error) => {
      if (secured && error.status === 401) auth.expired();
      return throwError(() => error);
    }),
  );
};
