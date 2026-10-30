import { config, authConfig } from './config/env.js';
import { createDatabase } from './config/database.js';
import { paypalGateway } from './config/paypal.js';
import { createServices } from './services/index.js';
import { createApp } from './app.js';
const db = createDatabase();
try {
  await db.get('SELECT id FROM erp_lock WHERE id=1');
} catch {
  console.error('Ejecuta npm run setup desde la carpeta backend.');
  await db.close();
  process.exit(1);
}
const app = createApp(createServices(db, authConfig(), paypalGateway(config.paypal)), db);
const server = app.listen(config.port, () =>
  console.log(`El Grano ERP: http://localhost:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
