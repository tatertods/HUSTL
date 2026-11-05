import { h, useState } from '../lib/base.js';
import { Icon, Logo } from '../components/Icon.js';
import { PatternWaves } from '../components/PatternWaves.js';
import { TrueFocus } from '../components/UiBits.js';
import { StudentCard } from '../components/Common.js';
import { checkEmail } from '../lib/data.js';
import { supabase, configured } from '../lib/supabase.js';
import { api } from '../lib/data.js';

const authMessage = error => {
  const msg = String((error && error.message) || '').toLowerCase();
  if (error && error.status === 429 || msg.includes('rate limit') || msg.includes('too many')) return 'Too many tries. Wait a minute and request a new code.';
  if (msg.includes('database error') || msg.includes('iu.edu')) return 'Only @iu.edu addresses can join Hustl.';
  return 'We could not send the code. Check the address and try again in a minute.';
};

const NameForm = ({ user, onSaved }) => {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return;
    setBusy(true);
    try { await api.saveName(user.id, clean); await onSaved(); } catch (err) { /* keep form open */ }
    setBusy(false);
  };
  return h('form', { onSubmit: submit },
    h('p', { className: 'sub', style: { marginTop: 14 } }, 'Confirm the name other students will see.'),
    h('div', { className: 'fieldrow' },
      h('input', { className: 'input', value: name, maxLength: 40, 'aria-label': 'Display name', onChange: e => setName(e.target.value) }),
      h('button', { className: 'btn btn-dark', type: 'submit', disabled: busy }, busy ? 'Saving...' : 'Save name')));
};

const VerifyCard = ({ user, profile, onProfileSaved, go, signOut }) => {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clean = email.trim().toLowerCase();

  const send = async e => {
    if (e) e.preventDefault();
    const msg = checkEmail(email);
    setError(msg);
    if (msg) return;
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) { setError(authMessage(err)); return; }
    setMode('code'); setCode('');
  };
  const confirm = async e => {
    e.preventDefault();
    if (code.trim().length < 6) { setError('Enter the 6 digit code from your email.'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: clean, token: code.trim(), type: 'email' });
    setBusy(false);
    if (err) setError('That code is wrong or expired. Request a new one.');
  };

  if (!configured) {
    return h('div', { className: 'verify-card rise', style: { '--i': 4 } },
      h('h3', null, 'Connect Supabase'),
      h('p', { className: 'sub' }, 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (or your Vercel settings), then reload.'));
  }
  if (user) {
    return h('div', { className: 'verify-card rise', style: { '--i': 4 } },
      h('div', { className: 'ok-row' }, h('span', { className: 'ok-ring' }, h(Icon, { name: 'shield' })),
        h('div', null, h('h3', null, `You are verified, ${user.name.split(' ')[0]}`), h('p', { className: 'sub' }, user.email))),
      profile && !profile.name_confirmed ? h(NameForm, { user, onSaved: onProfileSaved }) : null,
      h('div', { className: 'fieldrow' },
        h('button', { className: 'btn btn-grad', onClick: () => go('feed') }, 'Browse tasks', h(Icon, { name: 'arrow' })),
        h('button', { className: 'btn btn-ghost', onClick: () => go('post') }, 'Post a task')),
      h('button', { type: 'button', className: 'replay', onClick: signOut }, 'Sign out'));
  }
  return h('div', { className: 'verify-card rise', style: { '--i': 4 } },
    mode === 'email'
      ? h('form', { onSubmit: send, noValidate: true },
          h('h3', null, 'Verify you are an IU student'),
          h('p', { className: 'sub' }, 'Use your campus email. Only verified students can post and accept tasks.'),
          h('div', { className: 'fieldrow' },
            h('input', { className: 'input', type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'you@iu.edu', value: email, 'aria-label': 'Campus email', 'aria-invalid': error ? 'true' : undefined, onChange: e => { setEmail(e.target.value); if (error) setError(''); } }),
            h('button', { className: 'btn btn-grad', type: 'submit', disabled: busy }, busy ? 'Sending...' : 'Send code', busy ? null : h(Icon, { name: 'arrow' }))),
          error ? h('p', { className: 'err', role: 'alert' }, error) : h('p', { className: 'hint' }, 'Accepted: @iu.edu addresses during the Bloomington pilot.'))
      : h('form', { onSubmit: confirm, noValidate: true },
          h('h3', null, 'Enter your 6 digit code'),
          h('p', { className: 'sub' }, `We sent it to ${clean}. Check spam if it does not show up.`),
          h('div', { className: 'fieldrow' },
            h('input', { className: 'input codeinput', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6, placeholder: '000000', value: code, 'aria-label': '6 digit code', 'aria-invalid': error ? 'true' : undefined, onChange: e => { setCode(e.target.value.replace(/\D/g, '')); if (error) setError(''); } }),
            h('button', { className: 'btn btn-grad', type: 'submit', disabled: busy }, busy ? 'Checking...' : 'Verify', busy ? null : h(Icon, { name: 'check' }))),
          error ? h('p', { className: 'err', role: 'alert' }, error) : null,
          h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
            h('button', { type: 'button', className: 'replay', onClick: () => send() }, 'Send a new code'),
            h('button', { type: 'button', className: 'replay', onClick: () => { setMode('email'); setError(''); } }, 'Use a different email'))));
};

export const Landing = ({ user, profile, onProfileSaved, go, signOut }) => {
  const secure = [
    ['mail', 'Campus email only', 'Every account is tied to a working @iu.edu address.'],
    ['badge', 'Verified badges', 'Requesters and workers carry a visible student badge.'],
    ['lock', 'Protected payment', 'The task fee is tracked in escrow until the task is marked complete.'],
    ['clock', 'Clear terms upfront', 'Pay, place and deadline are shown before anyone accepts.']
  ];
  const mvp = [
    ['01', 'Campus email verification', 'Gated access for IU students only.', 'home'],
    ['02', 'Task posting form', 'Title, category, place, deadline and pay.', 'post'],
    ['03', 'Task feed and filters', 'Browse by category and distance.', 'feed'],
    ['04', 'Messaging and status', 'Chat, pickup codes and a live tracker.', 'messages'],
    ['05', 'Payment and escrow', 'Earnings and totals confirmed at the end.', 'messages']
  ];
  return h('main', { className: 'view' },
    h('section', { className: 'hero' },
      h('div', { className: 'hero-bg' }),
      h('div', { className: 'hero-waves', 'aria-hidden': 'true' },
        h(PatternWaves, { preset: 'ocean', color: '#e865b8', backgroundColor: '#ffffff', fade: 'edges', fadeSize: 0.45, cursorSize: 60 })),
      h('div', { className: 'wrap hero-in' },
        h('div', null,
          h('div', { className: 'hero-affil rise' }, h('span', { className: 'iu-badge' }, 'IU'), 'Indiana University | Sigma Eta Pi Case Competition'),
          h('h1', { className: 'wordmark rise', style: { '--i': 1 } }, h(Logo, { size: 'clamp(76px, 13vw, 168px)' })),
          h('div', { className: 'tagline rise', style: { '--i': 2 } },
            h(TrueFocus, { sentence: 'Your Campus. Your Hustle.', borderColor: '#d1409c', blurAmount: 3, animationDuration: 0.6, pauseBetweenAnimations: 1.2, cornerSize: 14, borderWidth: 3 })),
          h('p', { className: 'hero-sub rise', style: { '--i': 3 } }, 'A verified marketplace where IU students post one-time tasks and fellow students claim them for flexible pay.'),
          h(VerifyCard, { user, profile, onProfileSaved, go, signOut })),
        h('div', { className: 'card-stage rise', style: { '--i': 3 } }, h(StudentCard, { user })))),
    h('div', { className: 'wrap' },
      h('div', { className: 'secure' }, secure.map(([ic, t, d]) =>
        h('div', { className: 'spot sec-item', key: t }, h('span', { className: 'sec-ico' }, h(Icon, { name: ic })), h('h4', null, t), h('p', null, d)))),
      h('section', { className: 'section' },
        h('div', { className: 'eyebrow' }, 'The problem'),
        h('h2', null, 'Flexible income and fast help are stuck in group chats.'),
        h('div', { className: 'two' },
          h('div', null,
            h('p', { className: 'lead' }, 'Students need to earn between classes without rigid shifts. Others need quick, affordable help with package pickups, grocery runs, move-in days and peer tutoring. Flyers and group chats are slow, messy and impossible to trust.'),
            h('p', { className: 'lead', style: { marginTop: 14 } }, 'Hustl. keeps agreement, pricing, deadlines, messaging and status updates in one place.'),
            h('div', { className: 'statline' }, h('span', { className: 'pill pill-ok' }, 'Verified students only'), h('span', { className: 'pill' }, '$5 to $25 per task'), h('span', { className: 'pill' }, 'Free during the pilot'))),
          h('div', { style: { display: 'grid', gap: 16 } },
            h('div', { className: 'card persona' },
              h('div', { className: 'who' }, h('span', { className: 'avatar' }, 'R'), h('div', null, h('div', { className: 'eyebrow' }, 'Persona'), h('h3', null, 'Task requesters'))),
              h('ul', null,
                h('li', null, h('b', null, 'Who'), h('span', null, 'Full-time undergraduates, 18 to 24, in campus housing or nearby apartments.')),
                h('li', null, h('b', null, 'Pain'), h('span', null, 'Busy schedules, no reliable local help, cluttered group chats.')),
                h('li', null, h('b', null, 'Will pay'), h('span', null, '$5 to $25 depending on effort, distance and urgency.')))),
            h('div', { className: 'card persona' },
              h('div', { className: 'who' }, h('span', { className: 'avatar alt' }, 'W'), h('div', null, h('div', { className: 'eyebrow' }, 'Persona'), h('h3', null, 'Task workers'))),
              h('ul', null,
                h('li', null, h('b', null, 'Who'), h('span', null, 'Undergraduates who want flexible money for groceries, books or rent.')),
                h('li', null, h('b', null, 'Pain'), h('span', null, 'Rigid campus shifts, vague task details, uncertain pay.')),
                h('li', null, h('b', null, 'Needs'), h('span', null, 'Full clarity on details, place, pay and deadline before accepting.'))))))),
      h('section', { className: 'section' },
        h('div', { className: 'eyebrow' }, 'Revenue model'),
        h('h2', null, 'Workers keep every dollar. Requesters pay a 10% fee.'),
        h('div', { className: 'rev' },
          h('div', { className: 'rev-main' },
            h('h3', null, 'A $20 task, end to end'),
            h('div', { className: 'rev-eq' },
              h('div', { className: 'eq-row' }, h('span', null, 'Worker receives'), h('b', null, '$20.00')),
              h('div', { className: 'eq-row' }, h('span', null, 'Hustl. service fee (10%)'), h('b', null, '$2.00')),
              h('div', { className: 'eq-row total' }, h('span', null, 'Requester pays'), h('b', null, '$22.00')))),
          h('div', { className: 'rev-side' },
            h('div', { className: 'rev-note' }, h('h4', null, 'Pilot strategy'), h('p', null, 'Browsing and posting are free during the MVP launch to drive student adoption.')),
            h('div', { className: 'rev-note' }, h('h4', null, 'Why requesters accept it'), h('p', null, 'A couple of dollars buys a verified student, a fixed price and a clear record.')),
            h('div', { className: 'rev-note' }, h('h4', null, 'Why workers trust it'), h('p', null, 'The listed pay is exactly what the requester owes them. No surprise cuts.'))))),
      h('section', { className: 'section' },
        h('div', { className: 'eyebrow' }, 'The MVP'),
        h('h2', null, 'Five features. One complete journey.'),
        h('div', { className: 'mvp-grid' }, mvp.map(([k, t, d, to]) =>
          h('button', { key: k, className: 'mvp', onClick: () => go(to) }, h('span', { className: 'k' }, k), h('h4', null, t), h('p', null, d), h('span', { className: 'go' }, 'Try it', h(Icon, { name: 'arrow' })))))),
      h('footer', { className: 'foot' }, h(Logo, { size: 22 }), h('span', null, 'Indiana University | Sigma Eta Pi Case Competition'), h('span', null, 'Your Campus. Your Hustle.'))));
};
