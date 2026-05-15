import { api } from '../api.js';
import { showToast } from '../components/toast.js';

const PRODUCT_NAME = 'VisionLift IQ';

export function renderMarketingHTML() {
  return `
<div id="marketing-view" class="mktg-page">

  <header class="mktg-header" aria-label="Primary navigation">
    <a href="#top" class="mktg-logo" data-scroll="top" aria-label="${PRODUCT_NAME} home">
      <span class="mktg-logo-mark" aria-hidden="true">VL</span>
      <span class="mktg-logo-text">VisionLift <strong>IQ</strong></span>
    </a>
    <nav class="mktg-nav" aria-label="Page sections">
      <a href="#outcomes" data-scroll="outcomes">Outcomes</a>
      <a href="#workflow" data-scroll="workflow">Workflow</a>
      <a href="#pricing" data-scroll="pricing">Pricing</a>
      <a href="#compliance" data-scroll="compliance">Compliance</a>
      <a href="#contact" data-scroll="contact">Demo</a>
    </nav>
    <a href="#/login" class="mktg-login-btn">Staff Login</a>
  </header>

  <main id="top">
    <section class="mktg-hero" aria-labelledby="hero-title">
      <div class="mktg-hero-bg" aria-hidden="true"></div>
      <div class="mktg-hero-inner">
        <div class="mktg-hero-copy">
          <div class="mktg-hero-badge">Modern optical patient-intelligence SaaS</div>
          <h1 id="hero-title" class="mktg-hero-title">Turn every intake answer into a smarter optical sale.</h1>
          <p class="mktg-hero-sub">${PRODUCT_NAME} helps optical teams understand each patient before the conversation starts — so clerks, optometrists, and managers can guide better care, uncover lifestyle needs, and create more confident purchase moments.</p>
          <div class="mktg-hero-actions">
            <a href="#contact" class="mktg-cta-btn" data-scroll="contact">Schedule a demo</a>
            <a href="#pricing" class="mktg-secondary-btn" data-scroll="pricing">Start with 30 days free</a>
          </div>
          <div class="mktg-trust-strip" aria-label="Highlights">
            <span>30-day full-feature trial</span>
            <span>$15 USD / month intro price</span>
            <span>Built for optical retail teams</span>
          </div>
        </div>
        <div class="mktg-hero-panel" aria-label="Example patient intelligence card">
          <div class="mktg-panel-topline">Live visit insight</div>
          <div class="mktg-score-ring"><span>86</span><small>readiness</small></div>
          <div class="mktg-panel-card emphasized">
            <strong>Patient lifestyle signal</strong>
            <p>Screen-heavy workdays, night driving, and style-conscious frame preference.</p>
          </div>
          <div class="mktg-panel-grid">
            <div><span>Care cue</span><strong>Premium lens education</strong></div>
            <div><span>Retail cue</span><strong>Backup pair opportunity</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="mktg-section mktg-outcomes" id="outcomes" aria-labelledby="outcomes-title">
      <div class="mktg-section-kicker">Why opticals buy</div>
      <h2 id="outcomes-title" class="mktg-section-title">A sharper visit for patients. A clearer selling motion for your team.</h2>
      <p class="mktg-section-sub">Patients tell you what matters. ${PRODUCT_NAME} packages those answers into timely, practical cues that help your team serve with confidence instead of guessing.</p>
      <div class="mktg-metric-grid">
        <article class="mktg-metric-card">
          <span>01</span>
          <h3>Reveal intent earlier</h3>
          <p>Identify lifestyle, urgency, budget comfort, and product fit before the handoff.</p>
        </article>
        <article class="mktg-metric-card">
          <span>02</span>
          <h3>Coach the floor in real time</h3>
          <p>Give clerks a practical interaction tracker that keeps patient needs visible during the visit.</p>
        </article>
        <article class="mktg-metric-card">
          <span>03</span>
          <h3>Equip optoms and managers</h3>
          <p>Surface self-admitted lifestyle needs so clinical and retail leaders can personalize recommendations.</p>
        </article>
      </div>
    </section>

    <section class="mktg-section mktg-workflow" id="workflow" aria-labelledby="workflow-title">
      <div class="mktg-split">
        <div>
          <div class="mktg-section-kicker">How it works</div>
          <h2 id="workflow-title" class="mktg-section-title">From waiting-room form to sales-aware care plan in minutes.</h2>
          <p class="mktg-section-sub">The front desk shares a guided intake. Patients answer simple questions. Your staff sees a clean profile with readiness, care priorities, and conversation prompts.</p>
        </div>
        <div class="mktg-steps" aria-label="Product workflow">
          <div class="mktg-step"><span>1</span><div><strong>Capture the visit context</strong><p>New or returning patients complete a modern intake flow on a tablet or shared link.</p></div></div>
          <div class="mktg-step"><span>2</span><div><strong>Score needs automatically</strong><p>The dashboard organizes lifestyle, urgency, lens opportunities, and purchase readiness.</p></div></div>
          <div class="mktg-step"><span>3</span><div><strong>Guide the interaction</strong><p>Clerks track the visit while optoms and managers align care and product recommendations.</p></div></div>
        </div>
      </div>
    </section>

    <section class="mktg-section mktg-pricing" id="pricing" aria-labelledby="pricing-title">
      <div class="mktg-pricing-card">
        <div class="mktg-price-copy">
          <div class="mktg-section-kicker">One price</div>
          <h2 id="pricing-title" class="mktg-section-title">Introductory access for growing opticals.</h2>
          <p class="mktg-pricing-sub">Full-feature trial for 30 days, then one straightforward subscription designed to help stores convert more patient tests into better sales conversations.</p>
        </div>
        <div class="mktg-price-box" aria-label="$15 USD per month introductory price">
          <span class="mktg-price-label">Intro price</span>
          <div class="mktg-price"><sup>$</sup>15<span>USD/mo</span></div>
          <p>One modern SaaS workspace for the optical visit.</p>
          <a href="#contact" class="mktg-cta-btn full" data-scroll="contact">Claim the trial</a>
        </div>
      </div>
    </section>

    <section class="mktg-section mktg-compliance" id="compliance" aria-labelledby="compliance-title">
      <div class="mktg-section-kicker">Trust, terms, and privacy</div>
      <h2 id="compliance-title" class="mktg-section-title">Built with practical regional compliance in mind.</h2>
      <div class="mktg-compliance-grid">
        <article>
          <h3>Privacy-first contact</h3>
          <p>Demo requests collect only business contact details needed to respond. Submitting the form confirms permission to contact you about ${PRODUCT_NAME}.</p>
        </article>
        <article>
          <h3>Responsible patient data posture</h3>
          <p>The product is designed around secure access, role-aware dashboards, and minimal collection for optical visit support. Deployment teams should configure region-appropriate retention and data-processing terms.</p>
        </article>
        <article>
          <h3>Commercial terms made visible</h3>
          <p>The trial, introductory price, and cancellation-friendly subscription expectations are presented before a demo conversation so buyers have clear starting terms.</p>
        </article>
      </div>
      <div class="mktg-legal-notes" id="terms">
        <h3>Summary terms</h3>
        <p>30-day full-feature trial. Introductory price is $15 USD per month unless superseded by a signed agreement. Access may require accepted subscription, privacy, and data-processing terms before production use.</p>
      </div>
      <div class="mktg-legal-notes" id="privacy">
        <h3>Privacy summary</h3>
        <p>We use submitted contact information to respond to demo and product inquiries. Do not submit patient health information in the marketing contact form. Regional privacy obligations may vary by customer location and should be finalized in the production agreement.</p>
      </div>
    </section>

    <section class="mktg-contact" id="contact" aria-labelledby="contact-title">
      <div class="mktg-contact-inner">
        <div class="mktg-section-kicker">Contact us</div>
        <h2 id="contact-title" class="mktg-section-title">Let’s make your optical visits more profitable and more personal.</h2>
        <p class="mktg-contact-sub">Tell us about your store and we’ll help you schedule a demo, preview the workflow, and activate your 30-day full-feature trial.</p>
        <div class="mktg-contact-form" aria-label="Demo request form">
          <label class="sr-only" for="mktgName">Your name</label>
          <input type="text" id="mktgName" autocomplete="name" placeholder="Your name" class="mktg-input" maxlength="120">
          <label class="sr-only" for="mktgEmail">Email address</label>
          <input type="email" id="mktgEmail" autocomplete="email" placeholder="Email address" class="mktg-input" maxlength="160">
          <label class="sr-only" for="mktgMessage">Practice details</label>
          <textarea id="mktgMessage" placeholder="Tell us about your optical location, team size, and demo goals…" class="mktg-textarea" maxlength="1200"></textarea>
          <label class="mktg-consent"><input type="checkbox" id="mktgConsent"> <span>I agree to be contacted about ${PRODUCT_NAME} and confirm I will not submit patient health information in this form.</span></label>
          <button id="mktgSubmitBtn" class="mktg-submit-btn">Schedule my demo</button>
        </div>
      </div>
    </section>
  </main>

  <footer class="mktg-footer">
    <span>© ${new Date().getFullYear()} ${PRODUCT_NAME}. Optical patient-intelligence software.</span>
    <div class="mktg-footer-links">
      <a href="#privacy" data-scroll="privacy">Privacy</a>
      <a href="#terms" data-scroll="terms">Terms</a>
      <a href="#/login">Staff Login</a>
      <a href="#/admin-login">Admin</a>
    </div>
  </footer>

</div>`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function bindMarketingEvents() {
  document.querySelectorAll('[data-scroll]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const targetId = link.getAttribute('data-scroll');
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${targetId}`);
    });
  });

  const btn = document.getElementById('mktgSubmitBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name = document.getElementById('mktgName')?.value.trim();
    const email = document.getElementById('mktgEmail')?.value.trim();
    const message = document.getElementById('mktgMessage')?.value.trim();
    const consentAccepted = Boolean(document.getElementById('mktgConsent')?.checked);

    if (!name || !email || !message) { showToast('Please fill in all fields', 'warning'); return; }
    if (!isValidEmail(email)) { showToast('Please enter a valid email address', 'warning'); return; }
    if (!consentAccepted) { showToast('Please accept the contact and privacy notice', 'warning'); return; }

    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await api.post('/contact', { name, email, message });
      showToast('Demo request sent. We\'ll be in touch soon.');
      document.getElementById('mktgName').value = '';
      document.getElementById('mktgEmail').value = '';
      document.getElementById('mktgMessage').value = '';
      document.getElementById('mktgConsent').checked = false;
    } catch (err) {
      showToast(err?.message || 'Failed to send — please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Schedule my demo';
    }
  });
}
