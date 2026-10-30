import { rrhhModel } from '../models/rrhh.model.js';
import { text, cents, id, exists, choice, email } from '../middleware/validate.js';
import { fail } from './auth.service.js';
import { now } from '../models/base.model.js';
export const rrhhService = (db) => ({
  empleados: () => rrhhModel(db).empleados(),
  nominas: () => rrhhModel(db).nominas(),
  async guardar(b, employeeId) {
    const args = [
      text(b.nombre, 'Nombre', 100),
      text(b.puesto, 'Puesto', 80),
      text(b.turno, 'Turno', 100),
      choice(b.estado, ['Activo', 'En descanso', 'Baja'], 'Estado'),
      cents(b.salario, 'Salario mensual'),
      email(b.correo),
    ];
    return db.transaction(async (tx) => {
      if (employeeId) {
        const n = id(employeeId);
        exists(await tx.get('SELECT id FROM empleados WHERE id=?', [n]), 'Empleado');
        await tx.run(
          'UPDATE empleados SET nombre=?,puesto=?,turno=?,estado=?,salario_centavos=?,correo=? WHERE id=?',
          [...args, n],
        );
        return { id: n };
      }
      return {
        id: (
          await tx.run(
            'INSERT INTO empleados(nombre,puesto,turno,estado,salario_centavos,correo) VALUES (?,?,?,?,?,?)',
            args,
          )
        ).id,
      };
    });
  },
  async pagar(employeeId, b, user) {
    const periodo = text(b.periodo, 'Periodo', 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) throw fail(400, 'Usa un periodo AAAA-MM.');
    return db.transaction(async (tx) => {
      const e = exists(
        await tx.get('SELECT * FROM empleados WHERE id=?', [id(employeeId)]),
        'Empleado',
      );
      if (e.estado === 'Baja') throw fail(409, 'El empleado está dado de baja.');
      if (await tx.get('SELECT id FROM nominas WHERE empleado_id=? AND periodo=?', [e.id, periodo]))
        throw fail(409, 'Ese periodo ya está pagado.');
      const r = await tx.run(
        'INSERT INTO nominas(empleado_id,periodo,monto_centavos,fecha,usuario_id) VALUES (?,?,?,?,?)',
        [e.id, periodo, e.salario_centavos, now(), user.id],
      );
      await tx.run(
        'INSERT INTO movimientos(fecha,concepto,categoria,tipo,monto_centavos,referencia,usuario_id) VALUES (?,?,?,?,?,?,?)',
        [
          now(),
          `Nómina ${e.nombre} ${periodo}`,
          'Nómina',
          'Egreso',
          e.salario_centavos,
          `nomina:${r.id}`,
          user.id,
        ],
      );
      return { mensaje: 'Nómina pagada y registrada en finanzas.' };
    });
  },
});
