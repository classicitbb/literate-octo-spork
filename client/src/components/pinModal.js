// PIN numpad widget — reusable for login step
// Returns a Promise that resolves with the entered 4-digit PIN string

export function showPinModal({ title = 'Staff Access', subtitle = 'Enter your 4-digit PIN', onBack } = {}) {
  return new Promise((resolve) => {
    let buf = '';

    const overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.innerHTML = `
      <div class="pin-box">
        <div class="pin-title">${title}</div>
        <div class="pin-sub">${subtitle}</div>
        <div class="pin-dots" id="pinDotsInner">
          <div class="pin-dot"></div><div class="pin-dot"></div>
          <div class="pin-dot"></div><div class="pin-dot"></div>
        </div>
        <div class="pin-pad">
          ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pin-key" data-n="${n}">${n}</button>`).join('')}
          <button class="pin-key empty" aria-hidden="true"></button>
          <button class="pin-key" data-n="0">0</button>
          <button class="pin-key del" id="pinDelBtn">⌫</button>
        </div>
        ${onBack ? `<button class="pin-back-btn" id="pinBackBtn">← Back</button>` : ''}
      </div>`;

    document.body.appendChild(overlay);

    function updateDots() {
      overlay.querySelectorAll('.pin-dot').forEach((d, i) => {
        d.classList.toggle('filled', i < buf.length);
        d.classList.remove('error');
      });
    }

    function press(digit) {
      if (buf.length >= 4) return;
      buf += digit;
      updateDots();
      if (buf.length === 4) {
        const pin = buf;
        overlay.remove();
        resolve(pin);
      }
    }

    function back() {
      buf = buf.slice(0, -1);
      updateDots();
    }

    overlay.addEventListener('click', e => {
      const n = e.target.dataset?.n;
      if (n !== undefined) press(n);
      if (e.target.id === 'pinDelBtn') back();
      if (e.target.id === 'pinBackBtn' && onBack) { overlay.remove(); onBack(); }
    });
  });
}

export function showPinError(message = 'Incorrect PIN') {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
  const hint = document.querySelector('.pin-hint');
  if (hint) hint.textContent = message;
  setTimeout(() => {
    dots.forEach(d => d.classList.remove('error'));
  }, 800);
}
