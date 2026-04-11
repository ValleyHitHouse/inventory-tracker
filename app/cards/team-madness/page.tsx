'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import PublicNav from '@/app/components/PublicNav';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PLAYER_POWER_MIN = 115;
const PLAYER_POWER_MAX = 160;
const COACH_POWER_MIN = 160;
const COACH_POWER_MAX = 250;
const MAX_PER_POWER_LEVEL = 6;
const DECK_SIZE = 60;
const CARDS_PER_PARALLEL = 10;
const MAX_PARALLELS = 6;

const ALL_PARALLELS = [
  'Base Battlefoil','Colored Battlefoil','Inspired Ink','Gum',
  "80's Rad","Grandma's Linoleum",'Great Grandma Linoleum',
  'Mixtapes','Miami Ice','Firetracks','Blizzard','Coliseum',
  'Logo','Icons','Slime','Grilling','Chilling','Power Glove','Sidekicks',
];

type ApexCard = {
  id: string;
  card_number: string;
  hero_name: string;
  set_name: string;
  pose: string;
  power: number;
  weapon_type: string;
  parallel: string;
  is_apex: boolean;
};

type DeckCard = ApexCard & { slot_parallel: string };
type ApexSlot = { parallel: string; card: ApexCard | null };

type PlayerDeck = {
  name: string;
  cards: DeckCard[];
  apexSlots: ApexSlot[];
  selectedParallels: string[];
};

type TeamState = {
  teamName: string;
  players: [PlayerDeck, PlayerDeck, PlayerDeck];
  coach: PlayerDeck;
};

const emptyPlayer = (name: string): PlayerDeck => ({
  name, cards: [], apexSlots: [], selectedParallels: [],
});

const emptyTeam = (): TeamState => ({
  teamName: '',
  players: [emptyPlayer('Player 1'), emptyPlayer('Player 2'), emptyPlayer('Player 3')],
  coach: emptyPlayer('Coach'),
});

function countByPower(cards: DeckCard[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const c of cards) counts[c.power] = (counts[c.power] || 0) + 1;
  return counts;
}

function isDuplicateCard(existing: DeckCard[], card: ApexCard): boolean {
  return existing.some(c =>
    c.hero_name.toLowerCase() === card.hero_name.toLowerCase() &&
    c.power === card.power &&
    c.set_name.toLowerCase() === card.set_name.toLowerCase() &&
    (c.pose || '').toLowerCase() === (card.pose || '').toLowerCase() &&
    c.weapon_type.toLowerCase() === card.weapon_type.toLowerCase()
  );
}

function getParallelCount(cards: DeckCard[], parallel: string): number {
  return cards.filter(c => c.slot_parallel === parallel).length;
}

function validatePlayerDeck(deck: PlayerDeck, isCoach: boolean): string[] {
  const errors: string[] = [];
  const powerMin = isCoach ? COACH_POWER_MIN : PLAYER_POWER_MIN;
  const powerMax = isCoach ? COACH_POWER_MAX : PLAYER_POWER_MAX;
  const outOfRange = deck.cards.filter(c => c.power < powerMin || c.power > powerMax);
  if (outOfRange.length > 0) errors.push(`${outOfRange.length} card(s) outside power range (${powerMin}–${powerMax})`);
  const powerCounts = countByPower(deck.cards);
  for (const [power, count] of Object.entries(powerCounts)) {
    if (count > MAX_PER_POWER_LEVEL) errors.push(`Power ${power} has ${count} cards (max ${MAX_PER_POWER_LEVEL})`);
  }
  return errors;
}

function teamToCSV(team: TeamState): string {
  const lines = ['section,member_name,card_number,hero_name,set_name,pose,power,weapon_type,parallel,slot_parallel,is_apex,apex_parallel'];
  const addDeck = (section: string, deck: PlayerDeck) => {
    for (const c of deck.cards) {
      lines.push([section, deck.name, c.card_number, c.hero_name, c.set_name, c.pose || '', c.power, c.weapon_type, c.parallel, c.slot_parallel, 'false', ''].join(','));
    }
    for (const slot of deck.apexSlots) {
      if (slot.card) {
        lines.push([section + '_apex', deck.name, slot.card.card_number, slot.card.hero_name, slot.card.set_name, slot.card.pose || '', slot.card.power, slot.card.weapon_type, slot.card.parallel, slot.parallel, 'true', slot.parallel].join(','));
      }
    }
  };
  addDeck('player1', team.players[0]);
  addDeck('player2', team.players[1]);
  addDeck('player3', team.players[2]);
  addDeck('coach', team.coach);
  lines.push(`meta,team_name,${team.teamName},,,,,,,,, `);
  lines.push(`meta,player1_parallels,${team.players[0].selectedParallels.join('|')},,,,,,,,, `);
  lines.push(`meta,player2_parallels,${team.players[1].selectedParallels.join('|')},,,,,,,,, `);
  lines.push(`meta,player3_parallels,${team.players[2].selectedParallels.join('|')},,,,,,,,, `);
  return lines.join('\n');
}

function csvToTeam(csv: string, allCards: ApexCard[]): TeamState {
  const lines = csv.trim().split('\n');
  const team = emptyTeam();
  const cardMap = new Map(allCards.map(c => [c.card_number + '|' + c.set_name, c]));
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 10) continue;
    const section = cols[0], memberName = cols[1], cardNumber = cols[2];
    const power = parseInt(cols[6]);
    const weaponType = cols[7], parallel = cols[8], slotParallel = cols[9];
    const isApexRow = cols[10] === 'true';
    const apexParallel = cols[11];
    if (section === 'meta') {
      if (memberName === 'team_name') team.teamName = cardNumber;
      if (memberName === 'player1_parallels') team.players[0].selectedParallels = cardNumber ? cardNumber.split('|').filter(Boolean) : [];
      if (memberName === 'player2_parallels') team.players[1].selectedParallels = cardNumber ? cardNumber.split('|').filter(Boolean) : [];
      if (memberName === 'player3_parallels') team.players[2].selectedParallels = cardNumber ? cardNumber.split('|').filter(Boolean) : [];
      continue;
    }
    const foundCard = cardMap.get(cardNumber + '|' + cols[4]) || {
      id: `csv-${i}`, card_number: cardNumber, hero_name: cols[3], set_name: cols[4],
      pose: cols[5], power, weapon_type: weaponType, parallel, is_apex: false,
    };
    const deckCard: DeckCard = { ...foundCard, slot_parallel: slotParallel };
    const apexSlot: ApexSlot = { parallel: apexParallel || slotParallel, card: foundCard };
    let targetDeck: PlayerDeck | null = null;
    if (section === 'player1' || section === 'player1_apex') { team.players[0].name = memberName; targetDeck = team.players[0]; }
    else if (section === 'player2' || section === 'player2_apex') { team.players[1].name = memberName; targetDeck = team.players[1]; }
    else if (section === 'player3' || section === 'player3_apex') { team.players[2].name = memberName; targetDeck = team.players[2]; }
    else if (section === 'coach' || section === 'coach_apex') { team.coach.name = memberName; targetDeck = team.coach; }
    if (targetDeck) {
      if (isApexRow) targetDeck.apexSlots.push(apexSlot);
      else targetDeck.cards.push(deckCard);
    }
  }
  return team;
}

function ParallelProgress({ parallel, count, isUnlocked }: { parallel: string; count: number; isUnlocked: boolean }) {
  const pct = Math.min((count / CARDS_PER_PARALLEL) * 100, 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4, color: '#ccc' }}>
        <span>{parallel}</span>
        <span style={isUnlocked ? { color: '#22c55e', fontWeight: 700 } : {}}>{count}/{CARDS_PER_PARALLEL} {isUnlocked ? '🔓 APEX' : ''}</span>
      </div>
      <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: isUnlocked ? '#22c55e' : '#f97316', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function CardSearchModal({ allCards, existingCards, onAdd, onClose, powerMin, powerMax, slotParallel, isApex, label }: {
  allCards: ApexCard[]; existingCards: DeckCard[]; onAdd: (card: ApexCard, slotParallel: string) => void;
  onClose: () => void; powerMin: number; powerMax: number;
  slotParallel?: string; isApex?: boolean; label?: string;
}) {
  const [search, setSearch] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterWeapon, setFilterWeapon] = useState('');
  const [filterParallel, setFilterParallel] = useState(slotParallel || '');

  const filtered = allCards.filter(c => {
    if (isApex) { if (c.power < 165) return false; }
    else { if (c.power < powerMin || c.power > powerMax) return false; }
    if (filterSet && c.set_name !== filterSet) return false;
    if (filterWeapon && c.weapon_type.toLowerCase() !== filterWeapon.toLowerCase()) return false;
    if (filterParallel && !c.parallel.toLowerCase().includes(filterParallel.toLowerCase()) && c.parallel !== 'Superfoil') return false;
    if (search) {
      const s = search.toLowerCase();
      if (!c.hero_name.toLowerCase().includes(s) && !c.card_number.toLowerCase().includes(s)) return false;
    }
    return true;
  }).slice(0, 100);

  const sets = [...new Set(allCards.map(c => c.set_name))];
  const weapons = [...new Set(allCards.map(c => c.weapon_type))].filter(w => !['Alt', 'Metallic', 'Unknown'].includes(w));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #333', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#f97316' }}>{label || 'Add Card'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', flexWrap: 'wrap', borderBottom: '1px solid #222' }}>
          <input autoFocus placeholder="Search hero or card #..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '7px 10px', borderRadius: 6, fontSize: '0.85rem', flex: 1, minWidth: 140 }} />
          <select value={filterSet} onChange={e => setFilterSet(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '7px 10px', borderRadius: 6, fontSize: '0.85rem' }}>
            <option value="">All Sets</option>
            {sets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterWeapon} onChange={e => setFilterWeapon(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '7px 10px', borderRadius: 6, fontSize: '0.85rem' }}>
            <option value="">All Weapons</option>
            {weapons.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          {!slotParallel && (
            <select value={filterParallel} onChange={e => setFilterParallel(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '7px 10px', borderRadius: 6, fontSize: '0.85rem' }}>
              <option value="">All Parallels</option>
              {ALL_PARALLELS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 20 }}>No cards found</p>}
          {filtered.map(card => {
            const isDup = isDuplicateCard(existingCards, card);
            return (
              <div key={card.id} onClick={() => !isDup && onAdd(card, slotParallel || card.parallel)}
                style={{ padding: '10px 12px', borderRadius: 6, cursor: isDup ? 'not-allowed' : 'pointer', marginBottom: 4, background: '#1a1a1a', border: '1px solid transparent', opacity: isDup ? 0.4 : 1 }}
                onMouseEnter={e => { if (!isDup) (e.currentTarget as HTMLElement).style.borderColor = '#f97316'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{card.hero_name}</span>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>{card.card_number}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>{card.set_name} · {card.pose}</span>
                  <span style={{ fontSize: '0.75rem', color: '#f97316' }}>⚡{card.power}</span>
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>{card.weapon_type}</span>
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>{card.parallel}</span>
                </div>
                {isDup && <span style={{ fontSize: '0.72rem', color: '#f87171' }}>Already in deck</span>}
              </div>
            );
          })}
        </div>
        <p style={{ padding: '8px 16px', fontSize: '0.75rem', color: '#555', borderTop: '1px solid #1a1a1a', textAlign: 'right', margin: 0 }}>
          Showing {filtered.length} results
        </p>
      </div>
    </div>
  );
}

function DeckBuilder({ deck, isCoach, allCards, allApexCards, onUpdate }: {
  deck: PlayerDeck; isCoach: boolean; allCards: ApexCard[]; allApexCards: ApexCard[];
  onUpdate: (updated: PlayerDeck) => void;
}) {
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [showApexSearch, setShowApexSearch] = useState<string | null>(null);
  const powerMin = isCoach ? COACH_POWER_MIN : PLAYER_POWER_MIN;
  const powerMax = isCoach ? COACH_POWER_MAX : PLAYER_POWER_MAX;
  const errors = validatePlayerDeck(deck, isCoach);
  const powerCounts = countByPower(deck.cards);
  const totalCards = deck.cards.length;

  const addCard = (card: ApexCard, slotParallel: string) => {
    const currentPowerCount = powerCounts[card.power] || 0;
    if (currentPowerCount >= MAX_PER_POWER_LEVEL) return;
    if (!isCoach && slotParallel !== 'Superfoil') {
      if (getParallelCount(deck.cards, slotParallel) >= CARDS_PER_PARALLEL) return;
    }
    const newCard: DeckCard = { ...card, slot_parallel: slotParallel };
    const updatedCards = [...deck.cards, newCard];
    let updatedApex = [...deck.apexSlots];
    if (!isCoach && slotParallel !== 'Superfoil') {
      const newCount = getParallelCount(updatedCards, slotParallel);
      if (newCount === CARDS_PER_PARALLEL && !updatedApex.find(a => a.parallel === slotParallel)) {
        updatedApex.push({ parallel: slotParallel, card: null });
      }
    }
    onUpdate({ ...deck, cards: updatedCards, apexSlots: updatedApex });
    setShowCardSearch(false);
  };

  const removeCard = (idx: number) => {
    const removed = deck.cards[idx];
    const updatedCards = deck.cards.filter((_, i) => i !== idx);
    let updatedApex = deck.apexSlots;
    if (!isCoach && getParallelCount(updatedCards, removed.slot_parallel) < CARDS_PER_PARALLEL) {
      updatedApex = deck.apexSlots.filter(a => a.parallel !== removed.slot_parallel);
    }
    onUpdate({ ...deck, cards: updatedCards, apexSlots: updatedApex });
  };

  const addApexCard = (card: ApexCard, apexParallel: string) => {
    onUpdate({ ...deck, apexSlots: deck.apexSlots.map(s => s.parallel === apexParallel ? { ...s, card } : s) });
    setShowApexSearch(null);
  };

  const toggleParallel = (parallel: string) => {
    if (deck.selectedParallels.includes(parallel)) {
      onUpdate({
        ...deck,
        selectedParallels: deck.selectedParallels.filter(p => p !== parallel),
        cards: deck.cards.filter(c => c.slot_parallel !== parallel),
        apexSlots: deck.apexSlots.filter(a => a.parallel !== parallel),
      });
    } else {
      if (deck.selectedParallels.length >= MAX_PARALLELS) return;
      onUpdate({ ...deck, selectedParallels: [...deck.selectedParallels, parallel] });
    }
  };

  const cardsByParallel: Record<string, DeckCard[]> = {};
  for (const c of deck.cards) {
    if (!cardsByParallel[c.slot_parallel]) cardsByParallel[c.slot_parallel] = [];
    cardsByParallel[c.slot_parallel].push(c);
  }

  const s: Record<string, React.CSSProperties> = {
    section: { marginBottom: 16 },
    label: { fontSize: '0.78rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' } as React.CSSProperties,
    chip: { padding: '5px 12px', borderRadius: 20, border: '1px solid #333', background: '#1a1a1a', color: '#aaa', cursor: 'pointer', fontSize: '0.82rem' },
    chipSelected: { padding: '5px 12px', borderRadius: 20, border: '1px solid #f97316', background: '#f97316', color: '#000', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
    chipDisabled: { padding: '5px 12px', borderRadius: 20, border: '1px solid #222', background: '#111', color: '#444', cursor: 'not-allowed', fontSize: '0.82rem' },
    cardItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: '#1a1a1a', border: '1px solid #222', marginBottom: 4 },
  };

  return (
    <div style={{ background: '#111', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <input value={deck.name} onChange={e => onUpdate({ ...deck, name: e.target.value })}
          placeholder={isCoach ? 'Coach Name' : 'Player Name'}
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '8px 12px', borderRadius: 8, fontSize: '1rem', flex: 1 }} />
        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: totalCards === DECK_SIZE ? '#22c55e' : totalCards > DECK_SIZE ? '#f87171' : '#888' }}>
          {totalCards}/{DECK_SIZE}
        </span>
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ color: '#fbbf24', fontSize: '0.82rem', background: '#2d2408', padding: '4px 8px', borderRadius: 4, marginBottom: 4 }}>⚠ {e}</div>
      ))}

      {!isCoach && (
        <div style={s.section}>
          <p style={s.label as React.CSSProperties}>Select Parallels ({deck.selectedParallels.length}/{MAX_PARALLELS})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_PARALLELS.map(p => {
              const selected = deck.selectedParallels.includes(p);
              const disabled = !selected && deck.selectedParallels.length >= MAX_PARALLELS;
              return (
                <button key={p} onClick={() => toggleParallel(p)}
                  style={disabled ? s.chipDisabled : selected ? s.chipSelected : s.chip}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={s.section}>
        <p style={s.label as React.CSSProperties}>Power Levels (max {MAX_PER_POWER_LEVEL} per level · range {isCoach ? `${COACH_POWER_MIN}–${COACH_POWER_MAX}` : `${PLAYER_POWER_MIN}–${PLAYER_POWER_MAX}`})</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(powerCounts).sort((a, b) => Number(b[0]) - Number(a[0])).map(([power, count]) => (
            <div key={power} style={{ padding: '3px 10px', borderRadius: 6, background: '#1a1a1a', border: `1px solid ${count >= MAX_PER_POWER_LEVEL ? '#f87171' : '#333'}`, fontSize: '0.8rem', color: count >= MAX_PER_POWER_LEVEL ? '#f87171' : '#aaa' }}>
              {power}: {count}/{MAX_PER_POWER_LEVEL}
            </div>
          ))}
        </div>
      </div>

      {!isCoach && deck.selectedParallels.length > 0 && (
        <div style={s.section}>
          <p style={s.label as React.CSSProperties}>Parallel Progress</p>
          {deck.selectedParallels.map(p => (
            <ParallelProgress key={p} parallel={p} count={getParallelCount(deck.cards, p)} isUnlocked={getParallelCount(deck.cards, p) >= CARDS_PER_PARALLEL} />
          ))}
        </div>
      )}

      <button onClick={() => setShowCardSearch(true)}
        style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px dashed #444', color: '#f97316', borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>
        + Add Card
      </button>

      <div>
        {!isCoach && deck.selectedParallels.map(parallel => (
          <div key={parallel} style={{ marginBottom: 8, background: '#151515', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#1e1e1e', fontSize: '0.8rem', fontWeight: 700, color: '#f97316' }}>
              <span>{parallel}</span>
              <span>{getParallelCount(deck.cards, parallel)}/{CARDS_PER_PARALLEL}</span>
            </div>
            {(cardsByParallel[parallel] || []).map((card, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{card.hero_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>#{card.card_number} · {card.set_name} · ⚡{card.power} · {card.weapon_type}</div>
                </div>
                <button onClick={() => removeCard(deck.cards.indexOf(card))}
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}>✕</button>
              </div>
            ))}
          </div>
        ))}

        {!isCoach && (cardsByParallel['Superfoil'] || []).map((card, idx) => (
          <div key={`sf-${idx}`} style={{ ...s.cardItem, borderColor: '#fbbf24', background: '#1e1a00' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>⭐ {card.hero_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>#{card.card_number} · {card.set_name} · ⚡{card.power} · Superfoil</div>
            </div>
            <button onClick={() => removeCard(deck.cards.indexOf(card))}
              style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        ))}

        {isCoach && deck.cards.map((card, idx) => (
          <div key={idx} style={s.cardItem}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{card.hero_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>#{card.card_number} · {card.set_name} · ⚡{card.power} · {card.weapon_type} · {card.parallel}</div>
            </div>
            <button onClick={() => removeCard(idx)}
              style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        ))}
      </div>

      {deck.apexSlots.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>🔓 Apex Unlocks</p>
          {deck.apexSlots.map(slot => (
            <div key={slot.parallel} style={{ background: '#1a1500', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: 6 }}>{slot.parallel} Apex</span>
              {slot.card ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>⚡ {slot.card.hero_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>#{slot.card.card_number} · ⚡{slot.card.power} · {slot.card.parallel}</div>
                  </div>
                  <button onClick={() => onUpdate({ ...deck, apexSlots: deck.apexSlots.map(s => s.parallel === slot.parallel ? { ...s, card: null } : s) })}
                    style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowApexSearch(slot.parallel)}
                  style={{ padding: '6px 14px', background: 'transparent', border: '1px dashed #fbbf24', color: '#fbbf24', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                  + Add Apex Card
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showCardSearch && (
        <CardSearchModal allCards={allCards} existingCards={deck.cards} onAdd={addCard} onClose={() => setShowCardSearch(false)}
          powerMin={powerMin} powerMax={powerMax} label={`Add Card — ${deck.name}`} />
      )}
      {showApexSearch && (
        <CardSearchModal allCards={allApexCards} existingCards={deck.cards} onAdd={(card) => addApexCard(card, showApexSearch)}
          onClose={() => setShowApexSearch(null)} powerMin={165} powerMax={999}
          slotParallel={showApexSearch} isApex label={`Add ${showApexSearch} Apex Card`} />
      )}
    </div>
  );
}

export default function TeamMadnessPage() {
  const [allCards, setAllCards] = useState<ApexCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamState>(emptyTeam());
  const [activeTab, setActiveTab] = useState<'p0' | 'p1' | 'p2' | 'coach'>('p0');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchCards() {
      let allData: ApexCard[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('apex_cards')
          .select('*')
          .order('hero_name', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setAllCards(allData);
      setLoading(false);
    }
    fetchCards();
  }, []);

  const apexCards = allCards.filter(c => c.power >= 165);

  const updatePlayer = (idx: number, updated: PlayerDeck) => {
    const newPlayers = [...team.players] as [PlayerDeck, PlayerDeck, PlayerDeck];
    newPlayers[idx] = updated;
    setTeam({ ...team, players: newPlayers });
  };

  const exportCSV = () => {
    const blob = new Blob([teamToCSV(team)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${team.teamName || 'team'}-madness.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setTeam(csvToTeam(ev.target?.result as string, allCards)); setImportError(''); }
      catch { setImportError('Failed to import CSV.'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const allApexUsed = [...team.players[0].apexSlots, ...team.players[1].apexSlots, ...team.players[2].apexSlots, ...team.coach.apexSlots].filter(s => s.card);
  const apexConflicts: string[] = [];
  const seen = new Map<string, boolean>();
  for (const slot of allApexUsed) {
    if (!slot.card) continue;
    const key = `${slot.card.hero_name}|${slot.card.power}|${slot.card.set_name}|${slot.card.pose}|${slot.card.weapon_type}`;
    if (seen.has(key)) apexConflicts.push(`Duplicate apex: ${slot.card.hero_name} ⚡${slot.card.power} used in multiple decks`);
    else seen.set(key, true);
  }

  const tabIdx = activeTab === 'p0' ? 0 : activeTab === 'p1' ? 1 : activeTab === 'p2' ? 2 : -1;
  const activeDeck = activeTab === 'coach' ? team.coach : team.players[tabIdx as 0 | 1 | 2];

  const tabs = [
    { key: 'p0' as const, label: team.players[0].name || 'Player 1', icon: '🎴' },
    { key: 'p1' as const, label: team.players[1].name || 'Player 2', icon: '🎴' },
    { key: 'p2' as const, label: team.players[2].name || 'Player 3', icon: '🎴' },
    { key: 'coach' as const, label: team.coach.name || 'Coach', icon: '🎯' },
  ];

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f1f1f1', fontFamily: 'Inter, sans-serif', padding: '80px 16px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', margin: '0 0 4px' }}>⚡ Team Madness Builder</h1>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Build your 4-member Apex Madness team — 3 players + 1 coach</p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <input value={team.teamName} onChange={e => setTeam({ ...team, teamName: e.target.value })}
              placeholder="Team Name" style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f1f1f1', padding: '8px 14px', borderRadius: 8, fontSize: '1rem', flex: 1, minWidth: 200 }} />
            <button onClick={exportCSV} style={{ padding: '8px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', border: 'none', background: '#f97316', color: '#000' }}>⬇ Export CSV</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', background: '#1e3a1e', color: '#4ade80', border: '1px solid #4ade80' }}>⬆ Import CSV</button>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
          </div>
          {importError && <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: 8 }}>{importError}</p>}

          {apexConflicts.length > 0 && (
            <div style={{ background: '#3b1010', border: '1px solid #f87171', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              {apexConflicts.map((c, i) => <div key={i} style={{ color: '#f87171', fontSize: '0.85rem' }}>⚠ {c}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ flex: 1, padding: 10, border: 'none', background: activeTab === t.key ? '#f97316' : 'transparent', color: activeTab === t.key ? '#000' : '#888', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading card database...</div>
          ) : (
            <DeckBuilder
              deck={activeDeck}
              isCoach={activeTab === 'coach'}
              allCards={allCards.filter(c => activeTab === 'coach' ? c.power >= COACH_POWER_MIN && c.power <= COACH_POWER_MAX : c.power >= PLAYER_POWER_MIN && c.power <= PLAYER_POWER_MAX)}
              allApexCards={apexCards}
              onUpdate={updated => activeTab === 'coach' ? setTeam({ ...team, coach: updated }) : updatePlayer(tabIdx, updated)}
            />
          )}
        </div>
      </div>
    </>
  );
}