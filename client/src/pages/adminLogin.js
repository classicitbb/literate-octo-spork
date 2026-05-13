import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderAdminLoginHTML() {
  return `
<div id="admin-login-view" class="login-page">
  <a href="#/" class="login-back">← Back to site</a>

  <div>
    <div class="login-brand">
      <span class="login-brand-icon">🏥</span>
      <div class="login-brand-name">Patient Smart App</div>
      <div class="login-brand-sub">Admin Console</div>
    </div>

    <div class="login-card">
      <h2>Admin Sign In</h2>
      <p>Enter your email and password to access the admin console.</p>

      <div id="adminLoginError" class="login-error"></div>

      <div class="login-form">
        <div class="login-label">Email address</div>
        <input type="email" id="adminLoginEmail" class="login-input"
          placeholder="admin@example.com" autocomplete="email">

        <div class="login-label">Password</div>
        <input type="password" id="adminLoginPassword" class="login-input"
          placeholder="Your password" autocomplete="current-password">

        <button id="adminLoginBtn" class="login-btn-submit">Sign In →</button>
      </div>
    </div>
  </div>
</div>`;
}

export function bindAdminLoginEvents(onLogin) {
  const emailInput    = document.getElementById('adminLoginEmail');
  const passwordInput = document.getElementById('adminLoginPassword');
  const loginBtn      = document.getElementById('adminLoginBtn');

  if (passwordInput) {
    passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdminLogin(onLogin); });
  }
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') passwordInput?.focus(); });
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => handleAdminLogin(onLogin));
  }
}

async function handleAdminLogin(onLogin) {
  const email    = document.getElementById('adminLoginEmail')?.value.trim();
  const password = document.getElementById('adminLoginPassword')?.value;
  const errorEl  = document.getElementById('adminLoginError');

  if (errorEl) errorEl.style.display = 'none';

  if (!email || !password) {
    showError(errorEl, 'Please enter your email and password.');
    return;
  }

  const btn = document.getElementById('adminLoginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        res.status === 401 ? 'Incorrect email or password. Please try again.' :
        data.error || 'Login failed — please check your details.';
      showError(errorEl, msg);
      return;
    }
    api.setToken(data.token);
    onLogin(data);
  } catch {
    showError(errorEl, 'Could not reach the server. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }
  }
}

function showError(el, msg) {
  if (!el) { showToast(msg, 'error'); return; }
  el.textContent = msg;
  el.style.display = 'block';
}
