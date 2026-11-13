/* r42: общий набор ночных видов — тело со свечением мышц и графики «цвет набирается по мере заполнения».
   Тело — BODY_PATHS из ../../body.js (react-native-body-highlighter, MIT). Данные тестовые, веса новичка. */
const RU = { chest: 'Грудь', back: 'Спина', shoulders: 'Плечи', reardelt: 'Задняя дельта', biceps: 'Бицепс', triceps: 'Трицепс', abs: 'Пресс', quads: 'Ноги спереди', hams: 'Задняя бедра', glutes: 'Ягодицы', calves: 'Икры', lowback: 'Поясница' };
const D = {
  date: 'Чт, 16 октября', week: 'Неделя 3 из 5', lvl: 3, str: 46,
  // подходов за неделю на мышцу; норма 10–20 (тестовые)
  sets: { chest: 12, back: 12, shoulders: 13, reardelt: 4, biceps: 14, triceps: 12, abs: 6, quads: 12, hams: 7, glutes: 9, calves: 0, lowback: 3 },
  weeks: ['21.08', '28.08', '04.09', '11.09', '18.09', '25.09', '02.10', '09.10'],
  vol: [18, 24, 27, 25, 31, 34, 33, 38], // подходов за неделю, всего
  ton: [4.1, 5.2, 5.8, 5.5, 6.9, 7.4, 7.2, 8.3], // тонн за неделю
  chest: [32.5, 32.5, 35, 35, 37.5, 37.5, 40, 42.5], // жим от груди, рабочий вес
  e1rm: [41, 42, 44, 45, 47, 48, 51, 53], // оценка 1ПМ жима
  lifts: [['Жим ногами', 60, 85], ['Жим от груди', 32.5, 42.5], ['Тяга блока', 35, 45], ['Бицепс', 6, 8], ['Трицепс', 10, 14]],
  days: [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1], // 5 недель
  dayVol: [0.6, 0, 0.8, 0, 0, 0.7, 0, 0.75, 0, 0.9, 0, 0, 0.8, 0, 0.85, 0, 1, 0, 0, 0.7, 0.4, 0, 0.9, 0, 0.95, 0, 0, 0.8, 0, 1, 0, 0.9, 0, 0, 0.6],
  today: [['Жим в тренажёре от груди', 4, 4, 42.5], ['Тяга верхнего блока', 4, 2, 45], ['Жим ногами', 3, 0, 85], ['Сгибания ног сидя', 3, 0, 35], ['Махи в стороны на блоке', 3, 0, 5], ['Сгибания на бицепс', 5, 0, 8]],
};
const GROUPS = Object.keys(D.sets);
const SHORT = { reardelt: 'Зад. дельта', hams: 'Зад. бедра', quads: 'Ноги' };
const need = (g) => D.sets[g] < 10;
const okN = GROUPS.filter((g) => !need(g)).length;
const totalSets = Object.values(D.sets).reduce((a, b) => a + b, 0);
const f1 = (v) => String(v).replace('.', ',');

/* шкала «холод → тепло»: мало — тёмно-синий, норма — голубой/бирюза, верх нормы — золото */
const RAMP = ['#1B2B4A', '#1F4E79', '#2C7DB5', '#50B5EA', '#7FE0D6', '#E7C98A'];
const RAMP2 = ['#3B1E5A', '#6B2FA0', '#C2448F', '#FF6B6B', '#FFB067']; // ночной «закат» для второго языка
function mix(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function ramp(t, R = RAMP) { t = Math.max(0, Math.min(1, t)) * (R.length - 1); const i = Math.min(R.length - 2, Math.floor(t)); return mix(R[i], R[i + 1], t - i); }
const stops = (R = RAMP, op = 1) => R.map((c, i) => `<stop offset="${i / (R.length - 1)}" stop-color="${c}" stop-opacity="${op}"/>`).join('');
let UID = 0; const uid = (p = 'u') => p + (++UID);

/* тело: side front|back, col(g) → цвет, opts.need — подсветить «докачать» пульсом, opts.glow — свечение */
function body(side, h, col, opts = {}) {
  const B = BODY_PATHS[side], [x, y, w, hh] = B.vb.split(' ').map(Number), W = Math.round(h * w / hh), gid = uid('g');
  const ps = (ds) => ds.map((d) => `<path d="${d}"/>`).join('');
  const base = `<g fill="${opts.base || '#2A2B33'}">${ps(B.base || [])}</g>`;
  const mus = Object.entries(B.m).map(([g, ds]) => {
    const n = opts.need && need(g);
    return `<g data-g="${g}" fill="${col(g)}" ${opts.glow !== false ? `filter="url(#${gid})"` : ''} class="${n ? 'need' : ''}"><title>${RU[g]}: ${D.sets[g]} подх.</title>${ps(ds)}</g>`;
  }).join('');
  return `<svg width="${W}" height="${h}" viewBox="${B.vb}" class="body"><defs><filter id="${gid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${opts.blur || 9}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${base}${mus}</svg>`;
}
const heat = (g) => (D.sets[g] === 0 ? '#2A2B33' : ramp(Math.min(1, D.sets[g] / 20)));

/* полоса, цвет набирается по мере заполнения: градиент натянут на всю дорожку, видна только пройденная часть */
function gbar(p, w, h, R = RAMP, track = '#26272E', opts = {}) {
  const id = uid('b'), fw = Math.max(h, w * Math.min(1, p)), r = opts.r ?? h / 2;
  const marks = (opts.marks || []).map((m) => `<rect x="${w * m - 1}" y="-3" width="2" height="${h + 6}" rx="1" fill="#ffffff55"/>`).join('');
  return `<svg width="${w}" height="${h}" style="overflow:visible;display:block"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" x2="${w}">${stops(R)}</linearGradient></defs>
  <rect width="${w}" height="${h}" rx="${r}" fill="${track}"/><rect class="grow" width="${fw}" height="${h}" rx="${r}" fill="url(#${id})" ${opts.glow ? `style="filter:drop-shadow(0 0 6px ${ramp(p, R)})"` : ''}/>${marks}</svg>`;
}
/* плавная кривая через точки */
function smooth(P) { return P.map((p, i) => { if (!i) return `M${p[0]} ${p[1]}`; const a = P[i - 1], dx = (p[0] - a[0]) / 2.2; return `C${a[0] + dx} ${a[1]} ${p[0] - dx} ${p[1]} ${p[0]} ${p[1]}`; }).join(' '); }
/* область под кривой: линия меняет цвет слева направо (по ходу роста), заливка — тот же градиент, тает вниз */
function garea(vals, w, h, R = RAMP, opts = {}) {
  const pad = opts.pad ?? 10, mn = opts.min ?? Math.min(...vals) * 0.85, mx = opts.max ?? Math.max(...vals) * 1.05;
  const X = (i) => pad + i * (w - 2 * pad) / (vals.length - 1), Y = (v) => h - 22 - (v - mn) / (mx - mn) * (h - 40);
  const P = vals.map((v, i) => [X(i), Y(v)]), d = smooth(P), lg = uid('l'), fg = uid('f'), mk = uid('m');
  const last = P[P.length - 1], lc = R[R.length - 1];
  const lbl = (opts.labels || []).map((l, i) => (i % 2 === (opts.labels.length - 1) % 2 ? `<text x="${X(i)}" y="${h - 4}" font-size="10" text-anchor="middle" fill="#6f6c78">${l}</text>` : '')).join('');
  const grid = [0.25, 0.5, 0.75].map((t) => `<line x1="${pad}" x2="${w - pad}" y1="${(h - 22) - t * (h - 40)}" y2="${(h - 22) - t * (h - 40)}" stroke="#ffffff0d"/>`).join('');
  const dots = opts.dots ? P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${ramp(i / (P.length - 1), R)}"/>`).join('') : '';
  return `<svg width="${w}" height="${h}" style="display:block;overflow:visible"><defs><linearGradient id="${lg}" gradientUnits="userSpaceOnUse" x1="${pad}" x2="${w - pad}">${stops(R)}</linearGradient>
  <linearGradient id="${fg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${mk}"><path d="${d} L${last[0]} ${h - 22} L${P[0][0]} ${h - 22}Z" fill="url(#${fg})"/></mask></defs>${grid}
  <rect x="0" y="0" width="${w}" height="${h - 22}" fill="url(#${lg})" mask="url(#${mk})" opacity="${opts.fill ?? .45}"/>
  <path class="draw" pathLength="1" d="${d}" fill="none" stroke="url(#${lg})" stroke-width="${opts.sw || 3}" stroke-linecap="round" style="filter:drop-shadow(0 0 6px ${lc}88)"/>${dots}
  <circle cx="${last[0]}" cy="${last[1]}" r="9" fill="${lc}" opacity=".25"/><circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${lc}"/>${lbl}</svg>`;
}
/* столбики: у каждого градиент на всю высоту графика → высокий доходит до тёплого цвета */
function gbars(vals, w, h, R = RAMP, opts = {}) {
  const n = vals.length, gap = opts.gap ?? 6, bw = (w - gap * (n - 1)) / n, mx = opts.max ?? Math.max(...vals) * 1.08, id = uid('c'), H = h - 20;
  const lbl = (opts.labels || []).map((l, i) => `<text x="${i * (bw + gap) + bw / 2}" y="${h - 4}" font-size="9.5" text-anchor="middle" fill="#6f6c78">${l}</text>`).join('');
  const goal = opts.goal ? `<line x1="0" x2="${w}" y1="${H - opts.goal / mx * H}" y2="${H - opts.goal / mx * H}" stroke="#ffffff40" stroke-dasharray="3 4"/>` : '';
  return `<svg width="${w}" height="${h}" style="display:block"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${H}" x2="0" y2="0">${stops(R)}</linearGradient></defs>${goal}
  ${vals.map((v, i) => { const bh = Math.max(3, v / mx * H); return `<rect class="rise" x="${i * (bw + gap)}" y="${H - bh}" width="${bw}" height="${bh}" rx="${Math.min(4, bw / 2)}" fill="url(#${id})" ${i === n - 1 ? `style="filter:drop-shadow(0 0 8px ${ramp(v / mx, R)})"` : 'opacity=".85"'}/>`; }).join('')}${lbl}</svg>`;
}
/* дуга-шкала из мелких долей, каждая — свой цвет шкалы (конический градиент) */
function garc(p, size, w, R = RAMP, opts = {}) {
  const from = opts.from ?? -225, span = opts.span ?? 270, n = opts.n ?? 54, r = (size - w) / 2, c = size / 2;
  const pt = (a) => [c + r * Math.cos(a * Math.PI / 180), c + r * Math.sin(a * Math.PI / 180)];
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = from + span * i / n, a1 = from + span * (i + 1) / n - (opts.gapDeg ?? 1.6), on = (i + .5) / n <= p, [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    s += `<path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}" stroke="${on ? ramp(i / (n - 1), R) : (opts.track || '#26272E')}" stroke-width="${w}" fill="none" ${on ? `class="seg" style="animation-delay:${i * 12}ms"` : ''}/>`;
  }
  return `<svg width="${size}" height="${size}" style="display:block;overflow:visible">${s}${opts.inner || ''}</svg>`;
}
/* радар по группам */
function radar(keys, size, R = RAMP, opts = {}) {
  const c = size / 2, r = c - 34, n = keys.length, A = (i) => -Math.PI / 2 + i * 2 * Math.PI / n, id = uid('r');
  const pt = (i, t) => [c + r * t * Math.cos(A(i)), c + r * t * Math.sin(A(i))];
  const rings = [0.5, 1].map((t) => `<polygon points="${keys.map((k, i) => pt(i, t).join(',')).join(' ')}" fill="none" stroke="${t === .5 ? '#ffffff30' : '#ffffff14'}" ${t === .5 ? 'stroke-dasharray="3 4"' : ''}/>`).join('');
  const P = keys.map((k, i) => pt(i, Math.min(1, D.sets[k] / 20)));
  const lab = keys.map((k, i) => { const [x, y] = pt(i, 1.2); return `<text x="${x}" y="${y + 4}" font-size="10.5" text-anchor="middle" fill="${need(k) ? '#FFB067' : '#a8a4b2'}">${SHORT[k] || RU[k]}</text>`; }).join('');
  return `<svg width="${size}" height="${size}" style="display:block;overflow:visible"><defs><radialGradient id="${id}" cx="${c}" cy="${c}" r="${r}" gradientUnits="userSpaceOnUse">${stops(R, .75)}</radialGradient></defs>${rings}
  <polygon class="pop" points="${P.map((p) => p.join(',')).join(' ')}" fill="url(#${id})" stroke="${R[R.length - 2]}" stroke-width="2" style="filter:drop-shadow(0 0 10px ${R[3]}66)"/>${P.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff"/>`).join('')}${lab}</svg>`;
}
const IC = {
  today: '<path d="M3 10h3v4H3zM18 10h3v4h-3zM6 8h2v8H6zM16 8h2v8h-2zM8 11h8v2H8z" fill="currentColor"/>',
  hist: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  prog: '<path d="M5 19V11M10 19V6M15 19v-9M20 19V4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-2 7 0 9v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  me: '<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c1-5 15-5 16 0z" fill="currentColor"/>',
};
const tabs = (on) => `<div class="tab">${[['today', 'Сегодня'], ['hist', 'История'], ['prog', 'Прогресс'], ['food', 'Питание'], ['me', 'Я']].map(([k, t]) => `<div class="${k === on ? 'on' : ''}"><svg viewBox="0 0 24 24">${IC[k]}</svg>${t}</div>`).join('')}</div>`;
const sb = '<div class="sb"><span>9:41</span><i></i></div>';
