import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * SERVER ONLY. The service role key bypasses RLS — the agent_* tables have
 * RLS enabled with no policies, so the anon key reads nothing. Every query
 * here must run in a server component or route handler.
 *
 * Vercel env var: SUPABASE_SERVICE_ROLE_KEY  (NOT NEXT_PUBLIC_)
 */
let _admin: SupabaseClient | null = null;

/**
 * Lazy. Creating the client at module scope makes `next build` fail with
 * "supabaseKey is required" when the env var isn't present at build time.
 */
function db(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Agent fleet: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export function fleetConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type FleetAgent = {
  key: string; name: string; role: string; compartment: string | null;
  avatar: string | null; parent_key: string | null; model: string;
  schedule: string; enabled: boolean; sort_order: number;
  last_run_at: string | null; last_run_status: string | null;
  last_summary: string | null; last_cost: number | null;
  queued: number; open_flags: number;
  state: 'off' | 'working' | 'idle' | 'dark';
};

export type Finding = {
  id: number; agent_key: string; severity: string; title: string; body: string;
  needs_you: boolean; acknowledged: boolean; link: string | null; created_at: string;
};

export type Brief = {
  for_date: string; headline: string | null; body_md: string;
  needs_you_ids: number[]; emailed_at: string | null;
};

/**
 * OWNER ONLY.
 *
 * This section is Mitch's think tank — it surfaces payroll findings,
 * financials, and the Thinker's critique of the whole operation. Employee
 * accounts (Caitlin, Terrance) must not reach it.
 *
 * Checking only that vhh-auth exists is NOT enough: every logged-in
 * employee has that cookie. We check role and user as well.
 */
const OWNER_USERS = (process.env.AGENT_OWNER_USERS ?? 'mitch')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export async function requireOwner() {
  const jar = await cookies();
  const authed = jar.get('vhh-auth')?.value;
  const user = jar.get('vhh-user')?.value?.toLowerCase() ?? null;
  const role = jar.get('vhh-role')?.value?.toLowerCase() ?? null;

  const isOwner = !!authed && role === 'admin' && !!user && OWNER_USERS.includes(user);

  return { authed: !!authed, user, role, isOwner };
}

/** Kept for any non-sensitive page that only needs "is logged in". */
export async function requireAuth() {
  const jar = await cookies();
  return {
    authed: !!jar.get('vhh-auth')?.value,
    user: jar.get('vhh-user')?.value ?? null,
    role: jar.get('vhh-role')?.value ?? null,
  };
}

export async function getFleet(): Promise<FleetAgent[]> {
  const { data, error } = await db()
    .from('agent_fleet_status')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('getFleet:', error.message); return []; }
  return (data ?? []) as unknown as FleetAgent[];
}

export async function getTodayBrief(): Promise<Brief | null> {
  const { data } = await db()
    .from('agent_briefs')
    .select('for_date, headline, body_md, needs_you_ids, emailed_at')
    .order('for_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as Brief) ?? null;
}

export async function getOpenFindings(limit = 8): Promise<Finding[]> {
  const { data } = await db()
    .from('agent_findings')
    .select('id, agent_key, severity, title, body, needs_you, acknowledged, link, created_at')
    .eq('needs_you', true)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Finding[];
}

export async function getRecentFindings(limit = 20): Promise<Finding[]> {
  const { data } = await db()
    .from('agent_findings')
    .select('id, agent_key, severity, title, body, needs_you, acknowledged, link, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Finding[];
}

export async function getSpend24h() {
  const { data } = await db().from('agent_spend_24h').select('*');
  const rows = data ?? [];
  return {
    runs: rows.reduce((s: number, r: any) => s + Number(r.runs || 0), 0),
    cost: +rows.reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0).toFixed(2),
  };
}

export async function acknowledgeFinding(id: number) {
  const { error } = await db().from('agent_findings')
    .update({ acknowledged: true }).eq('id', id);
  if (error) throw error;
}

/** Fire an event agent — call when a break closes or a VOD lands. */
export async function enqueueEvent(agentKey: string, payload: Record<string, unknown> = {}) {
  const { error } = await db().from('agent_tasks')
    .insert({ agent_key: agentKey, kind: 'event', payload, priority: 10 });
  if (error) throw error;
}
