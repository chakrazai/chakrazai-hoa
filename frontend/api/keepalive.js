import pg from 'pg';

const { Pool } = pg;

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  const start = Date.now();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
  }

  try {
    const db = getPool();
    const result = await db.query('SELECT NOW() AS time, current_database() AS db');
    return res.status(200).json({
      ok: true,
      db: result.rows[0].db,
      serverTime: result.rows[0].time,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, latencyMs: Date.now() - start });
  }
}
