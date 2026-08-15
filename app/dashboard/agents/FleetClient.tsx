'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FleetAgent, Finding } from '@/lib/agentsDb';

const AVATAR: Record<string, string> = {
  glow: '/agents/glow.webp',
  steel: '/agents/steel.webp',
  fire: '/agents/fire.webp',
  ice: '/agents/ice.webp',
  gum: '/agents/gum.webp',
  brawl: '/agents/brawl.webp',
};

function ago(iso: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function FleetClient({
  initialFleet, recent,
}: { initialFleet: FleetAgent[]; recent: Finding[] }) {
  const [fleet, setFleet] = useState(initialFleet);
  const [tab, setTab] = useState<'fleet' | 'log'>('fleet');

  // Light poll. Only refreshes when the tab is visible, so a phone left
  // open in a pocket isn't burning battery or Supabase quota.
  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const r = await fetch('/api/agents/status', { cache: 'no-store' });
      if (r.ok) setFleet(await r.json());
    } catch { /* offline — keep showing last known */ }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 30_000);
    document.addEventListener('visibilitychange', poll);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', poll); };
  }, [poll]);

  // A "lead" is any agent that is not itself a sub-agent of a lead.
  // Saguaro's direct reports are department heads and deserve full cards;
  // only second-level agents (e.g. comp-watch under Flint) render as chips.
  const topKeys = new Set(fleet.filter(a => !a.parent_key).map(a => a.key));
  const leads = fleet.filter(a => !a.parent_key || topKeys.has(a.parent_key));
  const leadKeys = new Set(leads.map(a => a.key));
  const subs = (key: string) => fleet.filter(a => a.parent_key === key && !leadKeys.has(a.key));

  return (
    <>
      <div className="ag-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'fleet'}
          className={tab === 'fleet' ? 'on' : ''} onClick={() => setTab('fleet')}>Fleet</button>
        <button role="tab" aria-selected={tab === 'log'}
          className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>Activity</button>
      </div>

      {tab === 'fleet' ? (
        <section className="ag-section">
          <div className="ag-grid">
            {leads.map(a => (
              <article key={a.key} className={`ag-card st-${a.state}`}>
                <div className="ag-card-top">
                  <div className="ag-face">
                    {a.avatar && AVATAR[a.avatar] ? (
                      <img src={AVATAR[a.avatar]} alt="" width={44} height={44} loading="lazy" decoding="async" />
                    ) : <span>{a.name[0]}</span>}
                  </div>
                  <div className="ag-id">
                    <h3>{a.name}</h3>
                    <span>{a.role}</span>
                  </div>
                  <span className={`ag-dot st-${a.state}`} aria-label={a.state} />
                </div>

                <p className="ag-sum">{a.last_summary || 'No runs yet.'}</p>

                <div className="ag-meta">
                  <span>{a.compartment || '—'}</span>
                  <span>{a.schedule}</span>
                  <span>{a.last_run_at ? `${ago(a.last_run_at)} ago` : 'never run'}</span>
                  {a.parent_key && <span>→ {a.parent_key}</span>}
                </div>

                {subs(a.key).length > 0 && (
                  <div className="ag-subs">
                    {subs(a.key).map(s => (
                      <span key={s.key} className={`ag-sub st-${s.state}`}>{s.name}</span>
                    ))}
                  </div>
                )}

                {a.open_flags > 0 && (
                  <div className="ag-badge">{a.open_flags} flagged</div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="ag-section">
          <ul className="ag-log">
            {recent.map(f => (
              <li key={f.id}>
                <span className="ag-log-t">
                  {new Date(f.created_at).toLocaleTimeString('en-US',
                    { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className="ag-log-w">{f.agent_key}</span>
                <span className="ag-log-b">{f.body}</span>
              </li>
            ))}
            {!recent.length && <li className="ag-empty">Nothing logged yet.</li>}
          </ul>
        </section>
      )}
    </>
  );
}
