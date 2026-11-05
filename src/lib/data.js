import { supabase } from './supabase.js';

/* ---------- constants ---------- */
export const FEE_RATE = 0.1;
export const CATS = {
  errands: { label: 'Grocery / Errand Runs', short: 'Errands', icon: 'cart', color: '#f29a4f' },
  movein: { label: 'Move-In Help', short: 'Move-In Help', icon: 'truck', color: '#e865b8' },
  tutoring: { label: 'Peer Tutoring', short: 'Tutoring', icon: 'book', color: '#6366f1' },
  pickup: { label: 'Package Pickup', short: 'Package Pickup', icon: 'package', color: '#10b981' },
  odd: { label: 'Odd Jobs', short: 'Odd Jobs', icon: 'bolt', color: '#0ea5e9' }
};
export const CAT_ORDER = ['errands', 'movein', 'tutoring', 'pickup', 'odd'];
export const POST_ORDER = ['pickup', 'errands', 'movein', 'tutoring', 'odd'];
export const LOCATIONS = ['Wright Quad', 'SRSC', 'Wells Library', 'Indiana Memorial Union', 'Briscoe Quad', 'Luddy Hall', 'Kelley School of Business', 'Union Street Apartments'];
export const DEADLINES = ['Within 1 hour', 'Today, 5:00 PM', 'Today, 8:00 PM', 'Tomorrow, 9:00 AM', 'Tomorrow, 6:00 PM', 'This weekend'];
export const STEPS = ['Requested', 'Accepted', 'In Progress', 'Completed'];
export const STATUS_STEP = { open: 0, requested: 0, accepted: 1, in_progress: 2, completed: 3 };

/* ---------- helpers ---------- */
export const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);
export const moneyShort = n => (Number.isInteger(n) ? '$' + n : money(n));
export const feeOf = pay => Math.round(pay * FEE_RATE * 100) / 100;
export const initials = name => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
export const clock = iso => new Date(iso || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const checkEmail = value => {
  const e = value.trim().toLowerCase();
  if (!e) return 'Enter your campus email to continue.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'That does not look like an email address yet.';
  if (!e.endsWith('.edu')) return 'Hustl. needs a .edu campus email to keep the marketplace verified.';
  if (!/@(.+\.)?iu\.edu$/.test(e)) return 'The pilot is open to Indiana University only. Use your @iu.edu address.';
  return '';
};
export const nameFrom = email => {
  const local = String(email || '').split('@')[0].replace(/[0-9]+/g, '');
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return 'Hoosier';
  return parts.map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
};
export const timeAgo = iso => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  return Math.floor(s / 86400) + ' d ago';
};

/* ---------- row mapping ---------- */
const SEL = '*, poster:profiles!poster_id(full_name), worker:profiles!worker_id(full_name)';
export const rowToTask = r => ({
  id: r.id,
  cat: CATS[r.category] ? r.category : 'odd',
  title: r.title,
  desc: r.description || '',
  loc: r.location || '',
  dist: null,
  deadline: r.deadline || '',
  pay: Number(r.pay),
  poster: r.poster_name || (r.poster && r.poster.full_name) || 'IU student',
  worker: (r.worker && r.worker.full_name) || (r.worker_id ? 'IU student' : ''),
  posterId: r.poster_id,
  workerId: r.worker_id,
  status: r.status,
  paid: !!r.paid,
  paidAt: r.paid_at,
  isSample: !!r.is_sample,
  ago: timeAgo(r.created_at),
  createdAt: r.created_at
});

const unwrap = ({ data, error }) => { if (error) throw error; return data; };

/* ---------- API ---------- */
export const api = {
  async profile(uid) { return unwrap(await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()); },
  async saveName(uid, name) { return unwrap(await supabase.from('profiles').update({ full_name: name, name_confirmed: true }).eq('id', uid).select().maybeSingle()); },

  async openTasks() {
    const rows = unwrap(await supabase.from('tasks').select(SEL).eq('status', 'open').order('created_at', { ascending: false }));
    return rows.map(rowToTask);
  },
  async myTasks(uid) {
    const rows = unwrap(await supabase.from('tasks').select(SEL).or(`poster_id.eq.${uid},worker_id.eq.${uid}`).order('created_at', { ascending: false }));
    return rows.map(rowToTask);
  },
  async createTask(uid, posterName, f) {
    const row = unwrap(await supabase.from('tasks').insert({
      poster_id: uid, poster_name: posterName, title: f.title, description: f.desc, category: f.cat,
      location: f.loc, deadline: f.deadline, pay: f.pay
    }).select(SEL).single());
    return rowToTask(row);
  },
  async claim(id, uid) {
    const row = unwrap(await supabase.from('tasks').update({ worker_id: uid, status: 'requested' }).eq('id', id).eq('status', 'open').is('worker_id', null).select(SEL).single());
    return rowToTask(row);
  },
  async setStatus(id, status) { return unwrap(await supabase.from('tasks').update({ status }).eq('id', id).select().single()); },
  async decline(id) { return unwrap(await supabase.from('tasks').update({ status: 'open', worker_id: null }).eq('id', id).select().single()); },
  async markPaid(id) { return unwrap(await supabase.from('tasks').update({ paid: true }).eq('id', id).select().single()); },

  async messages(taskId) { return unwrap(await supabase.from('messages').select('*').eq('task_id', taskId).order('created_at', { ascending: true })); },
  async sendMessage(taskId, uid, body, kind = 'text') {
    return unwrap(await supabase.from('messages').insert({ task_id: taskId, sender_id: uid, body, kind }).select().single());
  },

  async reviewsAbout(uid) { return unwrap(await supabase.from('reviews').select('task_id, stars, created_at').eq('reviewee_id', uid)); },
  async review(taskId, reviewerId, revieweeId, stars) {
    return unwrap(await supabase.from('reviews').upsert({ task_id: taskId, reviewer_id: reviewerId, reviewee_id: revieweeId, stars }, { onConflict: 'task_id,reviewer_id' }).select().single());
  }
};

export const subscribeTasks = onChange => {
  const ch = supabase.channel('hustl-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onChange).subscribe();
  return () => supabase.removeChannel(ch);
};
export const subscribeMessages = (taskId, onMessage) => {
  const ch = supabase.channel('hustl-msgs-' + taskId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${taskId}` }, p => onMessage(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
};

/* ---------- stats, computed from real rows ---------- */
export const computeStats = (uid, mine, reviews) => {
  const asWorker = mine.filter(t => t.workerId === uid && t.paid);
  const asPoster = mine.filter(t => t.posterId === uid && t.paid);
  const now = Date.now(), WEEK = 7 * 86400000;
  const weekly = new Array(8).fill(0);
  asWorker.forEach(t => {
    const age = Math.floor((now - new Date(t.paidAt || t.createdAt).getTime()) / WEEK);
    if (age >= 0 && age < 8) weekly[7 - age] += t.pay;
  });
  const cats = {};
  CAT_ORDER.forEach(c => { cats[c] = 0; });
  asWorker.forEach(t => { cats[t.cat] += 1; });
  const stars = {};
  reviews.forEach(r => { stars[r.task_id] = r.stars; });
  const history = asWorker
    .slice()
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    .slice(0, 6)
    .map(t => ({ title: t.title, cat: t.cat, when: new Date(t.paidAt || t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }), pay: t.pay, rating: stars[t.id] || 0 }));
  return {
    jobs: asWorker.length,
    earned: asWorker.reduce((s, t) => s + t.pay, 0),
    posted: mine.filter(t => t.posterId === uid).length,
    spent: asPoster.reduce((s, t) => s + t.pay + feeOf(t.pay), 0),
    rating: reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0,
    reviews: reviews.length,
    weekly, cats, history
  };
};
