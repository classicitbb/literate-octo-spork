import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderDevHTML() {
  return `
<div id="dev-view" class="view">
  <div class="dev-header">
    <div>
      <h1>🛠 Dev Console</h1>
      <p>PriceSmart Optical — Account Management</p>
    </div>
    <span style="background:#1d4ed8;color:white;border-radius:50px;padding:4px 12px;font-size:10px;font-weight:700;letter-spacing:0.08em;">DEV</span>
  </div>

  <div class="dev-card">
    <h3>Tenants</h3>
    <div id="devTenantList"><div style="color:#64748B;text-align:center;padding:20px">Loading...</div></div>
  </div>

  <div class="dev-card">
    <h3>Create New Tenant</h3>
    <input class="dev-input" id="devNewCode" placeholder="Account code (e.g. trinidad-branch-3)">
    <input class="dev-input" id="devNewName" placeholder="Store name (e.g. PriceSmart Optical — Chaguanas)">
    <input class="dev-input" id="devNewAddress" placeholder="Store address (optional)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <input class="dev-input" id="devNewAdminPin" placeholder="Admin PIN (4 digits)" maxlength="4" style="margin-bottom:0">
      <input class="dev-input" id="devNewCsrPin" placeholder="CSR PIN (4 digits)" maxlength="4" style="margin-bottom:0">
    </div>
    <div style="margin-top:8px">
      <button class="dev-submit" id="devCreateTenantBtn">+ Create Tenant</button>
    </div>
  </div>

  <div class="dev-card">
    <h3>Emulation Log</h3>
    <div id="devEmulationLog"><div style="color:#64748B;text-align:center;padding:12px">Loading...</div></div>
  </div>
</div>`;
}

export async function initDev() {
  await Promise.all([loadTenants(), loadEmulationLog()]);
  bindDevEvents();
}

async function loadTenants() {
  const el = document.getElementById('devTenantList');
  if (!el) return;
  try {
    const tenants = await api.get('/dev/tenants');
    el.innerHTML = tenants.length ? tenants.map(t => `
      <div class="tenant-row" data-id="${t.id}">
        <div>
          <div class="tenant-name">${t.name}</div>
          <div class="tenant-meta">${t.account_code} · ${t.session_count} records · ${t.user_count} users</div>
        </div>
        <div class="tenant-actions">
          <span class="status-badge status-${t.status}">${t.status}</span>
          <button class="dev-btn emulate" data-emulate="${t.id}" data-name="${t.name}">Emulate</button>
          ${t.status === 'active'
            ? `<button class="dev-btn danger" data-status-id="${t.id}" data-new-status="suspended">Suspend</button>`
            : `<button class="dev-btn" data-status-id="${t.id}" data-new-status="active">Activate</button>`}
        </div>
      </div>`).join('')
      : `<div style="color:#64748B;text-align:center;padding:20px">No tenants yet. Create one below.</div>`;
  } catch {
    el.innerHTML = `<div style="color:#f87171;text-align:center;padding:12px">Failed to load tenants</div>`;
  }

  el.querySelectorAll('[data-emulate]').forEach(btn => {
    btn.addEventListener('click', () => emulate(btn.dataset.emulate, btn.dataset.name));
  });
  el.querySelectorAll('[data-status-id]').forEach(btn => {
    btn.addEventListener('click', () => setTenantStatus(btn.dataset.statusId, btn.dataset.newStatus));
  });
}

async function loadEmulationLog() {
  const el = document.getElementById('devEmulationLog');
  if (!el) return;
  try {
    const rows = await api.get('/dev/emulation-log');
    el.innerHTML = rows.length ? `<table style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="color:#64748B;border-bottom:1px solid #334155">
        <th style="text-align:left;padding:4px 0">Dev</th>
        <th style="text-align:left;padding:4px 0">Tenant</th>
        <th style="text-align:left;padding:4px 0">Started</th>
        <th style="text-align:left;padding:4px 0">Ended</th>
      </tr>
      ${rows.map(r => `<tr style="border-bottom:1px solid #1e293b;color:#94A3B8">
        <td style="padding:5px 0">${r.dev_username}</td>
        <td>${r.tenant_name}</td>
        <td>${new Date(r.started_at * 1000).toLocaleString()}</td>
        <td>${r.ended_at ? new Date(r.ended_at * 1000).toLocaleTimeString() : '—'}</td>
      </tr>`).join('')}
    </table>` : `<div style="color:#64748B;text-align:center;padding:12px">No emulation sessions yet.</div>`;
  } catch {
    el.innerHTML = `<div style="color:#f87171;text-align:center;padding:12px">Failed to load log</div>`;
  }
}

async function emulate(tenantId, tenantName) {
  if (!confirm(`Emulate "${tenantName}"? You'll have full admin access to this tenant.`)) return;
  try {
    const data = await api.post(`/dev/tenants/${tenantId}/emulate`);
    // Save dev token, load emulation token
    localStorage.setItem('ps_dev_token', api.getToken());
    api.setToken(data.token);
    // Reload the app with the tenant context
    window.location.reload();
  } catch {
    showToast('Failed to start emulation', 'error');
  }
}

async function setTenantStatus(tenantId, status) {
  const labels = { active: 'activate', suspended: 'suspend', disabled: 'disable' };
  if (!confirm(`${labels[status] || status} this tenant?`)) return;
  try {
    await api.patch(`/dev/tenants/${tenantId}/status`, { status });
    showToast(`Tenant ${status}`);
    loadTenants();
  } catch {
    showToast('Failed to update status', 'error');
  }
}

function bindDevEvents() {
  const createBtn = document.getElementById('devCreateTenantBtn');
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const code = document.getElementById('devNewCode')?.value.trim();
      const name = document.getElementById('devNewName')?.value.trim();
      const address = document.getElementById('devNewAddress')?.value.trim();
      const adminPin = document.getElementById('devNewAdminPin')?.value.trim();
      const csrPin = document.getElementById('devNewCsrPin')?.value.trim();
      if (!code || !name || !adminPin || !csrPin) { showToast('Fill in all required fields', 'warning'); return; }
      if (!/^\d{4}$/.test(adminPin) || !/^\d{4}$/.test(csrPin)) { showToast('PINs must be exactly 4 digits', 'warning'); return; }
      try {
        await api.post('/dev/tenants', { accountCode: code, name, address, adminPin, csrPin });
        showToast(`Tenant "${name}" created`);
        ['devNewCode','devNewName','devNewAddress','devNewAdminPin','devNewCsrPin'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        loadTenants();
      } catch (e) {
        showToast(e.data?.error || 'Failed to create tenant', 'error');
      }
    });
  }
}
