export const correoController = (s) => ({
  configuracion: async (_req, res) => res.json(s.configuracion()),
  xml: async (req, res) => {
    const result = await s.xml(req.params.id);
    res.type('application/xml').attachment(result.nombre).send(result.xml);
  },
  historial: async (req, res) => res.json(await s.historial(req.params.id)),
  enviar: async (req, res) =>
    res.json(await s.enviar(req.params.id, req.body, req.usuario, req.get('Idempotency-Key'))),
});
