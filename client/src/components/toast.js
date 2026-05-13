export function showToast(message, type = 'success', duration = 3000) {
  const existing = document.getElementById('ps-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'ps-toast';
  const bg = type === 'error' ? '#FEE2E2' : type === 'warning' ? '#FEF3C7' : '#D1FAE5';
  const color = type === 'error' ? '#991B1B' : type === 'warning' ? '#92400E' : '#065F46';
  el.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:${bg}; color:${color}; border-radius:12px; padding:12px 20px;
    font-size:13px; font-weight:600; z-index:2000;
    box-shadow:0 4px 16px rgba(0,0,0,0.12); max-width:320px; text-align:center;
    animation:fadeIn 0.2s ease;
  `;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}
