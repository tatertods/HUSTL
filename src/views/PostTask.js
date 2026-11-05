import { h, useState } from '../lib/base.js';
import { Icon } from '../components/Icon.js';
import { CatPill, TaskCard } from '../components/Common.js';
import { CATS, POST_ORDER, LOCATIONS, DEADLINES, money, feeOf } from '../lib/data.js';
import { useCountUp } from '../lib/hooks.js';
import { SlideCommit } from '../components/UiBits.js';

export const PostTask = ({ user, onPublish, toast }) => {
  const [f, setF] = useState({ title: '', cat: 'pickup', desc: '', loc: '', deadline: DEADLINES[1], pay: '15' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(prev => Object.assign({}, prev, { [k]: v }));
  const payNum = parseFloat(f.pay);
  const payOk = !isNaN(payNum) && payNum >= 5 && payNum <= 100;
  const pay = payOk ? payNum : 0;
  const fee = feeOf(pay);
  const total = useCountUp(pay + fee);
  const feeShown = useCountUp(fee);
  const payShown = useCountUp(pay);
  const errs = {
    title: f.title.trim().length < 4 ? 'Give your task a clear title (4+ characters).' : '',
    desc: f.desc.trim().length < 10 ? 'Add a few details so workers know what to do.' : '',
    loc: !f.loc.trim() ? 'Where should the worker go?' : '',
    pay: !payOk ? 'Offer between $5 and $100. Most tasks run $5 to $25.' : ''
  };
  const bad = Object.keys(errs).some(k => errs[k]);
  const submit = async e => {
    e.preventDefault();
    setTried(true);
    if (bad) { toast('Fill in the highlighted fields'); return; }
    setBusy(true);
    await onPublish({ cat: f.cat, title: f.title.trim(), desc: f.desc.trim(), loc: f.loc.trim(), deadline: f.deadline, pay: payNum });
    setBusy(false);
  };
  const slidePost = async () => {
    setTried(true);
    if (bad) { toast('Fill in the highlighted fields'); throw new Error('invalid'); }
    const ok = await onPublish({ cat: f.cat, title: f.title.trim(), desc: f.desc.trim(), loc: f.loc.trim(), deadline: f.deadline, pay: payNum });
    if (!ok) throw new Error('publish failed');
  };
  const show = k => (tried && errs[k] ? errs[k] : '');
  const preview = { cat: f.cat, title: f.title.trim(), desc: f.desc.trim(), loc: f.loc.trim(), dist: null, deadline: f.deadline, pay, poster: user ? user.name : 'You', ago: 'Preview' };
  return h('main', { className: 'view wrap' },
    h('div', { className: 'phead' }, h('div', null, h('div', { className: 'eyebrow' }, 'Post a task'), h('h1', null, 'What do you need done?'), h('p', null, 'Set the details once. A verified student will see the exact pay, place and deadline before they accept.'))),
    h('form', { className: 'postgrid', onSubmit: submit, noValidate: true },
      h('div', { className: 'card form' },
        h('div', null, h('label', { className: 'lab', htmlFor: 'f-title' }, 'Task title'),
          h('input', { id: 'f-title', className: 'input', placeholder: 'Pick up my package from the mailroom', maxLength: 70, value: f.title, 'aria-invalid': show('title') ? 'true' : undefined, onChange: e => set('title', e.target.value) }),
          show('title') ? h('p', { className: 'err' }, show('title')) : null),
        h('div', null, h('span', { className: 'lab' }, 'Category'),
          h('div', { className: 'seg' }, POST_ORDER.map(c => h('button', { key: c, type: 'button', className: 'segbtn', 'aria-pressed': f.cat === c, onClick: () => set('cat', c) }, h('i', { className: 'dot', style: { background: CATS[c].color } }), CATS[c].label)))),
        h('div', null, h('label', { className: 'lab', htmlFor: 'f-desc' }, 'Details'),
          h('textarea', { id: 'f-desc', className: 'textarea', maxLength: 600, placeholder: 'What exactly should the worker do, bring or know?', value: f.desc, 'aria-invalid': show('desc') ? 'true' : undefined, onChange: e => set('desc', e.target.value) }),
          show('desc') ? h('p', { className: 'err' }, show('desc')) : null),
        h('div', { className: 'two-in' },
          h('div', null, h('label', { className: 'lab', htmlFor: 'f-loc' }, 'Location'),
            h('input', { id: 'f-loc', className: 'input', list: 'locs', placeholder: 'Main Library, Student Union...', value: f.loc, 'aria-invalid': show('loc') ? 'true' : undefined, onChange: e => set('loc', e.target.value) }),
            h('datalist', { id: 'locs' }, LOCATIONS.map(l => h('option', { key: l, value: l }))),
            show('loc') ? h('p', { className: 'err' }, show('loc')) : null),
          h('div', null, h('label', { className: 'lab', htmlFor: 'f-dl' }, 'Deadline'),
            h('select', { id: 'f-dl', className: 'select', value: f.deadline, onChange: e => set('deadline', e.target.value) }, DEADLINES.map(d => h('option', { key: d }, d))))),
        h('div', null, h('label', { className: 'lab', htmlFor: 'f-pay' }, 'Offered pay', h('small', null, 'The worker keeps all of it')),
          h('div', { className: 'paywrap' }, h('span', null, '$'), h('input', { id: 'f-pay', inputMode: 'decimal', value: f.pay, 'aria-invalid': show('pay') ? 'true' : undefined, onChange: e => set('pay', e.target.value.replace(/[^0-9.]/g, '')) })),
          h('div', { className: 'chips' }, [5, 10, 15, 20, 25].map(n => h('button', { key: n, type: 'button', className: 'chipb', 'aria-pressed': payNum === n, onClick: () => set('pay', String(n)) }, '$' + n))),
          show('pay') ? h('p', { className: 'err' }, show('pay')) : null)),
      h('aside', { className: 'side' },
        h('div', { className: 'bill' },
          h('h3', null, 'Fee breakdown'),
          h('div', { className: 'row' }, h('span', null, 'Worker earns'), h('b', null, money(payShown))),
          h('div', { className: 'row' }, h('span', null, 'Hustl. fee (10%)'), h('b', null, money(feeShown))),
          h('div', { className: 'tot' }, h('span', null, 'You fund in escrow'), h('b', null, money(total))),
          h('p', { className: 'tiny' }, 'Slide below to fund the escrow and post your task. The worker is paid from it when the job is done. Pilot note: no real money moves yet.')),
        h('div', null, h('div', { className: 'preview-label' }, 'Live preview'), h(TaskCard, { task: preview, preview: true })),
        h('div', { className: 'slide-zone' },
          h(SlideCommit, { label: 'Slide to fund and post', doneLabel: 'Posted', errorLabel: 'Could not post', onConfirm: slidePost, trackColor: '#111827', handleColor: '#ffffff', successColor: '#10b981', width: 320, height: 60, radius: 30, holdMs: 0 }),
          h('p', null, 'You pay ' + money(pay + fee) + ' into escrow. ' + money(pay) + ' goes to the worker.')))));
};
