import './styles/base.css';
import './styles/patient.css';
import './styles/csr.css';
import './styles/admin.css';
import './styles/shared.css';
import './styles/marketing.css';

import { inject } from '@vercel/analytics';

import { api, parseJwt, isTokenValid } from './api.js';
import { setAllLogos, applyBranding } from './components/branding.js';
import { initModeStrip, switchView } from './components/modeStrip.js';
import { initIntake, resetIntake, toggleFullscreen, setPublicMode } from './pages/intake.js';
import { renderCSRHTML, initCSR, bindCSREvents, refreshCSRView } from './pages/csr.js';
import { renderAdminHTML, initAdmin, bindAdminEvents } from './pages/admin.js';
import { renderPublicHTML, bindPublicEvents } from './pages/public.js';
import { renderMarketingHTML, bindMarketingEvents } from './pages/marketing.js';
import { renderDevHTML, initDev } from './pages/dev.js';
import { renderSetupHTML, bindSetupEvents } from './pages/setup.js';
import { renderAdminLoginHTML, bindAdminLoginEvents } from './pages/adminLogin.js';

window.toggleFullscreen = toggleFullscreen;

// ── Routing ──────────────────────────────────────────────────────────────────

function getRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/intake/')) {
    return { type: 'intake', code: decodeURIComponent(hash.slice('#/intake/'.length)) };
  }
  if (hash === '#/login') return { type: 'login' };
  if (hash === '#/admin-login') return { type: 'admin-login' };
  if (hash === '#/setup') return { type: 'setup' };
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

  if (route.type === 'admin-login') {
    mountAdminLogin();
    return;
  }

  if (route.type === 'setup') {
    mountSetup();
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

function mountSetup() {
  document.getElementById('app').innerHTML = renderSetupHTML();
  bindSetupEvents(onLogin);
}

function mountAdminLogin() {
  document.getElementById('app').innerHTML = renderAdminLoginHTML();
  bindAdminLoginEvents(onLogin);
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
        <div class="patient-logo-img"><img id="navLogoImg" src="" alt="Patient Smart App"></div>
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

  // If user has no email set, prompt before entering the app
  if (!loginData.user?.email) {
    await showEmailSetupModal(loginData);
    return;
  }

  const payload = parseJwt(loginData.token);
  const tenantConfig = loginData.tenant;
  if (tenantConfig) applyBranding(tenantConfig);
  mountApp(payload, tenantConfig);
}

function showEmailSetupModal(loginData) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center;z-index:9999;`;

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <h2 style="margin:0 0 8px;font-size:1.25rem;color:#111;">Set your email address</h2>
        <p style="margin:0 0 20px;color:#666;font-size:.9rem;">
          Your account needs an email address. This is how you'll sign in going forward.
        </p>
        <div id="emailModalError" style="display:none;color:#c0392b;font-size:.85rem;margin-bottom:12px;"></div>
        <input id="emailModalInput" type="email" placeholder="you@example.com"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:1rem;margin-bottom:16px;"
          autocomplete="email">
        <button id="emailModalBtn"
          style="width:100%;padding:12px;background:#003087;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">
          Save &amp; Continue →
        </button>
      </div>`;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#emailModalInput');
    const btn   = overlay.querySelector('#emailModalBtn');
    const errEl = overlay.querySelector('#emailModalError');

    input.focus();
    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    btn.addEventListener('click', save);

    async function save() {
      const email = input.value.trim();
      if (!email || !email.includes('@')) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.token}` },
          credentials: 'include',
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          errEl.textContent = data.error || 'Could not save email. Try again.';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Save & Continue →';
          return;
        }
        document.body.removeChild(overlay);
        loginData.user.email = email;
        const payload = parseJwt(loginData.token);
        const tenantConfig = loginData.tenant;
        if (tenantConfig) applyBranding(tenantConfig);
        mountApp(payload, tenantConfig);
        resolve();
      } catch {
        errEl.textContent = 'Could not reach the server. Please try again.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Save & Continue →';
      }
    }
  });
}

function mountApp(payload, tenantConfig) {
  const { role } = payload;
  const appEl = document.getElementById('app');

  let html = `
    <div id="patient-view" class="view active">
      <div class="patient-topbar">
        <div class="patient-logo-img"><img id="navLogoImg" src="" alt="Patient Smart App"></div>
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

// Initialize Vercel Web Analytics
inject();
