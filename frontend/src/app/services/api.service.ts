import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly base = environment.apiBaseUrl;
  get<T>(path: string) {
    return this.http.get<T>(this.base + path);
  }
  blob(path: string) {
    return this.http.get(this.base + path, { responseType: 'blob' });
  }
  post<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.http.post<T>(this.base + path, body, { headers: new HttpHeaders(headers) });
  }
  put<T>(path: string, body: unknown) {
    return this.http.put<T>(this.base + path, body);
  }
}
export const mensajeError = (e: unknown) => {
  const error = e as { error?: { error?: string; mensaje?: string } };
  return (
    error.error?.error ||
    error.error?.mensaje ||
    'No se pudo completar la operación. Comprueba la conexión con la API.'
  );
};
