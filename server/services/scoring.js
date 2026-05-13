'use strict';

function scoreAnswers(ans) {
  const pr = (({a:25,b:18,c:8,d:15}[ans.q4]||0)) + (({a:5,b:15,c:25,d:35}[ans.q6]||0)) + (({a:8,b:18,c:28,d:40}[ans.q8]||0));
  const purchaseReadiness = Math.min(100, Math.round(pr));
  const urgency = {a:'low',b:'low',c:'medium',d:'high'}[ans.q6]||'medium';
  const budgetTier = {a:'value',b:'mid',c:'premium',d:'luxury'}[ans.q8]||'mid';
  const styleMap = {a:'Classic & Polished',b:'Modern & Bold',c:'Relaxed & Practical',d:'Creative & Unique'};
  const frameStyle = styleMap[ans.q2]||'Classic & Polished';
  const faceShapeMap = {a:'Round',b:'Oval',c:'Square',d:'Heart/Diamond'};
  const faceShape = faceShapeMap[ans.q9]||'Oval';
  const colorMap = {a:'Classic blacks & darks',b:'Warm browns & tortoise',c:'Metallics',d:'Bold & bright'};
  const colorPref = colorMap[ans.q10]||'Classic blacks & darks';
  const usageMap = {a:'Office/screens',b:'Outdoors & active',c:'Everywhere',d:'Formal/professional'};
  const usageEnv = usageMap[ans.q12]||'Everywhere';
  const lensFlags = [];
  if(['c','d'].includes(ans.q3)) lensFlags.push('blue-light');
  if(ans.q1==='c') lensFlags.push('backup pair opp.');
  if(['c','d'].includes(ans.q6)) lensFlags.push('progressive check');
  if(ans.q1==='a') lensFlags.push('premium coatings');
  if(ans.q3==='d') lensFlags.push('transitions');
  return {purchaseReadiness,urgency,budgetTier,frameStyle,faceShape,colorPref,usageEnv,lensFlags};
}

function frameReco(style, faceShape, colorPref) {
  const shapeAdvice = {
    'Round':'Angular rectangular or square frames add definition.',
    'Oval':'Most frame shapes work well — lucky you!',
    'Square':'Round or oval frames soften strong features.',
    'Heart/Diamond':'Bottom-heavy or oval frames balance wider forehead.'
  };
  const colorAdvice = {
    'Classic blacks & darks':'Black, gunmetal, or dark tortoise frames.',
    'Warm browns & tortoise':'Amber, honey, warm tortoiseshell, or copper tones.',
    'Metallics':'Silver, gold, rose gold, or titanium frames.',
    'Bold & bright':'Statement colors, patterns, or two-tone acetate.'
  };
  const styleReco = {
    'Classic & Polished':'Classic metal or acetate in timeless shapes.',
    'Modern & Bold':'Contemporary geometric acetate, designer brands.',
    'Relaxed & Practical':'Lightweight titanium, memory flex, or rimless.',
    'Creative & Unique':'Boutique or designer frames in distinctive shapes.'
  };
  return `${styleReco[style]||'Quality frames'} ${shapeAdvice[faceShape]||''} Color direction: ${colorAdvice[colorPref]||'neutral tones'}.`;
}

function lensReco(flags, budget) {
  const items = [];
  if(flags.includes('blue-light')) items.push('Blue-light filter');
  if(flags.includes('transitions')) items.push('Transitions/photochromic');
  if(flags.includes('progressive check')) items.push('Progressives (if 40+)');
  if(flags.includes('premium coatings')) items.push('Anti-reflective + scratch coating');
  if(flags.includes('backup pair opp.')) items.push('Backup pair (contact wearer)');
  if(['premium','luxury'].includes(budget)) items.push('Premium lens brand upgrade');
  return items.length ? items : ['Standard single vision lenses'];
}

module.exports = { scoreAnswers, frameReco, lensReco };
