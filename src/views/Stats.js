import { h, useState, useEffect } from '../lib/base.js';
import { Icon } from '../components/Icon.js';
import { CatPill, StudentCard } from '../components/Common.js';
import { PeekRating } from '../components/UiBits.js';
import { CountUp } from '../components/Backdrop.js';
import { CATS, CAT_ORDER, money } from '../lib/data.js';

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

export const Stats = ({ user, stats, go }) => {
  const [grown, setGrown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrown(true), 120); return () => clearTimeout(t); }, []);
  const max = Math.max.apply(null, stats.weekly.concat([1]));
  const catTotal = CAT_ORDER.reduce((s, c) => s + (stats.cats[c] || 0), 0) || 1;
  const tiles = [
    ['Jobs completed', stats.jobs, 0, '', '', 'bolt'],
    ['Total earned', stats.earned, 0, '$', '', 'wallet'],
    ['Average rating', stats.rating, 1, '', ' / 5', 'badge'],
    ['Reviews received', stats.reviews, 0, '', '', 'chat'],
    ['Tasks posted', stats.posted, 0, '', '', 'send'],
    ['Spent on tasks', stats.spent, 2, '$', '', 'lock']
  ];
  return h('main', { className: 'view wrap' },
    h('div', { className: 'phead' },
      h('div', null, h('div', { className: 'eyebrow' }, 'Your profile'), h('h1', null, 'My Hustl'), h('p', null, 'Your verified student card and everything you have earned, posted and finished on campus.'))),
    h('div', { className: 'statsgrid' },
      h('div', { className: 'card-stage statscard' }, h(StudentCard, { user, stats, height: 500 })),
      h('div', { style: { display: 'grid', gap: 16, minWidth: 0 } },
        h('div', { className: 'stiles' }, tiles.map(([label, v, d, pre, suf, ic], i) =>
          h('div', { key: label, className: 'spot stile rise', style: { '--i': i } },
            h('span', { className: 'sec-ico' }, h(Icon, { name: ic })),
            h('b', null, label === 'Average rating' && !stats.reviews ? 'New' : h(CountUp, { to: v, decimals: d, prefix: pre, suffix: suf })), h('span', { className: 'k' }, label)))),
        h('div', { className: 'two-col' },
          h('section', { className: 'card panel spot' },
            h('div', { className: 'tsum' }, h('h3', null, 'Earnings by week'), h('span', { className: 'pill pill-ok' }, 'Last 8 weeks')),
            h('div', { className: 'bars', role: 'img', 'aria-label': 'Weekly earnings' }, stats.weekly.map((v, i) =>
              h('div', { key: i, className: 'bar', title: money(v) }, h('em', null, v ? '$' + Math.round(v) : ''), h('i', { style: { height: grown ? (v / max * 100) + '%' : '0%', transitionDelay: i * 70 + 'ms' } }), h('span', null, WEEK_LABELS[i]))))),
          h('section', { className: 'card panel spot' },
            h('div', { className: 'tsum' }, h('h3', null, 'What you hustle at')),
            h('div', { className: 'catbars' }, CAT_ORDER.map(c => h('div', { key: c, className: 'catrow' },
              h('div', { className: 'cl' }, h(CatPill, { cat: c }), h('b', null, stats.cats[c] || 0)),
              h('div', { className: 'track' }, h('i', { style: { width: grown ? ((stats.cats[c] || 0) / catTotal * 100) + '%' : '0%', background: CATS[c].color } }))))))),
        h('section', { className: 'card panel' },
          h('div', { className: 'tsum' }, h('h3', null, 'Recent jobs'), h('button', { className: 'btn btn-ghost btn-sm', onClick: () => go('feed') }, 'Find more', h(Icon, { name: 'arrow' }))),
          stats.history.length
            ? h('div', { className: 'jobs' }, stats.history.map((j, i) => h('div', { key: j.title + i, className: 'jobrow' },
                h('span', { className: 'jico', style: { background: CATS[j.cat].color } }, h(Icon, { name: CATS[j.cat].icon, size: 16 })),
                h('div', { className: 'jt' }, h('b', null, j.title), h('span', null, `${j.when} · ${CATS[j.cat].short}`)),
                h(PeekRating, { value: j.rating, readOnly: true, count: 5, size: 14, activeColor: '#f29a4f', idleColor: 'rgba(17,24,39,.14)', lift: 0, showTip: false }),
                h('b', { className: 'jpay' }, '+' + money(j.pay)))))
            : h('p', { className: 'hint' }, 'No finished jobs yet. Request a task in the feed and it will show up here once you are paid.')))));
};
