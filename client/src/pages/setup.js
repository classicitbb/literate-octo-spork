export function renderSetupHTML() {
  return `
<div id="setup-view" class="login-page">
  <div>
    <div class="login-brand">
      <span class="login-brand-icon">👓</span>
      <div class="login-brand-name">PriceSmart Optical</div>
      <div class="login-brand-sub">First Time Setup</div>
    </div>

    <div class="login-card">
      <h2>Welcome! Let's get you set up.</h2>
      <p>Create your admin account to get started.</p>

      <div id="setupError" class="login-error"></div>

      <div class="login-form">
        <div class="login-label">Store Name</div>
        <input type="text" id="setupStoreName" class="login-input"
          placeholder="e.g. Main Street Optical" autocomplete="organization">

        <div class="login-label">Your Email</div>
        <input type="email" id="setupEmail" class="login-input"
          placeholder="you@example.com" autocomplete="email">

        <div class="login-label">Choose a PIN (4–8 digits)</div>
        <input type="password" id="setupPin" class="login-input"
          placeholder="e.g. 1234" maxlength="8" autocomplete="new-password">

        <button id="setupBtn" class="login-btn-submit">Create Account →</button>
      </div>
    </div>
  </div>
</div>`;
}

export function bindSetupEvents(onSetupComplete) {
  const storeInput = document.getElementById('setupStoreName');
  const emailInput = document.getElementById('setupEmail');
  const pinInput   = document.getElementById('setupPin');
  const btn        = document.getElementById('setupBtn');
  const errorEl    = document.getElementById('setupError');

  pinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSetup(); });
  btn?.addEventListener('click', handleSetup);

  async function handleSetup() {
    if (errorEl) errorEl.style.display = 'none';

    const storeName = storeInput?.value.trim();
    const email     = emailInput?.value.trim();
    const pin       = pinInput?.value.trim();

    if (!storeName || !email || !pin) {
      showError('Please fill in all fields.');
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      showError('PIN must be 4–8 digits.');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Setting up…'; }

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeName, email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Setup failed. Please try again.');
        return;
      }
      onSetupComplete(data);
    } catch {
      showError('Could not reach the server. Please try again.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
    }
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}
