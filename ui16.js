/* v16 (20.10, Денис про лист v15: «колхоз»): «Сегодня» и шапка упражнения по Fitbod (research/r49-ui-live/fitbod_today_1.jpg):
   крупный жирный заголовок, мышцы плитками, упражнения с картинкой 56 px, одна кнопка «Начать» внизу; вес — график месяца, клетки — по тапу.
   На тренировке справочные плашки (когда стоп, осторожно, проверка силы…) — чипами, текст по тапу; плашки с кнопками остаются. Флаг ?ui=16 */
const UI16 = /[?&](ui=16|sv=\d+)\b/.test(location.search); // v17: ?sv=1..10 включает v16 + вид из ui17.js
const thumb16 = (id, sz = 56) => { const t = TECH[id], st = `width:${sz}px;height:${sz}px`;
  if (!t || !t.img) return `<span class="t16 nil" style="${st}"></span>`;
  const ext = t.ext || 'png'; return `<span class="t16${ext === 'jpg' ? ' ph' : ''}" style="${st}"><img src="tech/${id}-0.${ext}" alt="" loading="lazy"></span>`; };
// мышца на маленькой фигуре: кадр по области тела, как плитки «target muscles» у Fitbod
const M16_SIDE = { back: 'back', reardelt: 'back', lowback: 'back', glutes: 'back', hams: 'back', triceps: 'back' };
const M16_BOX = { chest: 280, shoulders: 270, biceps: 330, triceps: 330, abs: 400, back: 300, reardelt: 270, lowback: 420, glutes: 560, hams: 700, quads: 680, calves: 930, forearms: 420 };
function mini16(g) {
  const side = M16_SIDE[g] || 'front', B = BODY_PATHS[side], x0 = +B.vb.split(' ')[0], y = M16_BOX[g] || 300, ps = (ds) => ds.map((d) => `<path d="${d}"/>`).join('');
  const gs = Object.entries(B.m).map(([k, ds]) => `<g fill="${k === g ? 'url(#hfull)' : 'url(#hoff)'}">${ps(ds)}</g>`).join('');
  return `<svg viewBox="${x0 + 104} ${y} 430 430" width="64" height="64"><g fill="${SCH3.base}">${ps(B.base)}</g>${gs}</svg>`;
}
const DM16 = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
// вес: число крупно, график 30 дней (точка — утренний замер, сегодня светится), клетки месяца — под «Весь месяц по дням»
function weight16() {
  const D = wDays(30), H = wHead(D);
  if (!H.has.length) return `<div class="w16"><div class="c16">Вес утром</div><div class="lb16">Взвешивайся каждое утро — здесь будет график месяца.</div>${wInput()}</div>`;
  const W = 330, h = 104, lo = H.min - .25, hi = H.max + .25, X = (i) => 6 + i * (W - 12) / (D.length - 1), Y = (kg) => 10 + (1 - (kg - lo) / (hi - lo)) * (h - 20);
  const P = D.map((x, i) => (x.kg == null ? null : [X(i), Y(x.kg), x])).filter(Boolean);
  let d = `M${P[0][0]} ${P[0][1]}`; // сглаженная линия (Catmull-Rom → кривые Безье)
  for (let i = 1; i < P.length; i++) { const p0 = P[i - 2] || P[i - 1], p1 = P[i - 1], p2 = P[i], p3 = P[i + 1] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
  const L = P[P.length - 1], today = L[2].today;
  const grid = [H.max, H.min].map((kg) => `<line x1="0" x2="${W}" y1="${Y(kg)}" y2="${Y(kg)}" stroke="#ffffff14" stroke-dasharray="3 4"/><text x="0" y="${Y(kg) - 4}" font-size="10" fill="#7C8685">${fmt(kg)}</text>`).join('');
  const dots = P.slice(0, -1).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#56CCBF" opacity=".7"/>`).join('');
  const dl = (x) => `${x.d.getDate()} ${DM16[x.d.getMonth()]}`;
  const pill = H.wk != null ? `<span class="p16">${Math.abs(H.wk) < .05 ? 'без изменений' : `${H.wk < 0 ? '↓' : '↑'} ${fmt(Math.abs(H.wk))} кг`}<small> за ${D.length} дн.</small></span>` : '';
  const pad = (D[0].d.getDay() + 6) % 7, hd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<div class="wh9">${w}</div>`).join('');
  const cells = D.map((x, i) => { const pv = D.slice(0, i).reverse().find((z) => z.kg != null), dv = x.kg != null && pv ? x.kg - pv.kg : null;
    return `<div class="wc9${x.today ? ' now' : ''}${x.kg == null ? ' off' : dv < 0 ? ' dn' : dv > 0 ? ' up' : ''}"><small>${x.d.getDate()}</small><b>${x.kg == null ? '—' : fmt(x.kg)}</b><i>${dv == null ? '' : wsgn(dv)}</i></div>`; }).join('');
  return `<div class="w16"><div class="row between" style="align-items:flex-start"><div><div class="c16">Вес утром</div><div class="n16">${fmt(L[2].kg)}<small> кг</small></div><div class="lb16">${today ? 'сегодня' : 'последний замер ' + dl(L[2])} · ${H.has.length} замеров за месяц</div></div>${pill}</div>
    <svg viewBox="0 0 ${W} ${h + 16}" width="100%" style="display:block;margin-top:10px;overflow:visible"><defs><linearGradient id="wf16" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14B8A6" stop-opacity=".32"/><stop offset="1" stop-color="#14B8A6" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${d} L${L[0]} ${h} L${P[0][0]} ${h}Z" fill="url(#wf16)"/><path d="${d}" fill="none" stroke="#14B8A6" stroke-width="2.6" stroke-linecap="round"/>${dots}
      <circle cx="${L[0]}" cy="${L[1]}" r="9" fill="#14B8A6" opacity=".25" class="wglow"/><circle cx="${L[0]}" cy="${L[1]}" r="5" fill="#fff" stroke="#14B8A6" stroke-width="2.5"/>
      <text x="0" y="${h + 14}" font-size="10.5" fill="#7C8685">${dl(D[0])}</text><text x="${W / 2}" y="${h + 14}" font-size="10.5" text-anchor="middle" fill="#7C8685">${dl(D[15])}</text><text x="${W}" y="${h + 14}" font-size="10.5" text-anchor="end" fill="${today ? '#56CCBF' : '#7C8685'}">сегодня</text></svg>
    ${D[D.length - 1].kg == null ? wInput() : ''}<details class="d16"><summary>Весь месяц по дням</summary><div class="wgrid9">${hd}${'<div></div>'.repeat(pad)}${cells}</div><div class="lb16" style="margin-top:6px">яркая клетка — тяжелее прошлого замера (набор), тусклая — легче</div></details></div>`;
}
const reps16 = (e) => { const r = e.ranges.map((x) => x.join('–')); return r.every((x) => x === r[0]) ? r[0] : r.join(' · '); };
const kg16 = (e) => (e.kgs.some((k) => k == null) ? 'вес подберёшь' : e.kgs.every((k) => !k) ? 'свой вес' : e.kgs.every((k) => k === e.kgs[0]) ? fmt(e.kgs[0]) + ' кг' : `${fmt(e.kgs[0])}→${fmt(e.kgs[e.kgs.length - 1])} кг`);
function today16(top, day, prog, nsets) {
  const ms = Fit.muscleSets(S.sessions), dl = cycNow().deload, add = {};
  prog.forEach((e) => { const m = Fit.MUSCLE[e.id]; if (!m) return; const n = dl ? Fit.deloadSets(e.ranges.length) : e.ranges.length; add[m[0]] = (add[m[0]] || 0) + n; m.slice(1).forEach((g) => { add[g] = (add[g] || 0) + n / 2; }); });
  const gs = Object.keys(add).filter((g) => add[g] >= 1 && NB(g) != null).sort((a, b) => add[b] - add[a]);
  const tiles = gs.map((g) => { const was = Math.round(ms[g]), will = Math.round(ms[g] + add[g]), ok = nok(will, g);
    return `<div class="m16"><div class="m16i">${mini16(g)}</div><b>${Fit.MUSCLE_RU[g]}</b><small>${was} → <span class="${ok ? 'ok16' : ''}">${will}</span> из ${NB(g)}</small><span class="b16"><i style="width:${Math.min(100, Math.round(nfr(will, g) * 100))}%" class="${ok ? 'ok16' : ''}"></i></span></div>`; }).join('');
  const min = Math.round(nsets * 1.6 / 5) * 5; // ~40 с подход + отдых ≤ 1 мин (REST_MAX)
  const rows = prog.map((e) => `<div class="x16" data-act="prog" data-id="${e.id}" role="button">${thumb16(e.id)}<div class="grow"><b>${esc(e.name)}</b><small>${dl ? Fit.deloadSets(e.ranges.length) : e.ranges.length} × ${reps16(e)} · ${kg16(e)}</small></div></div>`).join('');
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="h16"><span>${date[0].toUpperCase() + date.slice(1)}</span>Сегодня</div>${top}${weight16()}
    <div class="row between s16"><h3>Тренировка ${day}</h3><button class="link" data-act="pickday">сменить</button></div>
    <div class="lb16" style="margin:-6px 2px 12px">${prog.length} ${plural(prog.length, ['упражнение', 'упражнения', 'упражнений'])} · ${nsets} ${plural(nsets, ['подход', 'подхода', 'подходов'])} · около ${min} мин</div>
    ${tiles ? `<div class="row between s16 s16b"><h4>Мышцы сегодня</h4><span class="lb16" data-act="gbody" role="button">подходов за 7 дней</span></div><div class="ms16">${tiles}</div>` : ''}
    <div class="s16 s16b"><h4>Упражнения</h4></div><div class="xl16">${rows}</div>
    <div class="cta16"><button class="primary" data-act="start">Начать тренировку ${day}</button></div>`;
}
// справочные плашки упражнения — чипами; текст держим тут, лист открывается по data-act=hint16
const H16 = {};
function chips16(k, info) {
  if (!info.length) return '';
  return `<div class="ch16">${info.map(([c, t, x], i) => { H16[k + ':' + i] = [t, x, c]; return `<button class="${c ? 'k-' + c : ''}" data-act="hint16" data-h="${k}:${i}">${t}</button>`; }).join('')}</div>`;
}
function openHint16(key) {
  const [t, x, c] = H16[key] || [], w = $('#sheet'); if (!t) return; w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">${t}</div><p class="ehelp" style="font-size:16px">${x}</p>${c === 'eff' ? '<button id="hmore" style="width:100%;margin-top:4px">Подробнее: как понять, что хватит</button>' : ''}<button class="primary" id="tok" style="margin-top:12px">Понятно</button></div>`;
  w.onclick = (e) => { if (e.target.id === 'hmore') { openEffortHelp(); return; } if (e.target === w || e.target.id === 'tok') closeSheet(); };
}
