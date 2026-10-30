import { Routes } from '@angular/router';
import { Auth } from './components/auth/auth';
import { Home } from './components/home/home';
import { Ventas } from './components/ventas/ventas';
import { Compras } from './components/compras/compras';
import { Inventario } from './components/inventario/inventario';
import { Rrhh } from './components/rrhh/rrhh';
import { Finanzas } from './components/finanzas/finanzas';
import { SinAcceso } from './components/sin-acceso/sin-acceso';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
const secured = (roles: string[]) => ({ canActivate: [authGuard, roleGuard], data: { roles } });
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Auth },
  { path: 'home', component: Home, ...secured([]) },
  { path: 'ventas', component: Ventas, ...secured(['administrador', 'cajero']) },
  { path: 'compras', component: Compras, ...secured(['administrador', 'compras']) },
  {
    path: 'inventario',
    component: Inventario,
    ...secured(['administrador', 'almacen', 'compras']),
  },
  { path: 'rrhh', component: Rrhh, ...secured(['administrador', 'rrhh']) },
  { path: 'finanzas', component: Finanzas, ...secured(['administrador', 'contador']) },
  { path: 'contabilidad', redirectTo: 'finanzas', pathMatch: 'full' },
  { path: 'sin-acceso', component: SinAcceso, canActivate: [authGuard] },
  { path: '**', redirectTo: 'home' },
];
