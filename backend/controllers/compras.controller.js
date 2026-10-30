export const comprasController = (s) => ({
  ordenes: async (req, res) => res.json(await s.ordenes()),
  proveedores: async (req, res) => res.json(await s.proveedores()),
  proveedor: async (req, res) => res.json(await s.proveedor(req.body, req.params.id)),
  crear: async (req, res) => res.json(await s.crear(req.body, req.usuario)),
  recibir: async (req, res) => res.json(await s.recibir(req.params.id, req.usuario)),
  cancelar: async (req, res) => res.json(await s.cancelar(req.params.id)),
});
