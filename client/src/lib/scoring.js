// Client-side display functions only — scoring happens on the server
export function frameReco(style, faceShape, colorPref) {
  const shapeAdvice = {
    'Round': 'Angular rectangular or square frames add definition.',
    'Oval': 'Most frame shapes work well — lucky you!',
    'Square': 'Round or oval frames soften strong features.',
    'Heart/Diamond': 'Bottom-heavy or oval frames balance wider forehead.',
  };
  const colorAdvice = {
    'Classic blacks & darks': 'Black, gunmetal, or dark tortoise frames.',
    'Warm browns & tortoise': 'Amber, honey, warm tortoiseshell, or copper tones.',
    'Metallics': 'Silver, gold, rose gold, or titanium frames.',
    'Bold & bright': 'Statement colors, patterns, or two-tone acetate.',
  };
  const styleReco = {
    'Classic & Polished': 'Classic metal or acetate in timeless shapes.',
    'Modern & Bold': 'Contemporary geometric acetate, designer brands.',
    'Relaxed & Practical': 'Lightweight titanium, memory flex, or rimless.',
    'Creative & Unique': 'Boutique or designer frames in distinctive shapes.',
  };
  return `${styleReco[style] || 'Quality frames'} ${shapeAdvice[faceShape] || ''} Color direction: ${colorAdvice[colorPref] || 'neutral tones'}.`;
}

export function lensReco(flags, budget) {
  const items = [];
  if (flags.includes('blue-light')) items.push('Blue-light filter');
  if (flags.includes('transitions')) items.push('Transitions/photochromic');
  if (flags.includes('progressive check')) items.push('Progressives (if 40+)');
  if (flags.includes('premium coatings')) items.push('Anti-reflective + scratch coating');
  if (flags.includes('backup pair opp.')) items.push('Backup pair (contact wearer)');
  if (['premium', 'luxury'].includes(budget)) items.push('Premium lens brand upgrade');
  return items.length ? items : ['Standard single vision lenses'];
}
