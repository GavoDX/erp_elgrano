import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './env.js';
// Un mismo contrato de repositorios para MySQL y SQLite persistente.
export function createDatabase(options = config) {
  if (options.driver === 'mysql') {
    const pool = mysql.createPool({ ...options.db, connectionLimit: 10 });
    const wrap = (connection) => ({
      dialect: 'mysql',
      async all(sql, args = []) {
        const [rows] = await connection.execute(sql, args);
        return rows;
      },
      async get(sql, args = []) {
        return (await this.all(sql, args))[0];
      },
      async run(sql, args = []) {
        const [r] = await connection.execute(sql, args);
        return { id: r.insertId, changes: r.affectedRows };
      },
      lock(sql) {
        return sql + ' FOR UPDATE';
      },
    });
    const db = wrap(pool);
    db.transaction = async (work) => {
      const c = await pool.getConnection();
      try {
        await c.beginTransaction();
        // Orden de bloqueo global: evita carreras de existencias, recepciones y pagos.
        await c.execute('SELECT id FROM erp_lock WHERE id = 1 FOR UPDATE');
        const result = await work(wrap(c));
        await c.commit();
        return result;
      } catch (e) {
        await c.rollback();
        throw e;
      } finally {
        c.release();
      }
    };
    db.exec = async (sql) => {
      await pool.query(sql);
    };
    db.close = () => pool.end();
    return db;
  }
  if (options.driver !== 'sqlite') throw new Error('DB_DRIVER debe ser sqlite o mysql.');
  if (options.sqliteFile !== ':memory:')
    mkdirSync(dirname(options.sqliteFile), { recursive: true });
  const sqlite = new DatabaseSync(options.sqliteFile);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const base = {
    dialect: 'sqlite',
    async all(sql, args = []) {
      return sqlite.prepare(sql).all(...args);
    },
    async get(sql, args = []) {
      return sqlite.prepare(sql).get(...args);
    },
    async run(sql, args = []) {
      const r = sqlite.prepare(sql).run(...args);
      return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    lock(sql) {
      return sql;
    },
  };
  // Todas las lecturas públicas se encolan: nunca ven una transacción incompleta.
  let queue = Promise.resolve();
  const serial = (fn) => {
    const task = queue.then(fn);
    queue = task.catch(() => {});
    return task;
  };
  return {
    ...base,
    all: (...args) => serial(() => base.all(...args)),
    get: (...args) => serial(() => base.get(...args)),
    run: (...args) => serial(() => base.run(...args)),
    exec: (sql) => serial(() => sqlite.exec(sql)),
    transaction: (work) =>
      serial(async () => {
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const result = await work(base);
          sqlite.exec('COMMIT');
          return result;
        } catch (e) {
          sqlite.exec('ROLLBACK');
          throw e;
        }
      }),
    close: () => serial(() => sqlite.close()),
  };
}
