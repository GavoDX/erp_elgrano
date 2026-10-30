import { authService } from './auth.service.js';
import { usuarioModel } from '../models/usuario.model.js';
import { inventarioService } from './inventario.service.js';
import { ventasService } from './ventas.service.js';
import { comprasService } from './compras.service.js';
import { rrhhService } from './rrhh.service.js';
import { finanzasService } from './finanzas.service.js';
import { paypalService } from './paypal.service.js';
import { config } from '../config/env.js';
import { brevoGateway } from '../config/brevo.js';
import { correoService } from './correo.service.js';
export const createServices = (db, authConfig, paypal, brevo = brevoGateway(config.brevo)) => ({
  correo: correoService(db, brevo),
  auth: authService(usuarioModel(db), authConfig),
  inventario: inventarioService(db),
  ventas: ventasService(db),
  compras: comprasService(db),
  rrhh: rrhhService(db),
  finanzas: finanzasService(db),
  paypal: paypalService(db, paypal),
});
