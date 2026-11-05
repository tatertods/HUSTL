import { h, useState, useEffect, useMemo, useCallback, useRef, Fragment } from './lib/base.js';
import { supabase } from './lib/supabase.js';
import { api, subscribeTasks, computeStats, nameFrom } from './lib/data.js';
import { Icon } from './components/Icon.js';
import { SilkBackdrop, useSpotlight } from './components/Backdrop.js';
import { Header, GateCard } from './components/Common.js';
import { Landing } from './views/Landing.js';
import { Feed } from './views/Feed.js';
import { PostTask } from './views/PostTask.js';
import { Messages } from './views/Messages.js';
import { Stats } from './views/Stats.js';

const VIEWS = ['home', 'feed', 'post', 'messages', 'stats'];
const readHash = () => {
  let k = '';
  try { k = (location.hash || '').replace('#', ''); } catch (e) { k = ''; }
  return VIEWS.indexOf(k) > -1 ? k : 'home';
};
let toastId = 0;

export const App = () => {
  const [view, setView] = useState(readHash);
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [openTasks, setOpenTasks] = useState([]);
  const [mine, setMine] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const timer = useRef(0);
  useSpotlight();

  /* routing */
  useEffect(() => {
    const onHash = () => { setView(readHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = v => {
    try { if (location.hash !== '#' + v) location.hash = v; } catch (e) { /* ignore */ }
    setView(v);
    window.scrollTo(0, 0);
  };
  const toast = msg => {
    const id = ++toastId;
    setToasts(t => t.concat({ id, msg }));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };

  /* auth */
  useEffect(() => {
    if (!supabase) { setSession(null); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((event, s) => setSession(s || null));
    return () => data.subscription.unsubscribe();
  }, []);
  const uid = session && session.user ? session.user.id : null;
  const email = session && session.user ? session.user.email : '';

  const user = useMemo(() => (uid ? { id: uid, email, name: (profile && profile.full_name) || nameFrom(email) } : null), [uid, email, profile]);

  /* data */
  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const [o, m, r] = await Promise.all([api.openTasks(), api.myTasks(uid), api.reviewsAbout(uid)]);
      setOpenTasks(o); setMine(m); setReviews(r);
    } catch (err) { /* offline or signed out: keep what we have */ }
  }, [uid]);
  const loadProfile = useCallback(async () => {
    if (!uid) return;
    try { setProfile(await api.profile(uid)); } catch (err) { /* ignore */ }
  }, [uid]);

  useEffect(() => {
    if (!uid) { setProfile(null); setOpenTasks([]); setMine([]); setReviews([]); return undefined; }
    loadProfile();
    refresh();
    const off = subscribeTasks(() => { clearTimeout(timer.current); timer.current = setTimeout(refresh, 250); });
    return () => { clearTimeout(timer.current); off(); };
  }, [uid]);

  const stats = useMemo(() => computeStats(uid, mine, reviews), [uid, mine, reviews]);

  /* actions */
  const onRequest = async task => {
    if (task.posterId === uid && !task.isSample) { toast('That is your own task'); return false; }
    try {
      await api.claim(task.id, uid);
      await refresh();
      setSelectedId(task.id);
      toast('Request sent');
      go('messages');
      return true;
    } catch (err) {
      toast('Someone else just took that task');
      refresh();
      return false;
    }
  };
  const onPublish = async f => {
    try {
      const t = await api.createTask(uid, user.name, f);
      await refresh();
      setSelectedId(t.id);
      toast('Task published to the feed');
      go('messages');
    } catch (err) { console.error(err); toast('Could not publish: ' + ((err && err.message) || 'unknown error')); }
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); toast('Signed out'); go('home'); };

  let body;
  if (session === undefined) body = h('main', { className: 'view wrap' }, h('div', { className: 'phead' }, h('p', null, 'Loading...')));
  else if (view === 'home') body = h(Landing, { key: 'home', user, profile, onProfileSaved: loadProfile, go, signOut });
  else if (!user) body = h(GateCard, { key: 'gate', go });
  else if (view === 'feed') body = h(Feed, { key: 'feed', tasks: openTasks, user, onRequest, go });
  else if (view === 'post') body = h(PostTask, { key: 'post', user, onPublish, toast });
  else if (view === 'stats') body = h(Stats, { key: 'stats', user, stats, go });
  else body = h(Messages, { key: 'messages', user, mine, selectedId, setSelectedId, toast, refresh, go });

  return h(Fragment, null,
    h(SilkBackdrop),
    h(Header, { view, go, user }),
    body,
    h('div', { className: 'toasts', 'aria-live': 'polite' }, toasts.map(t => h('div', { key: t.id, className: 'toast' }, h('span', { className: 'vtick' }, h(Icon, { name: 'check', strokeWidth: 3 })), t.msg))));
};
