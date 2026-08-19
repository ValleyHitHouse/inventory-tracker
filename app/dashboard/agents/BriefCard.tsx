'use client';

import { useEffect, useRef, useState } from 'react';
import type { Finding } from '@/lib/agentsDb';

type Props = {
  headline: string | null;
  date: string;
  needs: Finding[];
  handledCount: number;
};

/** Strip markdown so the speech doesn't read asterisks aloud. */
function speakable(s: string) {
  return s.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ *
 * The headline figure.
 *
 * A collapsed row used to show the title alone, so the number that makes
 * the item worth reading — "$580 unpaid", "12%" — stayed hidden until you
 * tapped it. We surface it on the row itself: prefer the agent's own
 * structured `metrics`, fall back to the first figure in the body.
 * ------------------------------------------------------------------ */

const MONEY_KEY = /(usd|dollar|amount|cost|pay|price|revenue|gross|net|owed|due)/i;
const PCT_KEY = /(pct|percent|rate|margin|share)/i;

function fmtNum(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return String(+n.toFixed(abs < 10 && !Number.isInteger(n) ? 1 : 0));
}

/** Money keeps its cents when it has any: 580 -> $580, 25.2 -> $25.20. */
function fmtMoney(n: number) {
  const d = Number.isInteger(n) ? 0 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Money wins over percent, percent over a bare count. */
function figureFromMetrics(m: Record<string, unknown> | null | undefined) {
  if (!m || typeof m !== 'object') return null;
  const entries = Object.entries(m)
    .map(([k, v]) => [k, toNum(v)] as const)
    .filter((e): e is readonly [string, number] => e[1] !== null);
  if (!entries.length) return null;

  const money = entries.find(([k]) => MONEY_KEY.test(k));
  if (money) return fmtMoney(money[1]);
  const pct = entries.find(([k]) => PCT_KEY.test(k));
  if (pct) return `${fmtNum(pct[1])}%`;
  return fmtNum(entries[0][1]);
}

function figureFromBody(body: string) {
  const money = body.match(/\$\s?\d[\d,]*(?:\.\d+)?/);
  if (money) return money[0].replace(/\s+/g, '');
  const pct = body.match(/\d[\d,]*(?:\.\d+)?\s?%/);
  if (pct) return pct[0].replace(/\s+/g, '');
  const bare = body.match(/(^|[^\w$.])(\d[\d,]*(?:\.\d+)?)(?![\w%])/);
  return bare ? bare[2] : null;
}

function headlineFigure(f: Finding) {
  const fig = figureFromMetrics(f.metrics) ?? figureFromBody(f.body || '');
  if (!fig) return null;
  // The title already carries it — don't say the same number twice.
  if ((f.title || '').includes(fig)) return null;
  return fig;
}

export default function BriefCard({ headline, date, needs, handledCount }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  function toggleSpeak() {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }

    // Read the whole brief: status line, then each item title and body.
    const script = [
      `Good morning Mitch.`,
      headline ? speakable(headline) : '',
      needs.length
        ? `${needs.length} thing${needs.length === 1 ? '' : 's'} need${needs.length === 1 ? 's' : ''} you.`
        : 'Nothing needs you today.',
      ...needs.map((f, i) => `${i + 1}. ${speakable(f.title)}. ${speakable(f.body)}`),
      handledCount ? `Everything else is handled — ${handledCount} item${handledCount === 1 ? '' : 's'}.` : '',
    ].filter(Boolean).join(' ');

    const u = new SpeechSynthesisUtterance(script);
    u.rate = 1.02;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <section className="ag-brief">
      <div className="ag-brief-head-row">
        <div>
          <div className="ag-lbl">Morning brief · {date}</div>
          <p className="ag-brief-head">{headline}</p>
        </div>
        {canSpeak && (
          <button
            className={`ag-speak ${speaking ? 'on' : ''}`}
            onClick={toggleSpeak}
            aria-label={speaking ? 'Stop reading the brief' : 'Read the brief aloud'}
          >
            {speaking ? '■ Stop' : '▶ Listen'}
          </button>
        )}
      </div>

      {needs.length === 0 ? (
        <p className="ag-nothing">Nothing needs you today.</p>
      ) : (
        <ol className="ag-tldr">
          {needs.map((f, i) => {
            const isOpen = open === i;
            const fig = headlineFigure(f);
            return (
              <li key={f.id} className={`ag-tldr-item sev-${f.severity} ${isOpen ? 'open' : ''}`}>
                <button
                  className="ag-tldr-btn"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="ag-tldr-n">{i + 1}</span>
                  <span className="ag-tldr-title">{f.title}</span>
                  {fig && <span className="ag-tldr-fig">{fig}</span>}
                  <span className="ag-tldr-who">{f.agent_key}</span>
                  <span className="ag-tldr-chev" aria-hidden>{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="ag-tldr-body">
                    <p>{f.body}</p>
                    {f.link && <a href={f.link}>Open →</a>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="ag-handled">{handledCount} other item{handledCount === 1 ? '' : 's'} handled</div>
    </section>
  );
}
