import { finanzasModel } from '../models/finanzas.model.js';
import { text, cents, choice } from '../middleware/validate.js';
import { now } from '../models/base.model.js';
export const finanzasService = (db) => ({
  movimientos: () => finanzasModel(db).movimientos(),
  resumen: () => finanzasModel(db).resumen(),
  async crear(b, user) {
    const values = [
      now(),
      text(b.concepto, 'Concepto', 180),
      text(b.categoria, 'Categoría', 60),
      choice(b.tipo, ['Ingreso', 'Egreso'], 'Tipo'),
      cents(b.monto),
      null,
      user.id,
    ];
    return {
      id: (
        await db.run(
          'INSERT INTO movimientos(fecha,concepto,categoria,tipo,monto_centavos,referencia,usuario_id) VALUES (?,?,?,?,?,?,?)',
          values,
        )
      ).id,
    };
  },
});
