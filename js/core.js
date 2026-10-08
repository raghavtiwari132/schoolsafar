/* SchoolSafar — data, saving, matching */
const { html, render, useState, useEffect, useRef, useMemo, useLayoutEffect } = htmPreact;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ls = {
  get(k, d) { try { const v = localStorage.getItem('ss:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ss:' + k, JSON.stringify(v)); } catch (e) {} }
};
const fmtN = n => n.toLocaleString('en-IN');
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', star: '<path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>'
};
const I = (n, cls) => html`<svg class=${'i' + (cls ? ' ' + cls : '')} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[n] || '' }}></svg>`;
const Mark = () => html`<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="8" style="fill:var(--ink)"/><circle cx="9" cy="20" r="3" style="fill:none;stroke:var(--sheet);stroke-width:2"/><path d="M12 18.5c4-1 3-8 8-9" style="fill:none;stroke:var(--sheet);stroke-width:2;stroke-dasharray:2.5 2.5;stroke-linecap:round"/><path d="M17.5 6.5 21 4.5l3.5 2V11h-7z" style="fill:var(--accent);stroke:none"/></svg>`;

/* ---------- app state ---------- */
const S = {
  idx: null, loading: false, loadErr: '', place: null, schools: [], areas: [], home: null, tab: 'find', open: null, toast: null,
  me: { children: [], active: null, plan: null, shortlist: {}, checklist: {}, filters: null }, example: false, saveMode: 'loading'
};
const DEFAULT_FILTERS = { maxKm: 5, offersClass: true, kinds: { gov: true, central: true, aided: true, pvt: true, madarsa: false, unrec: false }, board: '', urbanOnly: false, sort: 'match' };
const listeners = new Set(); let emitQ = false;
function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; listeners.forEach(f => f()); }); }
function useStore() { const [, f] = useState(0); useEffect(() => { const g = () => f(x => x + 1); listeners.add(g); g(); return () => listeners.delete(g); }, []); return S; }
function toast(msg) { S.toast = msg; emit(); clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = null; emit(); }, 3200); }
const filters = () => S.me.filters || (S.me.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)));
const child = () => S.me.children.find(c => c.id === S.me.active) || S.me.children[0] || null;

/* ---------- saving: your account when this view allows it, otherwise this browser ---------- */
const Store = {
  db: null, path: null, t: 0, busy: false, again: false,
  async init() {
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const id = user ? await user.id() : null;
        if (db && id) {
          this.db = db; this.path = 'data/users/' + id + '/me';
          const snap = await db.doc(this.path).get();
          if (snap.exists) { try { return this.done('cloud', JSON.parse(snap.data().j)); } catch (e) {} }
          const local = ls.get('me', null); return this.done('cloud', local);
        }
      } catch (e) {}
    }
    return this.done('local', ls.get('me', null));
  },
  done(mode, data) { S.saveMode = mode; if (data && typeof data === 'object') Object.assign(S.me, data); S.me.shortlist = S.me.shortlist || {}; S.me.checklist = S.me.checklist || {}; S.me.children = S.me.children || []; return data; },
  save() { ls.set('me', S.me); clearTimeout(this.t); this.t = setTimeout(() => this.flush(), 800); emit(); },
  async flush() {
    if (S.saveMode !== 'cloud' || !this.db) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try { await this.db.doc(this.path).set({ j: JSON.stringify(S.me), t: Date.now() }); }
    catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked')) { S.saveMode = 'local'; emit(); } }
    this.busy = false; if (this.again) { this.again = false; this.flush(); }
  }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flush(); });

/* ---------- school data ---------- */
const KIND = ['gov', 'gov', 'aided', 'pvt', 'central', 'central', 'central', 'central', 'central', 'central', 'gov', 'gov', 'gov', 'gov', 'madarsa', 'unrec', 'unrec'];
const MG_LABEL = ['Government', 'Government (municipal)', 'Government-aided', 'Private', 'Kendriya Vidyalaya', 'Jawahar Navodaya Vidyalaya', 'Sainik School', 'Railway school',
  'Central government school', 'Central Tibetan School', 'Government (tribal welfare)', 'Government (social welfare)', 'Government (Ministry of Labour)', 'Government (other)',
  'Madarsa (recognised)', 'Madarsa (not recognised)', 'Not recognised'];
const KIND_LABEL = { gov: 'Government', central: 'Central government (KV, JNV, Sainik, Railway)', aided: 'Government-aided', pvt: 'Private', madarsa: 'Madarsa', unrec: 'Not recognised by government' };
const BOARD_OPTS = [['CBSE', 'CBSE'], ['ICSE', 'ICSE / ISC'], ['State Board', 'State board'], ['International Board', 'IB / Cambridge'], ['', 'Not sure / no preference']];
const BOARD_SHORT = { 'CBSE': 'CBSE', 'State Board': 'State board', 'ICSE': 'ICSE', 'International Board': 'International', 'Others': 'Other board' };
const classLabel = c => c === 0 ? 'Nursery / KG' : 'Class ' + c;

async function fetchJson(url) {
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = await r.arrayBuffer(), u8 = new Uint8Array(buf);
  if (u8[0] === 0x1f && u8[1] === 0x8b && 'DecompressionStream' in window) return JSON.parse(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  return JSON.parse(new TextDecoder().decode(u8));
}
const chunkCache = new Map();
const loadChunk = name => { if (!chunkCache.has(name)) chunkCache.set(name, fetchJson('data/c/' + name + '.json').then(j => j.d || {}).catch(e => { chunkCache.delete(name); throw e; })); return chunkCache.get(name); };
function findDistrict(st, di) { const s = S.idx.states.find(x => x.n === st); return s && s.d.find(d => d[0] === di); }

function placeOptions() {
  const out = [];
  S.idx.metros.forEach(m => out.push({ key: 'm:' + m.n, label: m.n, sub: m.h, parts: m.p, n: m.p.reduce((a, p) => a + ((findDistrict(p[0], p[1]) || [])[2] || 0), 0), metro: true }));
  Object.entries(S.idx.aliases).forEach(([a, p]) => out.push({ key: 'a:' + a, label: a, sub: p[1] + ', ' + p[0], parts: [p], n: (findDistrict(p[0], p[1]) || [])[2] || 0 }));
  S.idx.states.forEach(s => s.d.forEach(d => out.push({ key: 'd:' + s.n + '|' + d[0], label: d[0], sub: s.n, parts: [[s.n, d[0]]], n: d[2] })));
  return out;
}
async function choosePlace(opt, keepArea) {
  S.place = { key: opt.key, label: opt.label, sub: opt.sub, parts: opt.parts }; S.loading = true; S.loadErr = ''; S.schools = []; S.areas = []; if (!keepArea) S.home = null; emit();
  try {
    const groups = {};
    opt.parts.forEach(([st, di]) => { const d = findDistrict(st, di); if (d) (groups[d[1]] = groups[d[1]] || []).push([st, di]); });
    const loaded = await Promise.all(Object.keys(groups).map(c => loadChunk(c).then(data => ({ c, data }))));
    if (!S.place || S.place.key !== opt.key) return;
    const schools = [], areas = new Map(), pins = new Map();
    loaded.forEach(({ c, data }) => groups[c].forEach(([st, di]) => {
      const blk = data[di]; if (!blk) return;
      blk.s.forEach(r => {
        const s = { n: r[0], id: r[1], lat: r[2] / 1e4, lon: r[3] / 1e4, cf: r[4], ct: r[5], fl: r[6], mg: r[7], bs: r[8], bh: r[9], t: r[10], st: r[11], y: r[12], pin: r[13], loc: r[14] >= 0 ? blk.l[r[14]] : '', rooms: r[15], di, state: st };
        if (!r[2]) { s.lat = 0; s.lon = 0; }
        schools.push(s);
        if (s.lat) {
          if (s.loc) { const k = s.loc + '|' + di; const a = areas.get(k) || { label: s.loc, sub: di, n: 0, la: 0, lo: 0, kind: 'area' }; a.n++; a.la += s.lat; a.lo += s.lon; areas.set(k, a); }
          if (s.pin > 100000) { const p = pins.get(s.pin) || { label: String(s.pin), sub: 'PIN code · ' + di, n: 0, la: 0, lo: 0, kind: 'pin' }; p.n++; p.la += s.lat; p.lo += s.lon; pins.set(s.pin, p); }
        }
      });
    }));
    const fin = a => Object.assign(a, { lat: a.la / a.n, lon: a.lo / a.n });
    S.schools = schools; S.areas = [...areas.values()].map(fin).sort((a, b) => b.n - a.n).concat([...pins.values()].map(fin));
    S.loading = false;
    S.me.plan = Object.assign({}, S.me.plan || {}, { place: opt.key, area: keepArea && S.home ? S.home : null }); if (!S.example) Store.save();
    emit();
  } catch (e) { S.loading = false; S.loadErr = 'The school list for ' + opt.label + ' didn’t load. Check your connection and try again.'; emit(); }
}
function setHome(a) { S.home = a ? { label: a.label, sub: a.sub, lat: a.lat, lon: a.lon, exact: !!a.exact } : null; S.me.plan = Object.assign({}, S.me.plan || {}, { area: S.home }); if (!S.example) Store.save(); emit(); }

/* ---------- matching ---------- */
function km(a, b, c, d) { const p = Math.PI / 180, x = (d - b) * p * Math.cos((a + c) / 2 * p), y = (c - a) * p; return 6371 * Math.hypot(x, y); }
function boardsOf(s) {
  const b = new Set(); [s.bs, s.bh].forEach(i => { const n = S.idx.boards[i]; if (n === 'Both CBSE & State Board') { b.add('CBSE'); b.add('State Board'); } else if (n) b.add(n); });
  if (!b.size && (s.mg === 4 || s.mg === 5)) b.add('CBSE');
  return b;
}
const offers = (s, c) => c === 0 ? !!(s.fl & 2) : s.cf <= c && s.ct >= c && s.ct >= 1;
const isDefenceSchool = s => /\b(army|air force|airforce|navy|naval|military|sainik|cantonment|kendriya sainik|aps)\b/i.test(s.n) || s.mg === 6;
function evaluate(s, ch, home, f) {
  const R = [], kind = KIND[s.mg]; let pts = 0, max = 5;
  if (!f.kinds[kind]) return null;
  if (f.urbanOnly && !(s.fl & 1)) return null;
  if (ch && ch.gender === 'boy' && (s.fl & 4)) return null;
  if (ch && ch.gender === 'girl' && (s.fl & 8)) return null;
  const cls = ch && ch.cls != null && ch.cls !== '' ? +ch.cls : null;
  if (cls != null) {
    max += 10;
    if (offers(s, cls)) { pts += 10; R.push(['good', 'Has ' + classLabel(cls)]); }
    else if (f.offersClass) return null; else R.push(['no', 'No ' + classLabel(cls)]);
  }
  const bset = boardsOf(s);
  if (f.board && !bset.has(f.board)) return null;
  const want = ch && ch.board;
  if (want && (cls == null || cls >= 0)) {
    max += 30;
    if (bset.has(want)) { pts += 30; R.push(['good', (BOARD_SHORT[want] || want) + ', same as now']); }
    else if (!bset.size) { pts += 10; R.push(['ask', s.ct <= 8 ? 'Up to Class ' + s.ct + ', board not recorded' : 'Board not recorded']); }
    else R.push(['no', [...bset].map(b => BOARD_SHORT[b] || b).join(' & ') + ', not ' + (BOARD_SHORT[want] || want)]);
  } else if (bset.size) R.push(['info', [...bset].map(b => BOARD_SHORT[b] || b).join(' & ')]);
  let d = null;
  if (home) {
    max += 30;
    if (s.lat) {
      d = km(home.lat, home.lon, s.lat, s.lon);
      if (d > f.maxKm) return null;
      pts += 5 + 25 * (1 - d / f.maxKm);
    } else { if (f.maxKm < 50) return null; R.push(['ask', 'Location not on record']); }
  }
  const budget = ch && ch.budget;
  if (budget && budget !== 'any') {
    max += 15;
    if (budget === 'free') { if (kind === 'gov' || kind === 'central') { pts += 15; R.push(['good', 'Government school, little or no fee']); } else if (kind === 'aided') { pts += 8; R.push(['ask', 'Aided: usually low fees']); } else R.push(['no', 'Private: fees apply']); }
    else if (budget === 'low') { if (kind !== 'pvt') { pts += 15; R.push(['good', kind === 'aided' ? 'Aided: usually low fees' : 'Government: low fees']); } else { pts += 6; R.push(['ask', 'Private: check fees']); } }
    else if (budget === 'pvt') { if (kind === 'pvt') { pts += 15; R.push(['good', 'Private school']); } else pts += 5; }
  }
  const job = ch && ch.job;
  if (job === 'central' || job === 'defence' || job === 'railway') {
    max += 20;
    if (s.mg === 4 && (job === 'central' || job === 'defence')) { pts += 20; R.push(['good', 'KV: priority for transferable central-govt & defence families']); }
    else if (job === 'defence' && isDefenceSchool(s)) { pts += 16; R.push(['good', 'Defence school']); }
    else if (job === 'railway' && s.mg === 7) { pts += 20; R.push(['good', 'Railway school']); }
    else if (job === 'railway' && s.mg === 4) { pts += 14; R.push(['good', 'KV: priority for central-govt (incl. railway) families']); }
  }
  if (s.mg === 5) R.push(['info', 'Entry by JNV selection test']);
  if (s.mg === 6) R.push(['info', 'Entry by Sainik School entrance exam']);
  if (kind === 'unrec') R.push(['no', 'Not recognised by government']);
  if (s.fl & 4) R.push(['info', 'Girls’ school']); else if (s.fl & 8) R.push(['info', 'Boys’ school']);
  if (s.t > 0 && s.st > 20) { const r = s.st / s.t; if (r <= 25) { pts += 5; R.push(['good', '1 teacher per ' + Math.round(r) + ' students']); } else if (r > 40) R.push(['ask', '1 teacher per ' + Math.round(r) + ' students']); }
  return { s, d, score: Math.round(clamp(pts / max, 0, 1) * 100), reasons: R };
}
function results() {
  if (!S.schools.length) return { list: [], stats: null };
  const ch = child(), f = filters(), home = S.home;
  const list = []; let offerN = 0, boardN = 0, nearN = 0;
  for (const s of S.schools) {
    const e = evaluate(s, ch, home, f); if (!e) continue; list.push(e);
  }
  const cls = ch && ch.cls != null && ch.cls !== '' ? +ch.cls : null;
  S.schools.forEach(s => { if (cls == null || offers(s, cls)) { offerN++; if (ch && ch.board && boardsOf(s).has(ch.board)) boardN++; } });
  if (home) nearN = list.length;
  const by = f.sort;
  list.sort((a, b) => by === 'distance' ? (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d) : by === 'size' ? b.s.st - a.s.st : by === 'name' ? a.s.n.localeCompare(b.s.n) : (b.score - a.score) || ((a.d || 0) - (b.d || 0)));
  return { list, stats: { total: S.schools.length, offerN, boardN, nearN, cls } };
}
function shortlist(s) {
  const k = s.id;
  if (S.me.shortlist[k]) { delete S.me.shortlist[k]; toast('Removed from your shortlist'); }
  else { S.me.shortlist[k] = { n: s.n, di: s.di, state: s.state, place: S.place && S.place.key, status: 'considering', note: '', at: Date.now(), snap: { lat: s.lat, lon: s.lon, cf: s.cf, ct: s.ct, fl: s.fl, mg: s.mg, bs: s.bs, bh: s.bh, t: s.t, st: s.st, y: s.y, pin: s.pin, loc: s.loc } }; toast('Saved to your shortlist'); }
  Store.save();
}
