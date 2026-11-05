import { h, useState, useLayoutEffect, useRef, Fragment } from '../lib/base.js';
import { Icon, Logo } from './Icon.js';
import { ReflectiveCard } from './ReflectiveCard.js';
import { CATS, initials, moneyShort } from '../lib/data.js';

export const CatPill = ({ cat }) => h('span', { className: 'cat', 'data-c': cat }, h('i'), CATS[cat].short);

export const Header = ({ view, go, user }) => {
  const tabsRef = useRef(null);
  const [pill, setPill] = useState({ x: 0, w: 0 });
  const items = [['home', 'Home'], ['feed', 'Task Feed'], ['post', 'Post a Task'], ['messages', 'Messages'], ['stats', 'My Hustl']];
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabsRef.current && tabsRef.current.querySelector('[aria-current="page"]');
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [view]);
  return h('header', { className: 'topbar' },
    h('div', { className: 'wrap topbar-in' },
      h('button', { className: 'brandbtn', onClick: () => go('home'), 'aria-label': 'Hustl. home' }, h(Logo, { size: 28 })),
      h('nav', { className: 'tabs', ref: tabsRef, 'aria-label': 'Main' },
        h('span', { className: 'tab-pill', style: { transform: `translateX(${pill.x}px)`, width: pill.w } }),
        items.map(([id, label]) => h('button', { key: id, className: 'tab', 'aria-current': view === id ? 'page' : undefined, onClick: () => go(id) }, label))),
      h('button', { className: 'vchip', 'data-on': !!user, onClick: () => go('home'), title: user ? user.email : 'Verify your campus email' },
        h('i'), user ? 'Verified student' : 'Verify your email'))
  );
};

export const TaskCard = ({ task, onOpen, preview, index = 0 }) =>
  h('article', { className: 'spot task rise' + (preview ? ' preview' : ''), style: { '--i': index } },
    h('div', { className: 'task-top' },
      h('div', { style: { display: 'grid', gap: 10, minWidth: 0 } }, h(CatPill, { cat: task.cat }), h('h3', null, task.title || 'Your task title')),
      h('div', { className: 'earn' }, h('b', null, moneyShort(task.pay)), h('span', null, 'You earn'))),
    h('p', null, task.desc || 'Add a short description so workers know exactly what to expect.'),
    h('div', { className: 'meta' },
      h('span', null, h(Icon, { name: 'pin' }), task.loc || 'Add a location', task.dist != null ? ` · ${task.dist} mi` : ''),
      h('span', null, h(Icon, { name: 'clock' }), task.deadline)),
    h('div', { className: 'task-foot' },
      h('div', { className: 'poster' }, h('span', { className: 'avatar' }, initials(task.poster)), h('span', null, task.poster), h('span', { className: 'vtick', title: 'Verified student' }, h(Icon, { name: 'check', strokeWidth: 3 }))),
      preview ? h('span', { className: 'pill' }, task.ago) : h('button', { className: 'btn btn-dark btn-sm', onClick: () => onOpen(task) }, 'Details & Request', h(Icon, { name: 'arrow' }))));

const Silhouette = () => h('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
  h('defs', null, h('clipPath', { id: 'sil-clip' }, h('circle', { cx: 60, cy: 60, r: 60 }))),
  h('g', { clipPath: 'url(#sil-clip)', fill: '#fff', opacity: 0.95 }, h('circle', { cx: 60, cy: 46, r: 20 }), h('path', { d: 'M16 126c2-27 21-42 44-42s42 15 44 42z' })));

export const StudentCard = ({ user, stats, width = 340, height = 460 }) => {
  const name = user ? user.name : 'Your Name Here';
  const content = h(Fragment, null,
    h('div', { className: 'reflective-card__header' },
      h('span', { className: 'reflective-card__badge' }, h(Icon, { name: 'badge', size: 16, strokeWidth: 1.8 }), user ? 'Verified student' : 'Awaiting verification'),
      h('span', { className: 'reflective-card__status' }, h('span', { className: 'reflective-card__dot' }), user ? 'Active' : 'Pending')),
    h('div', { className: 'idc-avatar' }, h(Silhouette)),
    h('div', { className: 'reflective-card__identity' },
      h('h3', { className: 'reflective-card__name' }, name),
      h('p', { className: 'reflective-card__role' }, 'Verified campus student')),
    stats ? h('div', { className: 'idc-stats' }, [['Jobs', String(stats.jobs)], ['Earned', '$' + Math.round(stats.earned)], ['Rating', stats.reviews ? stats.rating.toFixed(1) : 'New']].map(([k, v]) => h('div', { key: k }, h('b', null, v), h('span', null, k)))) : null,
    h('div', { className: 'reflective-card__footer' },
      h('div', { className: 'reflective-card__id' }, h('span', { className: 'reflective-card__label' }, 'Campus email'), h('span', { className: 'reflective-card__value' }, user ? user.email : 'you@campus.edu')),
      h('span', { className: 'reflective-card__tile' }, h(Icon, { name: 'fingerprint', size: 22, strokeWidth: 1.6 }))));
  return h(ReflectiveCard, {
    children: content, statusColor: user ? '#10b981' : '#f29a4f', width, height, radius: 30, theme: 'light',
    tint: '#fff1f8', metalness: 0.35, roughness: 0.2, blurStrength: 8, glare: 0.55, warp: 0.5
  });
};

export const GateCard = ({ go, text }) =>
  h('main', { className: 'view wrap' },
    h('div', { className: 'phead' }, h('div', null, h('div', { className: 'eyebrow' }, 'Students only'), h('h1', null, 'Verify to continue'), h('p', null, text || 'Hustl. is open to verified college students. It takes under a minute.'))),
    h('div', null, h('button', { className: 'btn btn-grad', onClick: () => go('home') }, 'Verify with my campus email', h(Icon, { name: 'arrow' }))));
