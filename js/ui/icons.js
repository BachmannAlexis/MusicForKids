// Inline SVG icons (24×24, drawn with currentColor) so every icon matches the type.
const PATHS = {
  back: '<path d="m15 18-6-6 6-6"/>',
  settings:
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  star: '<path class="fill" d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
  play: '<path class="fill" d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/>',
  sound: '<path class="fill" d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path class="fill" d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>',
  stop: '<rect class="fill" x="6" y="6" width="12" height="12" rx="2"/>',
  restart: '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.3"/><path d="M3.5 3.5v4.8h4.8"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  // Activities
  keys:
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 20v-5M12 20v-5M16.5 20v-5"/>' +
    '<path class="fill" d="M6.3 4h2.4v11H6.3zM10.8 4h2.4v11h-2.4zM15.3 4h2.4v11h-2.4z"/>',
  ear: '<path d="M6 9a6 6 0 1 1 12 0c0 5.5-5.5 5.5-5.5 9.5a3 3 0 0 1-5.6 1.5"/><path d="M14.8 9.5a2.8 2.8 0 0 0-5.6-.5c0 1.6 1.3 2 2.3 2.6"/>',
  staff:
    '<path d="M2 6h20M2 10h20M2 14h20M2 18h20" opacity=".45"/>' +
    '<ellipse class="fill" cx="10" cy="16" rx="3.2" ry="2.3" transform="rotate(-20 10 16)"/><path d="M13 15.5V4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  stairs: '<path d="M3 20h5v-4h4v-4h4V8h5"/><path d="M21 4v4"/>',
  interval:
    '<ellipse class="fill" cx="7" cy="17.5" rx="3.2" ry="2.3" transform="rotate(-20 7 17.5)"/>' +
    '<ellipse class="fill" cx="17" cy="7" rx="3.2" ry="2.3" transform="rotate(-20 17 7)"/>' +
    '<path d="M10 15l4.5-5" stroke-dasharray="1.5 2.5"/>',
  chord:
    '<ellipse class="fill" cx="9" cy="18" rx="3.2" ry="2.3" transform="rotate(-20 9 18)"/>' +
    '<ellipse class="fill" cx="9" cy="12.5" rx="3.2" ry="2.3" transform="rotate(-20 9 12.5)"/>' +
    '<ellipse class="fill" cx="9" cy="7" rx="3.2" ry="2.3" transform="rotate(-20 9 7)"/><path d="M12 17.5V2.5"/>',
  drum: '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9"/><path d="m5 3 6 5M19 3l-6 5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path class="fill" d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3z"/>',
  circle5:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>' +
    '<path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  heart: '<path class="fill" d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4C21 15 12 20.5 12 20.5z"/>',
  logo:
    '<path class="fill" d="M9 17.5V6.2a1 1 0 0 1 .8-1l8-1.6a1 1 0 0 1 1.2 1v10.9"/><circle class="fill" cx="6.5" cy="17.5" r="2.8"/><circle class="fill" cx="16.5" cy="15.5" r="2.8"/>',
};

export function iconSvg(name, { label } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" ${a11y}>${PATHS[name]}</svg>`;
}

export function icon(name, options) {
  const span = document.createElement('span');
  span.className = 'icon-wrap';
  span.innerHTML = iconSvg(name, options);
  return span.firstChild;
}
