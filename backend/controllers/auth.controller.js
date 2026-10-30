export const authController = (service) => ({
  login: async (req, res) =>
    res.json(await service.login(req.body?.correo, req.body?.contrasena ?? req.body?.password)),
  registro: async (req, res) =>
    res.status(201).json({
      mensaje: 'Usuario registrado',
      usuario: await service.registrarUsuario(req.body || {}),
    }),
  me: (req, res) => res.json({ usuario: req.usuario }),
  logout: async (req, res) => {
    await service.logout(req.usuario.id);
    res.json({ mensaje: 'Sesiones cerradas.' });
  },
});
