import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { frameReco, lensReco } from '../lib/scoring.js';

const CSR_SKILLS = [
  { id: 'rapport', label: 'Built rapport quickly' },
  { id: 'discovery', label: 'Discovered their needs' },
  { id: 'presentation', label: 'Presented frames effectively' },
  { id: 'lensUpsell', label: 'Discussed lens options' },
  { id: 'close', label: 'Asked for the sale' },
];

let sessions = [];
let selectedId = null;
let selectedOutcome = null;

export async function initCSR() {
  await refreshCSRView();
}

export async function refreshCSRView() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    sessions = await api.get(`/sessions?date=${today}`);
  } catch {
    sessions = [];
  }
  renderPatientList();
}

function renderPatientList() {
  const list = document.getElementById('csrPatientList');
  if (!list) return;
  const todaySessions = sessions;
  if (!todaySessions.length) {
    list.innerHTML = `<div class="empty-state"><div class="es-icon">🕐</div>No patients yet today.</div>`;
    return;
  }
  list.innerHTML = todaySessions.map(s => {
    const pr = s.score?.purchaseReadiness || 0;
    const prCls = pr >= 70 ? 'pr-high' : pr >= 45 ? 'pr-mid' : 'pr-low';
    const prLbl = pr >= 70 ? '🔥 High' : pr >= 45 ? '⚡ Medium' : '❄️ Low';
    const t = new Date(s.timestamp);
    const tStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayName = s.contact?.name || (s.isNewPatient ? '🆕 New Patient' : '👤 Patient');
    const outcome = s.csrAssessment?.outcome;
    const ob = outcome === 'purchased' ? '✅ Sold' : outcome === 'no-sale' ? '❌ No Sale' : outcome === 'followup' ? '🔄 Follow-up' : '';
    return `<div class="patient-row${selectedId === s.id ? ' selected' : ''}" data-id="${s.id}">
      <div class="patient-row-info">
        <span class="patient-row-name">${displayName}</span>
        <span class="patient-row-meta">${tStr} · ${s.score?.frameStyle || ''} · ${s.score?.budgetTier || ''}</span>
      </div>
      <div style="display:flex;align-items:center;gap:5px">
        ${ob ? `<span style="font-size:10px;font-weight:600">${ob}</span>` : ''}
        <span class="pr-score ${prCls}">${prLbl}</span>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.patient-row').forEach(row => {
    row.addEventListener('click', () => selectPatient(row.dataset.id));
  });
}

function selectPatient(id) {
  selectedId = id;
  selectedOutcome = null;
  const s = sessions.find(x => x.id === id);
  if (!s) return;

  renderPatientList();

  const section = document.getElementById('contactEditSection');
  if (section) section.style.display = 'block';

  const nameEl = document.getElementById('csrEditName');
  const phoneEl = document.getElementById('csrEditPhone');
  const emailEl = document.getElementById('csrEditEmail');
  if (nameEl) nameEl.value = s.contact?.name || '';
  if (phoneEl) phoneEl.value = s.contact?.phone || '';
  if (emailEl) emailEl.value = s.contact?.email || '';

  // Show recommendation section
  const recoSection = document.getElementById('csrRecoSection');
  if (recoSection) {
    const reco = frameReco(s.score?.frameStyle, s.score?.faceShape, s.score?.colorPref);
    const lens = lensReco(s.score?.lensFlags || [], s.score?.budgetTier);
    recoSection.style.display = 'block';
    recoSection.querySelector('#csrRecoText').innerHTML =
      `<strong>Frames:</strong> ${reco}<br><strong>Lenses:</strong> ${lens.join(', ')}`;
  }

  const assessSection = document.getElementById('csrAssessSection');
  if (assessSection) assessSection.style.display = 'block';

  // Pre-fill existing assessment
  if (s.csrAssessment) {
    const { outcome, purchaseAmount, invoiceNumber, purchaseType, noSaleReason, followupNote, notes, csrName, skills } = s.csrAssessment;
    setOutcome(outcome);
    setVal('purchaseAmount', purchaseAmount);
    setVal('invoiceNumber', invoiceNumber);
    setVal('purchaseType', purchaseType);
    setVal('noSaleReason', noSaleReason);
    setVal('followupNote', followupNote);
    setVal('csrNotes', notes);
    setVal('csrName', csrName);
    if (skills) {
      CSR_SKILLS.forEach(sk => { if (skills[sk.id]) rateStar(sk.id, skills[sk.id]); });
    }
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function setOutcome(outcome) {
  selectedOutcome = outcome;
  document.querySelectorAll('.outcome-btn').forEach(b => b.className = 'outcome-btn');
  const map = { purchased: 'selected-green', 'no-sale': 'selected-red', followup: 'selected-yellow' };
  const btn = document.querySelector(`[data-val="${outcome}"]`);
  if (btn && map[outcome]) btn.classList.add(map[outcome]);
  const pf = document.getElementById('purchaseFields');
  const nf = document.getElementById('noSaleFields');
  const ff = document.getElementById('followupFields');
  if (pf) pf.style.display = outcome === 'purchased' ? 'block' : 'none';
  if (nf) nf.style.display = outcome === 'no-sale' ? 'block' : 'none';
  if (ff) ff.style.display = outcome === 'followup' ? 'block' : 'none';
}

function rateStar(skillId, rating) {
  document.querySelectorAll(`#stars-${skillId} .star`).forEach((s, i) => {
    s.className = 'star' + (i < rating ? ' active' : '');
    s.dataset.rating = i + 1;
  });
}

function getSkillRatings() {
  const ratings = {};
  CSR_SKILLS.forEach(sk => {
    const active = document.querySelectorAll(`#stars-${sk.id} .star.active`);
    ratings[sk.id] = active.length || 0;
  });
  return ratings;
}

export function bindCSREvents() {
  // Outcome buttons
  document.querySelectorAll('.outcome-btn').forEach(btn => {
    btn.addEventListener('click', () => setOutcome(btn.dataset.val));
  });

  // Star ratings
  CSR_SKILLS.forEach(sk => {
    const container = document.getElementById(`stars-${sk.id}`);
    if (!container) return;
    container.addEventListener('click', e => {
      const star = e.target.closest('.star');
      if (!star) return;
      rateStar(sk.id, parseInt(star.dataset.rating));
    });
  });

  // Contact save
  const saveContactBtn = document.getElementById('saveContactBtn');
  if (saveContactBtn) {
    saveContactBtn.addEventListener('click', saveContactEdit);
  }

  // Submit assessment
  const submitBtn = document.getElementById('submitAssessBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitAssessment);
  }

  // Refresh button
  const refreshBtn = document.getElementById('csrRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshCSRView);
  }

  // Sign-out button
  const signOutBtn = document.getElementById('csrSignOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => api.logout());
  }
}

async function saveContactEdit() {
  if (!selectedId) return;
  const contact = {
    name: document.getElementById('csrEditName')?.value.trim() || '',
    phone: document.getElementById('csrEditPhone')?.value.trim() || '',
    email: document.getElementById('csrEditEmail')?.value.trim() || '',
  };
  try {
    await api.patch(`/sessions/${selectedId}/contact`, contact);
    showToast('Contact updated');
    await refreshCSRView();
  } catch {
    showToast('Failed to save contact', 'error');
  }
}

async function submitAssessment() {
  if (!selectedId || !selectedOutcome) {
    showToast('Please select an outcome first', 'warning');
    return;
  }
  const body = {
    outcome: selectedOutcome,
    purchaseAmount: parseFloat(document.getElementById('purchaseAmount')?.value) || 0,
    invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
    purchaseType: document.getElementById('purchaseType')?.value || '',
    noSaleReason: document.getElementById('noSaleReason')?.value || '',
    followupNote: document.getElementById('followupNote')?.value || '',
    notes: document.getElementById('csrNotes')?.value || '',
    csrName: document.getElementById('csrName')?.value || '',
    skills: getSkillRatings(),
  };
  try {
    await api.patch(`/sessions/${selectedId}/assessment`, body);
    showToast('Assessment saved ✓');
    const toast = document.getElementById('csrSuccessToast');
    if (toast) { toast.style.display = 'block'; setTimeout(() => toast.style.display = 'none', 2500); }
    await refreshCSRView();
  } catch {
    showToast('Failed to save assessment', 'error');
  }
}

export function renderCSRHTML() {
  return `
<div id="csr-view" class="view">
  <div class="csr-header">
    <div>
      <img id="csrLogoImg" src="" alt="PriceSmart Optical" style="height:28px;display:block;margin-bottom:8px;opacity:0.95">
      <h1>📋 Post-Visit Assessment</h1><p>Log the interaction after your patient leaves</p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <span class="badge-red">CSR</span>
      <button id="csrRefreshBtn" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:white;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">⟳ Refresh</button>
      <button id="csrSignOutBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.8);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">Sign Out</button>
    </div>
  </div>

  <div class="section-card">
    <h3><span class="icon">👤</span> Select Today's Patient</h3>
    <div class="patient-selector" id="csrPatientList"></div>
  </div>

  <div class="section-card" id="contactEditSection" style="display:none">
    <h3><span class="icon">📝</span> Patient Contact Info <span style="font-size:11px;font-weight:400;color:var(--gray-400)">(editable by CSR)</span></h3>
    <div class="contact-edit-row">
      <div class="form-field"><label class="form-label-sm">First Name</label><input type="text" class="form-input-sm" id="csrEditName" placeholder="Name"></div>
      <div class="form-field"><label class="form-label-sm">Phone</label><input type="tel" class="form-input-sm" id="csrEditPhone" placeholder="Phone"></div>
    </div>
    <div class="contact-edit-row full">
      <div class="form-field"><label class="form-label-sm">Email (optional)</label><input type="email" class="form-input-sm" id="csrEditEmail" placeholder="Email address"></div>
    </div>
    <button id="saveContactBtn" style="background:var(--brand-primary);color:white;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;">Update Contact Info</button>
  </div>

  <div class="section-card" id="csrRecoSection" style="display:none">
    <h3><span class="icon">👓</span> Recommendations</h3>
    <div id="csrRecoText" style="font-size:12px;color:var(--gray-600);line-height:1.6;background:var(--gray-50);border-left:3px solid var(--brand-primary);border-radius:0 8px 8px 0;padding:8px 12px;"></div>
  </div>

  <div class="section-card" id="csrAssessSection" style="display:none">
    <h3><span class="icon">✅</span> Outcome</h3>
    <div class="outcome-btns">
      <button class="outcome-btn" data-val="purchased"><span class="ob-icon">💳</span><span class="ob-text">Purchased</span></button>
      <button class="outcome-btn" data-val="no-sale"><span class="ob-icon">❌</span><span class="ob-text">No Sale</span></button>
      <button class="outcome-btn" data-val="followup"><span class="ob-icon">🔄</span><span class="ob-text">Follow-up</span></button>
    </div>
    <div id="purchaseFields" style="display:none">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Amount ($)</label><input type="number" class="form-input" id="purchaseAmount" placeholder="e.g. 350"></div>
        <div class="form-group"><label class="form-label">Invoice #</label><input type="text" class="form-input" id="invoiceNumber" placeholder="INV-0001"></div>
      </div>
      <div class="form-group"><label class="form-label">Purchase Type</label>
        <select class="form-select" id="purchaseType">
          <option value="">Select...</option>
          <option>Frames only</option>
          <option>Frames + standard lenses</option>
          <option>Frames + blue light lenses</option>
          <option>Frames + lenses + upgrades (blue light, AR, etc.)</option>
          <option>Lenses only (patient has frames)</option>
          <option>Sunglasses (non-prescription)</option>
          <option>Prescription sunglasses</option>
        </select>
      </div>
    </div>
    <div id="noSaleFields" style="display:none">
      <div class="form-group"><label class="form-label">Reason</label>
        <select class="form-select" id="noSaleReason">
          <option value="">Select reason...</option>
          <option>Price / budget concern</option>
          <option>Needs prescription first</option>
          <option>Wants to think about it</option>
          <option>Didn't find a style they liked</option>
          <option>Just browsing</option>
          <option>Other</option>
        </select>
      </div>
    </div>
    <div id="followupFields" style="display:none">
      <div class="form-group"><label class="form-label">Follow-up Note</label><textarea class="form-textarea" id="followupNote" placeholder="What's the next step?"></textarea></div>
    </div>

    <h3 style="margin-top:14px"><span class="icon">⭐</span> CSR Self-Assessment</h3>
    ${CSR_SKILLS.map(sk => `
      <div class="skill-row">
        <span class="skill-label">${sk.label}</span>
        <div class="skill-stars" id="stars-${sk.id}">
          ${[1,2,3,4,5].map(n => `<div class="star" data-rating="${n}">${n}</div>`).join('')}
        </div>
      </div>`).join('')}

    <div class="form-group" style="margin-top:8px"><label class="form-label">CSR Name</label><input type="text" class="form-input" id="csrName" placeholder="Your name"></div>
    <div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="csrNotes" placeholder="Any observations or context..."></textarea></div>
    <button class="submit-btn" id="submitAssessBtn">Submit Assessment</button>
    <div class="success-toast" id="csrSuccessToast">✅ Assessment saved!</div>
  </div>
</div>`;
}
