import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { frameReco, lensReco } from '../lib/scoring.js';
import { applyBranding } from '../components/branding.js';

let _showDeleted = false;
let _currentDate = new Date().toISOString().slice(0, 10);

export async function initAdmin() {
  await refreshAdminView();
}

export async function refreshAdminView() {
  const date = _currentDate;
  try {
    const [overview, csrPerf, focus, sessions] = await Promise.all([
      api.get(`/stats/overview?date=${date}`),
      api.get(`/stats/csr-performance?date=${date}`),
      api.get(`/stats/focus-areas?date=${date}`),
      api.get(`/sessions?date=${date}${_showDeleted ? '&includeDeleted=true' : ''}`),
    ]);
    renderOverview(overview);
    renderOpportunities(sessions);
    renderCoaching(overview, sessions);
    renderPatientProfiles(sessions);
    renderCSRPerformance(csrPerf);
    renderFocusAreas(focus);
    renderLensOpportunities(sessions);
  } catch (e) {
    console.error('Admin refresh failed', e);
  }
}

function renderOverview(o) {
  const el = id => document.getElementById(id);
  if (el('statPatients')) el('statPatients').textContent = o.patientsToday || 0;
  if (el('statConv')) el('statConv').textContent = (o.conversionRate || 0) + '%';
  if (el('statRev')) el('statRev').textContent = '$' + (o.revenueToday || 0).toFixed(0);
  if (el('statPR')) el('statPR').textContent = (o.avgReadiness || 0) + '%';
}

function renderOpportunities(sessions) {
  const el = document.getElementById('opportunitiesList');
  if (!el) return;
  const opps = sessions.filter(s => !s.deletedAt && !s.csrAssessment && (s.score?.purchaseReadiness || 0) >= 60)
    .sort((a, b) => (b.score?.purchaseReadiness || 0) - (a.score?.purchaseReadiness || 0));
  el.innerHTML = opps.length ? opps.map(s => {
    const nm = s.contact?.name || (s.isNewPatient ? 'New Patient' : 'Anonymous');
    const reco = frameReco(s.score?.frameStyle, s.score?.faceShape, s.score?.colorPref);
    const lens = lensReco(s.score?.lensFlags || [], s.score?.budgetTier);
    return `<div class="ppc-reco" style="margin-bottom:9px">
      <strong>🔥 ${nm} · PR ${s.score?.purchaseReadiness}% · ${s.score?.budgetTier} budget</strong>
      ${reco} Lens: ${lens.slice(0, 2).join(', ')}.
    </div>`;
  }).join('') : `<div class="empty-state"><div class="es-icon">✅</div>All high-readiness patients assessed!</div>`;
}

function renderCoaching(overview, sessions) {
  const el = document.getElementById('insightTips');
  if (!el) return;
  const assessed = sessions.filter(s => s.csrAssessment?.outcome);
  const sold = assessed.filter(s => s.csrAssessment?.outcome === 'purchased');
  const noSales = assessed.filter(s => s.csrAssessment?.outcome === 'no-sale');
  const tips = [];
  if (noSales.length > sold.length) tips.push({ icon: '💡', title: 'Objection Handling Needed', body: 'More no-sales than sales today. Focus on value-building before quoting price.' });
  if (sessions.filter(s => (s.score?.lensFlags || []).includes('blue-light')).length > 1) tips.push({ icon: '🖥️', title: 'Blue Light Opportunity', body: 'Multiple high-screen-time patients today. Lead with the blue light conversation — adds ~$60–80.' });
  if (sessions.filter(s => s.score?.urgency === 'high').length > 1) tips.push({ icon: '⏰', title: 'High Urgency Patients', body: 'Several patients are 2+ years overdue. Emphasize how much vision changes — creates natural urgency.' });
  if (!tips.length) tips.push({ icon: '🏆', title: 'Strong Start Today!', body: 'Keep focusing on lens upsells — they add $80–$150 to average ticket value.' });
  el.innerHTML = tips.map(t => `<div class="tip-card"><span class="tip-icon">${t.icon}</span><div class="tip-text"><strong>${t.title}</strong>${t.body}</div></div>`).join('');
}

function renderPatientProfiles(sessions) {
  const el = document.getElementById('patientProfiles');
  if (!el) return;
  if (!sessions.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">👥</div>No patients yet today.</div>`;
    return;
  }
  el.innerHTML = sessions.map(s => {
    const pr = s.score?.purchaseReadiness || 0;
    const prCls = pr >= 70 ? 'pr-high' : pr >= 45 ? 'pr-mid' : 'pr-low';
    const reco = frameReco(s.score?.frameStyle, s.score?.faceShape, s.score?.colorPref);
    const lens = lensReco(s.score?.lensFlags || [], s.score?.budgetTier);
    const outcome = s.csrAssessment?.outcome;
    const op = outcome === 'purchased'
      ? `<span class="outcome-pill op-sold">✅ Sold $${s.csrAssessment.purchaseAmount}${s.csrAssessment.invoiceNumber ? ' · ' + s.csrAssessment.invoiceNumber : ''}</span>`
      : outcome === 'no-sale' ? `<span class="outcome-pill op-nosale">❌ No Sale</span>`
      : outcome === 'followup' ? `<span class="outcome-pill op-pending">🔄 Follow-up</span>`
      : `<span class="outcome-pill op-pending">⏳ Pending</span>`;
    const nm = s.contact?.name || (s.isNewPatient ? 'New Patient' : 'Anonymous');
    const phone = s.contact?.phone ? ` · ${s.contact.phone}` : '';
    const isDeleted = !!s.deletedAt;
    return `<div class="patient-profile-card${isDeleted ? ' deleted' : ''}">
      <div class="ppc-top">
        <div>
          <div class="ppc-name">${nm}${s.isNewPatient ? ' 🆕' : ''}${isDeleted ? ' 🗑️' : ''}</div>
          <div style="font-size:11px;color:var(--gray-400)">${phone} · ${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <span class="pr-score ${prCls}">PR ${pr}%</span>
      </div>
      <div class="ppc-tags">
        <span class="tag">🎨 ${s.score?.frameStyle || ''}</span>
        <span class="tag">🔵 ${s.score?.faceShape || ''}</span>
        <span class="tag budget">💰 ${s.score?.budgetTier || ''}</span>
        ${s.score?.urgency === 'high' ? '<span class="tag urgent">⏰ Urgent</span>' : ''}
        ${(s.score?.lensFlags || []).map(f => `<span class="tag lens">👓 ${f}</span>`).join('')}
      </div>
      <div class="ppc-reco"><strong>Recommendation:</strong> ${reco}<br><strong>Lenses:</strong> ${lens.join(', ')}${s.csrAssessment?.notes ? `<br><strong>CSR:</strong> ${s.csrAssessment.notes}` : ''}</div>
      <div class="ppc-outcome">
        ${op}
        ${!isDeleted
          ? `<button style="background:none;border:1.5px solid var(--danger);color:var(--danger);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;" data-del="${s.id}">Delete</button>`
          : `<button style="background:none;border:1.5px solid var(--success);color:var(--success);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;" data-restore="${s.id}">Restore</button>`}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this record? It will be removed from patient lists but stats are preserved.')) return;
      await api.delete(`/sessions/${btn.dataset.del}`);
      showToast('Record deleted');
      refreshAdminView();
    });
  });
  el.querySelectorAll('[data-restore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.patch(`/sessions/${btn.dataset.restore}/restore`);
      showToast('Record restored');
      refreshAdminView();
    });
  });
}

function renderCSRPerformance(csrPerf) {
  const el = document.getElementById('csrScoreboard');
  if (!el) return;
  if (!csrPerf.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div>No CSR assessments yet today.</div>`;
    return;
  }
  el.innerHTML = csrPerf.map(c => {
    const cls = c.convRate >= 60 ? 'score-a' : c.convRate >= 35 ? 'score-b' : 'score-c';
    return `<div class="csr-perf-row">
      <div class="csr-avatar">${c.name.slice(0, 2).toUpperCase()}</div>
      <div>
        <div class="csr-name">${c.name}</div>
        <div class="csr-meta">${c.interactions} patient${c.interactions !== 1 ? 's' : ''} · ${c.sold} sold · $${c.revenue.toFixed(0)}</div>
      </div>
      <span class="csr-score-badge ${cls}">${c.convRate}%</span>
    </div>`;
  }).join('');
}

function renderFocusAreas(focus) {
  const el = document.getElementById('focusBars');
  if (!el || !focus.total) return;
  const bars = [
    { label: 'Blue Light Lens Upsell', pct: focus.blueLight, color: '#6366f1' },
    { label: 'Progressive Lens Check', pct: focus.progressive, color: '#8b5cf6' },
    { label: 'Premium/Luxury Budget', pct: focus.premiumBudget, color: '#10b981' },
    { label: 'High Urgency (2+ yrs)', pct: focus.highUrgency, color: '#f59e0b' },
    { label: 'Backup Pair Opportunity', pct: focus.backupPair, color: '#3b82f6' },
    { label: 'New Patient Conversions', pct: focus.newPatient, color: '#ef4444' },
  ];
  el.innerHTML = bars.map(b => `
    <div class="focus-bar-wrap">
      <div class="focus-bar-label"><span>${b.label}</span><span>${b.pct}%</span></div>
      <div class="focus-bar-track"><div class="focus-bar-fill" style="width:${b.pct}%;background:${b.color}"></div></div>
    </div>`).join('');
}

function renderLensOpportunities(sessions) {
  const el = document.getElementById('lensOpportunities');
  if (!el) return;
  const active = sessions.filter(s => !s.deletedAt);
  const blCount = active.filter(s => (s.score?.lensFlags || []).includes('blue-light')).length;
  const prCount = active.filter(s => (s.score?.lensFlags || []).includes('progressive check')).length;
  const trCount = active.filter(s => (s.score?.lensFlags || []).includes('transitions')).length;
  el.innerHTML = [
    { label: 'Blue Light Filter', count: blCount, est: '$60–80 add-on', icon: '🖥️' },
    { label: 'Progressive Lenses', count: prCount, est: '$120–200 add-on', icon: '👁️' },
    { label: 'Transitions', count: trCount, est: '$80–120 add-on', icon: '🌓' },
  ].filter(x => x.count > 0).map(x =>
    `<div class="tip-card" style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE)">
      <span class="tip-icon">${x.icon}</span>
      <div class="tip-text" style="color:#1e3a8a">
        <strong>${x.label}: ${x.count} patient${x.count !== 1 ? 's' : ''}</strong>
        Estimated add-on: ${x.est} each
      </div>
    </div>`).join('') || `<div class="empty-state"><div class="es-icon">👓</div>No lens opportunities flagged yet today.</div>`;
}

export async function saveAdminConfig() {
  const cfg = {
    name: document.getElementById('cfgStoreName')?.value || '',
    address: document.getElementById('cfgAddress')?.value || '',
    welcomeMsg: document.getElementById('cfgWelcomeMsg')?.value || '',
    primaryColor: document.getElementById('cfgPrimary')?.value || '#003087',
    accentColor: document.getElementById('cfgAccent')?.value || '#CC0000',
  };
  try {
    await api.patch('/config', cfg);
    applyBranding(cfg);
    showToast('Settings saved');
    const toast = document.getElementById('configSuccess');
    if (toast) { toast.style.display = 'block'; setTimeout(() => toast.style.display = 'none', 2000); }
  } catch {
    showToast('Failed to save settings', 'error');
  }
}

export function generateQR(url) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encoded}`;
  const img = document.getElementById('storeQrCode');
  const label = document.getElementById('qrLabel');
  const printBtn = document.getElementById('printQrBtn');
  if (img) { img.src = src; img.style.display = 'block'; }
  if (label) label.textContent = url;
  if (printBtn) printBtn.style.display = 'inline-block';
  const printQr = document.getElementById('printQrImg');
  if (printQr) printQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encoded}`;
}

export function adminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  const tab = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
  const panel = document.getElementById(`panel-${tabId}`);
  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

export function bindAdminEvents(appUrl) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.addEventListener('click', () => adminTab(t.dataset.tab));
  });

  const saveBtn = document.getElementById('saveConfigBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAdminConfig);

  const copyBtn = document.getElementById('copyUrlBtn');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(appUrl).then(() => showToast('URL copied!'));
  });

  const printQrBtn = document.getElementById('printQrBtn');
  if (printQrBtn) printQrBtn.addEventListener('click', showPrintPage);

  const closePrintBtn = document.getElementById('closePrintBtn');
  if (closePrintBtn) closePrintBtn.addEventListener('click', hidePrintPage);

  const showDeletedToggle = document.getElementById('showDeletedToggle');
  if (showDeletedToggle) {
    showDeletedToggle.addEventListener('change', e => {
      _showDeleted = e.target.checked;
      refreshAdminView();
    });
  }

  generateQR(appUrl);

  const signOutBtn = document.getElementById('adminSignOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => api.logout());
  }
}

export function showPrintPage() {
  document.getElementById('print-page')?.classList.add('visible');
  setTimeout(() => window.print(), 300);
}

export function hidePrintPage() {
  document.getElementById('print-page')?.classList.remove('visible');
}

export function renderAdminHTML(tenantConfig) {
  const url = window.location.origin;
  return `
<div id="admin-view" class="view">
  <div class="admin-header">
    <div>
      <img id="adminLogoImg" src="" alt="PriceSmart Optical" style="height:28px;display:block;margin-bottom:6px;opacity:0.9">
      <h1>📊 Admin Dashboard</h1>
      <p>${tenantConfig?.name || 'PriceSmart Optical'} — Today's Overview</p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <span class="badge-red">ADMIN</span>
      <button id="adminSignOutBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.8);border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">Sign Out</button>
    </div>
  </div>

  <div class="admin-nav">
    <button class="admin-tab active" data-tab="overview">📊 Overview</button>
    <button class="admin-tab" data-tab="opportunities">🔥 Opportunities</button>
    <button class="admin-tab" data-tab="coaching">💡 Coaching</button>
    <button class="admin-tab" data-tab="patients">👥 Patients</button>
    <button class="admin-tab" data-tab="csr-perf">🏆 CSR</button>
    <button class="admin-tab" data-tab="focus">🎯 Focus</button>
    <button class="admin-tab" data-tab="setup">⚙️ Setup</button>
  </div>

  <div class="admin-panel active" id="panel-overview">
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" id="statPatients">—</div><div class="stat-label">Patients Today</div></div>
      <div class="stat-card"><div class="stat-value" id="statConv">—</div><div class="stat-label">Conversion Rate</div></div>
      <div class="stat-card"><div class="stat-value" id="statRev">—</div><div class="stat-label">Revenue Today</div></div>
      <div class="stat-card"><div class="stat-value" id="statPR">—</div><div class="stat-label">Avg Readiness</div></div>
    </div>
  </div>

  <div class="admin-panel" id="panel-opportunities">
    <div class="section-card"><h3><span class="icon">🔥</span> Top Opportunities (PR ≥ 60%)</h3><div id="opportunitiesList"></div></div>
  </div>

  <div class="admin-panel" id="panel-coaching">
    <div class="section-card"><h3><span class="icon">💡</span> Coaching Insights</h3><div id="insightTips"></div></div>
  </div>

  <div class="admin-panel" id="panel-patients">
    <div class="section-card" style="margin-bottom:10px">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--gray-500);cursor:pointer">
        <input type="checkbox" id="showDeletedToggle"> Show deleted records
      </label>
    </div>
    <div id="patientProfiles"></div>
  </div>

  <div class="admin-panel" id="panel-csr-perf">
    <div class="section-card"><h3><span class="icon">🏆</span> CSR Scoreboard</h3><div id="csrScoreboard"></div></div>
  </div>

  <div class="admin-panel" id="panel-focus">
    <div class="section-card">
      <h3><span class="icon">🎯</span> Conversion Focus Areas</h3>
      <p style="font-size:11px;color:var(--gray-400);margin-bottom:14px;">Based on today's patient responses. Higher % = bigger opportunity or gap.</p>
      <div id="focusBars"></div>
    </div>
    <div class="section-card" style="margin-top:12px"><h3><span class="icon">👓</span> Lens Upsell Pipeline</h3><div id="lensOpportunities"></div></div>
  </div>

  <div class="admin-panel" id="panel-setup">
    <div class="section-card">
      <h3><span class="icon">🏪</span> Store Identity</h3>
      <div class="form-group"><label class="form-label">Store Name</label><input type="text" class="form-input" id="cfgStoreName" value="${tenantConfig?.name || ''}" placeholder="e.g. PriceSmart Optical — San Fernando"></div>
      <div class="form-group"><label class="form-label">Store Address</label><input type="text" class="form-input" id="cfgAddress" value="${tenantConfig?.address || ''}" placeholder="e.g. 12 Main Street, Port of Spain"></div>
      <div class="form-group"><label class="form-label">Welcome Message (shown on tablet)</label><textarea class="form-textarea" id="cfgWelcomeMsg" placeholder="While you wait...">${tenantConfig?.welcomeMsg || ''}</textarea></div>
      <div class="color-row">
        <div class="color-pick"><label>Brand Color</label><input type="color" id="cfgPrimary" value="${tenantConfig?.primaryColor || '#003087'}"></div>
        <div class="color-pick"><label>Accent Color</label><input type="color" id="cfgAccent" value="${tenantConfig?.accentColor || '#CC0000'}"></div>
      </div>
    </div>
    <div class="section-card">
      <h3><span class="icon">🔗</span> Your Store Link</h3>
      <div class="store-url-box">
        <span class="store-url-text">${url}</span>
        <button class="copy-btn" id="copyUrlBtn">Copy</button>
      </div>
      <div class="qr-section">
        <img id="storeQrCode" src="" alt="QR Code" style="max-width:160px;display:none">
        <div class="qr-label" id="qrLabel">Generating QR code...</div>
        <br><button class="print-qr-btn" id="printQrBtn" style="display:none">🖨️ Print QR Code</button>
      </div>
    </div>
    <button class="save-config-btn" id="saveConfigBtn">💾 Save Store Settings</button>
    <div class="success-toast" id="configSuccess" style="margin-top:8px">✅ Store settings saved!</div>
  </div>
</div>

<!-- Print page -->
<div id="print-page">
  <div class="print-logo-wrap"><img id="printLogoImg" src="" alt="PriceSmart Optical"></div>
  <div class="print-store" id="printStoreAddr">${tenantConfig?.name || 'PriceSmart Optical'}</div>
  <div class="print-qr"><img id="printQrImg" src="" alt="QR" style="width:220px;height:220px"></div>
  <div class="print-instructions">📱 Scan to complete your pre-visit form while you wait</div>
  <div class="print-url">${url}</div>
  <button class="close-print-btn" id="closePrintBtn">← Back</button>
</div>`;
}
