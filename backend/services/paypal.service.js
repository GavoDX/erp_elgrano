import { randomUUID } from 'node:crypto';
import { paypalModel } from '../models/paypal.model.js';
import { cotizar, registrarVenta } from './ventas.service.js';
import { now, publicFactura } from '../models/base.model.js';
import { exists, text } from '../middleware/validate.js';
import { fail } from './auth.service.js';
const owned = (row, user) => {
  exists(row, 'Orden PayPal');
  if (row.usuario_id !== user.id) throw fail(403, 'Esta orden pertenece a otro usuario.');
  return row;
};
export const paypalService = (db, gateway) => ({
  configuracion: () => gateway.publicConfig(),
  pendientes: (user) => paypalModel(db).pendientes(user),
  async crear(items, user) {
    if (!gateway.enabled())
      throw fail(503, 'Configura las credenciales Sandbox de PayPal en .env.');
    return db.transaction(async (tx) => {
      const quote = await cotizar(tx, items),
        key = randomUUID();
      const remote = await gateway.create(quote.total, key);
      if (!remote.id) throw fail(502, 'PayPal no devolvió una orden válida.');
      for (const c of quote.consumos)
        await tx.run('UPDATE insumos SET reservado_miles=reservado_miles+? WHERE id=?', [
          c.cantidad,
          c.id,
        ]);
      await tx.run(
        'INSERT INTO paypal_ordenes(id,usuario_id,estado,total_centavos,moneda,snapshot,fecha) VALUES (?,?,?,?,?,?,?)',
        [remote.id, user.id, 'CREADA', quote.total, 'MXN', JSON.stringify(quote), now()],
      );
      return { id: remote.id, total: quote.total / 100 };
    });
  },
  async capturar(orderId, user) {
    const order = text(orderId, 'Orden PayPal', 50);
    return db.transaction(async (tx) => {
      const row = owned(await paypalModel(tx).byId(order), user);
      if (row.factura_id)
        return {
          mensaje: 'Pago confirmado previamente.',
          factura: publicFactura(
            await tx.get('SELECT * FROM facturas WHERE id=?', [row.factura_id]),
          ),
        };
      if (row.estado === 'CANCELADA') throw fail(409, 'La orden fue cancelada.');
      // Consultar primero permite recuperar un pago capturado tras una interrupción local.
      let remote = await gateway.get(order);
      if (remote.status !== 'COMPLETED') remote = await gateway.capture(order, `cap-${order}`);
      const captures = remote.purchase_units?.flatMap((u) => u.payments?.captures || []) || [];
      const completed = captures.filter((c) => c.status === 'COMPLETED');
      if (remote.status !== 'COMPLETED' || !completed.length) {
        await tx.run("UPDATE paypal_ordenes SET estado='PENDIENTE' WHERE id=?", [order]);
        return { mensaje: 'Pago pendiente de verificación', pendiente: true };
      }
      if (
        completed.some((c) => c.amount?.currency_code !== row.moneda) ||
        completed.reduce((s, c) => s + Math.round(Number(c.amount?.value) * 100), 0) !==
          row.total_centavos
      )
        throw fail(409, 'El monto o la moneda de PayPal no coincide. Requiere revisión.');
      const factura = await registrarVenta(
        tx,
        JSON.parse(row.snapshot),
        'PayPal',
        user,
        `paypal:${order}`,
        'Consumidor final',
        true,
      );
      await tx.run(
        "UPDATE paypal_ordenes SET estado='COMPLETADA',factura_id=?,capture_id=? WHERE id=?",
        [factura.id, completed[0].id, order],
      );
      return { mensaje: 'Pago confirmado. Venta e inventario actualizados.', factura };
    });
  },
  async cancelar(orderId, user) {
    return db.transaction(async (tx) => {
      const row = owned(await paypalModel(tx).byId(text(orderId, 'Orden PayPal', 50)), user);
      if (row.estado === 'CANCELADA') return { mensaje: 'Reserva ya cancelada.' };
      if (row.factura_id) throw fail(409, 'El pago ya fue confirmado.');
      const remote = await gateway.get(row.id);
      if (
        remote.status === 'COMPLETED' ||
        remote.purchase_units?.some((u) => u.payments?.captures?.length)
      )
        throw fail(409, 'Existe un pago. Usa Verificar pago para conciliarlo.');
      for (const c of JSON.parse(row.snapshot).consumos)
        await tx.run('UPDATE insumos SET reservado_miles=reservado_miles-? WHERE id=?', [
          c.cantidad,
          c.id,
        ]);
      await tx.run("UPDATE paypal_ordenes SET estado='CANCELADA' WHERE id=?", [row.id]);
      return { mensaje: 'Reserva cancelada y existencias liberadas.' };
    });
  },
});
