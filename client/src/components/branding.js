const _LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40">
  <rect x="0" y="8" width="28" height="28" rx="6" fill="#003087"/>
  <text x="14" y="27" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="white">P</text>
  <text x="38" y="30" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="16" font-weight="700" fill="white">Patient Smart</text>
  <text x="38" y="30" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="16" font-weight="700" fill="white" dx="107"> App</text>
</svg>`;

export const PS_LOGO_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(_LOGO_SVG);

export function setAllLogos() {
  ['navLogoImg', 'csrLogoImg', 'adminLogoImg', 'printLogoImg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = PS_LOGO_URI;
  });
}

export function applyBranding(cfg) {
  document.documentElement.style.setProperty('--brand-primary', cfg.primaryColor || '#003087');
  document.documentElement.style.setProperty('--brand-accent', cfg.accentColor || '#CC0000');
  const printWrap = document.querySelector('.print-logo-wrap');
  if (printWrap) printWrap.style.background = cfg.primaryColor || '#003087';
}
