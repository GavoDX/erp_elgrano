import { correoModel } from '../models/correo.model.js';
import { id, email, text, exists } from '../middleware/validate.js';
import { now } from '../models/base.model.js';
import { fail } from './auth.service.js';
export const escaparXml = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
    );
export function generarFacturaXml(factura, items, emisor = 'noreply@sgrest.app') {
  const subtotal = items.reduce((s, i) => s + i.precio_centavos * i.cantidad, 0),
    descuento = subtotal - factura.total_centavos;
  const money = (c) => (Number(c) / 100).toFixed(2);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<Factura version="1.0" tipo="ComprobanteInterno" folio="${escaparXml(factura.folio)}" fecha="${escaparXml(factura.fecha)}" moneda="MXN">`,
    `  <Emisor nombre="El Grano" correo="${escaparXml(emisor)}"/>`,
    `  <Receptor nombre="${escaparXml(factura.cliente)}"/>`,
    '  <Conceptos>',
    ...items.map(
      (i) =>
        `    <Concepto productoId="${i.producto_id}" descripcion="${escaparXml(i.nombre)}" cantidad="${i.cantidad}" precioUnitario="${money(i.precio_centavos)}" importe="${money(i.precio_centavos * i.cantidad)}"/>`,
    ),
    '  </Conceptos>',
    `  <Totales subtotal="${money(subtotal)}" descuento="${money(descuento)}" total="${money(factura.total_centavos)}"/>`,
    `  <Pago metodo="${escaparXml(factura.metodo)}"/>`,
    '</Factura>',
  ].join('\n');
}
export const correoService = (db, gateway) => ({
  configuracion: () => gateway.publicConfig(),
  async xml(facturaId) {
    const n = id(facturaId),
      model = correoModel(db),
      f = exists(await model.factura(n), 'Venta');
    return {
      nombre: `${f.folio}.xml`,
      xml: generarFacturaXml(f, await model.items(n), gateway.publicConfig().senderEmail),
    };
  },
  async historial(facturaId) {
    const n = id(facturaId);
    exists(await correoModel(db).factura(n), 'Venta');
    return correoModel(db).historial(n);
  },
  async enviar(facturaId, b, user, key) {
    const n = id(facturaId),
      dest = email(b.correo),
      nombre = b.nombre ? text(b.nombre, 'Nombre', 100) : 'Cliente',
      scoped = `${user.id}:${text(key, 'Idempotency-Key', 80)}`;
    const prepared = await db.transaction(async (tx) => {
      const model = correoModel(tx),
        factura = exists(await model.factura(n), 'Venta');
      const old = await model.porClave(scoped);
      if (old) {
        if (old.factura_id !== n || old.destinatario !== dest)
          throw fail(409, 'La clave de envío corresponde a otra solicitud.');
        if (old.estado === 'ACEPTADO') return { previous: old };
        throw fail(409, 'Ese intento ya fue registrado. Revisa su estado antes de reenviar.');
      }
      if (await model.pendiente(n, dest))
        throw fail(
          409,
          'Existe un intento sin confirmar para esa venta y correo. Verifica su estado en Brevo antes de repetir.',
        );
      const row = await model.crear([n, user.id, dest, 'ENVIANDO', scoped, now()]);
      return {
        id: row.id,
        factura,
        xml: generarFacturaXml(factura, await model.items(n), gateway.publicConfig().senderEmail),
      };
    });
    if (prepared.previous)
      return {
        estado: 'ACEPTADO',
        messageId: prepared.previous.message_id,
        mensaje: 'Este intento ya fue aceptado por Brevo.',
      };
    let acceptedId = null;
    try {
      const result = await gateway.enviar({
        destinatario: dest,
        nombre,
        folio: prepared.factura.folio,
        xml: prepared.xml,
        key: `erp-correo-${prepared.id}`,
      });
      acceptedId = result.messageId;
      await correoModel(db).terminar(prepared.id, 'ACEPTADO', result.messageId, null);
      return {
        estado: 'ACEPTADO',
        messageId: result.messageId,
        mensaje: 'Brevo aceptó el correo con el XML adjunto.',
      };
    } catch (e) {
      if (acceptedId) {
        // Reintentar la escritura local no vuelve a llamar al proveedor.
        try {
          await correoModel(db).terminar(prepared.id, 'ACEPTADO', acceptedId, null);
          return {
            estado: 'ACEPTADO',
            messageId: acceptedId,
            mensaje: 'Brevo aceptó el correo con el XML adjunto.',
          };
        } catch {
          // El registro inicial ENVIANDO bloquea otro envío hasta verificarlo.
          throw fail(
            502,
            'Brevo aceptó el intento pero no se pudo confirmar su registro local. Verifica el historial antes de repetir.',
          );
        }
      }
      await correoModel(db).terminar(
        prepared.id,
        e.incierto ? 'INCIERTO' : 'FALLIDO',
        null,
        String(e.message).slice(0, 300),
      );
      throw e;
    }
  },
});
