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
            return (
              <li key={f.id} className={`ag-tldr-item sev-${f.severity} ${isOpen ? 'open' : ''}`}>
                <button
                  className="ag-tldr-btn"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="ag-tldr-n">{i + 1}</span>
                  <span className="ag-tldr-title">{f.title}</span>
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
