export const ventasController = (s) => ({
  productos: async (req, res) => res.json(await s.productos()),
  facturas: async (req, res) => res.json(await s.facturas()),
  detalle: async (req, res) => res.json(await s.detalle(req.params.id)),
  cobrar: async (req, res) =>
    res.json(await s.cobrar(req.body, req.usuario, req.get('Idempotency-Key'))),
  guardarProducto: async (req, res) => res.json(await s.guardarProducto(req.body, req.params.id)),
});
