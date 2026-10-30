export const inventarioController = (s) => ({
  listar: async (req, res) => res.json(await s.listar()),
  movimientos: async (req, res) => res.json(await s.movimientos()),
  crear: async (req, res) => res.json(await s.crear(req.body, req.usuario)),
  actualizar: async (req, res) => res.json(await s.actualizar(req.params.id, req.body)),
  ajustar: async (req, res) => res.json(await s.ajustar(req.params.id, req.body, req.usuario)),
});
