import './styles/base.css';
import './styles/patient.css';
import './styles/csr.css';
import './styles/admin.css';
import './styles/shared.css';

import { api, parseJwt, isTokenValid } from './api.js';
import { setAllLogos, applyBranding } from './components/branding.js';
import { initModeStrip, switchView } from './components/modeStrip.js';
import { initIntake, resetIntake, toggleFullscreen } from './pages/intake.js';
import { renderCSRHTML, initCSR, bindCSREvents, refreshCSRView } from './pages/csr.js';
import { renderAdminHTML, initAdmin, bindAdminEvents } from './pages/admin.js';
import { renderPublicHTML, bindPublicEvents } from './pages/public.js';
import { renderDevHTML, initDev } from './pages/dev.js';

// Expose fullscreen globally (called from patient view inline button)
window.toggleFullscreen = toggleFullscreen;

async function boot() {
  const token = api.getToken();
  const isEmulationReturn = !!localStorage.getItem('ps_dev_token');

  // If returning from emulation reload, check which token to use
  const activeToken = token;

  if (!isTokenValid(activeToken)) {
    mountPublic();
    return;
  }

  const payload = parseJwt(activeToken);

  // Check for staging env
  try {
    const health = await fetch('/api/health').then(r => r.json());
    if (health.env === 'staging') {
      const ribbon = document.getElementById('staging-ribbon');
      if (ribbon) ribbon.style.display = 'block';
    }
  } catch {}

  // Emulation banner
  if (payload.isEmulation) {
    const banner = document.getElementById('emulation-banner');
    if (banner) {
      banner.classList.remove('hidden');
      const nameEl = banner.querySelector('#emulationTenantName');
      if (nameEl) nameEl.textContent = 'Tenant #' + payload.tenantId;
      const exitBtn = banner.querySelector('#exitEmulationBtn');
      if (exitBtn) {
        exitBtn.addEventListener('click', async () => {
          try { await api.post('/auth/emulate-end', {}); } catch {}
          const devToken = localStorage.getItem('ps_dev_token');
          localStorage.removeItem('ps_dev_token');
          api.setToken(devToken);
          window.location.reload();
        });
      }
    }
  }

  // Load tenant config for branding
  let tenantConfig = null;
  if (payload.tenantId) {
    try {
      tenantConfig = await api.get('/config');
      applyBranding(tenantConfig);
      // Update emulation banner with real name
      if (payload.isEmulation) {
        const nameEl = document.getElementById('emulationTenantName');
        if (nameEl && tenantConfig.name) nameEl.textContent = tenantConfig.name;
      }
    } catch {}
  }

  mountApp(payload, tenantConfig);
}

function mountPublic() {
  document.getElementById('app').innerHTML = renderPublicHTML();
  bindPublicEvents(onLogin);
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

  // Build page shell
  let html = '';

  // Patient view is always present
  html += `
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

  // Mode strip
  html += `<div class="mode-strip" id="modeStrip"></div>`;

  // Emulation banner (hidden by default)
  html += `
    <div id="emulation-banner" class="hidden">
      🟡 Emulating: <strong id="emulationTenantName">Tenant</strong>
      <button id="exitEmulationBtn">Exit Emulation</button>
    </div>`;

  // Staging ribbon (hidden by default, shown after health check)
  html += `<div id="staging-ribbon" style="display:none">STAGING</div>`;

  appEl.innerHTML = html;

  // Re-run emulation banner logic after render
  if (payload.isEmulation) {
    const banner = document.getElementById('emulation-banner');
    if (banner) {
      banner.classList.remove('hidden');
      if (tenantConfig?.name) {
        document.getElementById('emulationTenantName').textContent = tenantConfig.name;
      }
      document.getElementById('exitEmulationBtn')?.addEventListener('click', async () => {
        try { await api.post('/auth/emulate-end', {}); } catch {}
        const devToken = localStorage.getItem('ps_dev_token');
        localStorage.removeItem('ps_dev_token');
        api.setToken(devToken);
        window.location.reload();
      });
    }
  }

  setAllLogos();
  initModeStrip(role, onViewSwitch);
  initIntake(tenantConfig);

  if (['csr', 'admin', 'dev'].includes(role)) {
    bindCSREvents();
    initCSR();
  }
  if (['admin', 'dev'].includes(role)) {
    bindAdminEvents(window.location.origin);
    initAdmin();
  }
  if (role === 'dev') {
    initDev();
  }

  // Default view: patient for csr, csr for admin, dev for dev, patient otherwise
  const defaultView = role === 'dev' ? 'dev' : role === 'admin' ? 'admin' : 'patient';
  switchView(defaultView);
}

function onViewSwitch(mode) {
  if (mode === 'csr') refreshCSRView();
}

// Start
boot();
