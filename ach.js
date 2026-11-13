/* v100 награды (Денис 22.10: «понравилось, что дают ачивки — на каждую группу мышц прокачал, хоп, дали; в "Я"; как у Apple Watch»).
   Доноры research/r66-achievements/ДОНОРЫ.md: вид — Apple Watch Awards (полученные цветные, не полученные — серые контуры, медаль крутится пальцем,
   на обороте гравировка; bzamayo.com, Macworld 18.08.2026); ступени мышцы — Liftoff (ранг по каждой мышце, Bodygraph; liftoffrank.com), у нас ступени
   Strength Level (Fit.SL_RU). Пороги — только чужие или уже наши: First Workout (Apple), счётчики 100/365/500/1000 (Apple Move Goals),
   Perfect Week/Month (Apple; у нас неделя = Fit.WEEK_GOAL тренировок Пн–Вс), серия недель — как Hevy (month81), 4/12/26/52 — месяц/квартал/полгода/год,
   12 тренировок — цель 4 недель (КАРТА.md), слон 6 т — ELEPHANT81. Своих порогов нет.
   Предплечья на рисунке тела лежат в base — их пути (тот же MIT-рисунок, research/r37-raw) здесь отдельно. */
const Ach = (() => {
  const FA = ["M127.23 683.05c-4.07-2.12 1.27-27.07 2.25-31.57 4.98-23.03 9.17-46.17 13.91-69.25q1.53-7.47 2.13-15.13c.93-12.09.81-22.15 6.23-31.59 7.1-12.33 13.54-29.16 26.1-36.73a1.98 1.97 62.7 012.84.91c1.92 4.48 1.93 8.28 2.06 14.15.44 19.77-1.3 41.04-8.72 59.67-11 27.62-22.22 55.21-32.62 82.91-4.04 10.76-7.56 20.66-12.82 26.39q-.59.65-1.36.24z", "M201.5 527.4a.84.84 0 01.67.65c3.98 17.15-2.93 39.36-10.95 54.41-4.6 8.63-13.06 20.43-18.21 31.33q-13.21 27.92-24.58 56.64-2.51 6.35-6.61 11.02a1.43 1.43 0 01-2.5-.81q-.36-3.78.84-7.17 10.31-29.18 21.57-57.99c6.32-16.18 14.55-31.65 20.66-47.87 3.69-9.82 5.36-22.36 7.32-30.62 1.49-6.27 4.19-11.06 11.79-9.59z", "M207.33 540.4a.6.59-63.1 011.03-.34l5.38 6.02q.4.45.33 1.06-.52 4.1-1.29 5.84-6.91 15.65-13.69 31.35c-5.41 12.53-16.33 28.4-23.51 44.89-8.3 19.08-16.03 39.32-26.75 57.16a.36.36 0 01-.62 0l-.19-.32q-.17-.28-.06-.59 10.08-29.91 23.05-58.65 2.9-6.42 5.47-11.21c4.62-8.59 10.86-16.17 14.62-23.02q13.23-24.13 16.23-52.19z", "M600.08 683.04c-5-4.14-8.97-15.46-11.29-21.56-5.82-15.25-11.38-30.55-17.58-45.7q-9.15-22.39-18.02-44.89c-5.58-14.19-7.32-31.42-7.99-46.57-.29-6.44-.68-19.43 2.67-25.02a1.71 1.71 0 012.25-.63c6.72 3.52 11.29 9.96 14.87 16.5q6.25 11.38 12.68 22.66c1.97 3.45 2.93 7.66 3.41 12.06 1.16 10.6 1.55 21.29 3.66 31.65 3.93 19.29 7.38 38.63 11.47 57.92 1.5 7.07 9.3 39.08 5.12 43.5a.91.91 0 01-1.25.08z", "M586.58 681.46q-4.35-4.47-6.75-10.61-11.35-28.91-24.59-57.01c-5.72-12.13-14.32-22.86-19.97-35.1-7.1-15.36-12.9-33.32-9.27-50.31a1.44 1.43-87.1 011.23-1.12c7.47-.88 9.29 2.88 11.02 9.2 3.39 12.42 4.76 25.91 9.75 36.7 15.55 33.65 27.61 64.94 39.31 98.42 1.13 3.24 2.05 5.47 1.62 9.04a1.38 1.37 26.3 01-2.35.79z", "M579.58 686.43q-3.92-5.77-6.87-12.13-8.05-17.34-19.75-44.5-2.68-6.24-6.46-13.62c-5.14-10.05-13.15-22.36-17.34-31.85q-9.55-21.68-13.66-31.36-1.09-2.58-1.33-5.87-.04-.61.37-1.07l5.24-5.85a.69.69 0 011.2.4q2.74 27.05 15.49 50.75 1.7 3.17 8.26 12.86 7.02 10.39 12.18 21.88 8.71 19.41 20.19 50.1 2.22 5.92 3.13 9.98a.36.36 0 01-.65.28z"];
  const SERIES = [100, 365, 500, 1000], STREAK = [4, 12, 26, 52], ELE = 6000, GOAL12 = 12;
  const day = (t) => new Date(t).toISOString();
  const wk = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const vol = (se) => se.exercises.reduce((b, e) => b + (e.sets || e.reps.map((r) => ({ t: '', kg: e.kg || 0, reps: r }))).filter((x) => x.t !== 'w').reduce((c, x) => c + (+x.kg || 0) * (+x.reps || 0), 0), 0);
  // по счётчику: когда впервые набралось n (даты нарастающего итога)
  const at = (cum, n) => { const x = cum.find((c) => c.v >= n); return x ? x.d : null; };
  function list(S, Fit, bw, now = Date.now()) {
    const ss = S.sessions.filter((s) => Date.parse(s.date) <= now).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const out = [], add = (o) => out.push(o);
    // мышцы: высшая ступень, до которой мышца доходила (ранг считается по тренировкам до этой включительно)
    const groups = []; Fit.ORDER.forEach((d) => (S.program[d] || []).forEach((x) => { const g = Fit.SL[x.id] && Fit.MUSCLE[x.id] && Fit.MUSCLE[x.id][0]; if (g && !groups.includes(g)) groups.push(g); }));
    const best = {}, cur = Fit.slLevels(ss, bw, now).muscle;
    ss.forEach((se, i) => { const m = Fit.slLevels(ss.slice(0, i + 1), bw, now).muscle;
      for (const g of groups) { const l = m[g] ? m[g].lvl : 0, b = best[g] = best[g] || { lvl: 0, d: {} }; for (let k = b.lvl + 1; k <= l; k++) b.d[k] = se.date; b.lvl = Math.max(b.lvl, l); } });
    for (const g of groups) {
      const b = best[g] || { lvl: 0, d: {} }, c = cur[g];
      add({ id: 'm.' + g, sec: 'Мышцы', kind: 'm', g, tier: b.lvl, max: 5, title: Fit.MUSCLE_RU[g], sub: b.lvl ? Fit.SL_RU[b.lvl] : 'не открыта', date: b.d[b.lvl] || null,
        how: `Ступени силы ${Fit.SL_RU.slice(1).join(' → ')} — по лучшему подходу 1–10 повт. в главном упражнении на ${Fit.MUSCLE_RU[g].toLowerCase()} (таблицы Strength Level, как ранг мышцы у Liftoff).`,
        next: b.lvl >= 5 ? null : c && c.need10 ? `до «${Fit.SL_RU[b.lvl + 1]}»: ${String(c.need10).replace('.', ',')} кг × 10 в «${c.name}»` : 'сделай подход 1–10 повт. с весом', frac: c ? (c.lvl > b.lvl ? 1 : c.lvl === b.lvl ? c.frac : 0) : 0, steps: b.d });
    }
    // тренировки
    const cw = ss.map((s, i) => ({ v: i + 1, d: s.date }));
    [[1, 'Первая тренировка', 'Как First Workout у Apple Watch.'], [GOAL12, '12 тренировок', 'Цель первых 4 недель: 3 в неделю.'], ...SERIES.map((n) => [n, n + ' тренировок', 'Счётчик как у Apple Watch: 100 / 365 / 500 / 1000.'])]
      .forEach(([n, t, h], i) => add({ id: 'w.' + n, sec: 'Тренировки', kind: 'n', n, tier: i < 2 ? i + 1 : i, title: t, date: at(cw, n), how: h, cnt: ss.length }));
    // недели: идеальная (WEEK_GOAL за Пн–Вс), идеальный месяц (все недели месяца идеальные), серия недель подряд хотя бы с одной тренировкой
    const W = {}; ss.forEach((s) => { const k = wk(Date.parse(s.date)); (W[k] = W[k] || []).push(s.date); });
    const perf = Object.keys(W).map(Number).sort().filter((k) => W[k].length >= Fit.WEEK_GOAL), pd = perf.map((k) => W[k][Fit.WEEK_GOAL - 1]);
    add({ id: 'pw', sec: 'Недели', kind: 'pw', tier: perf.length ? 3 : 0, title: 'Идеальная неделя', date: pd[0] || null, times: perf.length, how: `${Fit.WEEK_GOAL} тренировки с понедельника по воскресенье — как Perfect Week у Apple Watch.`, cnt: (W[wk(now)] || []).length, need: Fit.WEEK_GOAL });
    const pm = []; const months = [...new Set(ss.map((s) => { const d = new Date(s.date); return d.getFullYear() * 12 + d.getMonth(); }))];
    // недели месяца — те, что начинаются (понедельник) в этом месяце; месяц засчитывается, когда кончился
    months.forEach((m) => { const y = Math.floor(m / 12), mo = m % 12, end = new Date(y, mo + 1, 1).getTime(); if (end > now) return;
      const mons = []; for (let t = new Date(y, mo, 1).getTime(); t < end; t += 864e5) { const d = new Date(t); if (d.getDay() === 1) mons.push(wk(t)); }
      if (mons.length && mons.every((t) => (W[t] || []).length >= Fit.WEEK_GOAL)) pm.push(W[mons[mons.length - 1]][Fit.WEEK_GOAL - 1]); });
    add({ id: 'pmo', sec: 'Недели', kind: 'pmo', tier: pm.length ? 5 : 0, title: 'Идеальный месяц', date: pm[0] || null, times: pm.length, how: `Все недели месяца (с понедельника) — по ${Fit.WEEK_GOAL} тренировки. Как Perfect Month у Apple Watch.` });
    const ks = Object.keys(W).map(Number).sort(), sc = []; let run = 0, prev = null;
    ks.forEach((k) => { run = prev != null && wk(k - 3 * 864e5) === prev ? run + 1 : 1; prev = k; sc.push({ v: run, d: W[k][0] }); });
    const mx = sc.reduce((a, c) => Math.max(a, c.v), 0), atS = (n) => { const x = sc.find((c) => c.v >= n); return x ? x.d : null; };
    STREAK.forEach((n, i) => add({ id: 's.' + n, sec: 'Недели', kind: 's', n, tier: i + 2, title: `${n} ${n === 4 ? 'недели' : 'недель'} подряд`, date: atS(n), how: `${['Месяц', 'Квартал', 'Полгода', 'Год'][i]} без пропущенной недели: хотя бы одна тренировка с понедельника по воскресенье (серия как у Hevy).`, cnt: mx }));
    // рекорды
    let rn = 0; const cr = []; ss.forEach((se) => { const r = Fit.sessionRecords(ss, se).length; if (r) { rn += r; cr.push({ v: rn, d: se.date }); } });
    [1, ...SERIES].forEach((n, i) => add({ id: 'r.' + n, sec: 'Рекорды', kind: 'r', n, tier: i + 1, title: n === 1 ? 'Первый рекорд' : n + ' рекордов', date: at(cr, n), how: n === 1 ? 'Поднял больше, чем когда-либо раньше в этом упражнении (рекорд как у Hevy).' : 'Счётчик как у Apple Watch: 100 / 365 / 500 / 1000.', cnt: rn }));
    // тонны слонами
    let kg = 0; const ct = ss.map((se) => ({ v: (kg += vol(se)) / ELE, d: se.date }));
    [1, ...SERIES].forEach((n, i) => add({ id: 't.' + n, sec: 'Слоны', kind: 't', n, tier: i + 1, title: n === 1 ? 'Первый слон' : n + ' слонов', date: at(ct, n), how: `Поднял за все тренировки столько, сколько весят ${n === 1 ? 'один слон' : n + ' слонов'} (слон 6 т).`, cnt: kg / ELE }));
    out.forEach((o) => { o.got = !!(o.kind === 'm' ? o.tier : o.date); if (o.kind !== 'm' && !o.got) o.tier = 0; if (o.n && !o.got && o.cnt != null) o.frac = Math.min(1, o.cnt / o.n); });
    return out;
  }
  // что получено, но ещё не показано (мышца — по ступени: «m.chest:2»)
  const key = (o) => (o.kind === 'm' ? o.id + ':' + o.tier : o.id);
  const fresh = (S, L) => L.filter((o) => o.got && !(S.achSeen || {})[key(o)]);
  const seeAll = (S, L) => { S.achSeen = S.achSeen || {}; L.filter((o) => o.got).forEach((o) => { S.achSeen[key(o)] = 1; }); };

  /* медаль: форма по разделу (Apple — у каждого вида своя форма), металл — ступени нашей бирюзы (fit-one-palette), не полученная — серая */
  const MT = [['#1A2628', '#2A3D40', '#1A2628'], ['#0B4744', '#10867B', '#093030'], ['#0C5450', '#14B8A6', '#0B4744'], ['#10867B', '#56CCBF', '#0C5450'], ['#14B8A6', '#B8F1EA', '#0E655E'], ['#56CCBF', '#FFFFFF', '#14B8A6']];
  const SH = { m: 'M50 3 L91 26 L91 74 L50 97 L9 74 L9 26 Z', n: 'M50 3 A47 47 0 1 1 49.9 3 Z', pw: 'M50 3 L95 50 L50 97 L5 50 Z', pmo: 'M50 3 L95 50 L50 97 L5 50 Z',
    s: 'M50 3 L90 15 L90 52 C90 75 70 90 50 97 C30 90 10 75 10 52 L10 15 Z', r: 'M50 2 L61 14 L77 10 L80 26 L95 33 L88 48 L95 64 L80 71 L77 87 L61 84 L50 97 L39 84 L23 87 L20 71 L5 64 L12 48 L5 33 L20 26 L23 10 L39 14 Z',
    t: 'M22 4 L78 4 Q96 4 96 22 L96 78 Q96 96 78 96 L22 96 Q4 96 4 78 L4 22 Q4 4 22 4 Z' };
  const short = (n) => (n >= 1000 ? n / 1000 + 'K' : String(n));
  function face(o, B, uid) {
    const ink = o.got ? '#fff' : '#4A5F62', T = (s, y, fs, w = 800) => `<text x="50" y="${y}" text-anchor="middle" font-size="${fs}" font-weight="${w}" fill="${ink}" font-family="-apple-system,system-ui,sans-serif">${s}</text>`;
    if (o.kind === 'm') {
      const side = B.front.m[o.g] ? 'front' : B.back.m[o.g] ? 'back' : 'front', b = B[side], ps = (ds) => ds.map((d) => `<path d="${d}"/>`).join(''), [x, y, w, h] = b.vb.split(' ').map(Number);
      const lit = o.g === 'forearms' ? FA : b.m[o.g];
      return `<svg x="27" y="14" width="46" height="58" viewBox="${x} ${y} ${w} ${h}"><g fill="${o.got ? 'rgba(7,18,22,.55)' : '#22322F'}">${ps(b.base)}${Object.values(b.m).map(ps).join('')}</g><g fill="${o.got ? '#fff' : '#3A5052'}">${ps(lit)}</g></svg>${T(o.tier ? ['', 'I', 'II', 'III', 'IV', 'V'][o.tier] : '', 88, 13)}`;
    }
    if (o.kind === 'pw') return T('✓', 52, 30) + T('НЕДЕЛЯ', 70, 9, 700);
    if (o.kind === 'pmo') return T('✓✓', 52, 24) + T('МЕСЯЦ', 70, 9, 700);
    if (o.kind === 's') return T(o.n, 56, 30) + T('НЕДЕЛЬ', 72, 8, 700);
    if (o.kind === 'r') return `<path d="M30 46 L34 30 L43 39 L50 26 L57 39 L66 30 L70 46 Z" fill="${ink}"/>` + T(short(o.n), 68, 17);
    if (o.kind === 't') return T('🐘', 50, 24, 400) + T(short(o.n), 76, 17);
    return T(short(o.n), 60, o.n >= 100 ? 26 : 32) + T('ТРЕН.', 76, 8, 700);
  }
  // uid — свой id градиента у каждой медали (на одной странице их много, и у каждой своя ступень)
  function medal(o, B, size, uid) {
    const c = MT[o.got ? Math.max(1, o.tier) : 0], g = 'am' + uid;
    return `<svg class="md100" viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${o.title}"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
      <path d="${SH[o.kind]}" fill="url(#${g})" stroke="${o.got ? '#B8F1EA' : '#2A4446'}" stroke-width="${o.got ? 1.5 : 2}"/><path d="${SH[o.kind]}" transform="translate(50 50) scale(.84) translate(-50 -50)" fill="${o.got ? 'rgba(7,18,22,.22)' : '#141E20'}" stroke="${o.got ? 'rgba(255,255,255,.45)' : '#22322F'}" stroke-width="1.5"/>${face(o, B, uid)}</svg>`;
  }
  // оборот медали — гравировка, как у Apple: что и когда
  function back(o, size) {
    const d = o.date ? new Date(o.date) : null, ds = d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : 'ещё нет';
    const c = MT[o.got ? Math.max(1, o.tier) : 0];
    return `<svg class="md100" viewBox="0 0 100 100" width="${size}" height="${size}"><path d="${SH[o.kind]}" fill="${c[2]}" stroke="${c[1]}" stroke-width="2"/>
      <text x="50" y="44" text-anchor="middle" font-size="7" fill="${c[1]}" font-weight="700" font-family="-apple-system,system-ui,sans-serif">${o.title.toUpperCase()}</text>
      <text x="50" y="58" text-anchor="middle" font-size="9" fill="#fff" font-weight="800" font-family="-apple-system,system-ui,sans-serif">${ds}</text></svg>`;
  }
  return { list, fresh, seeAll, key, medal, back, SERIES, STREAK, FA };
})();
if (typeof module !== 'undefined') module.exports = Ach;
