import { fail } from '../services/auth.service.js';
export function brevoGateway(settings, request = fetch) {
  const sender = String(settings.senderEmail || '')
    .trim()
    .toLowerCase();
  const enabled = () =>
    !!settings.apiKey && !settings.apiKey.includes('TU_') && /^[^\s@]+@sgrest\.app$/.test(sender);
  return {
    publicConfig: () => ({
      enabled: enabled(),
      senderEmail: sender,
      senderName: settings.senderName,
    }),
    async enviar({ destinatario, nombre, folio, xml, key }) {
      if (!enabled())
        throw fail(503, 'Configura BREVO_API_KEY y un remitente verificado de sgrest.app en .env.');
      const payload = {
        sender: { email: sender, name: settings.senderName },
        to: [{ email: destinatario, name: nombre }],
        subject: `Comprobante de venta ${folio}`,
        htmlContent: `<html><body><p>Adjuntamos el comprobante de tu venta en formato XML.</p><p>Gracias por tu compra en El Grano.</p></body></html>`,
        attachment: [
          { name: `${folio}.xml`, content: Buffer.from(xml, 'utf8').toString('base64') },
        ],
        headers: { IdempotencyKey: key },
        tags: ['erp', 'factura-xml'],
      };
      let response;
      try {
        response = await request('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': settings.apiKey,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(settings.timeoutMs || 15000),
        });
      } catch {
        throw Object.assign(
          fail(502, 'No se confirmó la respuesta de Brevo. Verifica el intento antes de reenviar.'),
          { incierto: true },
        );
      }
      if (!response.ok)
        throw Object.assign(
          fail(
            502,
            'Brevo rechazó o no pudo confirmar el envío. Revisa la clave API, el remitente y el estado en Brevo.',
          ),
          { incierto: response.status >= 500 },
        );
      let result;
      try {
        result = await response.json();
      } catch {
        throw Object.assign(
          fail(502, 'Brevo respondió sin una confirmación legible. Verifica el intento.'),
          { incierto: true },
        );
      }
      const messageId = result.messageId || result.messageIds?.[0];
      if (!messageId)
        throw Object.assign(
          fail(502, 'Brevo respondió sin identificador. Verifica el envío antes de repetirlo.'),
          { incierto: true },
        );
      return { messageId };
    },
  };
}
