import { redirect } from 'next/navigation';
import {
  requireOwner, getFleet, getTodayBrief, getOpenFindings,
  getRecentFindings, getSpend24h,
} from '@/lib/agentsDb';
import FleetClient from './FleetClient';
import './agents.css';

// Owner-only + payroll data: never cache this across requests. A shared
// CDN copy is exactly how one user's private page leaks to another.
// The 30s poll in FleetClient keeps it feeling live without caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AgentsPage() {
  // Owner only. Employees get bounced before any data is fetched.
  const { authed, isOwner } = await requireOwner();
  if (!authed) redirect('/dashboard/login');
  if (!isOwner) redirect('/dashboard');

  // one round trip, not five
  const [fleet, brief, open, recent, spend] = await Promise.all([
    getFleet(), getTodayBrief(), getOpenFindings(), getRecentFindings(12), getSpend24h(),
  ]);

  const onWatch = fleet.filter(a => a.state === 'working' || a.state === 'idle').length;

  return (
    <main className="ag">
      <header className="ag-head">
        <div className="ag-eyebrow">VHH Valley · Command Deck</div>
        <h1 className="ag-title">Agent Fleet</h1>
        <div className="ag-stats">
          <div><b>{onWatch}/{fleet.length}</b><span>On watch</span></div>
          <div><b>{open.length}</b><span>Need you</span></div>
          <div><b>{spend.runs}</b><span>Runs 24h</span></div>
          <div><b>${spend.cost}</b><span>Spend 24h</span></div>
        </div>
      </header>

      {brief && (
        <section className="ag-brief">
          <div className="ag-lbl">Morning brief · {brief.for_date}</div>
          <p className="ag-brief-head">{brief.headline}</p>
          <details>
            <summary>Read the full brief</summary>
            <pre className="ag-md">{brief.body_md}</pre>
          </details>
        </section>
      )}

      {open.length > 0 && (
        <section className="ag-section">
          <h2 className="ag-h2">Needs you</h2>
          <ul className="ag-flags">
            {open.map(f => (
              <li key={f.id} className={`ag-flag sev-${f.severity}`}>
                <div className="ag-flag-top">
                  <span className="ag-flag-who">{f.agent_key}</span>
                  <span className="ag-flag-sev">{f.severity}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                {f.link && <a href={f.link}>Open →</a>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <FleetClient initialFleet={fleet} recent={recent} />
    </main>
  );
}
