import './styles/base.css';
import './styles/patient.css';
import './styles/csr.css';
import './styles/admin.css';
import './styles/shared.css';
import './styles/marketing.css';

import { api, parseJwt, isTokenValid } from './api.js';
import { setAllLogos, applyBranding } from './components/branding.js';
import { initModeStrip, switchView } from './components/modeStrip.js';
import { initIntake, resetIntake, toggleFullscreen, setPublicMode } from './pages/intake.js';
import { renderCSRHTML, initCSR, bindCSREvents, refreshCSRView } from './pages/csr.js';
import { renderAdminHTML, initAdmin, bindAdminEvents } from './pages/admin.js';
import { renderPublicHTML, bindPublicEvents } from './pages/public.js';
import { renderMarketingHTML, bindMarketingEvents } from './pages/marketing.js';
import { renderDevHTML, initDev } from './pages/dev.js';

window.toggleFullscreen = toggleFullscreen;

// ── Routing ──────────────────────────────────────────────────────────────────

function getRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/intake/')) {
    return { type: 'intake', code: decodeURIComponent(hash.slice('#/intake/'.length)) };
  }
  if (hash === '#/login') return { type: 'login' };
  return { type: 'marketing' };
}

async function boot() {
  const route = getRoute();

  // QR / in-store intake — no auth required
  if (route.type === 'intake') {
    await mountIntakePublic(route.code);
    return;
  }

  // Authenticated session — go straight to the app
  const token = api.getToken();
  if (isTokenValid(token)) {
    await mountAuthenticated(token);
    return;
  }

  if (route.type === 'login') {
    mountPublic();
    return;
  }

  // Default: marketing page
  mountMarketing();
}

window.addEventListener('hashchange', boot);

// ── Mount functions ───────────────────────────────────────────────────────────

function mountMarketing() {
  document.getElementById('app').innerHTML = renderMarketingHTML();
  bindMarketingEvents();
}

function mountPublic() {
  document.getElementById('app').innerHTML = renderPublicHTML();
  bindPublicEvents(onLogin);
}

async function mountIntakePublic(code) {
  let tenantConfig = null;
  try {
    const r = await fetch(`/api/public/tenant?code=${encodeURIComponent(code)}`);
    if (r.ok) tenantConfig = await r.json();
  } catch {}

  if (tenantConfig) applyBranding(tenantConfig);

  document.getElementById('app').innerHTML = `
    <div id="patient-view" class="view active">
      <div class="patient-topbar">
        <div class="patient-logo-img"><img id="navLogoImg" src="" alt="PriceSmart Optical"></div>
        <button class="fullscreen-btn" onclick="toggleFullscreen()" title="Fullscreen">⛶</button>
      </div>
      <div class="patient-header">
        <div class="progress-dots" id="progressDots"></div>
        <div class="progress-label" id="progressLabel"></div>
      </div>
      <div class="card-stage" id="cardStage"></div>
    </div>`;

  setAllLogos();
  setPublicMode(code);
  initIntake(tenantConfig);
}

async function mountAuthenticated(token) {
  const payload = parseJwt(token);

  try {
    const health = await fetch('/api/health').then(r => r.json());
    if (health.env === 'staging') {
      const ribbon = document.getElementById('staging-ribbon');
      if (ribbon) ribbon.style.display = 'block';
    }
  } catch {}

  let tenantConfig = null;
  if (payload.tenantId) {
    try {
      tenantConfig = await api.get('/config');
      applyBranding(tenantConfig);
    } catch {}
  }

  mountApp(payload, tenantConfig);

  if (payload.isEmulation) {
    const banner = document.getElementById('emulation-banner');
    if (banner) {
      banner.classList.remove('hidden');
      const nameEl = banner.querySelector('#emulationTenantName');
      if (nameEl) nameEl.textContent = tenantConfig?.name || 'Tenant #' + payload.tenantId;
      banner.querySelector('#exitEmulationBtn')?.addEventListener('click', async () => {
        try { await api.post('/auth/emulate-end', {}); } catch {}
        const devToken = localStorage.getItem('ps_dev_token');
        localStorage.removeItem('ps_dev_token');
        api.setToken(devToken);
        window.location.reload();
      });
    }
  }
}

async function onLogin(loginData) {
  api.setToken(loginData.token);
  const payload = parseJwt(loginData.token);
  const tenantConfig = loginData.tenant;
  if (tenantConfig) applyBranding(tenantConfig);
  mountApp(payload, tenantConfig);
}

function mountApp(payload, tenantConfig) {
  const { role } = payload;
  const appEl = document.getElementById('app');

  let html = `
    <div id="patient-view" class="view active">
      <div class="patient-topbar">
        <div class="patient-logo-img"><img id="navLogoImg" src="" alt="PriceSmart Optical"></div>
        <button class="fullscreen-btn" onclick="toggleFullscreen()" title="Fullscreen">⛶</button>
      </div>
      <div class="patient-header">
        <div class="progress-dots" id="progressDots"></div>
        <div class="progress-label" id="progressLabel"></div>
      </div>
      <div class="card-stage" id="cardStage"></div>
    </div>`;

  if (['csr', 'admin', 'dev'].includes(role)) html += renderCSRHTML();
  if (['admin', 'dev'].includes(role)) html += renderAdminHTML(tenantConfig);
  if (role === 'dev') html += renderDevHTML();

  html += `<div class="mode-strip" id="modeStrip"></div>`;
  html += `
    <div id="emulation-banner" class="hidden">
      🟡 Emulating: <strong id="emulationTenantName">Tenant</strong>
      <button id="exitEmulationBtn">Exit Emulation</button>
    </div>`;
  html += `<div id="staging-ribbon" style="display:none">STAGING</div>`;

  appEl.innerHTML = html;

  setAllLogos();
  initModeStrip(role, onViewSwitch);
  initIntake(tenantConfig);

  if (['csr', 'admin', 'dev'].includes(role)) { bindCSREvents(); initCSR(); }
  if (['admin', 'dev'].includes(role)) { bindAdminEvents(window.location.origin); initAdmin(); }
  if (role === 'dev') initDev();

  const defaultView = role === 'dev' ? 'dev' : role === 'admin' ? 'admin' : 'patient';
  switchView(defaultView);
}

function onViewSwitch(mode) {
  if (mode === 'csr') refreshCSRView();
}

// Start
boot();
