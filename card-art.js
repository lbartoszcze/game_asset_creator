const RACE_COLORS = {
  humans:    { bg1: '#3a4a6a', bg2: '#1a2238', stroke: '#d6a93f' },
  dwarves:   { bg1: '#4a3a2a', bg2: '#2a1f15', stroke: '#c4844a' },
  elves:     { bg1: '#1f4a3a', bg2: '#0a261a', stroke: '#a8e8b8' },
  skeletons: { bg1: '#2a1a3a', bg2: '#150a1f', stroke: '#b88dff' },
};

const TIER_GLOW = { common: '#bdbdbd', combo: '#6cd6ff', rare: '#b88dff' };

const G = {};
G.sword = '<line x1="50" y1="14" x2="50" y2="62" stroke="#dde0e6" stroke-width="6"/><line x1="50" y1="14" x2="50" y2="62" stroke="#fff" stroke-width="1.5"/><rect x="34" y="60" width="32" height="5" fill="#3a2a1a"/><rect x="46" y="65" width="8" height="22" fill="#5c3b22"/><circle cx="50" cy="89" r="4" fill="#aaa"/>';
G.darksword = '<line x1="50" y1="14" x2="50" y2="62" stroke="#5a4a72" stroke-width="6"/><line x1="50" y1="14" x2="50" y2="62" stroke="#a884d8" stroke-width="1.5"/><rect x="34" y="60" width="32" height="5" fill="#1a1020"/><rect x="46" y="65" width="8" height="22" fill="#2a1a40"/><circle cx="50" cy="89" r="4" fill="#7a4ab5"/>';
G.shield = '<path d="M50 14 Q26 22 26 42 Q26 70 50 88 Q74 70 74 42 Q74 22 50 14 Z" fill="#aac0e0" stroke="#5a7090" stroke-width="2"/><path d="M50 26 L50 78 M30 42 L70 42" stroke="#5a7090" stroke-width="2"/><circle cx="50" cy="42" r="6" fill="#f3c259"/>';
G.bow = '<path d="M30 18 Q14 50 30 82" stroke="#6b4423" stroke-width="6" fill="none"/><line x1="30" y1="18" x2="30" y2="82" stroke="#fff" stroke-width="1"/><line x1="30" y1="50" x2="80" y2="50" stroke="#cccccc" stroke-width="2"/><path d="M75 45 L85 50 L75 55 Z" fill="#aaaaaa"/>';
G.axe = '<path d="M30 30 L60 22 Q72 30 72 50 Q72 70 60 78 L30 70 Z" fill="#b8c0c8" stroke="#5a6068" stroke-width="2"/><rect x="44" y="50" width="6" height="38" fill="#5c3b22"/><line x1="40" y1="44" x2="64" y2="44" stroke="#7a8088" stroke-width="1"/>';
G.hammer = '<rect x="28" y="20" width="44" height="34" rx="3" fill="#a8a8a8" stroke="#444" stroke-width="2"/><rect x="42" y="54" width="16" height="34" fill="#5c3b22"/><line x1="36" y1="28" x2="64" y2="28" stroke="#666" stroke-width="2"/><circle cx="50" cy="37" r="4" fill="#666"/>';
G.spear = '<line x1="50" y1="22" x2="50" y2="84" stroke="#5c3b22" stroke-width="4"/><path d="M50 14 L42 32 L50 28 L58 32 Z" fill="#dde0e6" stroke="#888" stroke-width="1"/><path d="M44 80 L50 90 L56 80 Z" fill="#3a2a1a"/>';
G.bonespear = '<line x1="50" y1="22" x2="50" y2="84" stroke="#9a8d72" stroke-width="4"/><path d="M50 12 L40 32 L50 26 L60 32 Z" fill="#eee5d0" stroke="#9a8d72" stroke-width="1"/><circle cx="50" cy="84" r="4" fill="#eee5d0"/>';
G.helmet = '<path d="M30 60 Q30 22 50 22 Q70 22 70 60 L70 70 L30 70 Z" fill="#888a90" stroke="#3a3a40" stroke-width="2"/><rect x="44" y="36" width="12" height="22" fill="#1a1a20"/><path d="M50 22 L50 14" stroke="#aa3030" stroke-width="3"/><path d="M30 60 L70 60" stroke="#3a3a40" stroke-width="2"/>';
G.banner = '<line x1="32" y1="14" x2="32" y2="90" stroke="#5c3b22" stroke-width="3"/><circle cx="32" cy="14" r="3" fill="#f3c259"/><path d="M32 18 L80 22 L74 38 L80 54 L32 50 Z" fill="#d04040" stroke="#7a2020" stroke-width="2"/><circle cx="56" cy="36" r="6" fill="#f3c259"/>';
G.holy = '<circle cx="50" cy="50" r="14" fill="#fff5b8"/><circle cx="50" cy="50" r="22" fill="none" stroke="#ffd864" stroke-width="2" stroke-dasharray="4 3"/><line x1="50" y1="14" x2="50" y2="86" stroke="#ffd864" stroke-width="3"/><line x1="14" y1="50" x2="86" y2="50" stroke="#ffd864" stroke-width="3"/><line x1="22" y1="22" x2="78" y2="78" stroke="#ffd864" stroke-width="2"/><line x1="78" y1="22" x2="22" y2="78" stroke="#ffd864" stroke-width="2"/>';
G.flame = '<path d="M50 90 Q32 74 38 52 Q42 36 50 30 Q56 38 56 50 Q62 38 62 32 Q72 50 68 70 Q60 88 50 90 Z" fill="#ff5520"/><path d="M50 84 Q42 72 46 60 Q52 50 50 44 Q56 54 54 64 Q60 76 50 84 Z" fill="#ffcc44"/><path d="M48 76 Q46 68 50 60 Q54 68 50 76 Z" fill="#fff4a0"/>';
G.tower = '<rect x="40" y="36" width="20" height="50" fill="#7a8590" stroke="#3a4045" stroke-width="2"/><rect x="36" y="28" width="28" height="10" fill="#7a8590" stroke="#3a4045" stroke-width="2"/><rect x="38" y="30" width="3" height="6" fill="#3a4045"/><rect x="46" y="30" width="3" height="6" fill="#3a4045"/><rect x="54" y="30" width="3" height="6" fill="#3a4045"/><rect x="60" y="30" width="3" height="6" fill="#3a4045"/><rect x="46" y="58" width="8" height="14" fill="#1a1a1f"/><polygon points="40,28 60,28 50,16" fill="#aa3030"/>';
G.mountain = '<path d="M14 84 L36 50 L52 66 L66 38 L86 84 Z" fill="#707378" stroke="#3a3a3f" stroke-width="2"/><path d="M60 46 L66 38 L72 46 Z" fill="#fff"/><path d="M30 58 L36 50 L42 58 Z" fill="#fff"/><line x1="36" y1="50" x2="42" y2="60" stroke="#3a3a3f" stroke-width="1"/>';
G.mug = '<path d="M30 30 L70 30 L66 80 L34 80 Z" fill="#aa7a40" stroke="#5c3b22" stroke-width="2"/><path d="M70 40 L82 40 L82 64 L68 64" fill="none" stroke="#5c3b22" stroke-width="3"/><ellipse cx="50" cy="32" rx="20" ry="3" fill="#f8e7b8"/><path d="M34 24 Q42 18 50 22 Q58 18 66 24" fill="none" stroke="#fff" stroke-width="2"/>';
G.anvil = '<path d="M22 60 L78 60 L72 72 L28 72 Z" fill="#3a3a40" stroke="#1a1a20" stroke-width="2"/><rect x="36" y="42" width="28" height="20" fill="#222" stroke="#000" stroke-width="2"/><path d="M30 32 L70 32 L74 42 L26 42 Z" fill="#222" stroke="#000" stroke-width="2"/><rect x="38" y="72" width="24" height="14" fill="#5c3b22"/><circle cx="60" cy="34" r="2" fill="#666"/>';
G.minecart = '<rect x="22" y="44" width="56" height="30" fill="#5c3b22" stroke="#2a1a14" stroke-width="2"/><path d="M22 44 L78 44 L72 32 L28 32 Z" fill="#aa7a40" stroke="#5c3b22" stroke-width="2"/><circle cx="32" cy="78" r="6" fill="#222"/><circle cx="68" cy="78" r="6" fill="#222"/><line x1="14" y1="84" x2="86" y2="84" stroke="#888" stroke-width="2"/><circle cx="42" cy="38" r="3" fill="#666"/><circle cx="58" cy="38" r="3" fill="#666"/>';
G.leaf = '<path d="M50 88 Q22 60 30 28 Q70 22 70 52 Q70 78 50 88 Z" fill="#4caf50" stroke="#2a6a2a" stroke-width="2"/><line x1="50" y1="88" x2="44" y2="38" stroke="#2a6a2a" stroke-width="2"/><line x1="48" y1="64" x2="58" y2="58" stroke="#2a6a2a" stroke-width="1"/><line x1="46" y1="50" x2="60" y2="42" stroke="#2a6a2a" stroke-width="1"/>';
G.moon = '<circle cx="50" cy="50" r="28" fill="#f8eed0"/><circle cx="58" cy="46" r="26" fill="#1a2238"/><circle cx="36" cy="40" r="2.5" fill="#bba88c"/><circle cx="42" cy="58" r="2" fill="#bba88c"/><circle cx="32" cy="50" r="1.5" fill="#bba88c"/>';
G.drop = '<path d="M50 14 Q34 50 34 70 Q34 88 50 88 Q66 88 66 70 Q66 50 50 14 Z" fill="#4ad0e0" stroke="#2a8a98" stroke-width="2"/><path d="M44 60 Q44 76 52 80" stroke="#fff" stroke-width="2" fill="none"/><circle cx="44" cy="46" r="3" fill="#a8eaf2" opacity="0.7"/>';
G.tree = '<rect x="46" y="60" width="8" height="28" fill="#5c3b22"/><path d="M50 18 L30 50 L40 50 L24 75 L76 75 L60 50 L70 50 Z" fill="#1f5a2c" stroke="#0f3a1c" stroke-width="2"/>';
G.bone = '<rect x="42" y="22" width="16" height="56" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/><ellipse cx="40" cy="22" rx="9" ry="7" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/><ellipse cx="60" cy="22" rx="9" ry="7" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/><ellipse cx="40" cy="78" rx="9" ry="7" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/><ellipse cx="60" cy="78" rx="9" ry="7" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/>';
G.skull = '<path d="M30 38 Q30 18 50 18 Q70 18 70 38 L70 60 L62 60 L62 76 L56 76 L52 70 L48 70 L44 76 L38 76 L38 60 L30 60 Z" fill="#eee5d0" stroke="#9a8d72" stroke-width="2"/><ellipse cx="40" cy="42" rx="6" ry="7" fill="#101015"/><ellipse cx="60" cy="42" rx="6" ry="7" fill="#101015"/><path d="M46 56 L50 60 L54 56" fill="none" stroke="#101015" stroke-width="2"/>';
G.tomb = '<rect x="20" y="80" width="60" height="6" fill="#444" stroke="#222" stroke-width="1"/><path d="M28 80 L28 36 Q28 24 50 24 Q72 24 72 36 L72 80 Z" fill="#888" stroke="#444" stroke-width="2"/><path d="M44 50 L44 66 M56 50 L56 66 M44 58 L56 58" stroke="#444" stroke-width="2"/>';
G.crypt = '<path d="M14 86 L20 60 L14 40 L86 40 L80 60 L86 86 Z" fill="#5a5a60" stroke="#1a1a20" stroke-width="2"/><path d="M50 18 L20 40 L80 40 Z" fill="#444" stroke="#1a1a20" stroke-width="2"/><rect x="42" y="56" width="16" height="30" fill="#1a1a20"/><circle cx="50" cy="68" r="2" fill="#b88dff"/>';
G.darkwave = '<path d="M14 56 Q26 44 38 56 Q50 68 62 56 Q74 44 86 56 L86 80 L14 80 Z" fill="#2a1f3a" stroke="#7a4ab5" stroke-width="2"/><path d="M14 64 Q26 52 38 64 Q50 76 62 64 Q74 52 86 64" fill="none" stroke="#a884d8" stroke-width="2"/><circle cx="30" cy="40" r="2" fill="#b88dff"/><circle cx="70" cy="36" r="2" fill="#b88dff"/>';
G.scythe = '<line x1="30" y1="20" x2="70" y2="84" stroke="#3a2a1a" stroke-width="4"/><path d="M70 20 Q40 18 30 30 Q34 26 50 30 Q66 36 70 20 Z" fill="#dde0e6" stroke="#5a4a72" stroke-width="2"/>';

function pickGlyph(card) {
  const id = card.id || '', kind = card.kind || '';
  if (id === 'd_quake') return 'mountain';
  if (id === 'h_fire' || id.includes('flame')) return 'flame';
  if (id === 'd_forge') return 'anvil';
  if (id === 'd_mine') return 'minecart';
  if (id === 'h_tower' || id === 'e_wood') return 'tower';
  if (id === 'h_holy') return 'holy';
  if (id === 'h_banner') return 'banner';
  if (id === 'h_knight' || id === 'h_tact' || id === 'e_ranger') return 'helmet';
  if (id === 's_yard') return 'tomb';
  if (id === 's_crypt') return 'crypt';
  if (id === 's_wave') return 'darkwave';
  if (id === 's_drain' || id === 's_raise' || id === 's_plague') return 'skull';
  if (id === 's_cursed') return 'darksword';
  if (id === 's_spear') return 'bonespear';
  if (id === 's_tomb') return 'tomb';
  if (id === 'e_grove') return 'tree';
  if (id === 'e_moon') return 'moon';
  if (id === 'e_spring' || id === 'd_brew') return 'drop';
  if (id === 'e_pact' || id === 'e_cloak') return 'leaf';
  if (id === 'd_clan') return 'mug';
  if (id === 'd_mount') return 'mountain';
  if (id.includes('hammer')) return 'hammer';
  if (id.includes('axe')) return 'axe';
  if (id.includes('bow') || id.includes('volley')) return 'bow';
  if (id.includes('bone')) return 'bone';
  if (kind === 'armor') return 'shield';
  if (kind === 'weapon') return 'sword';
  if (kind === 'recruit') return 'helmet';
  if (kind === 'spell') return 'holy';
  if (kind === 'building') return 'tower';
  return 'sword';
}

export function cardArtSvg(card, race) {
  const c = RACE_COLORS[race] || RACE_COLORS.humans;
  const glow = TIER_GLOW[card.tier] || '#888';
  const glyph = G[pickGlyph(card)] || G.sword;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <rect width="100" height="100" rx="6" fill="${c.bg2}"/>
  <rect x="3" y="3" width="94" height="94" rx="4" fill="${c.bg1}"/>
  <circle cx="50" cy="50" r="32" fill="${glow}" opacity="0.18"/>
  <circle cx="50" cy="50" r="22" fill="${glow}" opacity="0.10"/>
  ${glyph}
  <rect x="1" y="1" width="98" height="98" rx="6" fill="none" stroke="${c.stroke}" stroke-width="1.5"/>
</svg>`;
}
