/* v93 (22.10, Денис: «последнюю выбрал» — design/v12 №12): «Питание» = дуга 270° как Lifesum, центр «осталось ↔ съел» по тапу,
   палец по дуге — стеклянная лупа показывает, что съел к этой точке; бледное продолжение — план; внизу плитки Белок / Креатин / Сон.
   Анимация только при входе на вкладку (render: !sameTab), перерисовка после галочки — сразу итог. */
const F12 = { G: 'f12', W: 15 };
const f12arc = (() => { // дуга 135°→405° по кругу r=104 в квадрате 260
  const p = (a) => [130 + 104 * Math.cos((a * Math.PI) / 180), 130 + 104 * Math.sin((a * Math.PI) / 180)], [x0, y0] = p(135), [x1, y1] = p(405);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A104 104 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
})();
// общий расчёт и куски разметки: «Питание» (food12) и карточка №9 на главной (home9) — одни цифры
function f12data(c, t) {
  const today = Fit.dstr(Date.now()), E = Math.round(t.kcal), G = c.goalKcal;
  return { h: S.habits[today] || {}, E, G, over: E > G, burn: tdeeNow() || c.t.base, lo: c.t.kcalLo, hi: c.t.kcalHi,
    meals: S.meals.filter((m) => m.date === today && !m.planned).map((m) => [m.title || m.items.map((x) => x.name).join(', '), m.total.kcal]) };
}
const f12attr = (d, t) => `data-e="${d.E}" data-g="${d.G}" data-b="${d.burn}" data-p="${fmt(t.protein)}" data-m='${esc(JSON.stringify(d.meals))}'`;
function f12arcHtml(d, t) {
  const { E, G, burn, over } = d, pe = Math.min(100, (E / G) * 100), pp = Math.min(100 - pe, (t.pKcal / G) * 100);
  const eat = !!food.f12eat, lab = over ? 'сверху нормы' : eat ? 'съел' : 'осталось', val = over ? E - G : eat ? E : G - E;
  return `<div class="f12w"><svg viewBox="0 0 260 236" width="100%" class="f12a"><defs><filter id="f12gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <path d="${f12arc}" pathLength="100" fill="none" stroke="var(--line)" stroke-width="${F12.W}" stroke-linecap="round"/>
      ${pp > 0 ? `<path d="${f12arc}" pathLength="100" fill="none" stroke="var(--blue)" stroke-opacity=".28" stroke-width="${F12.W}" stroke-linecap="round" stroke-dasharray="${pe + pp} 100"/>` : ''}
      <path class="fg" d="${f12arc}" pathLength="100" fill="none" stroke="var(--blue)" stroke-width="${F12.W}" stroke-linecap="round" stroke-dasharray="${E ? pe : 0} 200" stroke-opacity="${E ? 1 : 0}"/>
      <circle class="cp" r="${E ? 5 : 0}" fill="#fff"/></svg>
      <div class="f12c" data-act="f12c" role="button" aria-label="Осталось или съел"><div class="muted small lab">${lab}</div><div class="f12v val">${val.toLocaleString('ru-RU')}</div><div class="muted small">из ${G.toLocaleString('ru-RU')} ккал</div></div>
      <div class="f12s" style="left:21.7%"><b class="eat">${E.toLocaleString('ru-RU')}</b><span>съел</span></div><div class="f12s" style="left:78.3%"><b>${burn.toLocaleString('ru-RU')}</b><span>расход</span></div>
      <div class="f12b"></div></div>`;
}
function f12tiles(d, c, t) {
  const chk = (on) => `<svg class="f12k${on ? ' on' : ''}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>`;
  const ser = (k) => { const st = Food.habitStreak(S, Fit, k, Date.now(), c.goalProtein); // v95: серия и точки из «Я» переехали сюда
    return `<div class="f12sr"><b class="${st.n ? '' : 'z'}">${st.n ? st.n + ' ' + plural(st.n, ['день', 'дня', 'дней']) + ' подряд' : 'серии нет'}</b><span>${st.week.map((x, i) => `<i class="${x ? 'on' : ''}${i === 6 ? ' td' : ''}"></i>`).join('')}</span></div>`; };
  const tile = (k, n, sub, on) => `<button class="f12t" data-act="f12h" data-h="${k}"><b>${n}</b><div class="muted small">${sub}</div>${chk(on)}${ser(k)}</button>`;
  return `<div class="f12g"><div class="f12t f12p"><b>Белок</b><div class="muted small"><span class="pv">${fmt(t.protein)}</span> / ${c.goalProtein} г</div><div class="f12bar"><i style="width:${Math.min(100, (t.protein / c.goalProtein) * 100)}%"></i></div>${ser('protein')}</div>
      ${tile('creatine', 'Креатин', '5 г', d.h.creatine)}${tile('sleep', 'Сон', '≥ 7 ч', d.h.sleep)}</div>`;
}
function f12notes(c, t) { // подписи под плитками во вкладке «Питание» (раньше — в карточке №12)
  const pOk = c.goalProtein > 0 && t.protein >= c.goalProtein;
  return `<p class="muted small" style="margin:8px 2px 0;text-align:center">Точки — 7 дней, правая — сегодня. Белок отмечается сам, когда съел норму.</p>
    ${pOk ? '' : `<p class="muted small" style="margin:10px 2px 0">Белок на глаз: 2 ладони мяса, рыбы или творога за раз, 3–4 раза в день. Калории даже при подсчёте ошибаются на 20–35 % — главное белок и вес раз в неделю.</p>`}`;
}
const f12spring = (k) => (k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(8.5 * k));
function f12tween(dur, ease, cb) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return cb(1);
  const t0 = performance.now(), f = (n) => { const k = Math.min(1, (n - t0) / dur); cb(ease(k)); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f);
}
const f12out = (k) => 1 - Math.pow(1 - k, 3);
function f12place(card, pct) { const fg = card.querySelector('.fg'), cp = card.querySelector('.cp'); fg.setAttribute('stroke-dasharray', `${Math.max(0, pct)} 200`); fg.setAttribute('stroke-opacity', pct > 0 ? 1 : 0); // 200: без точки-хвоста в конце дуги
  if (+card.dataset.e) { const pt = fg.getPointAtLength(Math.max(0.01, (pct / 100) * fg.getTotalLength())); cp.setAttribute('cx', pt.x); cp.setAttribute('cy', pt.y); } }
// вход на вкладку: дуга набегает с пружинкой, числа отсчитываются, белок наливается
function food12run(card, play) {
  const E = +card.dataset.e, G = +card.dataset.g, pe = Math.min(100, (E / G) * 100), val = card.querySelector('.val'), eat = card.querySelector('.eat'), v0 = +val.textContent.replace(/\D/g, '');
  f12place(card, pe); f12bind(card);
  if (!play || !E) return;
  const bar = card.querySelector('.f12bar i'), w = bar.style.width;
  f12tween(1400, f12spring, (k) => f12place(card, pe * k));
  const a = card.querySelector('.lab').textContent === 'осталось' ? G : 0; // «осталось» тает от нормы, «съел» растёт от нуля
  f12tween(1100, f12out, (k) => { val.textContent = Math.round(a + (v0 - a) * k).toLocaleString('ru-RU'); eat.textContent = Math.round(E * k).toLocaleString('ru-RU'); });
  bar.style.width = '0'; f12tween(1100, f12spring, (k) => { bar.style.width = parseFloat(w) * k + '%'; });
}
// палец по дуге: кружок-лупа едет по съеденному, пузырь — сколько к этой точке и какой приём
function f12bind(card) {
  const svg = card.querySelector('.f12a'), cp = card.querySelector('.cp'), bub = card.querySelector('.f12b'), E = +card.dataset.e, G = +card.dataset.g, M = JSON.parse(card.dataset.m || '[]');
  if (!E) return;
  const move = (e) => {
    const b = svg.getBoundingClientRect(), x = ((e.clientX - b.left) / b.width) * 260, y = ((e.clientY - b.top) / b.width) * 260;
    let a = (Math.atan2(y - 130, x - 130) * 180) / Math.PI; if (a < 90) a += 360;
    const f = Math.max(0, Math.min(1, (a - 135) / 270)), kc = f * G, got = Math.min(kc, E), fg = card.querySelector('.fg');
    const pt = fg.getPointAtLength(Math.max(0.01, Math.min(f, E / G) * fg.getTotalLength()));
    cp.setAttribute('cx', pt.x); cp.setAttribute('cy', pt.y); cp.setAttribute('r', 12); cp.setAttribute('fill', 'rgba(255,255,255,.35)'); cp.setAttribute('stroke', '#fff');
    const cb = card.getBoundingClientRect(); bub.style.left = b.left - cb.left + (pt.x / 260) * b.width + 'px'; bub.style.top = b.top - cb.top + (pt.y / 260) * b.width + 'px'; bub.style.opacity = 1;
    let acc = 0, who = M[0]; for (const m of M) { acc += m[1]; who = m; if (got <= acc) break; }
    bub.innerHTML = kc > E ? `<b>${E.toLocaleString('ru-RU')} ккал</b> — дальше пусто, ещё ${Math.max(0, G - E).toLocaleString('ru-RU')}` : `<b>${Math.round(got).toLocaleString('ru-RU')} ккал</b>${who ? ' · ' + esc(who[0]) : ''}`;
  };
  const up = () => { bub.style.opacity = 0; cp.setAttribute('r', 5); cp.setAttribute('fill', '#fff'); cp.removeAttribute('stroke'); f12place(card, Math.min(100, (E / G) * 100)); };
  svg.style.touchAction = 'none';
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); move(e); });
  svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') move(e); });
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}
// тап по центру: «осталось» ↔ «съел», дуга перетекает
function food12flip(card) {
  const E = +card.dataset.e, G = +card.dataset.g; if (E > G) return;
  food.f12eat = !food.f12eat;
  const lab = card.querySelector('.lab'), val = card.querySelector('.val'), from = food.f12eat ? G - E : E, to = food.f12eat ? E : G - E;
  lab.textContent = food.f12eat ? 'съел' : 'осталось';
  f12tween(600, f12out, (k) => { val.textContent = Math.round(from + (to - from) * k).toLocaleString('ru-RU'); });
}

/* v104 (Денис 22.10: «почему №9 с v12 не внедрил? Вот так мне надо — на первую страницу»): design/v12 №9 «дуга сверху, шкала снизу» —
   стекло на бирюзовом сиянии, дуга как в «Питании» (те же f12data/f12arcHtml/f12tiles), под ней шкала Bevel «съел − потратил»:
   левый край — ничего не съел (−расход), светлая зона — набор (норма − расход), бегунок — стеклянная линза, под ней шкала крупнее */
const N9 = { lo: (d) => -d.burn, hi: (d) => Math.max(900, d.hi - d.burn + 300) };
const n9x = (d, v) => 18 + ((Math.max(N9.lo(d), Math.min(N9.hi(d), v)) - N9.lo(d)) / (N9.hi(d) - N9.lo(d))) * 264;
const n9num = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('ru-RU');
function n9scale(d) {
  const z0 = n9x(d, d.lo - d.burn), z1 = n9x(d, d.hi - d.burn), tk = [];
  for (let v = -3000; v <= N9.hi(d) - 150; v += 500) if (v >= N9.lo(d) + 150 && (v % 1000 === 0 || v === 500)) tk.push(v); // шаг 1000: при 500 подписи «−2 500−2 000» слипаются на 390 px
  return `<svg viewBox="0 0 300 76" width="100%" class="n9s"><g id="sc9h"><defs><linearGradient id="sg9h"><stop offset="0" stop-color="#2A3436"/><stop offset=".72" stop-color="#3B4544"/><stop offset="1" stop-color="#14B8A6"/></linearGradient></defs>
    <rect x="18" y="34" width="264" height="12" rx="6" fill="url(#sg9h)"/><rect x="${z0 - 3}" y="31" width="${z1 - z0 + 6}" height="18" rx="5" fill="#7DDDD3"/>
    <line x1="${n9x(d, 0)}" x2="${n9x(d, 0)}" y1="28" y2="52" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>
    ${tk.map((v) => `<text x="${n9x(d, v)}" y="68" fill="#99A3A2" font-size="10" text-anchor="middle">${n9num(v)}</text>`).join('')}
    <text x="${(z0 + z1) / 2}" y="22" fill="#7DDDD3" font-size="11" text-anchor="middle" font-weight="700">набор</text></g>
    <defs><clipPath id="lc9h"><circle class="lcc" cx="0" cy="40" r="19"/></clipPath><radialGradient id="lr9h" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".35" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></radialGradient></defs>
    <g class="lens"><circle class="lsh" cx="0" cy="44" r="19" fill="#000" opacity=".35" style="filter:blur(3px)"/><circle class="lbg" cx="0" cy="40" r="19" fill="#203234"/>
    <g clip-path="url(#lc9h)"><use class="lmag" href="#sc9h"/></g>
    <line class="lnd" x1="0" x2="0" y1="27" y2="53" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle class="lrim" cx="0" cy="40" r="19" fill="url(#lr9h)" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/></g></svg>`;
}
function home9(c, t, tab) {
  const d = f12data(c, t), net = d.E - d.burn;
  const z = d.E < d.lo ? `до зоны набора ещё ${(d.lo - d.E).toLocaleString('ru-RU')} ккал` : d.E > d.hi ? `выше зоны набора на ${(d.E - d.hi).toLocaleString('ru-RU')} ккал` : 'в зоне набора — так и держи';
  return `<div class="st9h"><div class="aur9h"><i></i><i></i><i></i></div><div class="glass f12 n9h" ${f12attr(d, t)} data-n="${net}" data-x0="${n9x(d, -d.burn)}" data-x="${n9x(d, net)}" data-lo="${-d.burn}">
    ${tab ? `<div class="f12h">Сегодня${d.meals.length ? ' · веди пальцем по дуге' : ''}</div>` : '<div class="f12h n9t" data-tab="food" role="button">Питание · сегодня<span>›</span></div>'}
    ${f12arcHtml(d, t)}${tab && t.pKcal ? `<div class="small" style="text-align:center;color:var(--amber);margin:-14px 0 8px">бледное — ещё ${t.pKcal} ккал по плану</div>` : ''}
    <div style="text-align:center;margin-top:4px"><b class="net9">${n9num(net)}</b><div class="muted small">ккал · съел − потратил</div></div>
    ${n9scale(d)}<div class="small n9z">${z}</div>
    ${f12tiles(d, c, t)}${tab ? f12notes(c, t) : ''}</div></div>`;
}
function n9lens(card, x) {
  card.querySelectorAll('.lcc,.lbg,.lrim,.lsh').forEach((c) => c.setAttribute('cx', x)); const nd = card.querySelector('.lnd'); nd.setAttribute('x1', x); nd.setAttribute('x2', x);
  card.querySelector('.lmag').setAttribute('transform', `translate(${x} 40) scale(1.7) translate(${-x} -40)`); // линза: та же шкала, увеличенная под стеклом
}
// вход на главную: блик по стеклу, дуга (food12run), через 0,5 с линза едет от «ничего не съел» к сегодняшнему
function home9run(card, play) {
  const x0 = +card.dataset.x0, x = +card.dataset.x, n = +card.dataset.n, lo = +card.dataset.lo, el = card.querySelector('.net9');
  n9lens(card, x);
  if (!play || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  card.classList.remove('sheen'); void card.offsetWidth; card.classList.add('sheen');
  n9lens(card, x0); el.textContent = n9num(lo);
  setTimeout(() => { f12tween(1500, f12spring, (k) => n9lens(card, x0 + (x - x0) * k)); f12tween(1300, f12out, (k) => { el.textContent = n9num(lo + (n - lo) * k); }); }, 500);
}
