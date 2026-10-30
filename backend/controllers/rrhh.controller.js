export const rrhhController = (s) => ({
  empleados: async (req, res) => res.json(await s.empleados()),
  nominas: async (req, res) => res.json(await s.nominas()),
  guardar: async (req, res) => res.json(await s.guardar(req.body, req.params.id)),
  pagar: async (req, res) => res.json(await s.pagar(req.params.id, req.body, req.usuario)),
});
