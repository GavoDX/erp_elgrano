import { fail } from '../services/auth.service.js';
// Se inyecta fetch solamente en pruebas. En ejecución todas las llamadas van a PayPal.
export function paypalGateway(settings, request = fetch) {
  const { clientId, secret, environment } = settings;
  if (!['sandbox', 'live'].includes(environment)) throw new Error('PAYPAL_ENV inválido.');
  const base =
    environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  let token = '',
    expires = 0;
  const enabled = () =>
    !!clientId && !!secret && !clientId.includes('TU_') && !secret.includes('TU_');
  async function access() {
    if (!enabled()) throw fail(503, 'Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en .env.');
    if (expires > Date.now()) return token;
    let response;
    try {
      response = await request(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw fail(502, 'No hubo conexión con PayPal. Reintenta.');
    }
    if (!response.ok) throw fail(502, 'PayPal rechazó las credenciales del servidor.');
    const data = await response.json();
    if (!data.access_token) throw fail(502, 'PayPal no devolvió un token.');
    token = data.access_token;
    expires = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
    return token;
  }
  async function call(path, method = 'GET', body, key) {
    const bearer = await access();
    let response;
    try {
      response = await request(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...(key ? { 'PayPal-Request-Id': key } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw fail(502, 'PayPal no respondió. Verifica el pago pendiente antes de volver a cobrar.');
    }
    if (!response.ok) {
      if (response.status === 401) expires = 0;
      throw fail(502, 'PayPal no pudo completar la operación. Verifica la orden o reintenta.');
    }
    return response.json();
  }
  return {
    enabled,
    publicConfig: () => ({ enabled: enabled(), clientId, currency: 'MXN', environment }),
    create: (amount, key) =>
      call(
        '/v2/checkout/orders',
        'POST',
        {
          intent: 'CAPTURE',
          purchase_units: [
            { custom_id: key, amount: { currency_code: 'MXN', value: (amount / 100).toFixed(2) } },
          ],
        },
        key,
      ),
    get: (id) => call(`/v2/checkout/orders/${encodeURIComponent(id)}`),
    capture: (id, key) =>
      call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, 'POST', {}, key),
  };
}
