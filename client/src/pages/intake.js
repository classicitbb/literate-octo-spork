import { api } from '../api.js';
import { showToast } from '../components/toast.js';

const QUESTIONS = [
  { id:'q1',emoji:'👓',q:"How do you typically wear your glasses?",sub:"Choose the option that fits best",
    opts:[{e:'☀️',t:"Every day, all day — they're part of me",v:'a'},{e:'💻',t:"Mostly for reading or screens",v:'b'},{e:'🔄',t:"I switch between glasses and contacts",v:'c'},{e:'🚗',t:"Mainly for driving or specific tasks",v:'d'}]},
  { id:'q2',emoji:'✨',q:"What word best describes your personal style?",sub:"Go with your gut — no wrong answer",
    opts:[{e:'🎩',t:"Classic & Polished",v:'a'},{e:'🔷',t:"Modern & Bold",v:'b'},{e:'🌿',t:"Relaxed & Practical",v:'c'},{e:'🎨',t:"Creative & Unique",v:'d'}]},
  { id:'q3',emoji:'🖥️',q:"On a typical weekday, how many hours are you on screens?",sub:"Phone, computer, TV — all count!",
    opts:[{e:'😎',t:"Less than 2 hours",v:'a'},{e:'📱',t:"About 2–4 hours",v:'b'},{e:'💻',t:"About 4–8 hours",v:'c'},{e:'🔥',t:"More than 8 hours",v:'d'}]},
  { id:'q4',emoji:'🛍️',q:"When buying something you use every day, you tend to:",sub:"Think about how you usually decide",
    opts:[{e:'💎',t:"Invest in quality — you get what you pay for",v:'a'},{e:'⚖️',t:"Find the sweet spot between quality and value",v:'b'},{e:'🔍',t:"Look for the best deal possible",v:'c'},{e:'🤝',t:"Ask someone I trust for a recommendation",v:'d'}]},
  { id:'q5',emoji:'🚗',q:"If your glasses were a vehicle, they'd be:",sub:"First instinct is usually the best!",
    opts:[{e:'🚙',t:"A reliable SUV — practical, does it all",v:'a'},{e:'🏎️',t:"A sports car — turns heads effortlessly",v:'b'},{e:'🚘',t:"A classic car — timeless & full of character",v:'c'},{e:'🚜',t:"A rugged 4×4 — built to handle anything",v:'d'}]},
  { id:'q6',emoji:'⏰',q:"How long ago did you get your current glasses?",sub:"Be honest — no judgment here!",
    opts:[{e:'✨',t:"Less than a year ago",v:'a'},{e:'📅',t:"About 1–2 years ago",v:'b'},{e:'⏳',t:"About 2–3 years ago",v:'c'},{e:'😬',t:"More than 3 years ago!",v:'d'}]},
  { id:'q7',emoji:'🌟',q:"In your perfect glasses, you'd feel:",sub:"What matters most to you",
    opts:[{e:'💼',t:"Confident and put-together",v:'a'},{e:'😌',t:"Comfortable and at ease",v:'b'},{e:'🏃',t:"Active and ready for anything",v:'c'},{e:'🌟',t:"Expressive and noticed",v:'d'}]},
  { id:'q8',emoji:'💳',q:"If you treated yourself to something today, you'd spend:",sub:"For something you'd wear every single day",
    opts:[{e:'💚',t:"Up to $100",v:'a'},{e:'💛',t:"$100 – $250",v:'b'},{e:'🧡',t:"$250 – $500",v:'c'},{e:'❤️',t:"Whatever it takes to get it right",v:'d'}]},
  { id:'q9',emoji:'🔵',q:"Which best describes the shape of your face?",sub:"This helps us suggest the most flattering frames",
    opts:[{e:'⭕',t:"Round — soft, full features",v:'a'},{e:'🥚',t:"Oval — balanced & proportional",v:'b'},{e:'◼️',t:"Square — strong, defined jawline",v:'c'},{e:'🔺',t:"Heart / Diamond — wider at top",v:'d'}]},
  { id:'q10',emoji:'🎨',q:"Which colors do you tend to gravitate toward?",sub:"Think about your wardrobe & accessories",
    opts:[{e:'🖤',t:"Classic blacks & dark tones",v:'a'},{e:'🍂',t:"Warm browns & tortoiseshell",v:'b'},{e:'✨',t:"Metallics — silver, gold, rose gold",v:'c'},{e:'🌈',t:"Bold & bright — I like to stand out!",v:'d'}]},
  { id:'q11',emoji:'🪞',q:"How do you feel about your current frame style?",sub:"Honest answer = better recommendations!",
    opts:[{e:'💕',t:"Love it — want something very similar",v:'a'},{e:'🔄',t:"Ready for something completely different",v:'b'},{e:'✨',t:"Similar, but with a few upgrades",v:'c'},{e:'🤷',t:"Open to whatever looks best on me",v:'d'}]},
  { id:'q12',emoji:'📍',q:"Where do you wear your glasses most?",sub:"Choose your primary environment",
    opts:[{e:'💼',t:"Office / indoors — lots of screen time",v:'a'},{e:'🌿',t:"Outdoors & active lifestyle",v:'b'},{e:'🔄',t:"Everywhere — need them for everything",v:'c'},{e:'🎭',t:"Mainly formal / professional settings",v:'d'}]},
];

let currentCard = -1;
let isNewPatient = false;
let currentAnswers = {};
let patientContact = { name: '', phone: '', email: '' };
let _storeName = 'Patient Smart App';
let _welcomeMsg = "While you wait, let us get to know your style a little — so we can make the most of your visit today.";
let _publicCode = null; // set when launched from a QR/link without staff auth

export function setPublicMode(code) { _publicCode = code; }

export function initIntake(tenant) {
  if (tenant) {
    _storeName = tenant.name || _storeName;
    _welcomeMsg = tenant.welcomeMsg || _welcomeMsg;
  }
  resetIntake();
}

function renderProgressDots(idx) {
  const total = QUESTIONS.length;
  const el = document.getElementById('progressDots');
  const label = document.getElementById('progressLabel');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'pdot' + (i < idx ? ' done' : i === idx ? ' active' : '');
    el.appendChild(d);
  }
  if (label) label.textContent = idx >= 0 && idx < total ? `Question ${idx + 1} of ${total}` : '';
}

function showCard(idx) {
  const stage = document.getElementById('cardStage');
  if (!stage) return;
  const existing = stage.querySelector('.intake-card');
  if (existing) {
    existing.style.animation = 'cardOut 0.28s ease forwards';
    setTimeout(() => renderCardContent(idx), 280);
  } else {
    renderCardContent(idx);
  }
}

function renderCardContent(idx) {
  currentCard = idx;
  const stage = document.getElementById('cardStage');
  if (!stage) return;
  renderProgressDots(idx);

  if (idx === -1) {
    stage.innerHTML = `
      <div class="intake-card welcome-card">
        <span class="welcome-icon">👋</span>
        <div class="welcome-title">Welcome to ${_storeName}!</div>
        <p class="welcome-sub">${_welcomeMsg}</p>
        <div class="new-patient-toggle" id="newPatientToggle">
          <div class="toggle-box" id="newPatientBox"></div>
          <span>This is my first visit here</span>
        </div>
        <button class="start-btn" id="startBtn">Let's Get Started →</button>
      </div>`;
    document.getElementById('newPatientToggle').addEventListener('click', () => {
      isNewPatient = !isNewPatient;
      document.getElementById('newPatientBox').className = 'toggle-box' + (isNewPatient ? ' checked' : '');
    });
    document.getElementById('startBtn').addEventListener('click', startIntake);
    document.getElementById('progressLabel').textContent = '';
  } else if (idx === 0) {
    stage.innerHTML = `
      <div class="intake-card contact-card">
        <span class="card-emoji">📋</span>
        <h2>Quick intro!</h2>
        <p>A CSR can help you fill this in if you prefer.</p>
        <div class="field-row">
          <div class="form-field">
            <label class="form-label-sm">First Name *</label>
            <input type="text" class="form-input-sm" id="ptName" value="${patientContact.name}" placeholder="Your name">
          </div>
          <div class="form-field">
            <label class="form-label-sm">Phone *</label>
            <input type="tel" class="form-input-sm" id="ptPhone" value="${patientContact.phone}" placeholder="Phone number">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label-sm">Email <span style="font-weight:400;text-transform:none">(optional)</span></label>
          <input type="email" class="form-input-sm" id="ptEmail" value="${patientContact.email}" placeholder="Email address">
        </div>
        <p class="opt-note">💬 Fields are optional — tap Next to skip</p>
        <div class="next-row">
          <button class="back-btn" id="backBtn">← Back</button>
          <span class="q-counter">Contact Info</span>
          <button class="next-btn ready" id="nextBtn">Next →</button>
        </div>
      </div>`;
    document.getElementById('backBtn').addEventListener('click', () => showCard(-1));
    document.getElementById('nextBtn').addEventListener('click', saveContactAndNext);
  } else {
    const q = QUESTIONS[idx - 1];
    const selected = currentAnswers[q.id];
    stage.innerHTML = `
      <div class="intake-card">
        <span class="card-emoji">${q.emoji}</span>
        <div class="card-question">${q.q}</div>
        <div class="card-subtitle">${q.sub}</div>
        <div class="options-grid" id="optGrid">
          ${q.opts.map(o => `
            <button class="opt-btn${selected === o.v ? ' selected' : ''}" data-v="${o.v}">
              <span class="opt-emoji">${o.e}</span>
              <span class="opt-text">${o.t}</span>
            </button>`).join('')}
        </div>
        <div class="next-row">
          <button class="back-btn" id="backBtn">← Back</button>
          <span class="q-counter">${idx} / ${QUESTIONS.length}</span>
          <button class="next-btn${selected ? ' ready' : ''}" id="nextBtn">Next →</button>
        </div>
      </div>`;
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('nextBtn').addEventListener('click', nextCard);
    document.getElementById('optGrid').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      selectOption(q.id, btn.dataset.v, btn);
    });
  }
}

function startIntake() {
  currentAnswers = {};
  showCard(0);
}

function saveContactAndNext() {
  patientContact.name = document.getElementById('ptName')?.value.trim() || '';
  patientContact.phone = document.getElementById('ptPhone')?.value.trim() || '';
  patientContact.email = document.getElementById('ptEmail')?.value.trim() || '';
  showCard(1);
}

function selectOption(qId, val, btn) {
  currentAnswers[qId] = val;
  btn.closest('.options-grid').querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const nb = document.getElementById('nextBtn');
  if (nb) nb.classList.add('ready');
  setTimeout(() => nextCard(), 380);
}

function nextCard() {
  if (currentCard > 0) {
    const q = QUESTIONS[currentCard - 1];
    if (q && !currentAnswers[q.id]) return;
  }
  if (currentCard >= QUESTIONS.length) {
    showThankYou();
  } else {
    showCard(currentCard + 1);
  }
}

function goBack() {
  if (currentCard <= 0) { showCard(-1); return; }
  showCard(currentCard - 1);
}

async function showThankYou() {
  let score = {};
  try {
    const endpoint = _publicCode ? '/public/intake' : '/sessions';
    const payload = _publicCode
      ? { accountCode: _publicCode, isNewPatient, contact: { ...patientContact }, answers: { ...currentAnswers } }
      : { isNewPatient, contact: { ...patientContact }, answers: { ...currentAnswers } };
    const result = await api.post(endpoint, payload);
    score = result.score || {};
  } catch (e) {
    if (e.status === 429) {
      showToast('Record limit reached — please speak to a staff member.', 'warning', 6000);
    } else {
      showToast('Could not save your form — please see staff.', 'error', 5000);
    }
  }

  const stage = document.getElementById('cardStage');
  const firstName = patientContact.name ? patientContact.name.split(' ')[0] : '';
  stage.innerHTML = `
    <div class="intake-card thankyou-card">
      <span class="ty-icon">🎉</span>
      <div class="ty-title">Thank you${firstName ? ' ' + firstName : ''}!</div>
      <p class="ty-sub">Your optician will be right with you. We're looking forward to helping you find your perfect pair today.</p>
      <div class="ty-chips">
        ${score.frameStyle ? `<div class="ty-chip">🎨 ${score.frameStyle}</div>` : ''}
        ${score.colorPref ? `<div class="ty-chip">✨ ${score.colorPref}</div>` : ''}
        ${(score.lensFlags || []).slice(0, 2).map(f => `<div class="ty-chip">${f}</div>`).join('')}
        ${isNewPatient ? '<div class="ty-chip red">New Patient</div>' : ''}
      </div>
      <p style="font-size:12px;color:var(--gray-400);">Please hand the tablet back to the front desk — they'll call you shortly!</p>
      <button class="reset-btn" id="resetBtn">Start a New Form</button>
    </div>`;
  document.getElementById('progressDots').innerHTML = '';
  document.getElementById('progressLabel').textContent = '';
  document.getElementById('resetBtn').addEventListener('click', resetIntake);
}

export function resetIntake() {
  currentCard = -1;
  isNewPatient = false;
  currentAnswers = {};
  patientContact = { name: '', phone: '', email: '' };
  showCard(-1);
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}
