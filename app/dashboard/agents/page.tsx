import { redirect } from 'next/navigation';
import {
  requireOwner, getFleet, getTodayBrief, getOpenFindings,
  getRecentFindings, getSpend24h,
} from '@/lib/agentsDb';
import FleetClient from './FleetClient';
import BriefCard from './BriefCard';
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

      <BriefCard
        headline={brief?.headline ?? null}
        date={brief?.for_date ?? new Date().toISOString().slice(0, 10)}
        needs={open.slice(0, 4)}
        handledCount={Math.max(0, recent.length - Math.min(open.length, 4))}
      />

      <FleetClient initialFleet={fleet} recent={recent} />
    </main>
  );
}
