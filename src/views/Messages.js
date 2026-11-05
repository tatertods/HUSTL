import { h, useState, useEffect, useRef } from '../lib/base.js';
import { Icon } from '../components/Icon.js';
import { CatPill } from '../components/Common.js';
import { PeekRating, SlideCommit } from '../components/UiBits.js';
import { api, subscribeMessages, STEPS, STATUS_STEP, money, moneyShort, feeOf, initials, clock } from '../lib/data.js';

const Stepper = ({ step }) =>
  h('ol', { className: 'stepper', style: { '--p': step / 3 }, 'aria-label': 'Task progress' },
    STEPS.map((label, i) => {
      const s = step === 3 || i < step ? 'done' : i === step ? 'now' : '';
      return h('li', { key: label, className: 'step', 'data-s': s || undefined, 'aria-current': i === step ? 'step' : undefined },
        h('span', { className: 'n' }, s === 'done' ? h(Icon, { name: 'check', strokeWidth: 3 }) : i + 1), label);
    }));

export const Messages = ({ user, mine, selectedId, setSelectedId, toast, refresh, go }) => {
  const task = mine.find(t => t.id === selectedId) || mine[0] || null;
  const taskId = task ? task.id : null;
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [working, setWorking] = useState(false);
  const threadEl = useRef(null);

  useEffect(() => {
    if (!taskId) { setMsgs([]); return undefined; }
    let alive = true;
    setMsgs([]);
    api.messages(taskId).then(rows => { if (alive) setMsgs(rows); }).catch(() => {});
    const off = subscribeMessages(taskId, m => { if (m && m.id != null) setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : prev.concat(m))); });
    return () => { alive = false; off(); };
  }, [taskId]);

  useEffect(() => { if (threadEl.current) threadEl.current.scrollTop = threadEl.current.scrollHeight; }, [msgs.length]);

  if (!task) {
    return h('main', { className: 'view wrap' },
      h('div', { className: 'phead' }, h('div', null, h('div', { className: 'eyebrow' }, 'Messages'), h('h1', null, 'Messages and progress'), h('p', null, 'Once you post a task or request one, the chat and progress tracker show up here.'))),
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h('button', { className: 'btn btn-grad', onClick: () => go('feed') }, 'Browse tasks', h(Icon, { name: 'arrow' })),
        h('button', { className: 'btn btn-ghost', onClick: () => go('post') }, 'Post a task')));
  }

  const isPoster = task.posterId === user.id;
  const isWorker = task.workerId === user.id;
  const other = isPoster ? (task.worker || '') : task.poster;
  const step = STATUS_STEP[task.status] || 0;
  const pay = task.pay, fee = feeOf(pay), total = pay + fee;
  const hasCode = msgs.some(m => m.kind === 'code');
  const addMsg = row => setMsgs(prev => (prev.some(x => x.id === row.id) ? prev : prev.concat(row)));
  const sys = async text => { addMsg(await api.sendMessage(task.id, user.id, text, 'sys')); };

  const act = async fn => {
    setWorking(true);
    try { await fn(); await refresh(); } catch (err) { toast('That did not go through. Try again.'); }
    setWorking(false);
  };
  const send = async e => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !task.workerId) return;
    setDraft('');
    try {
      addMsg(await api.sendMessage(task.id, user.id, text));
    } catch (err) { toast('Message not sent'); setDraft(text); }
  };
  const shareCode = () => act(async () => {
    addMsg(await api.sendMessage(task.id, user.id, 'HST-' + (1000 + Math.floor(Math.random() * 9000)), 'code'));
  });
  const copy = code => {
    const done = () => toast('Pickup code copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => toast(code));
    else toast(code);
  };
  const release = () => api.markPaid(task.id).then(async () => { await sys('Payment released'); await refresh(); });

  const actions = [];
  if (task.status === 'open') actions.push(h('button', { key: 'w', className: 'btn btn-ghost', disabled: true }, 'Waiting for a student to request this'));
  if (task.status === 'requested') {
    if (isPoster) {
      actions.push(h('button', { key: 'a', className: 'btn btn-grad', disabled: working, onClick: () => act(async () => { await api.setStatus(task.id, 'accepted'); await sys('Request accepted'); }) }, `Accept ${other.split(' ')[0]}`, h(Icon, { name: 'check' })));
      actions.push(h('button', { key: 'd', className: 'btn btn-ghost', disabled: working, onClick: () => act(async () => { await sys('Request declined'); await api.decline(task.id); }) }, 'Decline'));
    } else actions.push(h('button', { key: 'w', className: 'btn btn-ghost', disabled: true }, `Waiting for ${task.poster.split(' ')[0]} to accept...`));
  }
  if (task.status === 'accepted' && isWorker) actions.push(h('button', { key: 's', className: 'btn btn-dark', disabled: working, onClick: () => act(async () => { await api.setStatus(task.id, 'in_progress'); await sys('Task is now in progress'); }) }, 'Start task', h(Icon, { name: 'arrow' })));
  if (task.status === 'in_progress' && isWorker) actions.push(h('button', { key: 'c', className: 'btn btn-grad', disabled: working, onClick: () => act(async () => { await api.setStatus(task.id, 'completed'); await sys('Task marked completed'); }) }, 'Mark Task Completed', h(Icon, { name: 'check' })));
  if ((task.status === 'accepted' || task.status === 'in_progress') && isPoster && !hasCode) actions.push(h('button', { key: 'p', className: 'btn btn-ghost', disabled: working, onClick: shareCode }, 'Share pickup code', h(Icon, { name: 'lock' })));
  if ((task.status === 'accepted' || task.status === 'in_progress') && !isWorker && isPoster) actions.push(h('p', { key: 'i', className: 'hint', style: { textAlign: 'center' } }, `${other.split(' ')[0]} will mark the task complete when it is done.`));
  if (task.status === 'completed' && !task.paid && isWorker && !isPoster) actions.push(h('p', { key: 'i2', className: 'hint', style: { textAlign: 'center' } }, `Waiting for ${task.poster.split(' ')[0]} to release payment.`));

  const revieweeId = isPoster ? task.workerId : task.posterId;
  const label = isPoster ? 'Requester' : 'Worker';

  return h('main', { className: 'view wrap' },
    h('div', { className: 'phead' }, h('div', null, h('div', { className: 'eyebrow' }, isPoster ? 'You posted this task' : 'You requested this task'), h('h1', null, 'Messages and progress'), h('p', null, 'Coordinate details, share the pickup code and watch the task move from request to payment.'))),
    mine.length > 1 ? h('div', { className: 'threads', role: 'group', 'aria-label': 'Your tasks' }, mine.map(t => h('button', { key: t.id, className: 'tchip', 'aria-pressed': t.id === task.id, onClick: () => setSelectedId(t.id) }, h('b', null, t.title), h('small', null, `${t.posterId === user.id ? 'You posted' : 'You requested'} · ${STEPS[STATUS_STEP[t.status] || 0]}`)))) : null,
    h('div', { className: 'msggrid' },
      h('section', { className: 'card chat', 'aria-label': 'Chat' },
        h('div', { className: 'chat-head' },
          h('span', { className: 'avatar' }, initials(other || '?')),
          h('div', { className: 't' }, h('b', null, other || 'No student yet', other ? h('span', { className: 'vtick' }, h(Icon, { name: 'check', strokeWidth: 3 })) : null), h('span', { className: 's' }, `Verified student · ${task.loc || 'location to be agreed'}`)),
          h(CatPill, { cat: task.cat })),
        h('div', { className: 'thread', ref: threadEl, 'aria-live': 'polite' },
          h('div', { className: 'sys' }, h(Icon, { name: 'bolt', size: 13 }), `Task posted: "${task.title}"`),
          msgs.map(m => m.kind === 'sys' ? h('div', { key: m.id, className: 'sys' }, h(Icon, { name: 'bolt', size: 13 }), m.body)
            : m.kind === 'code' ? h('div', { key: m.id, className: 'codecard' + (m.sender_id === user.id ? '' : ' them') }, h('div', null, h('small', null, 'Pickup code'), h('b', null, m.body)), h('button', { className: 'copybtn', onClick: () => copy(m.body) }, 'Copy'))
            : h('div', { key: m.id, className: 'bub ' + (m.sender_id === user.id ? 'me' : 'them') }, m.body, h('time', null, clock(m.created_at))))),
        h('form', { className: 'composer', onSubmit: send },
          h('input', { className: 'input', disabled: !task.workerId, placeholder: task.workerId ? `Message ${other.split(' ')[0]}...` : 'Chat opens when a student requests this task', value: draft, 'aria-label': 'Message', onChange: e => setDraft(e.target.value) }),
          h('button', { className: 'send', type: 'submit', disabled: !task.workerId, 'aria-label': 'Send' }, h(Icon, { name: 'send' })))),
      h('div', null,
        h('section', { className: 'card panel' },
          h('div', { className: 'tsum' }, h('div', { style: { minWidth: 0 } }, h(CatPill, { cat: task.cat }), h('h3', { style: { marginTop: 10 } }, task.title), h('p', null, `${task.loc} · ${task.deadline}`)), h('div', { className: 'earn' }, h('b', null, moneyShort(pay)), h('span', null, 'Worker pay'))),
          h(Stepper, { step }),
          actions.length ? h('div', { className: 'act' }, actions) : null),
        h('section', { className: 'card panel' },
          h('div', { className: 'tsum' }, h('h3', null, 'Payment and escrow'), h('span', { className: 'pill ' + (task.paid ? 'pill-ok' : 'pill-warm') }, h(Icon, { name: task.paid ? 'check' : 'lock' }), task.paid ? 'Released' : 'Held in escrow')),
          h('div', { style: { marginTop: 8 } },
            h('div', { className: 'esc-row' }, h('span', null, 'Worker earns'), h('b', null, money(pay))),
            h('div', { className: 'esc-row' }, h('span', null, 'Hustl. fee (10%, paid by requester)'), h('b', null, money(fee))),
            h('div', { className: 'esc-row hl' }, h('span', null, 'Requester pays in total'), h('b', null, money(total)))),
          h('p', { className: 'hint' }, 'Pilot note: Hustl. records the amounts and the release, but no money moves through the app yet. Settle up directly after the task.'),
          task.status === 'completed' && isPoster ? h('div', { className: 'slide-zone' },
            h(SlideCommit, { label: 'Slide to release payment', doneLabel: 'Released', errorLabel: 'Could not release', onConfirm: release, trackColor: '#111827', handleColor: '#ffffff', successColor: '#10b981', width: 300, height: 58, radius: 29, holdMs: 0, disabled: task.paid }),
            h('p', null, task.paid ? 'Marked as paid.' : 'Confirm the task was done to release the escrow.')) : null,
          task.paid ? h('div', null,
            h('div', { className: 'receipt' },
              h('span', { className: 'eyebrow' }, 'Payment confirmed'),
              h('span', { className: 'big' }, isPoster ? `You owe ${money(total)}` : `You earned ${money(pay)}`),
              h('span', { style: { color: 'var(--ink-2)', fontSize: 14 } }, isPoster ? `${other} receives ${money(pay)}. Hustl. fee is ${money(fee)}.` : `The requester pays ${money(total)} in total, including a ${money(fee)} fee.`)),
            revieweeId ? h('div', { className: 'rate' },
              h('div', { className: 'eyebrow' }, `Rate ${other ? other.split(' ')[0] : label}`),
              h(PeekRating, { count: 5, labels: ['Poor', 'Fair', 'Good', 'Great', 'Superb'], activeColor: '#f29a4f', idleColor: 'rgba(17,24,39,.16)', tipColor: '#111827', tipTextColor: '#ffffff', size: 32, lift: 7, magnify: 1.15, popScale: 1.3, ariaLabel: 'Rate this student',
                onChange: v => { if (v) api.review(task.id, user.id, revieweeId, v).then(() => { toast(`Thanks, rated ${v} of 5`); refresh(); }).catch(() => toast('Rating not saved')); } })) : null) : null))));
};
