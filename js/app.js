/* SchoolSafar — shortlist, checklist, children, shell and start-up */
const fromShort = (id, e) => Object.assign({ id, n: e.n, di: e.di, state: e.state }, e.snap);

function Shortlist() {
  const items = Object.entries(S.me.shortlist).sort((a, b) => b[1].at - a[1].at);
  const [pick, setPick] = useState([]);
  const cmp = items.filter(([id]) => pick.includes(id)).map(([id, e]) => [fromShort(id, e), e]);
  const toggle = id => setPick(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= 4 ? p : p.concat(id));
  const dist = s => S.home && s.lat ? km(S.home.lat, S.home.lon, s.lat, s.lon).toFixed(1) + ' km' : '—';
  const bn = i => S.idx && S.idx.boards[i] ? (BOARD_SHORT[S.idx.boards[i]] || S.idx.boards[i]) : '—';
  return html`<main class="wrap" style="padding-block:28px 60px">
    <h1 style="font-size:32px">Your shortlist</h1>
    <p class="muted" style="margin:6px 0 20px;max-width:64ch">Track every school you’re considering, from first call to admission. Tick up to four to compare them side by side.</p>
    ${!items.length ? html`<div class="panel empty"><h3>Nothing saved yet</h3><p>Tap the star on any school to save it here with notes and an admission status.</p><button class="btn primary" style="margin-top:14px" onClick=${() => { S.tab = 'find'; emit(); }}>Find schools</button></div>` : html`
      <div class="cards">${items.map(([id, e]) => { const s = fromShort(id, e); return html`<article class="card" style="grid-template-columns:28px minmax(0,1fr) auto">
        <input type="checkbox" aria-label=${'Compare ' + e.n} checked=${pick.includes(id)} onChange=${() => toggle(id)} style="width:20px;height:20px;margin-top:4px;accent-color:var(--accent)"/>
        <div style="min-width:0"><h3><button onClick=${() => { S.open = s; emit(); }}>${e.n}</button></h3>
          <div class="meta"><span>${MG_LABEL[s.mg]}</span><span>${[s.loc, e.di].filter(Boolean).join(', ')}</span><span>Class ${s.cf || 'Nursery'}–${s.ct}</span></div>
          ${e.note ? html`<p class="muted" style="margin:8px 0 0;font-size:14.5px;white-space:pre-wrap">${e.note}</p>` : null}</div>
        <div class="acts"><select class="select sm" style="width:auto" value=${e.status} aria-label="Status" onChange=${ev => { e.status = ev.target.value; Store.save(); }}>${STATUSES.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
          <button class="ibtn" aria-label=${'Remove ' + e.n} onClick=${() => { delete S.me.shortlist[id]; setPick(p => p.filter(x => x !== id)); Store.save(); }}>${I('trash')}</button></div>
      </article>`; })}</div>
      ${cmp.length >= 2 ? html`<h2 style="font-size:22px;margin:28px 0 12px">Side by side</h2><div class="tablewrap"><table class="cmp">
        <thead><tr><th></th>${cmp.map(([s]) => html`<th style="text-transform:none;letter-spacing:0;font:700 14px var(--f-body);color:var(--ink)">${s.n}</th>`)}</tr></thead>
        <tbody>${[['Run by', s => MG_LABEL[s.mg]], ['Classes', s => (s.cf === 0 ? 'Nursery' : s.cf) + '–' + s.ct], ['Board, Class 10', s => bn(s.bs)], ['Board, Class 12', s => bn(s.bh)],
          ['For', s => s.fl & 4 ? 'Girls' : s.fl & 8 ? 'Boys' : 'Co-ed'], ['Students', s => s.st ? fmtN(s.st) : '—'], ['Teacher ratio', s => s.t && s.st ? '1 : ' + Math.round(s.st / s.t) : '—'],
          ['Founded', s => s.y > 1800 ? s.y : '—'], ['From your new home', s => dist(s)], ['Status', (s, e) => (STATUSES.find(x => x[0] === e.status) || [])[1]], ['Notes', (s, e) => e.note || '—']]
          .map(([l, f]) => html`<tr><td>${l}</td>${cmp.map(([s, e]) => html`<td style="white-space:pre-wrap">${f(s, e)}</td>`)}</tr>`)}</tbody></table></div>`
        : items.length >= 2 ? html`<p class="faint" style="margin-top:14px">Tick two to four schools to compare them.</p>` : null}`}
  </main>`;
}

const CHECKLIST = [
  ['Documents to gather before you move', [
    ['tc', 'Transfer Certificate (TC)', 'From your current school. Most new schools need it to confirm admission. Some states ask for it to be countersigned by the district education office.'],
    ['report', 'Latest report card', 'Plus attendance records if the school gives them.'],
    ['birth', 'Birth certificate', 'Original and a few copies.'],
    ['ids', 'Aadhaar card and APAAR ID', 'Many schools ask for Aadhaar. The APAAR ID carries your child’s academic record from school to school.'],
    ['photos', 'Passport-size photos', 'Six to eight of your child, and a couple of each parent.'],
    ['address', 'Proof of your new address', 'Rent agreement, electricity bill or a letter from your employer.'],
    ['order', 'Transfer or posting order', 'Needed for Kendriya Vidyalaya priority admission, and many schools ask for it for mid-year admission.'],
    ['migration', 'Migration certificate', 'Only if your child has passed Class 10 or 12 and is changing boards.'],
    ['category', 'Caste, EWS or disability certificate', 'Only if you’re applying for a reserved seat or an RTE seat.'],
    ['medical', 'Medical and vaccination records', 'Note allergies and any regular medicines.']]],
  ['Steps', [
    ['s1', 'Shortlist three to five schools', 'Use Find schools, then call each one about seats in your child’s class.'],
    ['s2', 'Check the new state’s rules', 'Ask about the compulsory state language and the board used for Classes 9–12.'],
    ['s3', 'Visit, or ask for a video tour', 'Meet the class teacher if you can, and look at the transport route from your new home.'],
    ['s4', 'Apply and pay the admission fee', 'Keep every receipt and the admission letter.'],
    ['s5', 'Collect the TC once the new seat is confirmed', 'The old school may take a few days to issue it.'],
    ['s6', 'Sort out transport, uniform and books', 'Ask the new school for the list before the first day.']]]
];
function Checklist() {
  const c = S.me.checklist, all = CHECKLIST.flatMap(g => g[1]), done = all.filter(x => c[x[0]]).length;
  return html`<main class="wrap" style="padding-block:28px 60px">
    <h1 style="font-size:32px">Moving checklist</h1>
    <p class="muted" style="margin:6px 0 20px;max-width:64ch">What to collect and do when your child changes school between cities. Ticks are saved, so you can come back to it. <b class="mono">${done}/${all.length}</b> done.</p>
    <div class="twocol">
      <div class="stack">${CHECKLIST.map(([title, items]) => html`<section class="panel"><h2>${title}</h2><div class="cl">${items.map(([k, t, d]) => html`<label><input type="checkbox" checked=${!!c[k]} onChange=${e => { c[k] = e.target.checked; Store.save(); }}/><span><b>${t}</b><small>${d}</small></span></label>`)}</div></section>`)}</div>
      <div class="stack">
        <section class="panel"><h2>Good to know</h2><div class="stack" style="font-size:15px">
          <p style="margin:0"><b>Kendriya Vidyalayas</b> give admission priority to children of transferable central government employees, including the armed forces. Mid-year admission is possible when there’s a seat, so carry your transfer order.</p>
          <p style="margin:0"><b>Class 10 and 12 are the hardest years to move.</b> Students register for board exams a year earlier, in Class 9 and 11. If you can, talk to both schools well before the move.</p>
          <p style="margin:0"><b>Right to Education seats.</b> Private schools keep 25% of seats in their entry class for children from economically weaker sections. Each state runs its own application process.</p>
          <p style="margin:0"><b>State languages.</b> Many states require their own language to be taught. Ask how the school supports children who are new to it.</p>
        </div></section>
      </div>
    </div>
  </main>`;
}

function Kids() {
  const add = () => { const c = { id: uid(), name: '', cls: '', board: '', job: (child() || {}).job || '', budget: 'any', gender: '' }; S.me.children.push(c); S.me.active = c.id; S.example = false; Store.save(); };
  return html`<main class="wrap" style="padding-block:28px 60px">
    <h1 style="font-size:32px">My children</h1>
    <p class="muted" style="margin:6px 0 20px;max-width:64ch">Tell us about each child once. Schools are ranked for whichever child is selected, so siblings can get their own results. ${S.saveMode === 'cloud' ? 'This is saved to your account, so it’s there on every device.' : 'This is saved in this browser.'}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px">
      ${S.me.children.map((c, n) => html`<section class="panel" key=${c.id} style=${S.me.active === c.id ? 'border-color:var(--accent)' : ''}>
        <div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="row"><span class="avatar">${(c.name || 'C' + (n + 1))[0].toUpperCase()}</span><h2 style="margin:0">${c.name || 'Child ' + (n + 1)}</h2></div>
          ${S.me.children.length > 1 ? html`<button class="ibtn" aria-label=${'Remove ' + (c.name || 'child')} onClick=${() => { S.me.children = S.me.children.filter(x => x !== c); if (S.me.active === c.id) S.me.active = S.me.children[0].id; Store.save(); }}>${I('trash')}</button>` : null}</div>
        <${ChildForm} c=${c}/>
        <div class="row" style="margin-top:14px">${S.me.active === c.id ? html`<span class="chip good">Results are for this child</span>` : html`<button class="btn sm" onClick=${() => { S.me.active = c.id; Store.save(); }}>Show results for ${c.name || 'this child'}</button>`}
          <button class="btn primary sm" onClick=${() => { S.me.active = c.id; S.tab = 'find'; Store.save(); window.scrollTo(0, 0); }}>Find schools</button></div>
      </section>`)}
      <button class="panel" style="border-style:dashed;display:grid;place-items:center;min-height:160px;color:var(--ink-2)" onClick=${add}><span class="row">${I('plus')}Add another child</span></button>
    </div>
  </main>`;
}

function Footer() {
  return html`<footer class="foot"><div class="wrap">
    <p>School information comes from <b>UDISE+</b>, the Ministry of Education’s register of every recognised school (“Basic Details of Schools” on the <a href="https://indiadataportal.com" target="_blank" rel="noopener">India Data Portal</a>, Government Open Data License – India)${S.idx ? ', loaded ' + S.idx.built : ''}. Some schools may be missing or have outdated details. Always confirm board, fees and seats with the school.</p>
    <p>Distances are straight-line from your address or from the middle of the area you pick, not road distance.${CAN_WEB ? ' Address search and maps use OpenStreetMap (© OpenStreetMap contributors).' : ''} Fit scores are a guide from the details listed here, not a rating of school quality. SchoolSafar isn’t run by the government.</p>
  </div></footer>`;
}

function App() {
  useStore();
  return html`<${Header}/>
    ${S.tab === 'find' ? html`<${Find}/>` : S.tab === 'short' ? html`<${Shortlist}/>` : S.tab === 'check' ? html`<${Checklist}/>` : html`<${Kids}/>`}
    <${Footer}/><${Drawer}/>${S.addrOpen ? html`<${AddressDialog}/>` : null}
    ${S.toast ? html`<div class="toast" role="status">${S.toast}</div>` : null}`;
}

(async function start() {
  render(html`<${App}/>`, document.getElementById('app'));
  try {
    const [idx, fixes] = await Promise.all([fetchJson('data/index.json'), fetchJson('data/fixes.json').catch(() => ({})), Store.init()]);
    S.idx = idx; S.fixes = fixes.d || {};
  } catch (e) { S.loadErr = 'The school register didn’t load. Check your connection and reload the page.'; S.place = { label: '' }; emit(); return; }
  if (!S.me.children.length) { const c = { id: uid(), name: '', cls: '', board: '', job: '', budget: 'any', gender: '' }; S.me.children.push(c); S.me.active = c.id; }
  emit();
  const plan = S.me.plan, opts = placeOptions();
  if (plan && plan.place) { const o = opts.find(x => x.key === plan.place); if (o) { S.home = plan.area || null; return choosePlace(o, true); } }
  const ch = child(); S.example = true;
  if (ch.cls === '' && !ch.board) { ch.cls = 6; ch.board = 'CBSE'; }
  await choosePlace(opts.find(o => o.key === 'm:Pune'));
  const a = S.areas.find(x => /^kothrud/i.test(x.label)) || S.areas[0];
  if (a) { S.home = { label: a.label, sub: a.sub, lat: a.lat, lon: a.lon }; emit(); }
})();
