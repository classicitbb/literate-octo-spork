import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { showPinModal } from '../components/pinModal.js';

export function renderPublicHTML() {
  return `
<div id="public-view" style="min-height:100vh;background:linear-gradient(145deg,#0a0f1e,#003087,#1a2a6c);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
  <div style="text-align:center;max-width:480px;width:100%">
    <div style="margin-bottom:32px">
      <div style="font-size:48px;margin-bottom:12px">👓</div>
      <h1 style="font-size:28px;font-weight:800;color:white;margin-bottom:8px">PriceSmart Optical</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6">Patient intake &amp; staff management platform</p>
    </div>

    <div style="background:white;border-radius:24px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.4)">
      <h2 style="font-size:18px;font-weight:700;color:#1E293B;margin-bottom:6px">Staff Login</h2>
      <p style="font-size:13px;color:#64748B;margin-bottom:20px">Enter your account code and PIN</p>

      <div id="loginStep1">
        <label style="display:block;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Account Code</label>
        <input type="text" id="accountCodeInput" class="form-input-sm" placeholder="e.g. trinidad-branch-1"
          style="width:100%;margin-bottom:14px;text-align:center;font-size:15px;letter-spacing:0.05em">
        <button id="accountCodeBtn" style="width:100%;background:linear-gradient(135deg,#003087,#4477FF);color:white;border:none;border-radius:50px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;">Continue →</button>
      </div>
    </div>

    <div style="margin-top:24px">
      <button id="showContactFormBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);border-radius:50px;padding:9px 22px;font-size:13px;cursor:pointer;">
        💬 New to PriceSmart Optical? Contact Us
      </button>
    </div>

    <div id="contactFormCard" style="display:none;background:white;border-radius:24px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.4);margin-top:16px;text-align:left">
      <h3 style="font-size:17px;font-weight:700;color:#1E293B;margin-bottom:4px">Get in Touch</h3>
      <p style="font-size:13px;color:#64748B;margin-bottom:18px">Interested in PriceSmart Optical for your store?</p>
      <input type="text" id="cfName" placeholder="Your name" class="form-input-sm" style="width:100%;margin-bottom:10px">
      <input type="email" id="cfEmail" placeholder="Email address" class="form-input-sm" style="width:100%;margin-bottom:10px">
      <textarea id="cfMessage" placeholder="Tell us about your optical centre..." style="width:100%;border:1.5px solid #E2E8F0;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;min-height:80px;resize:vertical;outline:none;margin-bottom:12px"></textarea>
      <button id="cfSubmitBtn" style="width:100%;background:#003087;color:white;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
    </div>
  </div>
</div>`;
}

export function bindPublicEvents(onLogin) {
  const codeInput = document.getElementById('accountCodeInput');
  const codeBtn = document.getElementById('accountCodeBtn');
  const showContactBtn = document.getElementById('showContactFormBtn');
  const contactCard = document.getElementById('contactFormCard');

  if (codeInput) {
    codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleCodeSubmit(onLogin); });
  }
  if (codeBtn) {
    codeBtn.addEventListener('click', () => handleCodeSubmit(onLogin));
  }
  if (showContactBtn) {
    showContactBtn.addEventListener('click', () => {
      contactCard.style.display = contactCard.style.display === 'none' ? 'block' : 'none';
    });
  }

  const cfSubmit = document.getElementById('cfSubmitBtn');
  if (cfSubmit) {
    cfSubmit.addEventListener('click', async () => {
      const name = document.getElementById('cfName')?.value.trim();
      const email = document.getElementById('cfEmail')?.value.trim();
      const message = document.getElementById('cfMessage')?.value.trim();
      if (!name || !email || !message) { showToast('Please fill in all fields', 'warning'); return; }
      try {
        await api.post('/contact', { name, email, message });
        showToast('Message sent! We\'ll be in touch.');
        document.getElementById('cfName').value = '';
        document.getElementById('cfEmail').value = '';
        document.getElementById('cfMessage').value = '';
        contactCard.style.display = 'none';
      } catch {
        showToast('Failed to send. Please try again.', 'error');
      }
    });
  }
}

async function handleCodeSubmit(onLogin) {
  const code = document.getElementById('accountCodeInput')?.value.trim();
  if (!code) { showToast('Enter your account code', 'warning'); return; }

  const pin = await showPinModal({
    title: 'Enter PIN',
    subtitle: `Account: ${code}`,
    onBack: () => {},
  });

  if (!pin) return;

  try {
    const data = await api.post('/auth/login', { accountCode: code, pin });
    api.setToken(data.token);
    onLogin(data);
  } catch (e) {
    if (e.status === 401) showToast('Incorrect PIN. Try again.', 'error');
    else if (e.status === 403) showToast('This account is not active.', 'error');
    else showToast('Login failed. Check account code.', 'error');
    handleCodeSubmit(onLogin);
  }
}
