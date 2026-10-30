export const finanzasController = (s) => ({
  movimientos: async (req, res) => res.json(await s.movimientos()),
  resumen: async (req, res) => res.json(await s.resumen()),
  crear: async (req, res) => res.json(await s.crear(req.body, req.usuario)),
});
