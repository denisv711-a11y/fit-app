/* v147: чистый график веса за всё время без наложения цифр + строка Старт/Мин/Макс/Сейчас + тап по точкам + быстрый ввод веса прямо в «Я». */
const W9 = { MON: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], WEEKS: 56 };
const w9f = (n) => (Math.round(n * 10) / 10).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const w9s = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + w9f(Math.abs(n));
const w9d = (s) => s.slice(8, 10) + '.' + s.slice(5, 7);
function weight9data() {
  const wi = S.weights.filter((w) => +w.kg > 0).map((w) => ({ date: w.date, weightKg: +w.kg })).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!wi.length) return null;
  const T = Coach.computeWeightTrend(wi), n = T.length - 1, start = wi[0].weightKg, tr = T[n].trendKg;
  const day = (d) => Coach.daysBetween(wi[0].date, d);
  const pts = wi.map((w) => [day(w.date), w.weightKg, w.date]);
  const back = Math.min(7, n), rate = n ? ((tr - T[n - back].trendKg) * 7) / back : 0;
  const g = Fit.gainKg(tr);
  return { wi, T, n, start, tr, pts, rate, lo: g.lo, hi: g.hi, d0: wi[0].date };
}
function weight9() {
  const D = weight9data();
  const todayStr = Fit.dstr(Date.now()), todayW = S.weights.find((w) => w.date === todayStr);
  const inp = `<div class="win9" style="margin-top:12px"><input id="wnow" inputmode="decimal" placeholder="${todayW ? `Сегодня ${w9f(+todayW.kg)} кг` : 'Записать вес сегодня, кг'}"><button class="primary" data-act="wsave">${todayW ? 'Поправить' : 'Записать'}</button></div>`;
  if (!D) return `<div class="card w9"><div class="f12h">Вес</div><p class="muted" style="margin:6px 0">Запиши утренний вес — появится график и темп набора.</p>${inp}</div>`;
  const { T, n, start, tr, pts, rate, lo, hi, d0 } = D, span = Math.max(n, 1), h = 164;
  const wedge = n > 0 ? [start + (lo * span) / 7, start + (hi * span) / 7] : [start, start];
  const all = pts.map((p) => p[1]).concat(T.map((t) => t.trendKg), wedge);
  const rawMin = Math.min(...all), rawMax = Math.max(...all);
  const pad = Math.max(0.5, (rawMax - rawMin) * 0.15);
  const ylo = Math.floor((rawMin - pad) * 2) / 2, yhi = Math.ceil((rawMax + pad) * 2) / 2;
  const ySpan = Math.max(1, yhi - ylo);
  const X = (d) => 12 + (d / span) * 252, Y = (kg) => 14 + ((yhi - kg) / ySpan) * (h - 42);
  let s = `<svg viewBox="0 0 300 ${h}" width="100%" class="w9c"><defs><linearGradient id="w9ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14B8A6" stop-opacity=".26"/><stop offset="1" stop-color="#14B8A6" stop-opacity="0"/></linearGradient>
    <clipPath id="w9cl"><rect class="w9rev" x="0" y="0" width="300" height="${h}"/></clipPath></defs>`;
  // дедуп делений оси Y: минимум 0.5 кг и не ближе 22px друг к другу
  const yTicks = [ylo + ySpan * 0.15, (ylo + yhi) / 2, yhi - ySpan * 0.15].map((v) => Math.round(v * 2) / 2);
  const drawnY = [];
  yTicks.forEach((v) => {
    const yy = Y(v);
    if (drawnY.some((prev) => Math.abs(prev - yy) < 22)) return;
    drawnY.push(yy);
    s += `<line x1="12" x2="266" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="271" y="${(yy + 3.5).toFixed(1)}" fill="var(--ink-2)" font-size="10">${w9f(v)}</text>`;
  });
  if (n > 0) s += `<path class="w9wd" d="M${X(0).toFixed(1)} ${Y(start).toFixed(1)} L${X(span).toFixed(1)} ${Y(wedge[1]).toFixed(1)} L${X(span).toFixed(1)} ${Y(wedge[0]).toFixed(1)} Z" fill="#14B8A6" opacity=".18"/>`;
  const tl = pts.map(([d, kg], i) => `${i ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(kg).toFixed(1)}`).join(' ');
  s += `<g clip-path="url(#w9cl)">${n ? `<path d="${tl} L${X(span).toFixed(1)} ${h - 28} L${X(0).toFixed(1)} ${h - 28} Z" fill="url(#w9ar)"/>` : ''}<path d="${tl}" fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const r = pts.length > 35 ? 2.5 : pts.length > 14 ? 3.5 : 4.5;
  pts.forEach(([d, kg, dt], i) => {
    const cx = X(d).toFixed(1), cy = Y(kg).toFixed(1), isLast = i === pts.length - 1;
    s += `<circle class="w9p${isLast ? ' on' : ''}" cx="${cx}" cy="${cy}" r="${isLast ? r + 1 : r}" fill="${isLast ? '#5EEAD4' : '#E9F2F1'}" stroke="#071216" stroke-width="2" data-d="${d}" data-i="${i}"/>`;
    s += `<circle class="w9hit" cx="${cx}" cy="${cy}" r="14" fill="transparent" data-i="${i}" data-kg="${w9f(kg)}" data-dt="${w9d(dt)}" data-diff="${w9s(kg - start)}"/>`;
  });
  // подписи дат снизу: не чаще 54px, крайние выровнены внутрь
  const ticks = pts.length <= 6 ? pts.map(([d]) => d) : Array.from({ length: 5 }, (_, i) => Math.round((i * span) / 4));
  let lx = 999;
  ticks.slice().reverse().forEach((d) => {
    const x = X(d);
    if (lx - x < 54) return;
    lx = x;
    const anc = d === 0 ? 'start' : d === span ? 'end' : 'middle';
    s += `<text x="${x.toFixed(1)}" y="${h - 8}" fill="var(--ink-2)" font-size="10" text-anchor="${anc}">${w9d(Coach.addDaysStr(d0, d))}</text>`;
  });
  s += '</svg>';
  const last = pts[pts.length - 1], mx = pts.reduce((a, b) => (b[1] > a[1] ? b : a)), mn = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  const stats = `<div class="w9stat"><div><small>старт</small><b>${w9f(start)}</b></div><div><small>мин</small><b>${w9f(mn[1])}</b></div><div><small>макс</small><b>${w9f(mx[1])}</b></div><div><small>сейчас</small><b style="color:#5EEAD4">${w9f(last[1])}</b></div></div>`;
  const gain = rate >= lo, fast = rate > hi;
  const say = n < 7 ? `Взвешивайся утром до еды — через неделю покажу реальный темп. Цель: +${w9f(lo)}…${w9f(hi)} кг в неделю.`
    : fast ? `Вес идёт <b>вверх</b> на ${w9f(rate)} кг/нед — быстрее нормы ${w9f(lo)}…${w9f(hi)}: лишнее уходит в жир. Убавь ~200 ккал.`
    : gain ? `В среднем <b>+${w9f(rate)} кг/нед</b> — ровно в коридоре набора ${w9f(lo)}…${w9f(hi)}. Так и держи.`
    : `В среднем <b style="color:#fff">${rate < 0 ? 'вниз' : 'вверх'} ${w9f(Math.abs(rate))} кг/нед</b>, а для набора нужно +${w9f(lo)}…${w9f(hi)}. Добавь ~200 ккал.`;
  const leg = n > 0 ? `<div class="w9leg"><span><i style="background:rgba(20,184,166,.35)"></i>коридор набора</span><span class="w9tip" id="w9tip">тап по точке — дата и вес</span></div>` : '';
  return `<div class="card w9"><div class="row between" style="align-items:baseline;margin-bottom:8px"><div><b class="w9v">${w9f(last[1])}</b> <span class="muted small">кг · ${w9d(last[2])}</span></div>
    <span class="small" style="color:${last[1] - start >= 0 ? 'var(--amber)' : 'var(--ink-2)'}">${w9s(last[1] - start)} кг с ${w9d(d0)}</span></div>
    ${stats}<div class="w9b">${s}</div>${leg}<div class="w9say">${say}</div>${inp}</div>`;
}
// вход на вкладку: плавная отрисовка линии + интерактивный тап по точкам
function weight9run(card, play) {
  const rev = card.querySelector('.w9rev'), ps = card.querySelectorAll('.w9p'), wd = card.querySelector('.w9wd'), tip = card.querySelector('#w9tip');
  card.querySelectorAll('.w9hit').forEach((h) => {
    h.onclick = () => {
      ps.forEach((p) => { const on = p.dataset.i === h.dataset.i; p.classList.toggle('on', on); p.setAttribute('fill', on ? '#5EEAD4' : '#E9F2F1'); });
      if (tip) tip.innerHTML = `<b style="color:#fff">${h.dataset.dt}</b> · <b>${h.dataset.kg} кг</b> (${h.dataset.diff})`;
    };
  });
  const done = () => { ps.forEach((p) => (p.style.transform = '')); };
  if (!play || !rev || matchMedia('(prefers-reduced-motion:reduce)').matches) return done();
  const span = Math.max(1, ...[...ps].map((p) => +p.dataset.d));
  ps.forEach((p) => { p.style.transform = 'scale(0)'; setTimeout(() => (p.style.transform = ''), 180 + (+p.dataset.d / span) * 900); });
  if (wd) { wd.style.opacity = 0; wd.style.transition = 'opacity .7s'; requestAnimationFrame(() => (wd.style.opacity = '')); }
  f12tween(1100, f12out, (k) => rev.setAttribute('width', Math.max(0, 300 * k)));
}
