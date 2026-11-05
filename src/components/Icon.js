import { h } from '../lib/base.js';

/* ===== Inline icon set (stroke icons, 24px grid) ===== */
const ICON_PATHS = {
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  lock: [['rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }], ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]],
  shield: [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }], ['path', { d: 'm9 12 2 2 4-4' }]],
  arrow: [['path', { d: 'M5 12h14' }], ['path', { d: 'm12 5 7 7-7 7' }]],
  pin: [['path', { d: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z' }], ['circle', { cx: 12, cy: 10, r: 3 }]],
  clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
  send: [['path', { d: 'm22 2-7 20-4-9-9-4z' }], ['path', { d: 'M22 2 11 13' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  x: [['path', { d: 'M18 6 6 18M6 6l12 12' }]],
  mail: [['rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }], ['path', { d: 'm22 7-10 6L2 7' }]],
  bolt: [['path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }]],
  fingerprint: [
    ['path', { d: 'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4' }], ['path', { d: 'M14 13.12c0 2.38 0 6.38-1 8.88' }],
    ['path', { d: 'M17.29 21.02c.12-.6.43-2.3.5-3.02' }], ['path', { d: 'M2 12a10 10 0 0 1 18-6' }],
    ['path', { d: 'M21.8 16c.2-2 .131-5.354 0-6' }], ['path', { d: 'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2' }],
    ['path', { d: 'M8.65 22c.21-.66.45-1.32.57-2' }], ['path', { d: 'M9 6.8a6 6 0 0 1 9 5.2v2' }]
  ],
  badge: [
    ['path', { d: 'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z' }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  package: [
    ['path', { d: 'm7.5 4.27 9 5.15' }],
    ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }],
    ['path', { d: 'm3.3 7 8.7 5 8.7-5' }], ['path', { d: 'M12 22V12' }]
  ],
  cart: [['circle', { cx: 8, cy: 21, r: 1 }], ['circle', { cx: 19, cy: 21, r: 1 }], ['path', { d: 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12' }]],
  book: [['path', { d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20' }]],
  chat: [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
  copy: [['rect', { x: 9, y: 9, width: 13, height: 13, rx: 2 }], ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }]],
  wallet: [['path', { d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' }], ['path', { d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' }]],
  truck: [
    ['path', { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' }], ['path', { d: 'M15 18H9' }],
    ['path', { d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14' }],
    ['circle', { cx: 17, cy: 18, r: 2 }], ['circle', { cx: 7, cy: 18, r: 2 }]
  ],
  coffee: [['path', { d: 'M10 2v2M14 2v2M6 2v2' }], ['path', { d: 'M16 8h1a4 4 0 1 1 0 8h-1' }], ['path', { d: 'M3 8h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z' }]],
  print: [['path', { d: 'M6 9V2h12v7' }], ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }], ['rect', { x: 6, y: 14, width: 12, height: 8 }]],
  sheet: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ['path', { d: 'M3 9h18M3 15h18M9 3v18' }]]
};

export const Icon = ({ name, size, className, strokeWidth = 2 }) => {
  const parts = ICON_PATHS[name] || [];
  return h(
    'svg',
    {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round',
      strokeLinejoin: 'round', width: size, height: size, className, 'aria-hidden': 'true', focusable: 'false'
    },
    parts.map((p, i) => h(p[0], Object.assign({ key: i }, p[1])))
  );
};

export const Logo = ({ size = 30 }) =>
  h('span', { className: 'logo', style: { fontSize: size }, role: 'img', 'aria-label': 'Hustl.' },
    h('span', { className: 'logo-word' }, 'Hustl'),
    h('span', { className: 'logo-dot' }),
    h('svg', { viewBox: '0 0 100 9', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      h('defs', null, h('linearGradient', { id: 'swoosh', x1: '0', x2: '1' },
        h('stop', { offset: '0', stopColor: '#e965b9' }), h('stop', { offset: '1', stopColor: '#f29a4f' }))),
      h('path', { d: 'M0 7 C 30 0.5, 70 0.5, 100 3 C 70 3.5, 30 4.5, 4 9 Z', fill: 'url(#swoosh)' })
    )
  );
