export const finanzasModel = (db) => ({
  movimientos: async () =>
    (await db.all('SELECT * FROM movimientos ORDER BY id DESC LIMIT 1000')).map((m) => ({
      ...m,
      monto: m.monto_centavos / 100,
    })),
  async resumen() {
    const r = await db.get(
      "SELECT COALESCE(SUM(CASE WHEN tipo='Ingreso' THEN monto_centavos ELSE 0 END),0) AS ingresos,COALESCE(SUM(CASE WHEN tipo='Egreso' THEN monto_centavos ELSE 0 END),0) AS egresos FROM movimientos",
    );
    const p = await db.get(
      "SELECT COALESCE(SUM(total_centavos),0) AS total FROM ordenes_compra WHERE estado='Pendiente'",
    );
    return {
      ingresos: r.ingresos / 100,
      egresos: r.egresos / 100,
      balance: (r.ingresos - r.egresos) / 100,
      cuentasPorPagar: p.total / 100,
    };
  },
});
