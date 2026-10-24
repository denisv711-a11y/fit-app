/* v81 (Денис 21.10, лист shots/app-092-home-fun-weight/thu-glavnaya-AB.png): главная — вариант B «сверху я» + тело (Денис: «добавить тело, где
   показаны зоны, которые ещё не прокачаны и что прокачано»). Порядок блоков — макет research/r52-home-fun/ours/thu-B.html; всё из уже посчитанного:
   общий уровень (Fit.slLevels), подходы за 7 дней (Fit.muscleSets, норма мышцы Fit.normOf), неделя (Fit.weekStrip, cycNow), рекорды (Fit.sessionRecords),
   замеры (Fit.measureDue), проверка силы (coachDay → test). Правки Дениса к листу app-093: неделя убрана, «докачать» — красным со свечением,
   в «Я» — вес месяцем с вводом, всё оживлено (cu81 — числа набегают, блоки выезжают по очереди, рекорд с бликом). Тело: в норме — бирюзовое, ниже — серое с оттенком по доле нормы (в «Прогресс → Тело» наоборот горит «докачать»; на главной Денис просил «что прокачано»). */
const MON81 = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const DOWF81 = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const dayN81 = (t) => { const d = new Date(t); d.setHours(12, 0, 0, 0); return d.getTime(); };
// рекорд словами: «+5 кг» / «+2 повт.» / «+3 кг к максимуму»
const recDelta81 = (r) => (r.type === 'kg' ? `+${fmt(r.now - r.was)} кг` : r.more ? `+${r.more} повт.` : r.type === 'reps' ? `+${r.now - r.was} повт.` : `+${fmt(r.now - r.was)} кг к максимуму`);
const recSet81 = (r) => (r.set.kg > 0 ? `${fmt(r.set.kg)} кг × ${r.set.reps}` : `${r.set.reps} ${plural(r.set.reps, ['повтор', 'повтора', 'повторов'])}`);
function recs81(now = Date.now()) {
  const done = S.sessions.filter((se) => Date.parse(se.date) <= now).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const last = done[done.length - 1], d0 = new Date(now), m0 = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime();
  const month = done.filter((se) => Date.parse(se.date) >= m0).flatMap((se) => Fit.sessionRecords(S.sessions, se));
  return { last, lastRecs: last ? Fit.sessionRecords(S.sessions, last) : [], month };
}
/* v83 карточка «Я» (Денис 21.10 к листам app-094/095: «рекорд чего? хочется инфы покруче» → выбран C2, лист shots/app-095-me/list-C2.png), доноры r55-me-card/НАХОДКИ.md:
   ранг — как Liftoff/Gymverse/Hevy Strength Level (таблицы SL — мужчины-лифтеры по весу тела, strengthlevel.com/about); месяц — как Hevy Monthly Report
   (тренировки, объём, рекорды месяца, серия недель — Hevy gym-consistency), объём → слоны как Fitocracy/Gymverse;
   слон 6 т — самец африканского саванного слона (Wikipedia African bush elephant; San Diego Zoo до 6,8 т). */
const ELEPHANT81 = 6000;
function month81(now = Date.now()) {
  const d0 = new Date(now), m0 = new Date(d0.getFullYear(), d0.getMonth(), 1).getTime(), p0 = new Date(d0.getFullYear(), d0.getMonth() - 1, 1).getTime();
  const done = S.sessions.filter((se) => Date.parse(se.date) <= now), cur = done.filter((se) => Date.parse(se.date) >= m0), prev = done.filter((se) => { const t = Date.parse(se.date); return t >= p0 && t < m0; });
  const kg = cur.reduce((a, se) => a + se.exercises.reduce((b, e) => b + (e.sets || e.reps.map((r) => ({ t: '', kg: e.kg || 0, reps: r }))).filter((x) => x.t !== 'w').reduce((c, x) => c + (+x.kg || 0) * (+x.reps || 0), 0), 0), 0);
  // серия — недели подряд (с понедельника) хотя бы с одной тренировкой; текущая неделя без тренировки серию ещё не рвёт (Hevy)
  const wk = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const W = new Set(done.map((se) => wk(Date.parse(se.date)))); let w = wk(now), st = 0; if (!W.has(w)) w -= 7 * 864e5; while (W.has(w)) { st++; w = wk(w - 3 * 864e5); }
  return { n: cur.length, prev: prev.length, kg, st };
}
const tons81 = (kg) => (kg >= 1000 ? `${fmt(Math.round(kg / 100) / 10)}<small> т</small>` : `${Math.round(kg)}<small> кг</small>`);
// Денис 21.10: «поднял = 1 слон — одного слона, или что?» → «столько весит 1 слон / весят 2 слона», дробь — «весит 0,4 слона»
const ele81 = (kg) => { const n = kg / ELEPHANT81, f = Math.floor(n); return n >= 1 ? `столько ${f % 10 === 1 && f % 100 !== 11 ? 'весит' : 'весят'} ${f} ${plural(f, ['слон', 'слона', 'слонов'])}` : `столько весит ${String(Math.round(n * 10) / 10).replace('.', ',')} слона`; };
function me81(L, R) {
  const M = month81(), mon = MON81[new Date().getMonth()], ov = L.overall;
  const lv = Fit.SL_RU[ov.lvl] || Fit.SL_RU[0], nx = Fit.SL_RU[Math.min(5, ov.lvl + 1)];
  const cu = (n, t = n) => `<b class="cu81" data-cu="${n}">${t}</b>`;
  /* C2 (Денис 21.10 к листу app-095: «Я 83 кг убери, начинающий — окей, но чтоб пиздец круто; 32 побил — непонятно; плитки меньше»):
   значок-шестиугольник и лестница ступеней — раскладка Liftoff (r55 raw/liftoff-4.jpg), цвет только наш; месяц — строкой из 4 плиток */
  const RN = ['·', 'I', 'II', 'III', 'IV', 'V'], HX = 'M30 2 L57 17 L57 51 L30 66 L3 51 L3 17 Z';
  const badge = `<span class="bd96"><svg viewBox="0 0 60 68" width="78" height="88"><defs><linearGradient id="hg96" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8F1EA"/><stop offset=".45" stop-color="#14B8A6"/><stop offset="1" stop-color="#0C5450"/></linearGradient></defs>
    <path d="${HX}" fill="url(#hg96)" stroke="#8ADCD2" stroke-width="2"/><path d="M30 10 L50 21.5 L50 46.5 L30 58 L10 46.5 L10 21.5 Z" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
    <text x="30" y="42" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="-apple-system,system-ui,sans-serif">${RN[ov.lvl] || '·'}</text></svg></span>`;
  // v101 (лист app-118 №23): ступени зажигаются слева по очереди до твоей, над твоей — «ты здесь»
  const lad = Fit.SL_RU.map((n, k) => `<span class="${k < ov.lvl ? 'p' : k === ov.lvl ? 'on' : ''}" style="--i:${Math.min(k, ov.lvl)}"><svg viewBox="0 0 60 68" width="${k === ov.lvl ? 22 : 16}"><path d="${HX}"/></svg>${k === ov.lvl ? '<em class="yh101">ты здесь</em>' : ''}</span>`).join('<i></i>');
  const hero = `<div class="hr96">${badge}<div style="flex:1;min-width:0"><span class="cap9">МОЙ РАНГ</span><b>${lv}</b><small>${ov.n ? `сильнее <b class="cu81" data-cu="${ov.p || 0}">${ov.p || 0}</b> % мужчин в зале твоего веса` : 'ранг — после первой тренировки'}</small></div></div>
    <div class="ld96">${lad}</div><div class="ldn96"><span>${Fit.SL_RU[0]}</span><span>${Fit.SL_RU[5]}</span></div>
    <div style="margin-top:6px"><div class="lq96" style="--f:${Math.round((ov.lvl >= 5 ? 1 : ov.frac) * 100)}%"><i></i></div></div><div class="lb" style="margin-top:4px">${ov.lvl >= 5 ? 'высшая ступень' : `до «${nx}» пройдено ${Math.round(ov.frac * 100)} %`}</div>`;
  const nk = R.month.filter((r) => r.type === 'kg').length, nr = R.month.length - nk;
  const mt = (big, cap) => `<div class="t96"><b>${big}</b><small>${cap}</small></div>`;
  // v108 (Денис 23.10: «из-за текста про слонов плитки большие, продольные») — плитка = число + одно слово, слоны строкой под плитками
  const month = `<div class="cap9" style="margin-top:16px">В ${mon.toUpperCase()}</div><div class="m96">${mt(cu(M.n), plural(M.n, ['тренировка', 'тренировки', 'тренировок']))}${mt(tons81(M.kg), 'поднял')}${mt(cu(R.month.length), plural(R.month.length, ['рекорд', 'рекорда', 'рекордов']))}${mt(cu(M.st), plural(M.st, ['неделя', 'недели', 'недель']) + ' подряд')}</div>
    ${M.kg ? `<div class="lb" style="margin-top:6px">${tons81(M.kg).replace(/<\/?small>/g, '')} — ${ele81(M.kg)} 🐘</div>` : ''}${R.month.length ? `<div class="lb" style="margin-top:4px">Рекорд — поднял больше, чем когда-либо раньше: ${nk} ${plural(nk, ['раз', 'раза', 'раз'])} — больше вес, ${nr} — больше повторов.</div>` : ''}`;
  return `<div class="st9h rk107"><div class="aur9h"><i></i><i></i><i></i></div><div class="glass c81 g9h"><div data-tab="grow" role="button">${hero}${month}</div>${wMonth81()}</div></div>`;
}
/* Денис 21.10 к листу app-093: «где я — добавить месяц с весом, чтобы я туда добавлял». Календарь 30 дней — тот же, что вид 6 веса (Gravl, v78):
   в клетке утренний вес, ярче — тяжелее (цель — набор); ввод под ним всегда — сегодняшний вес перезаписывается (wsave). */
function wMonth81() {
  const D = wDays(30), H = wHead(D), today = D[D.length - 1].kg;
  // v86 (Денис 21.10: «отметки дни, когда тренировался, нажать — посмотреть тренировку и удалить тест»): как календарь Hevy — день с тренировкой отмечен, тап — лист дня
  const tr = new Set(S.sessions.map((s) => Fit.dstr(new Date(s.date))));
  const inp = `<div class="win9"><input id="wnow" inputmode="decimal" placeholder="${today != null ? `Сегодня ${fmt(today)} кг` : 'Вес сегодня, кг'}"><button class="primary" data-act="wsave">${today != null ? 'Поправить' : 'Записать'}</button></div>`;
  if (!H.has.length && !D.some((x) => tr.has(x.k))) return `<div class="w81"><div class="cap9">ВЕС ЗА МЕСЯЦ</div><div class="lb" style="margin:4px 0 2px">Взвешивайся утром — клетки месяца заполнятся.</div>${inp}</div>`;
  const pad = (D[0].d.getDay() + 6) % 7, rg = Math.max(.3, H.max - H.min), hd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<div class="wh9">${w}</div>`).join('');
  const cells = D.map((x, i) => { const dl = `animation-delay:${300 + i * 22}ms`, t1 = tr.has(x.k), at = t1 ? ` data-act="calday" data-k="${x.k}" role="button" aria-label="Тренировка ${x.d.getDate()}"` : '';
    if (x.kg == null) return `<div class="wc6 off${x.today ? ' now' : ''}${t1 ? ' tr' : ''}" style="${dl}"${at}><small>${x.d.getDate()}</small></div>`;
    const t = (x.kg - H.min) / rg, c = ramp(.15 + t * .85); return `<div class="wc6${x.today ? ' now' : ''}${t1 ? ' tr' : ''}" style="background:${c};color:${t > .75 ? '#093030' : '#fff'};${t > .85 ? `box-shadow:0 0 12px ${c}88;` : ''}${dl}"${at}><small>${x.d.getDate()}</small><b>${fmt(x.kg)}</b></div>`; }).join('');
  const dw = H.wk == null ? '' : `<span class="lb"><b style="color:${H.wk > 0 ? '#14B8A6' : '#fff'}">${Math.abs(H.wk) < .05 ? 'без изменений' : (H.wk > 0 ? '+' : '−') + fmt(Math.abs(H.wk)) + ' кг'}</b> за месяц</span>`;
  const lg = D.some((x) => tr.has(x.k)) ? '<div class="lb" style="margin-top:8px"><i class="tml"></i>тренировка (нажми)<i class="tnl"></i>сегодня</div>' : '';
  return `<div class="w81"><div class="row between" style="min-height:0"><span class="cap9">ВЕС ЗА МЕСЯЦ</span>${dw}</div>${inp}<div class="wgrid9" style="margin-top:12px">${hd}${'<div></div>'.repeat(pad)}${cells}</div>${lg}</div>`;
}
const RED81 = '#F0524F'; // v107: красный = мышца добита до нормы (было «не в норме»); тот же, что у записи голоса (micp)
// тело спереди и сзади рядом, как «Прогресс → Тело»; под ним — кого докачать
function body81() {
  const ms = Fit.muscleSets(S.sessions), need = BODY_N.filter((g) => ms[g] < NB(g)).sort((x, y) => ms[x] - ms[y]);
  const fig = ['front', 'back'].map((s) => bodySvg(s, () => 0, { h: 230, col: (g) => mcol(nfr(ms[g], g)), cls: (g) => (nok(ms[g], g) ? 'ok81' : NB(g) == null ? '' : 'need81') })).join('');
  return `<div class="glass c81" data-act="gbody" role="button"><div class="row between" style="min-height:0"><span class="cap9">ТЕЛО ЗА 7 ДНЕЙ</span><span class="lb">в норме ${BODY_N.length - need.length} из ${BODY_N.length}</span></div>
    <div class="bodies b81">${fig}</div>
    <div class="leg81"><span><i style="background:${RED81}"></i>красное — норма мышцы набрана</span><span><i style="background:linear-gradient(90deg,#123A39,#5EEAD4)"></i>светлее — больше подходов</span></div>${need.length ? `<div class="lb" style="margin-top:8px;text-align:center">докачать: ${need.slice(0, 5).map((g, i) => `<b${i ? '' : ' class="lagn101"'} style="color:#5EEAD4">${Fit.MUSCLE_RU[g].toLowerCase()}</b> ${fmt(ms[g])}`).join(' · ')}${need.length > 5 ? ` · ещё ${need.length - 5}` : ''}</div>` : ''}
    </div>`;
}
// №6 листа: рекорд прошлой тренировки крупно + лента рекордов месяца. Крупно — сначала вес, потом остальное, по росту в разах
const recBig81 = (r) => (r.type === 'kg' ? `+${fmt(r.now - r.was)}<small> кг</small>` : r.more ? `+${r.more}<small> повт.</small>` : r.type === 'reps' ? `+${r.now - r.was}<small> повт.</small>` : `+${fmt(r.now - r.was)}<small> кг к максимуму</small>`);
const recWas81 = (r) => (r.type === 'kg' ? `было ${fmt(r.was)} кг` : r.more ? `было ${fmt(r.set.kg)} кг × ${r.set.reps - r.more}` : r.type === 'reps' ? `было ${r.was} повт.` : `расчётный максимум ${fmt(r.was)} → ${fmt(r.now)} кг`);
function rec81(R) {
  const best = R.lastRecs.slice().sort((a, b) => ((b.type === 'kg') - (a.type === 'kg')) || (b.now / b.was - a.now / a.was))[0];
  const hero = best ? `<div class="hero81"${best.id ? ` data-act="prog" data-id="${best.id}" role="button"` : ''}><div class="x">Рекорд прошлой тренировки · ${DOWF81[new Date(R.last.date).getDay()]}</div><i class="ry101"></i><div class="n">${recBig81(best)}</div><i class="sh81"></i>
    <div style="font-size:17px;font-weight:700;margin-top:4px">${esc(best.name)} — ${recSet81(best)}</div><div class="x">${recWas81(best)}${best.wasDate ? ' · ' + dshort(best.wasDate) : ''}</div><div class="pr">PR</div></div>` : '';
  const rest = R.month.filter((r) => r !== best && !(best && r.name === best.name && r.date === best.date)).slice(-3).reverse();
  const list = rest.length ? `<div class="glass c81" style="padding:4px 14px"><div class="cap9" style="padding:10px 0 4px">РЕКОРДЫ В ${MON81[new Date().getMonth()].toUpperCase()} · ${R.month.length}</div>
    ${rest.map((r) => `<div class="r81"${r.id ? ` data-act="prog" data-id="${r.id}" role="button"` : ''}><span>★</span><div style="flex:1;min-width:0"><b>${esc(r.name)}</b><small>${recSet81(r)} · ${dshort(r.date)}</small></div><i>${recDelta81(r)}</i></div>`).join('')}</div>` : '';
  return hero + list;
}
function todo81(day) {
  const out = []; // замеры и фото — в «Я» (Денис 21.10), здесь только проверка силы
  const cd = coachDay(day), tests = Object.keys(cd).filter((id) => cd[id].test).map((id) => exById(id)).filter(Boolean);
  if (tests.length) out.push(`<div class="todo81"><span class="ic">${ico('grow')}</span><div><b>Проверка силы — ${tests.map((e) => esc(e.name)).join(', ')}</b><small>сегодня по плану: последний подход — сколько сможешь</small></div></div>`);
  return out.length ? `<div class="glass c81" style="padding:4px 14px 10px"><div class="cap9" style="padding:10px 0 2px">СДЕЛАТЬ СЕГОДНЯ</div>${out.join('')}</div>` : '';
}
function home81(top, day, prog, nsets) {
  const R = recs81(), L = Fit.slLevels(S.sessions, slBw()), date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const meta = `${prog.length} ${plural(prog.length, ['упражнение', 'упражнения', 'упражнений'])} · ${nsets} ${plural(nsets, ['подход', 'подхода', 'подходов'])} · около ${Math.round(nsets * 1.6 / 5) * 5} мин`;
  const chips = prog.slice(0, 4).map((e) => `<span>${esc(e.name)}</span>`).join('') + (prog.length > 4 ? `<span>+${prog.length - 4}</span>` : '');
  const work = `<div class="glass c81"><div class="row between" style="align-items:flex-start;min-height:0"><div><b style="font-size:19px">Тренировка ${day}</b><div class="lb" style="margin-top:3px">${meta}</div></div><button class="link" data-act="pickday">сменить</button></div><div class="chips81">${chips}</div></div>`;
  return `<div class="lb" style="margin:2px 2px 0">${date[0].toUpperCase() + date.slice(1)}</div>${top}<div class="v9 h81">${me81(L, R)}${work}${body81()}${rec81(R)}${todo81(day)}</div>
    <div class="cta16"><button class="primary" data-act="start">Начать тренировку ${day}</button></div>`;
}

/* №10 листа (research/r52-home-fun/ours/10.html): «Я» → «Вес и замеры» — вес крупно, фигура спереди, замеры подписаны вокруг (последний замер и разница
   с прошлым), кнопка «Записать замеры и фото». Замеры — те, что приложение уже пишет (Fit.MEASURES: грудь, талия, бицепс Л/П, бедро Л/П). */
// 22.10: с v97 замеров 12, места были только у 6 — остальные вставали в одну точку слева (left 50%) и налезали. 6 слева, 6 справа, шаг 14 % (~48 px при росте 340)
// v110 (Денис 23.10: «бицепс правый, левый — гуляют, поставь ровно и проведи, что куда идёт»): пары лев./прав. на одной высоте, от ярлыка линия к мышце (lines81)
const TAG81 = { shoul: ['l', 10], chest: ['r', 10], bicR: ['l', 26], bicL: ['r', 26], foreR: ['l', 41], foreL: ['r', 41],
  waist: ['l', 56], hips: ['r', 56], thighR: ['l', 71], thighL: ['r', 71], calfR: ['l', 87], calfL: ['r', 87] };
const MPART81 = { shoul: 'shoulders', chest: 'chest', bicL: 'biceps', bicR: 'biceps', foreL: 'forearms', foreR: 'forearms', thighL: 'quads', thighR: 'quads', calfL: 'calves', calfR: 'calves', waist: 'abs', hips: 'glutes' };
function weightMeasures81() {
  const D = wDays(30), H = wHead(D), ms = S.measures || [], rows = Fit.measureLast(ms), du = Fit.measureDue(ms);
  const wHead81 = H.has.length ? `<b style="font-size:30px">${fmt(H.last.kg)} <small style="font-size:15px;color:#A3ADAC">кг${H.wk != null ? ` · ${Math.abs(H.wk) < .05 ? 'без изменений' : (H.wk > 0 ? '+' : '−') + fmt(Math.abs(H.wk))} за месяц` : ''}</small></b>` : '<div class="lb">ещё не взвешивался</div>';
  const has = rows.filter((r) => r.v != null), lit = new Set(has.map((r) => MPART81[r.key]));
  const fig = bodySvg('front', () => 0, { h: 340, col: (g) => (lit.has(g) ? '#0E655E' : '#2A3D40') });
  const tags = rows.map((r) => { const [s, y] = TAG81[r.key] || ['l', 50], nm = r.name.replace(' Л', ' лев.').replace(' П', ' прав.');
    return `<div class="tg81 ${s}" data-p="${MPART81[r.key] || ''}" style="top:${y}%"><small>${nm}</small><b>${r.v == null ? '—' : fmt(r.v)}</b><i>${r.d == null ? '' : (r.d > 0 ? '+' : r.d < 0 ? '−' : '') + fmt(Math.abs(r.d))}</i></div>`; }).join('');
  const when = du.last ? `ЗАМЕРЫ · ${dshort(du.last).toUpperCase()}` : 'ЗАМЕРЫ';
  return `<h2 style="margin-top:4px">Вес и замеры</h2><div class="glass c81"><div class="cap9">ВЕС</div>${wHead81}
    <div class="row between" style="margin-top:14px;min-height:0"><span class="cap9">${when}</span><span class="lb">${has.length ? 'см · разница с прошлым' : 'сантиметры лентой'}</span></div>
    <div class="fig81">${fig}${tags}</div>
    ${du.due ? `<div class="lb" style="margin:10px 0 0;color:${RED81}">${du.last ? `Последние замеры ${du.days} ${plural(du.days, ['день', 'дня', 'дней'])} назад — пора, раз в две недели` : 'Ещё ни разу — запиши, с чего начинаешь'}</div>` : ''}<button class="primary go9" data-act="mnew">Записать замеры и фото</button>${ms.length ? '<button class="link" data-act="mopen" style="min-height:44px;width:100%">Графики и фото</button>' : ''}</div>`;
}
// v82: число набегает от 0 за ~0,9 с (без анимаций в системе — сразу итог)
function countUp81(el) {
  const to = +el.dataset.cu; if (!(to > 0) || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const t0 = performance.now(), D = +el.dataset.ms || 900, f = el.dataset.sp ? sp3 : (n) => n; el.textContent = '0';
  const step = (t) => { const k = Math.min(1, (t - t0) / D); el.textContent = f(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// v110: линия от ярлыка замера к своей мышце — точка в центре того куска мышцы, что на стороне ярлыка (у пар их два)
function lines81(box) {
  const svg = box.querySelector('svg'); if (!svg) return; const B = box.getBoundingClientRect(), mid = B.left + B.width / 2;
  const ln = box.querySelector('.ln81') || box.appendChild(Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), {})); ln.setAttribute('class', 'ln81'); ln.innerHTML = '';
  box.querySelectorAll('.tg81[data-p]').forEach((t) => {
    const l = t.classList.contains('l'), ps = [...svg.querySelectorAll(`g[data-g="${t.dataset.p}"] path`)].map((p) => p.getBoundingClientRect()).filter((r) => r.width);
    const side = ps.filter((r) => (r.left + r.width / 2 < mid) === l), pick = (side.length ? side : ps).sort((x, y) => y.width * y.height - x.width * x.height)[0]; if (!pick) return;
    const T = t.getBoundingClientRect(), x1 = (l ? T.right + 4 : T.left - 4) - B.left, y1 = T.top + T.height / 2 - B.top, x2 = pick.left + pick.width / 2 - B.left, y2 = pick.top + pick.height / 2 - B.top;
    ln.insertAdjacentHTML('beforeend', `<path d="M${x1} ${y1} L${x1 + (x2 - x1) * .35} ${y1} L${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="3"/>`);
  });
}
