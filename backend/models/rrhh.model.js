export const rrhhModel = (db) => ({
  empleados: async () =>
    (await db.all('SELECT * FROM empleados ORDER BY id')).map((e) => ({
      ...e,
      salario: e.salario_centavos / 100,
    })),
  nominas: async () =>
    (
      await db.all(
        'SELECT n.*,e.nombre FROM nominas n JOIN empleados e ON e.id=n.empleado_id ORDER BY n.id DESC LIMIT 200',
      )
    ).map((n) => ({ ...n, monto: n.monto_centavos / 100 })),
});
