import React from 'react';

const TEAM_COUNTS = { 5:{good:3,evil:2}, 6:{good:4,evil:2}, 7:{good:4,evil:3}, 8:{good:5,evil:3}, 9:{good:6,evil:3}, 10:{good:6,evil:4} };
const GOOD_SPECIALS = new Set(['Merlin', 'Percival']);
const EVIL_SPECIALS = new Set(['Assassin', 'Morgana', 'Mordred', 'Oberon']);

export function computeRoleComposition(playerCount, selectedRoles) {
  const counts = TEAM_COUNTS[playerCount];
  if (!counts) return null;
  const { good: goodCount, evil: evilCount } = counts;
  const selected = selectedRoles || [];
  const wantedGood = selected.filter(r => GOOD_SPECIALS.has(r));
  let goodPool = wantedGood.includes('Merlin') ? [...wantedGood] : ['Merlin', ...wantedGood];
  while (goodPool.length < goodCount) goodPool.push('Loyal Servant');
  goodPool = goodPool.slice(0, goodCount);
  const wantedEvil = selected.filter(r => EVIL_SPECIALS.has(r));
  let evilPool = [...wantedEvil];
  if (!evilPool.includes('Assassin')) evilPool.unshift('Assassin');
  while (evilPool.length < evilCount) evilPool.push('Minion');
  evilPool = evilPool.slice(0, evilCount);
  return { goodPool, evilPool };
}

export default function RoleCompositionSummary({ playerCount, selectedRoles }) {
  const comp = computeRoleComposition(playerCount, selectedRoles);
  if (!comp) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {comp.goodPool.map((r, i) => <span key={i} className="badge badge-good">{r}</span>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {comp.evilPool.map((r, i) => <span key={i} className="badge badge-evil">{r}</span>)}
      </div>
    </div>
  );
}
