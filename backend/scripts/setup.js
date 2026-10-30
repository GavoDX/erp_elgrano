import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config, authConfig } from '../config/env.js';
import { createDatabase } from '../config/database.js';
export async function initialize(
  db,
  { seed = true, adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!' } = {},
) {
  const schema = await readFile(
    new URL(`../database/schema.${db.dialect}.sql`, import.meta.url),
    'utf8',
  );
  for (const sql of schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.exec(sql);
  if (!(await db.get('SELECT id FROM erp_lock WHERE id=1')))
    await db.run('INSERT INTO erp_lock(id) VALUES (1)');
  if (!seed) return;
  for (const [nombre, correo, password, rol] of [
    ['Administrador', 'admin@elgrano.com', adminPassword, 'administrador'],
    ['Cajero', 'cajero@elgrano.com', 'Cajero123!', 'cajero'],
    ['Compras', 'compras@elgrano.com', 'Compras123!', 'compras'],
    ['Almacén', 'almacen@elgrano.com', 'Almacen123!', 'almacen'],
    ['Recursos humanos', 'rrhh@elgrano.com', 'Rrhh123!', 'rrhh'],
    ['Contabilidad', 'contador@elgrano.com', 'Contador123!', 'contador'],
  ]) {
    if (!(await db.get('SELECT id FROM usuarios WHERE correo=?', [correo])))
      await db.run('INSERT INTO usuarios(nombre,correo,password_hash,rol) VALUES (?,?,?,?)', [
        nombre,
        correo,
        await bcrypt.hash(password, 12),
        rol,
      ]);
  }
  await db.transaction(async (tx) => {
    if (!(await tx.get('SELECT id FROM insumos LIMIT 1'))) {
      for (const row of [
        ['Leche entera', 'Lácteos', 'L', 30000, 5000, 2200],
        ['Café en grano - Blend', 'Café', 'kg', 10000, 5000, 32000],
        ['Vasos desechables 16oz', 'Empaque', 'pz', 620000, 300000, 150],
        ['Jarabe de vainilla', 'Insumos', 'L', 4000, 2000, 18000],
        ['Agua mineral', 'Bebidas', 'pz', 50000, 10000, 1000],
        ['Muffin arándano', 'Alimentos', 'pz', 40000, 10000, 1800],
        ['Croissant', 'Alimentos', 'pz', 40000, 10000, 1600],
        ['Cheesecake', 'Postres', 'pz', 30000, 10000, 2600],
      ])
        await tx.run(
          'INSERT INTO insumos(nombre,categoria,unidad,stock_miles,minimo_miles,costo_centavos) VALUES (?,?,?,?,?,?)',
          row,
        );
    }
    if (!(await tx.get('SELECT id FROM productos LIMIT 1'))) {
      const ids = {};
      for (const row of await tx.all('SELECT id,nombre FROM insumos')) ids[row.nombre] = row.id;
      for (const [nombre, categoria, precio, recipe] of [
        [
          'Latte Grande',
          'Bebidas calientes',
          4500,
          [
            ['Café en grano - Blend', 18],
            ['Leche entera', 250],
            ['Vasos desechables 16oz', 1000],
          ],
        ],
        [
          'Cappuccino',
          'Bebidas calientes',
          4200,
          [
            ['Café en grano - Blend', 18],
            ['Leche entera', 200],
            ['Vasos desechables 16oz', 1000],
          ],
        ],
        [
          'Espresso Doble',
          'Bebidas calientes',
          3500,
          [
            ['Café en grano - Blend', 20],
            ['Vasos desechables 16oz', 1000],
          ],
        ],
        [
          'Frappé Moka',
          'Bebidas frías',
          5200,
          [
            ['Leche entera', 200],
            ['Jarabe de vainilla', 30],
            ['Vasos desechables 16oz', 1000],
          ],
        ],
        [
          'Té Chai',
          'Bebidas calientes',
          3800,
          [
            ['Leche entera', 200],
            ['Jarabe de vainilla', 20],
            ['Vasos desechables 16oz', 1000],
          ],
        ],
        ['Agua Mineral', 'Bebidas frías', 2000, [['Agua mineral', 1000]]],
        ['Muffin Arándano', 'Alimentos', 3000, [['Muffin arándano', 1000]]],
        ['Croissant', 'Alimentos', 2800, [['Croissant', 1000]]],
        ['Cheesecake', 'Postres', 4800, [['Cheesecake', 1000]]],
      ]) {
        const r = await tx.run(
          'INSERT INTO productos(nombre,categoria,precio_centavos) VALUES (?,?,?)',
          [nombre, categoria, precio],
        );
        for (const [name, amount] of recipe)
          await tx.run('INSERT INTO recetas(producto_id,insumo_id,cantidad_miles) VALUES (?,?,?)', [
            r.id,
            ids[name],
            amount,
          ]);
      }
    }
    if (!(await tx.get('SELECT id FROM proveedores LIMIT 1')))
      for (const row of [
        ['Distribuidora Café Sur', 'ventas@cafesur.example', 'Café'],
        ['Lácteos del Valle', 'pedidos@lactosvalle.example', 'Lácteos'],
      ])
        await tx.run('INSERT INTO proveedores(nombre,contacto,categoria) VALUES (?,?,?)', row);
    if (!(await tx.get('SELECT id FROM empleados LIMIT 1')))
      for (const row of [
        ['Ana Martínez', 'Cajero', 'Matutino', 'Activo', 900000, 'ana@elgrano.example'],
        ['Diego Ruiz', 'Barista', 'Matutino', 'Activo', 1000000, 'diego@elgrano.example'],
        ['Iván Castro', 'Cajero', 'Vespertino', 'En descanso', 900000, 'ivan@elgrano.example'],
      ])
        await tx.run(
          'INSERT INTO empleados(nombre,puesto,turno,estado,salario_centavos,correo) VALUES (?,?,?,?,?,?)',
          row,
        );
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  authConfig();
  if (config.driver === 'mysql') {
    if (!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error('DB_NAME inválido.');
    const { database, ...rest } = config.db,
      c = await mysql.createConnection(rest);
    await c.query(
      'CREATE DATABASE IF NOT EXISTS `' +
        database +
        '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    await c.end();
  }
  const db = createDatabase();
  try {
    await initialize(db);
    console.log('Base preparada. Inicio: admin@elgrano.com / Admin123! (o SEED_ADMIN_PASSWORD).');
  } finally {
    await db.close();
  }
}
