import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderMarketingHTML() {
  return `
<div id="marketing-view" class="mktg-page">

  <header class="mktg-header">
    <div class="mktg-logo">
      <span class="mktg-logo-icon">🏥</span>
      <span class="mktg-logo-text">Patient Smart<strong> App</strong></span>
    </div>
    <a href="#/login" class="mktg-login-btn">Staff Login →</a>
  </header>

  <section class="mktg-hero">
    <div class="mktg-hero-inner">
      <div class="mktg-hero-badge">Built for patient-focused practices</div>
      <h1 class="mktg-hero-title">Smart intake.<br>Better outcomes.</h1>
      <p class="mktg-hero-sub">Patient Smart App is the simple subscription platform that modernises your patient intake, guides your team, and gives you the data to grow — all from a single dashboard.</p>
      <a href="#contact" class="mktg-cta-btn">Get Started Today</a>
    </div>
  </section>

  <section class="mktg-features">
    <div class="mktg-section-label">What you get</div>
    <h2 class="mktg-section-title">Everything your team needs,<br>nothing they don't.</h2>
    <div class="mktg-feature-grid">
      <div class="mktg-feature-card">
        <div class="mktg-feature-icon">📋</div>
        <h3>Digital Patient Intake</h3>
        <p>Replace clipboards with a guided tablet experience. Patients complete a personalised questionnaire while they wait — automatically scored before the appointment begins.</p>
      </div>
      <div class="mktg-feature-card">
        <div class="mktg-feature-icon">📊</div>
        <h3>Built-in Sales Coaching</h3>
        <p>Every visit generates a readiness score and patient profile. Your team arrives at each appointment knowing exactly what to prioritise.</p>
      </div>
      <div class="mktg-feature-card">
        <div class="mktg-feature-icon">🔍</div>
        <h3>Live Analytics</h3>
        <p>Track conversions, average sale value, and team performance from one real-time dashboard. See what's working and act on it — the same day.</p>
      </div>
    </div>
  </section>

  <section class="mktg-pricing">
    <div class="mktg-pricing-inner">
      <div class="mktg-section-label">Pricing</div>
      <h2 class="mktg-section-title">Simple, transparent subscription.</h2>
      <p class="mktg-pricing-sub">One flat monthly fee per location. No setup costs. No long-term contracts. Cancel any time — though you won't want to.</p>
      <a href="#contact" class="mktg-cta-btn mktg-cta-outline">Contact us for pricing</a>
    </div>
  </section>

  <section class="mktg-contact" id="contact">
    <div class="mktg-contact-inner">
      <div class="mktg-section-label">Get in touch</div>
      <h2 class="mktg-section-title">Ready to modernise<br>your practice?</h2>
      <p class="mktg-contact-sub">Leave your details and we'll reach out within one business day.</p>
      <div class="mktg-contact-form">
        <input type="text"  id="mktgName"    placeholder="Your name"                   class="mktg-input">
        <input type="email" id="mktgEmail"   placeholder="Email address"               class="mktg-input">
        <textarea           id="mktgMessage" placeholder="Tell us about your practice…" class="mktg-textarea"></textarea>
        <button id="mktgSubmitBtn" class="mktg-submit-btn">Send Message</button>
      </div>
    </div>
  </section>

  <footer class="mktg-footer">
    <span>© ${new Date().getFullYear()} Patient Smart App</span>
    <div style="display:flex;gap:16px;align-items:center;">
      <a href="#/login" class="mktg-footer-login">Staff Login</a>
      <a href="#/admin-login" class="mktg-footer-login" style="opacity:0.5;font-size:0.8em;">Admin</a>
    </div>
  </footer>

</div>`;
}

export function bindMarketingEvents() {
  const btn = document.getElementById('mktgSubmitBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name    = document.getElementById('mktgName')?.value.trim();
    const email   = document.getElementById('mktgEmail')?.value.trim();
    const message = document.getElementById('mktgMessage')?.value.trim();
    if (!name || !email || !message) { showToast('Please fill in all fields', 'warning'); return; }

    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await api.post('/contact', { name, email, message });
      showToast('Message sent! We\'ll be in touch soon.');
      document.getElementById('mktgName').value    = '';
      document.getElementById('mktgEmail').value   = '';
      document.getElementById('mktgMessage').value = '';
    } catch {
      showToast('Failed to send — please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
}
