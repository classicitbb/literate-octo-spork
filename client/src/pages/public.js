import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderPublicHTML() {
  return `
<div id="public-view" class="login-page">
  <a href="#/" class="login-back">← Back</a>

  <div>
    <div class="login-brand">
      <span class="login-brand-icon">👓</span>
      <div class="login-brand-name">Patient Smart App</div>
      <div class="login-brand-sub">Staff Login</div>
    </div>

    <div class="login-card">
      <h2>Sign in to your account</h2>
      <p>Enter your email and PIN to access your clinic's app.</p>

      <div id="loginError" class="login-error"></div>

      <div class="login-form">
        <div class="login-label">Email address</div>
        <input type="email" id="loginEmail" class="login-input"
          placeholder="you@example.com" autocomplete="email">

        <div class="login-label">PIN</div>
        <input type="password" id="loginPin" class="login-input"
          placeholder="Enter your PIN" maxlength="8" autocomplete="current-password">

        <button id="loginBtn" class="login-btn-submit">Sign In →</button>
      </div>
    </div>
  </div>
</div>`;
}

export function bindPublicEvents(onLogin) {
  const emailInput = document.getElementById('loginEmail');
  const pinInput   = document.getElementById('loginPin');
  const loginBtn   = document.getElementById('loginBtn');

  if (pinInput) {
    pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(onLogin); });
  }
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') pinInput?.focus(); });
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => handleLogin(onLogin));
  }
}

async function handleLogin(onLogin) {
  const email = document.getElementById('loginEmail')?.value.trim();
  const pin   = document.getElementById('loginPin')?.value.trim();
  const errorEl = document.getElementById('loginError');

  if (errorEl) errorEl.style.display = 'none';

  if (!email || !pin) {
    showError(errorEl, 'Please enter your email and PIN.');
    return;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    // Use raw fetch — bypasses the api.js 401 interceptor which would reload the page
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        res.status === 401 ? 'Incorrect email or PIN. Please try again.' :
        res.status === 403 ? 'This account is not active. Contact your administrator.' :
        data.error || 'Login failed — please check your details and try again.';
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
