import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const start = Date.now();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_URL or SUPABASE_ANON_KEY not configured' });
  }

  try {
    const supabase = createClient(url, key);
    // Simple ping — just checks the connection is alive
    const { error } = await supabase.from('users').select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      // PGRST116 = no rows, 42P01 = table doesn't exist — both mean DB is alive
      return res.status(500).json({ ok: false, error: error.message, latencyMs });
    }

    return res.status(200).json({ ok: true, message: 'Supabase is alive', latencyMs });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, latencyMs: Date.now() - start });
  }
}
