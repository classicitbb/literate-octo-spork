// Mode strip: Patient / CSR / Admin buttons
// role: 'csr' | 'admin' | 'dev' | null

let _currentView = 'patient';
let _onSwitch = null;

export function initModeStrip(role, onSwitch) {
  _onSwitch = onSwitch;
  const strip = document.getElementById('modeStrip');
  if (!strip) return;

  const canAdmin = ['admin', 'dev'].includes(role);
  const canCSR = ['csr', 'admin', 'dev'].includes(role);

  strip.innerHTML = `
    <button class="mode-btn active" id="modePatient" data-mode="patient">🏥 Patient Form</button>
    ${canCSR ? `<button class="mode-btn" id="modeCSR" data-mode="csr">📋 CSR View</button>` : ''}
    ${canAdmin ? `<button class="mode-btn" id="modeAdmin" data-mode="admin">📊 Manager View</button>` : ''}
    ${role === 'dev' ? `<button class="mode-btn" id="modeDev" data-mode="dev">🛠 Admin Console</button>` : ''}
  `;

  strip.addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    switchView(btn.dataset.mode);
  });
}

export function switchView(mode) {
  _currentView = mode;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(mode + '-view');
  if (target) target.classList.add('active');

  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  if (_onSwitch) _onSwitch(mode);
}

export function getCurrentView() { return _currentView; }
