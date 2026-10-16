/* SchoolSafar — screens */
function Combo({ id, label, placeholder, value, search, onPick, disabled }) {
  const [q, setQ] = useState(null), [open, setOpen] = useState(false), [i, setI] = useState(0), box = useRef();
  const list = open ? search(q == null ? '' : q).slice(0, 60) : [];
  useEffect(() => { const f = e => { if (box.current && !box.current.contains(e.target)) { setOpen(false); setQ(null); } }; document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f); }, []);
  const pick = o => { onPick(o); setOpen(false); setQ(null); };
  const key = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setI(x => Math.min(list.length - 1, x + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)); }
    else if (e.key === 'Enter' && open && list[i]) { e.preventDefault(); pick(list[i]); }
    else if (e.key === 'Escape') { setOpen(false); setQ(null); }
  };
  return html`<label class="field combo" ref=${box}><span>${label}</span>
    <input id=${id} class="input" autocomplete="off" disabled=${disabled} role="combobox" aria-expanded=${open ? 'true' : 'false'} placeholder=${placeholder}
      value=${q != null ? q : value || ''} onFocus=${e => { setOpen(true); e.target.select(); }} onInput=${e => { setQ(e.target.value); setOpen(true); setI(0); }} onKeyDown=${key}/>
    ${open && list.length ? html`<div class="combo-list" role="listbox">${list.map((o, n) => html`<button type="button" role="option" aria-selected=${n === i ? 'true' : 'false'} onMouseEnter=${() => setI(n)} onClick=${() => pick(o)}>
      <span><b style="font-weight:${o.metro ? 700 : 500}">${o.label}</b>${o.sub ? html`<br/><small style="font-family:var(--f-body);font-size:13px">${o.sub}</small>` : null}</span>${o.n ? html`<small>${fmtN(o.n)}</small>` : null}</button>`)}</div>` : null}
  </label>`;
}
function rank(opts, q, max) {
  q = q.trim().toLowerCase(); if (!q) return opts.slice(0, max || 60);
  const a = [], b = [];
  for (const o of opts) { const l = o.label.toLowerCase(); if (l.startsWith(q)) a.push(o); else if (l.includes(q) || (o.sub || '').toLowerCase().includes(q)) b.push(o); if (a.length > 60) break; }
  return a.concat(b);
}

function Header() {
  const n = Object.keys(S.me.shortlist).length;
  const T = (id, label, extra) => html`<button class="tab" aria-current=${S.tab === id ? 'page' : null} onClick=${() => { S.tab = id; emit(); window.scrollTo(0, 0); }}>${label}${extra ? html`<span class="n">${extra}</span>` : null}</button>`;
  return html`<header class="top"><div class="wrap">
    <a class="brand" href="#" onClick=${e => { e.preventDefault(); S.tab = 'find'; emit(); }}><${Mark}/><span><b>SchoolSafar</b><small>Find your child’s next school in a new city</small></span></a>
    <nav class="tabs" aria-label="Sections">${T('find', 'Find schools')}${T('short', 'Shortlist', n || null)}${T('check', 'Moving checklist')}${T('kids', 'My children', S.me.children.length || null)}</nav>
    <span class="who" title=${S.saveMode === 'cloud' ? 'Your children, shortlist and notes are saved to your account' : 'Saved in this browser only'}><i class=${'dot' + (S.saveMode === 'cloud' ? '' : ' local')}></i>${S.saveMode === 'cloud' ? 'Saved to your account' : S.saveMode === 'loading' ? 'Connecting…' : 'Saved on this device'}</span>
  </div></header>`;
}

function MoveBar() {
  const opts = useMemo(() => S.idx ? placeOptions() : [], [S.idx]);
  const ch = child();
  return html`<div class="movebar" role="search">
    <${Combo} id="place" label="Moving to (city or district)" placeholder="e.g. Pune, Delhi NCR, Noida" value=${S.place ? S.place.label : ''} disabled=${!S.idx}
      search=${q => rank(opts, q)} onPick=${o => { S.example = false; choosePlace(o); }}/>
    <div class="field" style="position:relative">
      <${Combo} id="area" label="New home near (area or PIN code)" placeholder=${S.place ? (S.loading ? 'Loading areas…' : 'e.g. Kothrud or 411038') : 'Pick a city first'} value=${S.home ? S.home.label : ''} disabled=${!S.place || S.loading}
        search=${q => rank(S.areas, q.replace(/\s+/g, ' '))} onPick=${o => { S.example = false; setHome(o); }}/>
      <button type="button" class="addr-link" disabled=${!S.place || S.loading} onClick=${() => { S.addrOpen = true; emit(); }}>${I('pin')}${S.home && S.home.exact ? 'Change your address' : 'Or enter your full address'}</button>
    </div>
    <label class="field"><span>For</span>
      <select id="who" class="select" value=${ch ? ch.id : ''} onChange=${e => { if (e.target.value === '+') { S.tab = 'kids'; emit(); return; } S.me.active = e.target.value; Store.save(); }}>
        ${S.me.children.map(c => html`<option value=${c.id}>${c.name || 'My child'} · ${c.cls === '' || c.cls == null ? 'any class' : classLabel(+c.cls)}</option>`)}
        <option value="+">+ Add a child…</option></select></label>
    <button class="btn dark lg go" onClick=${() => { const el = document.getElementById('results'); el && el.scrollIntoView({ behavior: 'smooth' }); }}>${I('search')}Show schools</button>
  </div>`;
}

function ChildForm({ c, compact }) {
  const set = (k, v) => { c[k] = v; S.example = false; Store.save(); };
  return html`<div class="stack">
    ${compact ? null : html`<label class="field"><span>Name (optional)</span><input id=${'cn-' + c.id} class="input sm" value=${c.name} placeholder="e.g. Aarav" onInput=${e => set('name', e.target.value)}/></label>`}
    <label class="field"><span>Class next year</span><select id=${'cc-' + c.id} class="select sm" value=${c.cls === '' || c.cls == null ? '' : String(c.cls)} onChange=${e => set('cls', e.target.value === '' ? '' : +e.target.value)}>
      <option value="">Not sure yet</option><option value="0">Nursery / KG</option>${Array.from({ length: 12 }, (_, i) => html`<option value=${i + 1}>Class ${i + 1}</option>`)}</select></label>
    <label class="field"><span>Board they’re on now</span><select id=${'cb-' + c.id} class="select sm" value=${c.board} onChange=${e => set('board', e.target.value)}>${BOARD_OPTS.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>
    <label class="field"><span>Parent’s job</span><select id=${'cj-' + c.id} class="select sm" value=${c.job} onChange=${e => set('job', e.target.value)}>
      <option value="">Prefer not to say</option><option value="central">Central government (transferable)</option><option value="defence">Defence / armed forces</option><option value="railway">Railways</option><option value="state">State government</option><option value="private">Private company / business</option></select></label>
    <label class="field"><span>Fees</span><select id=${'cf-' + c.id} class="select sm" value=${c.budget} onChange=${e => set('budget', e.target.value)}>
      <option value="any">Any</option><option value="free">Free or nearly free (government)</option><option value="low">Low fees (government or aided)</option><option value="pvt">Prefer private</option></select></label>
    <div class="field"><span>School type</span><div class="seg" role="group" aria-label="Girls, boys or co-ed">${[['', 'Any'], ['girl', 'Girl'], ['boy', 'Boy']].map(([v, l]) => html`<button type="button" aria-pressed=${(c.gender || '') === v ? 'true' : 'false'} onClick=${() => set('gender', v)}>${l === 'Any' ? 'Any child' : l}</button>`)}</div>
      <small class="faint">Hides boys’ schools for girls and girls’ schools for boys.</small></div>
  </div>`;
}

function Filters({ open, setOpen }) {
  const f = filters(), set = (k, v) => { f[k] = v; Store.save(); };
  return html`<div class="panel">
    <div class="row" style="justify-content:space-between"><h2 style="margin:0">Filters</h2><button class="btn ghost sm filters-toggle" onClick=${() => setOpen(!open)}>${open ? 'Hide' : 'Show'}</button></div>
    <div class="stack collapsible" style="margin-top:12px">
      <label class="field"><span>Within ${f.maxKm} km of your new home</span><input id="f-km" type="range" min="1" max="25" value=${f.maxKm} onInput=${e => set('maxKm', +e.target.value)} disabled=${!S.home}/>
        ${S.home ? null : html`<small class="faint">Pick an area above to use distance.</small>`}</label>
      <label class="check"><input id="f-offer" type="checkbox" checked=${f.offersClass} onChange=${e => set('offersClass', e.target.checked)}/><span>Only schools that have my child’s class</span></label>
      <div class="field"><span>Run by</span>${Object.entries(KIND_LABEL).map(([k, l]) => html`<label class="check"><input id=${'f-k-' + k} type="checkbox" checked=${!!f.kinds[k]} onChange=${e => { f.kinds = Object.assign({}, f.kinds, { [k]: e.target.checked }); Store.save(); }}/><span>${l}</span></label>`)}</div>
      <label class="field"><span>Board (Class 10 / 12)</span><select id="f-board" class="select sm" value=${f.board} onChange=${e => set('board', e.target.value)}><option value="">Any board</option>${BOARD_OPTS.slice(0, 4).map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>
      <label class="check"><input id="f-urban" type="checkbox" checked=${f.urbanOnly} onChange=${e => set('urbanOnly', e.target.checked)}/><span>Urban schools only</span></label>
      <button class="btn ghost sm" style="justify-self:start" onClick=${() => { S.me.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS)); Store.save(); }}>Reset filters</button>
    </div></div>`;
}

function Rings({ list }) {
  const home = S.home, R = 104, f = filters(); if (!home) return null;
  const pts = list.filter(e => e.d != null).slice(0, 80);
  const xy = s => { const dx = (s.lon - home.lon) * 111.32 * Math.cos(home.lat * Math.PI / 180), dy = (s.lat - home.lat) * 110.57; return [120 + dx / f.maxKm * R, 120 - dy / f.maxKm * R]; };
  return html`<div class="plot"><svg viewBox="0 0 240 240" role="img" aria-label=${'Map of the ' + pts.length + ' best-matching schools around ' + home.label}>
    ${[.25, .5, .75, 1].map(k => html`<circle cx="120" cy="120" r=${R * k} style="fill:none;stroke:var(--rule)" stroke-dasharray=${k === 1 ? '' : '3 4'}/>`)}
    ${[.5, 1].map(k => html`<text x=${122} y=${120 - R * k + 11} style="fill:var(--ink-3);font:10px var(--f-mono)">${+(f.maxKm * k).toFixed(1)} km</text>`)}
    ${pts.slice().reverse().map(e => { const [x, y] = xy(e.s); return html`<circle cx=${x} cy=${y} r=${e.score >= 80 ? 4.5 : 3.5} style=${e.score >= 80 ? 'fill:var(--accent)' : 'fill:var(--sheet);stroke:var(--accent);stroke-width:1.5'} onClick=${() => { S.open = e.s; emit(); }}><title>${e.s.n} · ${e.d.toFixed(1)} km · fit ${e.score}</title></circle>`; })}
    <circle cx="120" cy="120" r="6" style="fill:var(--ink)"/><circle cx="120" cy="120" r="10" style="fill:none;stroke:var(--ink);stroke-width:1.5"/>
  </svg><div class="cap">Your new home in the centre · filled dots are great fits</div></div>`;
}

function Card({ e }) {
  const s = e.s, saved = !!S.me.shortlist[s.id], hi = e.score >= 80 ? 'hi' : e.score >= 60 ? 'mid' : '';
  return html`<article class="card">
    <div class=${'score ' + hi} title="How well this school fits your child, out of 100">${e.score}<small>FIT</small></div>
    <div style="min-width:0">
      <h3><button onClick=${() => { S.open = s; emit(); }}>${s.n}</button></h3>
      <div class="meta"><span>${MG_LABEL[s.mg]}</span><span>${s.cf === 0 ? 'Nursery' : 'Class ' + s.cf}–${s.ct}</span>${s.loc ? html`<span>${s.loc}</span>` : null}${s.st ? html`<span class="mono">${fmtN(s.st)} students</span>` : null}</div>
      <div class="chips">${e.reasons.slice(0, 6).map(([k, t]) => html`<span class=${'chip ' + k}>${t}</span>`)}</div>
    </div>
    <div class="acts">${e.d != null ? html`<span class="dist">${e.d < 1 ? Math.round(e.d * 1000) + ' m' : e.d.toFixed(1) + ' km'}</span>` : html`<span class="faint" style="font-size:13px">${S.home ? '' : 'Pick an area for distance'}</span>`}
      <button class=${'ibtn' + (saved ? ' on' : '')} aria-pressed=${saved ? 'true' : 'false'} aria-label=${(saved ? 'Remove ' : 'Shortlist ') + s.n} title=${saved ? 'On your shortlist' : 'Add to shortlist'} onClick=${() => shortlist(s)}>${I('star')}</button></div>
  </article>`;
}

function Find() {
  const [show, setShow] = useState(30), [fopen, setFopen] = useState(false);
  const ch = child(), f = filters();
  const key = [S.place && S.place.key, S.schools.length, S.home && S.home.label, JSON.stringify(ch), JSON.stringify(f)].join('~');
  const R = useMemo(() => results(), [key]);
  useEffect(() => setShow(30), [key]);
  const st = R.stats;
  return html`<main>
    <section class="wrap hero">
      <div class="label">${S.idx ? fmtN(S.idx.total) + ' schools across ' + S.idx.states.reduce((a, s) => a + s.d.length, 0) + ' districts' : 'Loading the school register…'}</div>
      <h1 style="margin-top:8px">Moving cities? Find the right school before you arrive.</h1>
      <p>Every school in the Government of India’s school register, ranked for your child by class, board, distance from your new home, fees and your job.</p>
      <${MoveBar}/>
      ${!S.place && S.idx ? html`<div class="row" style="margin-top:14px"><span class="faint" style="font-size:14px">Popular moves:</span>${S.idx.metros.map(m => html`<button class="btn sm" onClick=${() => { S.example = false; choosePlace(placeOptions().find(o => o.key === 'm:' + m.n)); }}>${m.n}</button>`)}</div>` : null}
    </section>
    <section class="wrap layout" id="results">
      <aside class=${'side' + (fopen ? '' : ' closed')}>
        ${ch ? html`<div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">${ch.name ? ch.name + '’s needs' : 'Your child’s needs'}</h2><button class="btn ghost sm" onClick=${() => { S.tab = 'kids'; emit(); }}>Edit</button></div><div class="collapsible"><${ChildForm} c=${ch} compact/></div></div>` : null}
        <${Filters} open=${fopen} setOpen=${setFopen}/>
      </aside>
      <div style="min-width:0">
        ${S.example ? html`<div class="notice info">${I('info')}<span>This is an <b>example search</b> for a Class 6 CBSE student moving to ${S.place ? S.place.label : ''}${S.home ? ' near ' + S.home.label : ''}. Choose your own city and area above, and edit your child’s needs.</span></div>` : null}
        ${S.loadErr ? html`<div class="notice">${I('alert')}<span>${S.loadErr}</span></div>` : null}
        ${!S.place ? html`<div class="panel empty"><h3>Start with the city you’re moving to</h3><p>Type a city, district or metro area above. Schools load for that area, and you can then pick the neighbourhood or PIN code of your new home.</p></div>`
          : S.loading ? html`<div class="cards">${[1, 2, 3, 4].map(() => html`<div class="skeleton"></div>`)}</div>`
          : !st ? html`<div class="panel empty"><h3>No schools listed for ${S.place.label}</h3><p>The register has no schools under this name. Try the neighbouring district or the metro area.</p></div>`
          : html`
            <div class="summary">
              <div class="facts">
                <div class="fact"><b>${fmtN(st.total)}</b><span>schools in ${S.place.label}</span></div>
                <div class="fact"><b>${fmtN(st.offerN)}</b><span>${st.cls != null ? 'have ' + classLabel(st.cls) : 'all classes'}</span></div>
                <div class="fact"><b>${ch && ch.board ? fmtN(st.boardN) : '—'}</b><span>${ch && ch.board ? 'recorded as ' + (BOARD_SHORT[ch.board] || ch.board) + (st.cls != null ? ' with ' + classLabel(st.cls) : '') : 'pick your child’s board'}</span></div>
                <div class="fact"><b>${S.home ? fmtN(st.nearN) : '—'}</b><span>${S.home ? 'match within ' + f.maxKm + ' km' : 'pick an area for distance'}</span></div>
              </div>
              <${Rings} list=${R.list}/>
            </div>
            ${!S.home ? html`<div class="notice info">${I('pin')}<span>Add the area or PIN code of your new home above to sort schools by distance. Until then they’re ranked on class, board and fees only.</span></div>` : null}
            <${NameFind} list=${R.list}/>
            <div class="listhead"><h2>${fmtN(R.list.length)} ${R.list.length === 1 ? 'school fits' : 'schools fit'}</h2>
              <label class="row" style="font-size:14px"><span class="muted">Sort by</span><select id="sort" class="select sm" style="width:auto" value=${f.sort} onChange=${e => { f.sort = e.target.value; Store.save(); }}>
                <option value="match">Best fit</option><option value="distance">Nearest</option><option value="size">Most students</option><option value="name">Name</option></select></label></div>
            ${R.list.length ? html`<div class="cards">${R.list.slice(0, show).map(e => html`<${Card} key=${e.s.id} e=${e}/>`)}</div>
              ${R.list.length > show ? html`<div class="more"><button class="btn" onClick=${() => setShow(show + 30)}>Show 30 more of ${fmtN(R.list.length - show)}</button></div>` : null}`
              : html`<div class="panel empty"><h3>No schools match all of that</h3><p>Try a bigger distance, turn off “only schools that have my child’s class”, or allow more school types in the filters.</p></div>`}`}
      </div>
    </section>
  </main>`;
}

// Find one school you already know, whether or not it made the list, and see why
function NameFind({ list }) {
  const [q, setQ] = useState('');
  const words = q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 1);
  const rank = new Map(list.map((e, i) => [e.s.id, i + 1]));
  const hits = words.length ? S.schools.filter(s => { const n = s.n.toLowerCase(); return words.every(w => n.includes(w)); }).sort((a, b) => (rank.get(a.id) || 1e9) - (rank.get(b.id) || 1e9)).slice(0, 8) : [];
  return html`<div class="panel" style="margin-bottom:16px">
    <label class="field"><span>Know a school already? Find it by name</span>
      <input id="namefind" class="input sm" placeholder="e.g. Jaipuria or Kendriya Vidyalaya" value=${q} onInput=${e => setQ(e.target.value)}/></label>
    ${words.length ? hits.length ? html`<div class="addr-list">${hits.map(s => { const r = rank.get(s.id), why = r ? [] : whyHidden(s, child(), S.home, filters());
        return html`<button class="addr-opt" onClick=${() => { S.open = s; emit(); }}><b>${s.n}</b>
          <small>${[s.loc, s.di].filter(Boolean).join(', ')} · ${r ? 'Number ' + r + ' in your list' : 'Not in your list: ' + (why[0] || 'hidden by a filter')}</small></button>`; })}</div>`
      : html`<p class="faint" style="font-size:14px;margin:8px 0 0">No school in ${S.place.label} has that in its name in the government register. Try one word of the name, or a different spelling.</p>` : null}
  </div>`;
}

function Drawer() {
  const s = S.open, [note, setNote] = useState(''); const sl = s && S.me.shortlist[s.id];
  useEffect(() => { setNote(sl ? sl.note : ''); }, [s && s.id]);
  useEffect(() => { if (!s) return; const k = e => { if (e.key === 'Escape') { S.open = null; emit(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [s]);
  if (!s) return null;
  const e = evaluate(s, child(), S.home, filters()) || Object.assign(evaluate(s, child(), S.home, Object.assign({}, filters(), { offersClass: false, maxKm: 1e4, kinds: { gov: 1, central: 1, aided: 1, pvt: 1, madarsa: 1, unrec: 1 }, board: '', urbanOnly: false })) || { reasons: [], d: null }, { score: 0 });
  const close = () => { S.open = null; emit(); };
  const b = boardsOf(s), kind = KIND[s.mg];
  const bname = i => S.idx.boards[i] ? (BOARD_SHORT[S.idx.boards[i]] || S.idx.boards[i]) : '';
  const asks = [];
  if (s.mg === 4) asks.push('Kendriya Vidyalayas admit children of transferable central government and defence employees first. Bring your transfer or posting order.');
  if (!b.size) asks.push('Which board is the school affiliated to, and what is its affiliation number? You can check CBSE schools on the CBSE SARAS portal.');
  asks.push('Are there seats in ' + (child() && child().cls !== '' && child().cls != null ? classLabel(+child().cls) : 'your child’s class') + ' now, and do they take admissions mid-year?');
  if (kind === 'pvt' || kind === 'aided') asks.push('What is the full fee for the year: tuition, admission fee, transport, books and uniform?');
  if (kind === 'pvt') asks.push('Private schools keep 25% of entry-class seats for families with lower incomes under the Right to Education Act. Ask if you might qualify.');
  asks.push('Which second and third languages are taught? Many states require their own language, so ask how the school helps children new to it.');
  asks.push('Is there a bus or van from your area, and how long is the ride?');
  asks.push('Do they have a special educator or learning support if your child needs it?');
  const setStatus = v => { if (!sl) shortlist(s); S.me.shortlist[s.id].status = v; Store.save(); };
  const gmaps = s.lat ? (S.home ? 'https://www.google.com/maps/dir/?api=1&origin=' + S.home.lat + ',' + S.home.lon + '&destination=' + s.lat + ',' + s.lon : 'https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lon) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.n + ' ' + s.di);
  return html`<div class="scrim" onPointerDown=${ev => { if (ev.target === ev.currentTarget) close(); }}>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label=${s.n}>
      <div class="row" style="justify-content:space-between"><span class="label">${MG_LABEL[s.mg]}</span><button class="ibtn" aria-label="Close" onClick=${close}>${I('x')}</button></div>
      <h2>${s.n}</h2>
      <div class="muted">${[s.loc, s.di, s.state].filter(Boolean).join(', ')}${s.pin ? ' · PIN ' + s.pin : ''}</div>
      ${(() => { const why = evaluate(s, child(), S.home, filters()) ? [] : whyHidden(s, child(), S.home, filters());
        return why.length ? html`<div class="notice" style="margin:14px 0 0">${I('alert')}<span><b>Why it’s not in your list:</b> ${why.join('. ')}.${why.some(w => /km away|no map location/.test(w)) ? ' The government register’s map points are sometimes wrong. Check where it really is with “Open in Maps”, and widen the distance if it’s close to your home.' : ''}</span></div>` : null; })()}
      ${s.fixed ? html`<div class="notice info" style="margin:14px 0 0">${I('info')}<span>${s.fixed === 'osm' ? 'The government register had this school in the wrong place on the map. SchoolSafar uses its location from OpenStreetMap instead.' : 'The government register had this school in the wrong place on the map. SchoolSafar uses its real address instead.'}</span></div>` : null}
      <div class="chips">${e.score ? html`<span class="chip" style="background:var(--ink);color:var(--sheet)">Fit ${e.score}/100</span>` : null}${e.reasons.map(([k, t]) => html`<span class=${'chip ' + k}>${t}</span>`)}</div>
      <div class="row" style="margin-top:16px">
        <button class=${'btn ' + (sl ? '' : 'primary')} onClick=${() => shortlist(s)}>${I('star')}${sl ? 'On your shortlist' : 'Add to shortlist'}</button>
        <a class="btn" href=${gmaps} target="_blank" rel="noopener">${I('route')}${S.home && s.lat ? 'Directions' : 'Open in Maps'}</a>
      </div>
      <dl class="kv">
        <dt>Classes</dt><dd>${(s.fl & 2) && s.cf > 0 ? 'Nursery and ' : ''}${s.cf === 0 ? 'Nursery' : 'Class ' + s.cf} to ${s.ct}</dd>
        <dt>Board</dt><dd>${bname(s.bs) || bname(s.bh) ? [bname(s.bs) && 'Class 10: ' + bname(s.bs), bname(s.bh) && 'Class 12: ' + bname(s.bh)].filter(Boolean).join(' · ') : b.size ? [...b].join(', ') + ' (central school)' : 'Not recorded'}</dd>
        <dt>Run by</dt><dd>${MG_LABEL[s.mg]}</dd>
        <dt>For</dt><dd>${s.fl & 4 ? 'Girls only' : s.fl & 8 ? 'Boys only' : 'Girls and boys (co-ed)'}</dd>
        <dt>Students</dt><dd>${s.st ? fmtN(s.st) : 'Not recorded'}</dd>
        <dt>Teachers</dt><dd>${s.t ? fmtN(s.t) + (s.st ? ' · about 1 per ' + Math.round(s.st / s.t) + ' students' : '') : 'Not recorded'}</dd>
        ${s.rooms ? html`<dt>Classrooms</dt><dd>${s.rooms}</dd>` : null}
        ${s.y > 1800 ? html`<dt>Founded</dt><dd>${s.y} (${new Date().getFullYear() - s.y} years ago)</dd>` : null}
        <dt>Area</dt><dd>${s.fl & 1 ? 'Urban' : 'Rural'}${e.d != null ? ' · ' + e.d.toFixed(1) + ' km from ' + (S.home.exact ? 'your new home' : S.home.label) + ' in a straight line' : ''}</dd>
        <dt>UDISE code</dt><dd class="mono">${s.id} <button class="ibtn" style="width:26px;height:26px" aria-label="Copy UDISE code" onClick=${async () => { try { await navigator.clipboard.writeText(s.id); toast('UDISE code copied'); } catch (x) { toast('Select the code to copy it'); } }}>${I('copy')}</button></dd>
      </dl>
      <h3 style="font:800 18px var(--f-display);margin-top:6px">Questions to ask this school</h3>
      <ul class="ask-list">${asks.map(a => html`<li>${a}</li>`)}</ul>
      <h3 style="font:800 18px var(--f-display);margin-top:22px">Your notes</h3>
      <div class="statuses" style="margin:8px 0" role="group" aria-label="Status">${STATUSES.map(([v, l]) => html`<button class=${'btn sm' + (sl && sl.status === v ? ' dark' : '')} aria-pressed=${sl && sl.status === v ? 'true' : 'false'} onClick=${() => setStatus(v)}>${l}</button>`)}</div>
      <textarea id="note" class="input" placeholder="Fees you were quoted, who you spoke to, visit date…" value=${note} onInput=${ev => setNote(ev.target.value)} onBlur=${() => { if (!S.me.shortlist[s.id] && !note.trim()) return; if (!S.me.shortlist[s.id]) shortlist(s); S.me.shortlist[s.id].note = note; Store.save(); }}></textarea>
      <p class="faint" style="font-size:13px;margin-top:18px">From the UDISE+ register. Details can be out of date, so confirm with the school before you decide.</p>
    </aside></div>`;
}
const STATUSES = [['considering', 'Considering'], ['contacted', 'Contacted'], ['visited', 'Visited'], ['applied', 'Applied'], ['admitted', 'Admitted'], ['no', 'Not for us']];
