/* SchoolSafar — "your new address": find the exact home on a map (website), or match its area / PIN code (offline) */
const CAN_WEB = !(window.claude && typeof window.claude.use === 'function');   // inside Claude, outside services are blocked
const STOPWORDS = new Set(['nagar', 'road', 'colony', 'sector', 'ward', 'gaon', 'village', 'east', 'west', 'north', 'south', 'new', 'old', 'main', 'city', 'town', 'layout',
  'phase', 'block', 'extension', 'cross', 'street', 'lane', 'marg', 'chowk', 'society', 'apartment', 'apartments', 'tower', 'flat', 'house', 'near', 'opposite', 'behind', 'school']);
const norm = s => ' ' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';

function offlineMatches(text) {
  const t = norm(text), out = [], seen = new Set();
  const pin = (String(text).match(/\b([1-9]\d{5})\b/) || [])[1];
  if (pin) { const p = S.areas.find(a => a.kind === 'pin' && a.label === pin); if (p) out.push(Object.assign({}, p, { how: 'PIN code ' + pin })); }
  for (const a of S.areas) {
    if (a.kind !== 'area' || a.n < 2) continue;
    const l = norm(a.label); if (l.length < 6) continue;
    const w = l.trim().split(' ')[0];
    if (t.includes(l) || (w.length >= 5 && !STOPWORDS.has(w) && t.includes(' ' + w + ' '))) {
      if (!seen.has(a.label)) { seen.add(a.label); out.push(Object.assign({}, a, { how: 'Area ' + a.label })); }
    }
    if (out.length >= 6) break;
  }
  return out;
}
function cityBox() {
  const la = S.schools.filter(s => s.lat).map(s => s.lat).sort((a, b) => a - b), lo = S.schools.filter(s => s.lat).map(s => s.lon).sort((a, b) => a - b);
  if (!la.length) return null; const q = (arr, p) => arr[Math.floor((arr.length - 1) * p)];
  return [q(lo, .01) - .05, q(la, .99) + .05, q(lo, .99) + .05, q(la, .01) - .05];
}
let lastGeo = 0;
async function nominatim(q, box) {
  const wait = 1100 - (Date.now() - lastGeo); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastGeo = Date.now();   // public service: at most one search a second
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=6&accept-language=en&q=' + encodeURIComponent(q) + (box ? '&bounded=1&viewbox=' + box.join(',') : '');
  return (await fetch(u)).json();
}
async function geocode(text) {
  // Building and flat names are rarely on the map, so retry with less detail: "Flat 4B, Sai Heights, Baner Road, Pune" → "Baner Road, Pune" → …
  const box = cityBox(), parts = text.split(',').map(s => s.trim()).filter(Boolean);
  const tries = [parts.join(', ')]; for (let i = 1; i < parts.length - 1 && tries.length < 4; i++) tries.push(parts.slice(i).join(', '));
  for (let n = 0; n < tries.length; n++) {
    const res = await nominatim(tries[n], box);
    if (res.length) return res.map(x => ({ label: x.display_name.split(',').slice(0, 3).join(',').trim(), sub: x.display_name, lat: +x.lat, lon: +x.lon, exact: true, approx: n > 0 }));
  }
  return [];
}
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!loadLeaflet.p) loadLeaflet.p = new Promise((res, rej) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => res(window.L); s.onerror = () => { loadLeaflet.p = null; rej(); }; document.head.appendChild(s);
  });
  return loadLeaflet.p;
}

function AddressDialog() {
  const [q, setQ] = useState((S.me.plan && S.me.plan.addr) || ''), [busy, setBusy] = useState(false), [res, setRes] = useState(null), [err, setErr] = useState(''), [pt, setPt] = useState(null);
  const mapEl = useRef(), map = useRef(null), marker = useRef(null);
  const close = () => { S.addrOpen = false; emit(); };
  useEffect(() => { const k = e => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', k); return () => { window.removeEventListener('keydown', k); if (map.current) { map.current.remove(); map.current = null; } }; }, []);
  const search = async e => {
    if (e) e.preventDefault(); if (!q.trim() || busy) return;
    setBusy(true); setErr(''); const offline = offlineMatches(q); let web = [];
    if (CAN_WEB) { try { web = await geocode(q); } catch (x) { setErr('The map search didn’t answer, so these are matches from the school register instead.'); } }
    setRes({ web, offline }); setBusy(false);
    const first = web[0] || offline[0]; setPt(first ? Object.assign({}, first, { moved: false }) : null);
    if (!first) setErr(CAN_WEB ? 'We couldn’t find that address. Try just the area and city, for example “Baner, Pune”, or add the PIN code.' : 'We couldn’t find an area or PIN code from the register in that address. Add the PIN code, or the name of the area.');
  };
  const here = () => {
    if (!navigator.geolocation) return setErr('This browser can’t share your location.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(p => { setBusy(false); setRes(null); setPt({ label: 'Your current location', sub: 'From your phone or computer', lat: p.coords.latitude, lon: p.coords.longitude, exact: true }); },
      () => { setBusy(false); setErr('Location wasn’t shared. You can type the address instead.'); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  useEffect(() => {
    if (!CAN_WEB || !pt || !mapEl.current) return;
    loadLeaflet().then(L => {
      if (!map.current) {
        map.current = L.map(mapEl.current, { scrollWheelZoom: false }).setView([pt.lat, pt.lon], pt.exact ? 17 : 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
        marker.current = L.marker([pt.lat, pt.lon], { draggable: true, icon: L.divIcon({ className: 'pin-icon', html: '<i></i>', iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(map.current);
        const moveTo = ll => setPt(p => Object.assign({}, p, { lat: ll.lat, lon: ll.lng, exact: true, moved: true }));
        marker.current.on('dragend', () => moveTo(marker.current.getLatLng()));
        map.current.on('click', ev => { marker.current.setLatLng(ev.latlng); moveTo(ev.latlng); });
      } else if (!pt.moved) { map.current.setView([pt.lat, pt.lon], pt.exact ? 17 : 14); marker.current.setLatLng([pt.lat, pt.lon]); }
    }).catch(() => setErr('The map didn’t load, but you can still use the address we found.'));
  }, [pt && pt.lat, pt && pt.lon, pt && pt.moved]);
  const use = () => {
    if (!pt) return;
    setHome({ label: pt.exact ? 'Your new home' : pt.label, sub: pt.exact ? (q || pt.sub) : pt.sub, lat: pt.lat, lon: pt.lon, exact: !!pt.exact });
    S.me.plan.addr = q; S.addrOpen = false; S.example = false; Store.save(); toast(pt.exact ? 'Distances are now from your new home' : 'Distances are from the centre of ' + pt.label);
  };
  const Row = r => html`<button class=${'addr-opt' + (pt && pt.lat === r.lat && pt.lon === r.lon ? ' on' : '')} onClick=${() => setPt(Object.assign({}, r, { moved: false }))}>
    <b>${r.label}</b><small>${r.exact ? (r.approx ? 'Nearest match on the map · drag the pin to your building · ' : '') + r.sub : r.how + ' · centre of ' + fmtN(r.n) + ' schools’ locations'}</small></button>`;
  return html`<div class="scrim modal-wrap" onPointerDown=${e => { if (e.target === e.currentTarget) close(); }}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Your new address" style="width:min(600px,100%)">
      <div class="row" style="justify-content:space-between"><h2 style="font-size:22px">Your new address</h2><button class="ibtn" aria-label="Close" onClick=${close}>${I('x')}</button></div>
      <p class="muted" style="margin:6px 0 14px;font-size:15px">${CAN_WEB ? 'Type the address you’re moving to. We’ll find it on the map, and you can drag the pin to your exact building.' : 'Type the address you’re moving to. In this preview, distances are measured from the area or PIN code in your address. On the SchoolSafar website, your exact address is found on a map.'}</p>
      <form class="row" style="flex-wrap:nowrap;align-items:stretch" onSubmit=${search}>
        <input id="addr" class="input grow" autocomplete="street-address" placeholder=${'e.g. Flat 4B, Sai Heights, Baner Road, ' + (S.place ? S.place.label : 'Pune') + ' 411045'} value=${q} onInput=${e => setQ(e.target.value)}/>
        <button class="btn primary lg" disabled=${!q.trim() || busy}>${busy ? 'Finding…' : 'Find'}</button>
      </form>
      ${CAN_WEB && navigator.geolocation ? html`<button class="btn ghost sm" style="margin-top:8px" onClick=${here}>${I('pin')}I’m already there: use my current location</button>` : null}
      ${err ? html`<div class="notice" style="margin:12px 0 0">${I('alert')}<span>${err}</span></div>` : null}
      ${res && (res.web.length || res.offline.length) ? html`<div class="addr-list">${res.web.map(Row)}${res.offline.map(Row)}</div>` : null}
      ${CAN_WEB && pt ? html`<div class="addr-map" ref=${mapEl}></div><p class="faint" style="font-size:13px;margin:6px 0 0">Drag the pin, or tap the map, to put it on your building.</p>` : null}
      <p class="faint" style="font-size:13px;margin:14px 0 0">${CAN_WEB ? 'Your address is sent to OpenStreetMap’s free search to find it on the map. SchoolSafar keeps it only in your own browser.' : 'Your address stays in your own account or browser.'}</p>
      <div class="row" style="justify-content:flex-end;margin-top:14px">
        ${S.home ? html`<button class="btn ghost" onClick=${() => { setHome(null); S.me.plan.addr = ''; Store.save(); close(); }}>Clear home</button>` : null}
        <button class="btn" onClick=${close}>Cancel</button>
        <button class="btn dark" disabled=${!pt} onClick=${use}>Use this ${pt && pt.exact ? 'address' : 'area'}</button></div>
    </div></div>`;
}
