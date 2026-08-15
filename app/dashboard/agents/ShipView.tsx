'use client';

import { useState } from 'react';
import type { FleetAgent } from '@/lib/agentsDb';

/* ------------------------------------------------------------------ *
 * The ship.
 *
 * `/ship/deck.webp` is baked from the WinLu tileset by
 * scripts/bake-ship.py — hull, floors, furniture and door frames, one
 * flat image. Everything that reacts to agent state is an SVG overlay
 * on top of it, sharing the same 1440x2016 coordinate space as the bake.
 *
 * Rooms are polygons, not rectangles, because the hull has diagonal
 * walls. The point lists below are the SAME polygons the bake uses —
 * if you change one you must change the other or the glow will sit
 * somewhere the floor isn't.
 * ------------------------------------------------------------------ */

const W = 1440;
const H = 2016;

type Room = { key: string | null; name: string; label: [number, number]; points: string };

const ROOMS: Room[] = [
  { key: 'saguaro',    name: 'Command',    label: [720, 269],
    points: '547,72 893,72 955,149 955,398 893,466 547,466 485,398 485,149' },
  { key: 'fizz',       name: 'Payroll',    label: [474, 717],
    points: '547,466 653,466 653,826 557,922 269,922 269,672 331,610' },
  { key: null,         name: 'Barracks',   label: [966, 717],
    points: '893,466 787,466 787,826 883,922 1171,922 1171,672 1109,610' },
  { key: 'ember',      name: 'R & D',      label: [413, 1058],
    points: '269,922 557,922 557,1195 269,1195' },
  { key: 'thinker',    name: 'Reactor',    label: [720, 957],
    points: '653,466 787,466 787,826 883,922 883,1195 797,1306 643,1306 557,1195 557,922 653,826' },
  { key: 'comp-watch', name: 'Sensor Bay', label: [1027, 1058],
    points: '1171,922 883,922 883,1195 1171,1195' },
  { key: 'slugger',    name: 'Storage',    label: [445, 1296],
    points: '269,1195 557,1195 643,1306 475,1440 288,1344' },
  { key: 'frost',      name: 'Vault',      label: [995, 1296],
    points: '1171,1195 883,1195 797,1306 965,1440 1152,1344' },
  { key: 'flint',      name: 'Engine',     label: [720, 1539],
    points: '475,1440 643,1306 797,1306 965,1440 946,1690 869,1747 571,1747 494,1690' },
];

/** x, y, rotation in degrees, and the agent whose activity opens it. */
const DOORS: { x: number; y: number; a: number; key: string | null }[] = [
  { x: 720,  y: 466,  a: 0,     key: 'saguaro' },
  { x: 653,  y: 696,  a: 90,    key: 'fizz' },
  { x: 787,  y: 696,  a: 90,    key: null },
  { x: 557,  y: 1056, a: 90,    key: 'ember' },
  { x: 883,  y: 1056, a: 90,    key: 'comp-watch' },
  { x: 600,  y: 1250, a: 51.9,  key: 'slugger' },
  { x: 840,  y: 1250, a: 128.1, key: 'frost' },
  { x: 720,  y: 1306, a: 0,     key: 'flint' },
];

function ago(iso: string | null) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ShipView({ fleet }: { fleet: FleetAgent[] }) {
  const [sel, setSel] = useState<string | null>(null);

  const byKey = new Map(fleet.map(a => [a.key, a]));
  const selected = sel ? byKey.get(sel) ?? null : null;
  const aboard = ROOMS.filter(r => r.key && byKey.has(r.key));
  const docked = fleet.filter(a => !ROOMS.some(r => r.key === a.key));

  const crew = aboard.filter(r => {
    const st = byKey.get(r.key!)?.state;
    return st === 'working' || st === 'idle';
  }).length;
  const alerts = fleet.reduce((n, a) => n + (a.open_flags || 0), 0);

  /** Rooms with no agent (Barracks) are lit as crew space, never flagged. */
  const stateOf = (r: Room) => {
    if (!r.key) return 'crew';
    return byKey.get(r.key)?.state ?? 'off';
  };

  return (
    <section className="sv">
      <div className="sv-hud">
        <span className="sv-hud-name">VHH&nbsp;Valley</span>
        <span className={`sv-hud-stat ${crew ? 'on' : ''}`}>{crew}/{aboard.length} crewed</span>
        {alerts > 0 && (
          <span className="sv-hud-stat alert">{alerts} alert{alerts === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="sv-stage-wrap">
        <div className="sv-stage" style={{ aspectRatio: `${W} / ${H}` }}>
          <img className="sv-deck" src="/ship/deck.webp" alt="" width={W} height={H} />

          <svg className="sv-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Ship deck plan">
            {ROOMS.map(r => {
              const a = r.key ? byKey.get(r.key) : null;
              const flagged = (a?.open_flags ?? 0) > 0;
              return (
                <polygon
                  key={r.name}
                  className={`sv-room st-${stateOf(r)} ${flagged ? 'flagged' : ''} ${sel === r.key ? 'sel' : ''}`}
                  points={r.points}
                  role={a ? 'button' : undefined}
                  tabIndex={a ? 0 : undefined}
                  aria-pressed={a ? sel === r.key : undefined}
                  aria-label={a ? `${r.name} — ${a.name}, ${a.state}${flagged ? `, ${a.open_flags} flagged` : ''}` : `${r.name}, no crew assigned`}
                  onClick={() => a && setSel(sel === r.key ? null : r.key!)}
                  onKeyDown={e => {
                    if (a && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setSel(sel === r.key ? null : r.key!);
                    }
                  }}
                />
              );
            })}

            {DOORS.map((d, i) => {
              const open = d.key ? byKey.get(d.key)?.state === 'working' : false;
              return (
                <g key={i} className={`sv-door ${open ? 'open' : ''}`}
                   transform={`translate(${d.x} ${d.y}) rotate(${d.a})`} aria-hidden>
                  <rect className="sv-leaf l" x={-44} y={-12} width={41} height={24} rx={2} />
                  <rect className="sv-leaf r" x={3}   y={-12} width={41} height={24} rx={2} />
                  <rect className="sv-seam"   x={-2}  y={-11} width={4}  height={22} />
                </g>
              );
            })}
          </svg>

          {ROOMS.map(r => {
            const a = r.key ? byKey.get(r.key) : null;
            return (
              <span
                key={r.name}
                className={`sv-tag st-${stateOf(r)}`}
                style={{ left: `${(r.label[0] / W) * 100}%`, top: `${(r.label[1] / H) * 100}%` }}
                aria-hidden
              >
                <b>{r.name}</b>
                {a && <i>{a.name}</i>}
              </span>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className={`sv-detail st-${selected.state}`}>
          <div className="sv-detail-head">
            <b>{selected.name}</b>
            <span>{ROOMS.find(r => r.key === selected.key)?.name ?? '—'}</span>
            <em>{selected.state}</em>
          </div>
          <p>{selected.last_summary || 'No runs yet.'}</p>
          <div className="sv-detail-meta">
            <span>{selected.model}</span>
            <span>{selected.schedule}</span>
            <span>{ago(selected.last_run_at)}</span>
            {selected.last_cost != null && <span>${Number(selected.last_cost).toFixed(2)}</span>}
            {selected.queued > 0 && <span>{selected.queued} queued</span>}
            {selected.open_flags > 0 && <span className="hot">{selected.open_flags} flagged</span>}
          </div>
        </div>
      ) : (
        <p className="sv-hint">Select a compartment.</p>
      )}

      {docked.length > 0 && (
        <div className="sv-docked">
          <span className="sv-docked-lbl">Docked</span>
          {docked.map(a => (
            <button key={a.key} className={`sv-chip st-${a.state}`} onClick={() => setSel(a.key)}>
              {a.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
