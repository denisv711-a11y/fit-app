/* v94 (22.10, Денис: «бери 9 для веса» — design/v13 №9): карточка «Вес» в «Я» = график за ВЕСЬ срок с первого взвешивания,
   по нему по одному выезжают стеклянные ярлыки последний / максимум / минимум (Happy Scale; тренд — крупной цифрой сверху). Бирюзовый клин — коридор набора от старта.
   Подписи снизу: пока данных < 8 недель — по неделям («нед 1, 2…»), дальше — по месяцам (Денис: «сначала неделя, вторая, третья, потом по месяцам»).
   Тренд — Coach.computeWeightTrend (тот же, что считает расход). Анимация только при входе на вкладку (render: !sameTab). */
const W9 = { MON: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], WEEKS: 56 };
const w9f = (n) => (Math.round(n * 10) / 10).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const w9s = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + w9f(Math.abs(n));
const w9d = (s) => s.slice(8, 10) + '.' + s.slice(5, 7);
function weight9data() {
  const wi = S.weights.filter((w) => +w.kg > 0).map((w) => ({ date: w.date, weightKg: +w.kg })).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!wi.length) return null;
  const T = Coach.computeWeightTrend(wi), n = T.length - 1, start = wi[0].weightKg, tr = T[n].trendKg;
  const day = (d) => Coach.daysBetween(wi[0].date, d);
  const pts = wi.map((w) => [day(w.date), w.weightKg]);
  const back = Math.min(7, n), rate = n ? ((tr - T[n - back].trendKg) * 7) / back : 0; // кг в неделю по тренду: последние 7 дней или весь срок, если меньше
  const g = Fit.gainKg(tr);
  return { wi, T, n, start, tr, pts, rate, lo: g.lo, hi: g.hi, d0: wi[0].date };
}
function weight9() {
  const D = weight9data();
  if (!D) return `<div class="card w9"><div class="f12h">Вес</div><p class="muted" style="margin:6px 0">Взвесься на главной — появится график за всё время.</p></div>`;
  const { T, n, start, tr, pts, rate, lo, hi, d0 } = D, span = Math.max(n, 1), h = 170;
  const wedge = n > 0 ? [start + (lo * span) / 7, start + (hi * span) / 7] : [start, start];
  const all = pts.map((p) => p[1]).concat(T.map((t) => t.trendKg), wedge);
  const ylo = Math.floor((Math.min(...all) - 0.3) * 2) / 2, yhi = Math.ceil((Math.max(...all) + 0.3) * 2) / 2;
  const X = (d) => 14 + (d / span) * 260, Y = (kg) => 16 + ((yhi - kg) / (yhi - ylo)) * (h - 44);
  let s = `<svg viewBox="0 0 300 ${h}" width="100%" class="w9c"><defs><linearGradient id="w9ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14B8A6" stop-opacity=".28"/><stop offset="1" stop-color="#14B8A6" stop-opacity="0"/></linearGradient>
    <clipPath id="w9cl"><rect class="w9rev" x="0" y="0" width="300" height="${h}"/></clipPath></defs>`;
  [ylo + (yhi - ylo) * 0.15, (ylo + yhi) / 2, yhi - (yhi - ylo) * 0.15].forEach((v) => { v = Math.round(v * 2) / 2; s += `<line x1="14" x2="274" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="278" y="${Y(v) + 4}" fill="var(--ink-2)" font-size="10">${w9f(v)}</text>`; });
  if (n > 0) s += `<path class="w9wd" d="M${X(0)} ${Y(start)} L${X(span)} ${Y(wedge[1])} L${X(span)} ${Y(wedge[0])} Z" fill="#14B8A6" opacity=".22"/><text x="${X(span) - 2}" y="${Y(wedge[1]) - 6}" fill="var(--amber)" font-size="10" text-anchor="end" font-weight="700">коридор набора</text>`;
  // v111 (Денис 23.10: «что за три чёрные точки, непонятно, в какой день сколько я весил»): линия — по самим взвешиваниям, точки белые, у каждой кг, снизу даты; тренд — только в тексте
  const tl = pts.map(([d, kg], i) => `${i ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(kg).toFixed(1)}`).join(' ');
  s += `<g clip-path="url(#w9cl)">${n ? `<path d="${tl} L${X(span)} ${h - 28} L${X(0)} ${h - 28} Z" fill="url(#w9ar)"/>` : ''}<path d="${tl}" fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const r = pts.length > 40 ? 2.5 : 4.5, few = pts.length <= 10;
  pts.forEach(([d, kg]) => { s += `<circle class="w9p" cx="${X(d)}" cy="${Y(kg)}" r="${r}" fill="#E9F2F1" stroke="#071216" stroke-width="2" data-d="${d}"/>${few ? `<text x="${X(d)}" y="${Y(kg) - 10}" fill="#E9F2F1" font-size="11" font-weight="700" text-anchor="middle">${w9f(kg)}</text>` : ''}`; });
  // подписи снизу: до 8 недель — неделя от старта, дальше — начало каждого месяца
  // v111: подписи снизу — даты (до 10 взвешиваний — дата каждого; больше — ~6 дат по сроку), не «нед 1, 2»; тесные пропускаем
  const ticks = few ? pts.map(([d]) => d) : Array.from({ length: 7 }, (_, i) => Math.round((i * span) / 6));
  let lx = 999; ticks.slice().reverse().forEach((d) => { if (lx - X(d) < 46) return; lx = X(d); /* справа налево: последняя дата всегда видна */ s += `<text x="${X(d)}" y="${h - 10}" fill="var(--ink-2)" font-size="10" text-anchor="${d ? (d === span ? 'end' : 'middle') : 'start'}">${w9d(Coach.addDaysStr(d0, d))}</text>`; });
  s += '</svg>';
  // ярлыки: одинаковые точки сливаются в один («последний · максимум»)
  const last = pts[pts.length - 1], mx = pts.reduce((a, b) => (b[1] > a[1] ? b : a)), mn = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  const tags = [];
  const add = (nm, p) => { const t = tags.find((x) => x.p === p); if (t) t.nm += ' · ' + nm; else tags.push({ nm, p }); };
  if (!few) { add('последний', last); if (pts.length > 1) { add('максимум', mx); add('минимум', mn); } }
  // ярлык сбоку от точки (справа — левее, чтобы не лезть на шкалу); высоту берём первую, где он не закрывает точки и другие ярлыки
  const P = pts.map(([d, kg]) => [X(d), Y(kg)]), box = n > 0 ? [[X(span) - 84, Y(wedge[1]) - 10, 84]] : []; // первым — надпись «коридор набора»
  const lab = tags.map(({ nm, p }) => {
    const x = X(p[0]), y = Y(p[1]), w = nm.length * 6 + 40, r = x > 150, x0 = r ? x - 8 - w : x + 8;
    const free = (ty) => ty > 10 && ty < h - 36 && !P.some(([px, py]) => px > x0 - 6 && px < x0 + w + 6 && Math.abs(py - ty) < 17) && !box.some(([bx, by, bw]) => bx < x0 + w && x0 < bx + bw && Math.abs(by - ty) < 22);
    const ty = [-22, 22, -44, 44, -66, 66].map((dy) => y + dy).find(free) ?? Math.max(10, Math.min(h - 36, y - 22));
    box.push([x0, ty, w]);
    if (Math.abs(ty - y) > 22) s = s.replace('</svg>', `<line x1="${x}" y1="${y}" x2="${r ? x - 8 : x + 8}" y2="${ty}" stroke="#E9F2F1" stroke-opacity=".6" stroke-width="1.2"/></svg>`); // далеко от точки — сплошная линия к ней (v111, Денис: «что за три точки вниз?» — пунктир читался точками)
    return `<div class="w9t${r ? ' r' : ''}" style="${r ? 'right:' + ((300 - x + 8) / 300) * 100 : 'left:' + ((x + 8) / 300) * 100}%;top:${(ty / h) * 100}%"><small>${nm}</small><b>${w9f(p[1])}</b></div>`;
  }).join('');
  const up = tr - start, gain = rate >= lo, fast = rate > hi;
  const say = n < 7 ? `Взвешивайся раз в неделю, утром, до еды — через неделю будет видно, куда идёт вес. Цель — вверх на ${w9f(lo)}…${w9f(hi)} кг в неделю.`
    : fast ? `Вес идёт <b>вверх</b> на ${w9f(rate)} кг в неделю — быстрее нормы ${w9f(lo)}…${w9f(hi)}: лишнее уходит в жир. Убавь 200 ккал в день.`
    : gain ? `В среднем вес идёт <b>вверх</b> на ${w9f(rate)} кг в неделю — в коридоре набора ${w9f(lo)}…${w9f(hi)}. Так и держи.`
    : `В среднем вес идёт <b style="color:#fff">${rate < 0 ? 'вниз' : 'вверх'}</b> на ${w9f(Math.abs(rate))} кг в неделю, а для набора нужно <b>вверх</b> на ${w9f(lo)}…${w9f(hi)}. Добавь 200 ккал в день.`;
  return `<div class="card w9"><div class="row between" style="align-items:baseline;margin-bottom:4px"><div><b class="w9v">${w9f(last[1])}</b> <span class="muted small">кг · ${w9d(D.wi[D.wi.length - 1].date)}</span></div>
    <span class="small" style="color:${last[1] - start >= 0 ? 'var(--amber)' : 'var(--ink-2)'}">${w9s(last[1] - start)} кг с ${w9d(d0)}</span></div>
    <div class="w9b">${s}${lab}</div><div class="w9say">${say}</div></div>`;
}
// вход на вкладку: график рисуется слева направо, точки хлопают по очереди, ярлыки выезжают по одному
function weight9run(card, play) {
  const rev = card.querySelector('.w9rev'), ps = card.querySelectorAll('.w9p'), ts = card.querySelectorAll('.w9t'), wd = card.querySelector('.w9wd');
  const done = () => { ps.forEach((p) => (p.style.transform = '')); ts.forEach((t) => t.classList.add('in')); };
  if (!play || !rev || matchMedia('(prefers-reduced-motion:reduce)').matches) return done();
  const span = Math.max(1, ...[...ps].map((p) => +p.dataset.d));
  ps.forEach((p) => { p.style.transform = 'scale(0)'; setTimeout(() => (p.style.transform = ''), 200 + (+p.dataset.d / span) * 1100); });
  if (wd) { wd.style.opacity = 0; wd.style.transition = 'opacity .7s'; requestAnimationFrame(() => (wd.style.opacity = '')); }
  f12tween(1300, f12out, (k) => rev.setAttribute('width', 300 * k));
  ts.forEach((t, i) => setTimeout(() => t.classList.add('in'), 1350 + i * 280));
}
