export const paypalController = (s) => ({
  configuracion: async (req, res) => res.json(await s.configuracion()),
  pendientes: async (req, res) => res.json(await s.pendientes(req.usuario)),
  crear: async (req, res) => res.json(await s.crear(req.body.productos, req.usuario)),
  capturar: async (req, res) => res.json(await s.capturar(req.params.id, req.usuario)),
  cancelar: async (req, res) => res.json(await s.cancelar(req.params.id, req.usuario)),
});
