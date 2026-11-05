import { h, useState, useEffect } from '../lib/base.js';
import { Icon } from '../components/Icon.js';
import { CatPill, TaskCard } from '../components/Common.js';
import { CATS, CAT_ORDER, money, feeOf } from '../lib/data.js';

export const Feed = ({ tasks, user, onRequest, go }) => {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = cat === 'all' ? tasks : tasks.filter(t => t.cat === cat);
  const avg = tasks.length ? tasks.reduce((s, t) => s + t.pay, 0) / tasks.length : 0;
  const top = tasks.length ? Math.max.apply(null, tasks.map(t => t.pay)) : 0;
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const request = async task => {
    setBusy(true);
    const ok = await onRequest(task);
    setBusy(false);
    if (ok) setOpen(null);
  };
  const mine = open && user && open.posterId === user.id && !open.isSample;
  return h('main', { className: 'view wrap' },
    h('div', { className: 'phead' },
      h('div', null, h('div', { className: 'eyebrow' }, 'Marketplace'), h('h1', null, 'Tasks around campus'), h('p', null, 'Everything here is posted by a verified IU student. Pay, place and deadline are clear before you request.')),
      h('div', { className: 'metrics' },
        h('div', { className: 'spot metric' }, h('b', null, tasks.length), h('span', null, 'Open tasks')),
        h('div', { className: 'spot metric' }, h('b', null, money(avg)), h('span', null, 'Average pay')),
        h('div', { className: 'spot metric' }, h('b', null, money(top)), h('span', null, 'Top pay')))),
    h('div', { className: 'filters', role: 'group', 'aria-label': 'Filter by category' },
      h('button', { className: 'fpill', 'aria-pressed': cat === 'all', onClick: () => setCat('all') }, 'All', h('small', null, tasks.length)),
      CAT_ORDER.map(c => h('button', { key: c, className: 'fpill', 'aria-pressed': cat === c, onClick: () => setCat(c) }, CATS[c].short, h('small', null, tasks.filter(t => t.cat === c).length)))),
    h('div', { className: 'feed', key: cat },
      list.length
        ? list.map((t, i) => h(TaskCard, { key: t.id, task: t, onOpen: setOpen, index: i }))
        : h('div', { className: 'empty' }, tasks.length ? 'No tasks in this category right now.' : 'No open tasks yet. Be the first to post one.',
            tasks.length ? null : h('div', { style: { marginTop: 16 } }, h('button', { className: 'btn btn-grad', onClick: () => go('post') }, 'Post a task', h(Icon, { name: 'arrow' }))))),
    open ? h('div', { className: 'scrim', onMouseDown: e => { if (e.target === e.currentTarget) setOpen(null); } },
      h('div', { className: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': open.title },
        h('button', { className: 'x', onClick: () => setOpen(null), 'aria-label': 'Close' }, h(Icon, { name: 'x' })),
        h(CatPill, { cat: open.cat }),
        h('h2', null, open.title),
        h('p', { style: { color: 'var(--ink-2)', marginTop: 12 } }, open.desc),
        h('dl', { className: 'dl' },
          h('div', null, h('dt', null, 'Location'), h('dd', null, open.loc || 'To be agreed')),
          h('div', null, h('dt', null, 'Deadline'), h('dd', null, open.deadline)),
          h('div', null, h('dt', null, 'Posted by'), h('dd', null, open.poster)),
          h('div', null, h('dt', null, 'Posted'), h('dd', null, open.ago))),
        h('div', { className: 'earn-box' }, h('span', null, 'You earn the full amount'), h('b', null, money(open.pay))),
        h('p', { className: 'hint' }, `The requester pays ${money(open.pay + feeOf(open.pay))}, which includes the 10% service fee.`),
        h('div', { className: 'modal-actions' },
          mine
            ? h('button', { className: 'btn btn-ghost', disabled: true }, 'This is your own task')
            : h('button', { className: 'btn btn-grad', disabled: busy, onClick: () => request(open) }, busy ? 'Requesting...' : 'Request this task', busy ? null : h(Icon, { name: 'bolt' })),
          h('button', { className: 'btn btn-ghost', onClick: () => setOpen(null) }, 'Not now')))) : null);
};
