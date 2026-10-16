/* Зал — личное PWA. Состояние в localStorage `fit.v1`. Логика прогрессии — в program.js (Fit). */
'use strict';
const KEY = 'fit.v1', GROQ = 'fit.groq', BK = 'fit.bk', BKM = 'fit.bkm'; // BK — ключ автокопии GitHub, BKM — когда и что скопировано
// ключ Groq по ссылке: …/#gk=gsk_… — сохранить и убрать из адреса (Денис 11.10: «вбей сам»)
(() => { const m = /[#&]gk=([^&]+)/.exec(location.hash || ''); if (m) { try { localStorage.setItem(GROQ, decodeURIComponent(m[1]).trim()); } catch (e) {} history.replaceState(null, '', location.pathname + location.search); } })();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n == null ? '—' : String(Math.round(n * 10) / 10).replace('.', ','));
const ICON = {
  today: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2"/>',
  grow: '<path d="M4 20V11M10 20V7M16 20v-6M22 20V4M3 20h20"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M5 3v8M17 21V3c-2 1-3 4-3 8h3"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/>', minus: '<path d="M6 12h12"/>', plus: '<path d="M12 6v12M6 12h12"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>', disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>', note: '<path d="M6 3h9l4 4v14H6zM9.5 12h6M9.5 16h6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  chat: '<path d="M4 5h16v11h-9l-5 4v-4H4z"/>', barcode: '<path d="M4 6v12M7.5 6v12M10 6v12M13.5 6v12M16 6v12M20 6v12"/>', swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
};
const ico = (n) => `<svg class="ico" viewBox="0 0 24 24">${ICON[n]}</svg>`;

/* ---------- состояние ---------- */
let S = load(); if (!S.meals) S.meals = [];
/* версия 57: всё тело 3×. Веса переезжают по id (Fit.split), новые упражнения — «подбери». S.lay — флаг раскладки; S.cyc0 — с какого момента считаем цикл
   из 5 недель (первая тренировка после переноса — неделя 1). Повторный запуск ничего не меняет. */
function toLayout() {
  if (!S.program) return false;
  let ch = false;
  if (!Fit.isCurrent(S.program)) { S.program = Fit.split(S.program, Fit.intro(S.profile && S.profile.back) ? Fit.INTRO_RIR : undefined); S.active = null; ch = true; }
  if (S.lay !== Fit.LAYOUT) { S.lay = Fit.LAYOUT; if (S.cyc0 == null) S.cyc0 = Date.now(); ch = true; }
  return ch;
}
if (toLayout()) save();
const cycNow = (now = Date.now()) => Fit.blockWeek(S.sessions, now, Fit.PID, S.cyc0 || 0); // неделя цикла (5 недель: 4 рабочих + разгрузка)
// карта 2.9 и 3.12: один раз и не посреди тренировки — тренажёры вместо свободных весов (кроме рук), диапазоны повторов по упражнению.
// Круг A-B-C, неделя блока и история не трогаются: номер программы тот же, меняются упражнения в своих слотах
function upgradeProgram() {
  if (!S.program || S.active || (S.mach >= 5 && S.pv >= 2 && S.arms >= 4)) return false;
  if (!(S.mach >= 3)) { // 0 → все замены; 1 (версия 49) → только наклонный жим и мост; 2 (версия 50) → мост в тренажёре снят, на его месте гакк-присед
    if (!(S.mach >= 2)) S.program = Fit.machines(S.program, S.mach ? Fit.MACH2 : Fit.MACH);
    S.program = Fit.machines(S.program, Fit.MACH3, true); S.mach = 3;
  }
  if (!(S.mach >= 4)) { S.program = Fit.machines(S.program, Fit.MACH4, true, true); S.mach = 4; } // версия 53: гакк → гиперэкстензия, пресс на полу; версия 54: задняя дельта снята, на её месте разгибания ног (вес из дня B)
  if (!(S.mach >= 5)) { S.program = Fit.machines(S.program, Fit.MACH5, true, true); S.mach = 5; } // версия 53 успела поставить гантели на заднюю дельту — снять
  if (!(S.pv >= 2)) { S.program = Fit.methods(S.program); S.pv = 2; }
  if (!(S.arms >= 4)) { S.program = Fit.arms(S.program); S.arms = 4; } // карта 2.10: руки в дне B; 2.11 (S.arms 1 → 2): сведения на блоках в дне C; версия 54 (2 → 3): тяга сидя и разводка гантелей в дне A; (3 → 4): сгибания ног сидя в дне A
  return true;
}
if (upgradeProgram()) save();
const introNow = (now = Date.now()) => Fit.intro(S.profile && S.profile.back, now); // вводные две недели после перерыва (карта 3.12)
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.program) return s; } catch (e) { /* пусто */ }
  return { profile: null, program: null, sessions: [], weights: [], habits: {}, meals: [], active: null };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Не удалось сохранить'); } }
let tab = 'today', view = null; // view: null | 'summary'
let summary = null;

/* ---------- звук, экран, таймер ---------- */
let actx = null, wake = null, rest = null, restTick = null;
document.addEventListener('pointerdown', () => { // iOS: звук разблокируется только жестом
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* нет звука */ } }
  if (actx && actx.state === 'suspended') actx.resume();
}, { passive: true });
function beep(n = 3) {
  if (!actx) return;
  for (let i = 0; i < n; i++) {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.28;
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.22);
  }
}
async function lockScreen() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* не поддержано */ } }
function unlockScreen() { if (wake) { wake.release().catch(() => {}); wake = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (S.active) lockScreen(); else bkMaybe(); });

function startRest(sec) {
  rest = { end: Date.now() + sec * 1000, total: sec, beeped: false };
  clearInterval(restTick); restTick = setInterval(drawRest, 250); drawRest();
}
function stopRest() { rest = null; clearInterval(restTick); drawRest(); }
const durMin = (t0) => Math.max(0, Math.floor((Date.now() - t0) / 60000));
function drawRest() {
  const el = $('#rest'), v = $('#view'), wd = $('#wdur');
  if (wd && S.active) wd.textContent = durMin(S.active.start) + ' мин';
  if (!rest || !S.active) { el.hidden = true; v.classList.remove('resting'); return; }
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0 && !rest.beeped) { rest.beeped = true; beep(); }
  const over = left <= 0;
  el.hidden = false; v.classList.add('resting');
  const m = Math.abs(left);
  // панель собираем один раз и меняем только текст: при пересборке каждые 250 мс кнопка менялась между нажатием и отпусканием — тап пропадал
  if (!el.firstChild) el.innerHTML = '<div class="t"></div><button data-act="rest-add">+30 с</button><button data-act="rest-stop" class="primary" style="width:auto;min-height:44px;font-size:16px"></button>';
  const t = el.firstChild, b = el.lastChild, txt = `${over ? '+' : ''}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, lbl = over ? 'Дальше' : 'Пропустить';
  if (t.textContent !== txt) t.textContent = txt;
  t.style.color = over ? 'var(--green)' : 'var(--ink)';
  if (b.textContent !== lbl) b.textContent = lbl;
}

/* ---------- тренировка ---------- */
function lastOf(name) { for (let i = S.sessions.length - 1; i >= 0; i--) { const e = S.sessions[i].exercises.find((x) => x.name === name); if (e) return e; } return null; }
/* Тренер (app-014): замер, застой, цель. Правила и источники — program.js, блок «тренер». */
const exById = (id) => Fit.ORDER.flatMap((d) => S.program[d]).find((e) => e.id === id);
const dshort = (d) => new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
// что тренер скажет по упражнениям дня: { id: { log, stall, test } }
function coachDay(day, now = Date.now()) {
  const out = {}, cands = [], bw = cycNow(now);
  for (const ex of S.program[day]) {
    const log = Fit.exLog(S.sessions, ex.name), stall = Fit.isStalled(Fit.stallTops(log));
    out[ex.id] = { log, stall, sadd: stall && Fit.stallAddOk(S.program, day, ex, S.sadd, bw.cycle || 0) }; // версия 57: при первом застое сначала +1 подход
    if (!introNow(now) && !bw.deload && Fit.isMain(ex.slot || ex.id)) { const d = Fit.testDue(log, now); if (d.due) cands.push({ id: ex.id, ...d }); }
  }
  for (const id of Fit.pickTests(cands)) out[id].test = true;
  return out;
}
// упражнения, которые ходили за последние три недели и встали (LiftOS stalledExercises)
function stalledNow(now = Date.now()) {
  return Fit.ORDER.flatMap((d) => S.program[d]).filter((e) => { const l = Fit.exLog(S.sessions, e.name); return l.length && now - l[l.length - 1].t <= Fit.RECENT_DAYS * 864e5 && Fit.isStalled(Fit.stallTops(l)); });
}
// цель упражнения и где мы сейчас: { g, e1, st, text, cls }; null — цели нет
function goalInfo(id, log) {
  const g = (S.goals || {})[id]; if (!g || !log.length) return null;
  const e1 = log[log.length - 1].e1, st = Fit.goalState(g, e1, Date.now());
  const pace = st.done ? 'цель взята' : st.delta > -0.05 ? 'по графику' + (st.delta >= 0.5 ? `, +${fmt(st.delta)} кг` : '') : `отстаёшь на ${fmt(-st.delta)} кг`;
  const left = st.done ? '' : st.days > 0 ? ` · ${st.days} ${plural(st.days, ['день', 'дня', 'дней'])}` : ' · срок вышел';
  return { g, e1, st, pace, text: pace + left, cls: st.done || st.delta > -0.05 ? 'pos' : 'neg' };
}
const goalBar = (st) => `<div class="gbar"><i style="width:${Math.round(st.pct * 100)}%"></i><u style="left:${Math.round(st.k * 100)}%"></u></div>`; // риска — где надо быть сегодня
// после тренировки: первая запись базового упражнения ставит цель; возвращает строку для итога
function goalAfter(id, rec) {
  if (!Fit.hasGoal(id, (exById(id) || {}).slot)) return '';
  const p = Fit.exLog([{ date: new Date().toISOString(), exercises: [rec] }], rec.name)[0]; if (!p || !(p.e1 > 0)) return '';
  const G = (S.goals = S.goals || {});
  if (!G[id] && rec.ci) return ''; // лёгкий день по чек-ину — не точка отсчёта для цели
  if (!G[id]) { G[id] = Fit.goalDefault(id, p.e1, Date.now()); return `Цель: ${fmt(G[id].kg)} кг к ${dshort(G[id].by)}`; }
  const st = Fit.goalState(G[id], p.e1, Date.now());
  return st.done ? `Цель ${fmt(G[id].kg)} кг взята` : `До цели ${fmt(st.left)} кг`;
}
function buildItem(ex, c, ci, day) { // упражнение программы -> упражнение тренировки (подходы, прошлый раз, плашки тренера); ci — чек-ин (app-021)
  const perf = Fit.perfEntry(S.sessions, ex.name), last = perf ? perf.sets.filter(Fit.counted) : [];
  const rc = Fit.recovery(ci, ex.id, Date.now()), dl = cycNow().deload; // версия 57: разгрузочная неделя — подходов вдвое меньше, вес как в режиме deload
  const k0 = Fit.easeKgs(ex, Fit.dayLast(S.sessions, day, ex.name), dl ? 'deload' : rc.mode), dx = dl ? Fit.deloadEx(ex, k0) : { ...ex, kgs: k0 }, kgs = dx.kgs, ranges = dx.ranges;
  const eased = !dl && kgs.some((k, i) => k !== ex.kgs[i]), exd = dx;
  // сниженный вес — повторы в верх диапазона, как при сбросе по застою (case 'deload')
  const sets = ranges.map((r, i) => ({ kg: kgs[i], reps: (dl || rc.mode === 'deload') && kgs[i] !== ex.kgs[i] ? r[1] : Fit.targetReps(exd, i, last[i]), done: false }));
  const coach = dl ? { dl: 1 } : {};
  if (!dl && rc.mode !== 'ok' && (eased || c.test)) coach.ci = { m: rc.mode, why: rc.why, v: rc.v, ...(rc.g ? { g: rc.g } : {}), ...(eased ? { e: 1 } : {}), ...(c.test ? { test: 1 } : {}) }; // в плохой день замер не ставим — придёт в следующий раз
  if (c.test && rc.mode === 'ok') { const l = sets[sets.length - 1]; l.t = 'f'; l.mx = 1; l.reps = 0; coach.test = 1; } // замер: повторы не подставляем — Денис 11.10: «цель макс, а повторы 10 — это как?» // замер: последний подход — максимум повторов
  if (c.stall && !dl) { coach.stall = 1; if (c.sadd) coach.sadd = 1; }
  if (!S.warmOff && !ex.bw) sets.unshift(...warmSets(ex.id, sets[0].kg, Fit.warmFor(ex))); // разминка по нарастающей стоит сама: число подходов — по тяжести упражнения (гайд автора, Fit.WARM_BY); веса ещё нет — нет и разминки
  return { id: ex.id, name: ex.name, slot: ex.slot, group: ex.group, restSec: ex.restSec, ranges, sets, perf, ...coach };
}
// день: по кругу A-B-C, либо выбранный руками на «Сегодня» (S.pick живёт до старта тренировки)
const dayNow = () => (S.pick && Fit.ORDER.includes(S.pick) ? S.pick : Fit.nextDay(S.sessions));
function startWorkout(ci) {
  const day = dayNow(), cd = coachDay(day); delete S.pick;
  const items = Fit.ssApply(Fit.seq(day, S.program[day]).map((ex) => buildItem(ex, cd[ex.id], ci, day)), (S.ss || {})[day]);
  S.active = { day, start: Date.now(), items, chat: [], ...(ci ? { ci } : {}) }; save(); lockScreen(); render();
  if (ci) { const t = ciCount(items); toast(t.dl || t.hd ? 'Чек-ин: ' + [t.dl ? `вес ниже в ${t.dl} упр.` : '', t.hd ? `без прибавки в ${t.hd} упр.` : ''].filter(Boolean).join(', ') : 'Чек-ин записан: веса по плану'); }
}
/* app-021: чек-ин перед тренировкой — лист на «Начать». Правило и источник — program.js, блок «чек-ин». Форма как у gymcoach
   (components/session/readiness-checkin.tsx): две обязательные шкалы 1–5, боль по мышцам — по желанию, «Пропустить».
   Боль спрашиваем только по главным мышцам сегодняшних упражнений: остальные на сегодняшние веса не влияют. */
const CI_ROWS = [['ready', 'Готовность', '1 — выжат · 5 — заряжен'], ['sleep', 'Сон', '1 — плохо · 5 — отлично']];
const ciWhy = (c) => (c.why === 'sore' ? `${Fit.MUSCLE_RU[c.g].toLowerCase()} болит на ${c.v} из 5` : `готовность ${c.v} из 5`);
const ciCount = (items) => ({ dl: items.filter((it) => it.ci && it.ci.e && it.ci.m === 'deload').length, hd: items.filter((it) => it.ci && it.ci.e && it.ci.m === 'hold').length });
const inEx = (n) => `в ${n} ${plural(n, ['упражнении', 'упражнениях', 'упражнениях'])}`;
function ciVerdict(day, ci) { // что чек-ин сделает с сегодняшней тренировкой — текст для листа
  if (!ci.ready || !ci.sleep) return 'Оцени готовность и сон — или нажми «Пропустить».';
  const cd = coachDay(day), its = S.program[day].map((ex) => buildItem(ex, cd[ex.id], ci, day)), t = ciCount(its);
  const why = [...new Set(its.filter((it) => it.ci).map((it) => ciWhy(it.ci)))].join(', '), tests = its.filter((it) => it.ci && it.ci.test).length;
  const out = [t.dl ? `Вес ниже примерно на 10 % — ${inEx(t.dl)}.` : '', t.hd ? `Вес без прибавки, как в прошлый раз — ${inEx(t.hd)}.` : '', tests ? 'Замер на максимум перенесён.' : ''].filter(Boolean);
  return out.length ? `<b>Сегодня легче.</b> ${out.join(' ')} Причина: ${why}.` : '<b>Веса по плану.</b>' + (ci.ready <= 2 || Object.values(ci.sore).some((v) => v >= 4) ? ' Прибавок сегодня и так нет — придерживать нечего.' : '');
}
function openCheckin() {
  const w = $('#sheet'), day = dayNow(), old = Fit.ciFresh(S.checkin, Date.now()) ? S.checkin : null; // свежий ответ (отменил и начал заново) — подставляем
  const ci = { ready: old ? old.ready : 0, sleep: old ? old.sleep : 0, sore: { ...((old && old.sore) || {}) } };
  const groups = [...new Set(S.program[day].map((e) => (Fit.MUSCLE[e.id] || [])[0]).filter(Boolean))];
  const chips = (k) => `<div class="chipr eq">${[1, 2, 3, 4, 5].map((v) => `<button class="chip" data-ci="${k}" data-v="${v}">${v}</button>`).join('')}</div>`;
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Как ты сегодня?</div>
    <p class="muted small" style="margin:0 0 12px">Два тапа перед тренировкой. В плохой день тренер не прибавит вес или снизит его на 10 %. Сверх плана чек-ин вес не поднимает.</p>
    ${CI_ROWS.map(([k, n, cap]) => `<div class="cirow"><div class="row between"><b>${n}</b><span class="muted small">${cap}</span></div>${chips(k)}</div>`).join('')}
    <details class="cisore"${Object.keys(ci.sore).length ? ' open' : ''}><summary>Что-то болит?</summary><p class="muted small" style="margin:0 0 10px">Отметь только то, что болит: 1 — чуть, 4 — сильно, 5 — еле двигается. Повторный тап снимает оценку.</p>
      ${groups.map((g) => `<div class="cirow"><b>${Fit.MUSCLE_RU[g]}</b>${chips('s:' + g)}</div>`).join('')}</details>
    <div class="civ" id="civ"></div>
    <button class="primary" id="cigo">Начать тренировку</button><button class="link" id="ciskip" style="min-height:44px">Пропустить</button>
    <p class="muted small" style="margin:8px 0 0">Как считается «на 10 % легче»: стоял вес 40 кг — сегодня будет 35 кг (ближайший вес на тренажёре ниже 36). Так делает открытое приложение gymcoach; научной работы под цифру 10 % нет. Вес в подходе всегда можно поправить руками. Сон на вес не влияет — его увидит тренер в чате. Лёгкий день программу не меняет: в следующий раз веса вернутся. Выключить чек-ин: «Я» → Настройки.</p></div>`;
  const paint = () => {
    w.querySelectorAll('[data-ci]').forEach((b) => { const [k, g] = b.dataset.ci.split(':'); b.classList.toggle('on', +b.dataset.v === (g ? ci.sore[g] : ci[k])); });
    $('#civ').innerHTML = ciVerdict(day, { ...ci, t: Date.now() });
  };
  paint();
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    if (e.target.id === 'ciskip') { closeSheet(); return startWorkout(); }
    if (e.target.id === 'cigo') {
      if (!ci.ready || !ci.sleep) return toast('Оцени готовность и сон — или нажми «Пропустить»');
      S.checkin = { t: Date.now(), ready: ci.ready, sleep: ci.sleep, sore: ci.sore }; closeSheet(); return startWorkout(S.checkin);
    }
    const b = e.target.closest('[data-ci]'); if (!b) return;
    const [k, g] = b.dataset.ci.split(':'), v = +b.dataset.v;
    if (g) { if (ci.sore[g] === v) delete ci.sore[g]; else ci.sore[g] = v; } else ci[k] = v;
    paint();
  };
}
// выбор дня тренировки руками (Денис 11.10: «сегодня ноги и плечи, а стоит другой план»); круг A-B-C-D продолжится от выбранного
// Лист «какая тренировка»: карточка дня как карточка рутины Hevy (название, упражнения, синяя кнопка — hevyapp.com/features/gym-routines,
// скрин research/r33-raw/hevy-routines/11.png). У Hevy упражнения в карточке через запятую в одну строку; Денис 13.10: «текст сплошняком,
// не понимаю, что выбираю» — поэтому столбиком, как на экране самой рутины. Названия дней — акценты программы (r26/r27).
const DAY_FOCUS = { A: 'Всё тело', B: 'Всё тело', C: 'Всё тело' }; // версия 57: всё тело 3×
function openPickDay() {
  const w = $('#sheet'), nx = Fit.nextDay(S.sessions), cur = dayNow();
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Какая тренировка сегодня?</div>
    ${Fit.ORDER.map((d) => { const pr = Fit.seq(d, S.program[d]), n = pr.reduce((x, e) => x + e.ranges.length, 0);
    return `<div class="pday${d === cur ? ' on' : ''}"><div class="row between"><div class="pdt"><i>${d}</i><div><b>${DAY_FOCUS[d] || 'Тренировка ' + d}</b><small>${pr.length} ${plural(pr.length, ['упражнение', 'упражнения', 'упражнений'])} · ${n} ${plural(n, ['подход', 'подхода', 'подходов'])}</small></div></div>${d === nx ? '<span class="pdn">по плану</span>' : ''}</div>
      <div class="pl">${pr.map((e, i) => `<div><em>${i + 1}</em><p><b>${esc(e.name)}</b></p><span>${e.ranges.length} ${plural(e.ranges.length, ['подход', 'подхода', 'подходов'])}</span></div>`).join('')}</div>
      <button class="${d === cur ? '' : 'primary'}" data-day="${d}">${d === cur ? 'Выбрана сейчас' : 'Выбрать ' + d}</button></div>`; }).join('')}
    <p class="muted small" style="margin:0 0 6px;text-align:center">Программа идёт по кругу A → B → C; после выбранной круг продолжится с неё.</p>
    <button class="link" id="pdx">Отмена</button></div>`;
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'pdx') return closeSheet();
    const b = e.target.closest('[data-day]'); if (!b) return;
    if (b.dataset.day === nx) delete S.pick; else S.pick = b.dataset.day;
    save(); closeSheet(); render();
  };
}
// app-016: замена упражнения в идущей тренировке — программа (Fit.swap, замены автора) и упражнение тренировки пересобираются; чат остаётся
function applySwap(k, toId) {
  const a = S.active, it = a.items[k]; if (!it) return;
  const p = Fit.swap(S.program, a.day, it.id, toId); if (!p) return toast('Такой замены нет в списке');
  if (it.sets.some((s) => s.done) && !confirm(`Отмеченные подходы «${it.name}» пропадут. Заменить?`)) return;
  S.program = p; const ex = p[a.day].find((e) => e.id === toId);
  a.items[k] = { ...buildItem(ex, coachDay(a.day)[toId], a.ci, a.day), group: it.group }; // замена остаётся в своём суперсете
  save(); closeSheet(); render(); toast(`Теперь ${ex.name}`);
}
function finishWorkout() {
  const a = S.active, exercises = [], sum = [];
  for (const it of a.items) {
    const done = it.sets.filter((s) => s.done);
    if (!done.length) continue;
    const prev = lastOf(it.name), rec = Fit.record(it.name, (done.find(Fit.counted) || done[0]).kg, done);
    if ((it.note || '').trim()) rec.note = it.note.trim(); // заметка этой тренировки уходит в запись; в следующий раз видна один раз серой подсказкой (perf.note)
    if (it.sets.some((s) => s.mx && s.done)) rec.test = 1; // замер сделан — следующий через Fit.TEST_DAYS
    if (it.ci && it.ci.e) rec.ci = it.ci.m; // лёгкий день по чек-ину — видно в разборе
    if (it.dl) rec.dl = 1; // разгрузочная неделя: в счёт застоя не идёт
    exercises.push(rec);
    const i = S.program[a.day].findIndex((e) => e.id === it.id), old = S.program[a.day][i];
    const cs = it.sets.filter(Fit.counted).map((s) => (s.done ? s : null)); // зачётные по порядку: без разминки и дропов
    const nxt = Fit.progress(old, cs, !!((it.ci && it.ci.e) || it.dl)); // разгрузка веса программы вниз не переписывает
    S.program[a.day][i] = nxt;
    const e1 = Fit.bestE1(rec), e0 = prev ? Fit.bestE1(prev) : null;
    const prs = it.sets.filter((s, j) => setCmp(it, j) === 'pr').length;
    const ups = nxt.kgs.filter((k, j) => cs[j] && k > cs[j].kg);
    sum.push({ name: it.name, text: setsText(rec), goal: goalAfter(it.id, rec), n: done.length, prs, ups, easy: !!rec.ci, e1, delta: e1 != null && e0 != null ? e1 - e0 : null });
  }
  const dur = durMin(a.start);
  if (exercises.length) S.sessions.push({ date: new Date().toISOString(), day: a.day, p: Fit.PID, dur, exercises, ...(a.ci ? { ci: a.ci } : {}), ...(a.chat && a.chat.length ? { chat: a.chat } : {}) }); // чат уходит в запись — для разбора после зала
  summary = { day: a.day, sum, empty: !exercises.length, dur, volume: Fit.sessionVolume({ exercises }), sets: sum.reduce((n, s) => n + s.n, 0), prs: sum.reduce((n, s) => n + s.prs, 0) };
  S.active = null; save(); stopRest(); unlockScreen(); view = 'summary'; render();
  if (exercises.length) backupNow(); // карта 7.2: копия сразу после тренировки
}

/* ---------- экраны ---------- */
/* Главная — сводка дня, собрана из макетов app/design по выбору Дениса (10.10): кольцо «осталось» — макет 8,
   карточка плана с баннером — макет 4 (JEFIT), весь состав тренировки под ней — макет 10 (WHOOP). Дней недели и пропусков нет. */
const sp3 = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+$)/g, ' ');
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];
function ring(size, r, w, p, color) {
  const c = size / 2, len = 2 * Math.PI * r, on = Math.max(0, Math.min(1, p || 0));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" stroke-width="${w}"/>${on > 0 ? `<circle cx="${c}" cy="${c}" r="${r}" stroke="${color}" stroke-width="${w}" stroke-dasharray="${(len * on).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>` : ''}</svg>`;
}
function screenToday() {
  if (view === 'summary' && summary) return screenSummary();
  if (S.active) return screenWorkout();
  const day = dayNow(), prog = Fit.seq(day, S.program[day]), c = ctx(), t = c.tot; // порядок тренировки, не порядок хранения
  const remK = c.goalKcal - t.kcal, remP = Math.round(c.goalProtein - t.protein);
  const ws = Fit.weightStats(S.weights), kgs = S.weights.slice(-14).map((w) => w.kg);
  const wNow = ws.avg != null ? ws.avg : kgs.length ? kgs[kgs.length - 1] : +S.profile.weight;
  const dKg = ws.pct == null ? null : ws.avg - ws.avg / (1 + ws.pct / 100);
  const wSub = dKg != null ? `${dKg < 0 ? '−' : '+'}${fmt(Math.abs(dKg))} кг за неделю` : kgs.length ? 'среднее за 7 дней' : 'из профиля · запиши утром';
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const bwT = cycNow(), nsets = prog.reduce((n, e) => n + (bwT.deload ? Fit.deloadSets(e.ranges.length) : e.ranges.length), 0);
  const kgText = (e) => (e.kgs.some((k) => k == null) ? 'подбери' : e.kgs.every((k) => !k) ? 'свой вес' : e.kgs.map(fmt).join(' / ') + ' кг');
  const cd = coachDay(day), ssd = (S.ss || {})[day] || [], tag = (e) => (cd[e.id].test ? ' · <u>проверка силы</u>' : '') + (cd[e.id].stall ? ' · <u class="st">вес не растёт</u>' : '') + (ssd.some((g) => g.includes(Fit.ssKey(e))) ? ' · <u>суперсет</u>' : '');
  const list = prog.map((e, i) => `<div><em>${i + 1}</em><p><b>${esc(e.name)}</b><small>${e.ranges.map((r) => r.join('–')).join(' · ')}${tag(e)}</small></p><span>${kgText(e)}</span></div>`).join('');
  // цель: упражнения сегодняшней тренировки, у которых она уже стоит; до первого замера — что будет
  const gl = prog.map((e) => [e, goalInfo(e.id, cd[e.id].log)]).filter((x) => x[1]), ntest = prog.filter((e) => cd[e.id].test).length, stuck = stalledNow().length;
  const iw = introNow(), goals = gl.map(([e, gi]) => `<div class="gl"><div class="row between"><b>${esc(e.name)}</b><span>${fmt(gi.e1)} → ${fmt(gi.g.kg)} кг</span></div>${goalBar(gi.st)}<small class="${gi.cls === 'neg' ? 'neg' : ''}">${gi.text}</small></div>`).join('')
    + (!gl.length && ntest ? '<div class="tsub">Сегодня проверяем силу. В упражнениях с пометкой «проверка силы» последний подход делай, сколько сможешь: пока получается ровно, без рывков. По этому числу приложение поставит тебе цель на 12 недель.</div>' : '')
    + (stuck >= Fit.FATIGUE_STALLS ? `<div class="tsub neg">Сразу в ${stuck} упражнениях вес не растёт уже ${Fit.STALL_SESSIONS} тренировки подряд. Так бывает, когда устал. В тренировке у каждого такого упражнения будет кнопка «Сбросить на 10 %» — нажми. Выйдет лёгкая неделя, потом вес снова пойдёт вверх.</div>` : '');
  return `<div class="hi"><span>${date[0].toUpperCase() + date.slice(1)}</span>Сегодня</div>${bkWarn()}
    ${weekCard()}${deloadCard()}${swapCard(day)}
    <div class="card" data-tab="food" role="button"><h3>Калории ≈</h3><div class="kc">
      <div class="rg">${ring(132, 58, 11, t.kcal / c.goalKcal, '#1f9bf0')}<div><b>${sp3(Math.abs(remK))}</b><span>${remK >= 0 ? 'осталось' : 'сверх цели'}</span></div></div>
      <div class="ls"><div><small>Цель</small><b>${sp3(c.goalKcal)}</b></div><div><small>Съедено</small><b>${sp3(t.kcal)}</b></div></div></div></div>
    <div class="two"><div class="card" data-tab="food" role="button"><h3>Белок</h3><div class="row between"><div><div class="tnum">${remP > 0 ? remP : fmt(t.protein)} <small>г</small></div><div class="tsub">${remP > 0 ? 'осталось' : 'норма набрана'}</div></div>
        <div class="rg">${ring(54, 23, 6, t.protein / c.goalProtein, '#34c759')}</div></div><div class="tsub">${fmt(t.protein)} из ${c.goalProtein} г</div></div>
      <div class="card" data-tab="me" role="button"><h3>Вес</h3><div class="tnum">${fmt(wNow)} <small>кг</small></div>${spark(kgs)}<div class="tsub">${wSub}</div></div></div>
    ${iw ? `<div class="card" id="introc"><h3>После перерыва</h3><div class="tsub">Первые две недели, осталось ${iw.left} дн. Вес бери полегче: в каждом подходе заканчивай, когда мог бы сделать ещё 3–5 повторов. Проверки силы пока не будет.</div></div>` : ''}
    ${goals ? `<div class="card" data-tab="history" role="button"><h3>Цель</h3>${goals}</div>` : ''}
    ${muscleCard()}
    <div class="plan"><div class="ban" data-act="pickday" role="button" aria-label="Сменить день"><i>${day}</i><small>${S.pick ? 'ВЫБРАНА ВРУЧНУЮ' : 'СЛЕДУЮЩАЯ ТРЕНИРОВКА'} · сменить</small><b>Тренировка ${day}</b></div>
      <div class="pb"><span>${prog.length} ${plural(prog.length, ['упражнение', 'упражнения', 'упражнений'])} · ${nsets} ${plural(nsets, ['подход', 'подхода', 'подходов'])}</span><button data-act="start">Начать</button></div>
      <div class="pl">${list}</div></div>
    ${prog.some((e) => e.kgs.some((k) => k == null)) ? '<p class="muted small" style="padding:0 4px">Где вес «подбери»: на первой тренировке найди его лесенкой — шаги будут в подсказке «Первый раз» над упражнением. Рабочий — вес, с которым верх диапазона даётся и ещё 1–2 повтора в запасе. Второй и третий подход — на 10 % легче, приложение подставит и запомнит.</p>' : ''}
    <p class="muted small" style="padding:0 4px">Программа: всё тело, три дня по кругу A → B → C; руки и предплечья — с большим объёмом. Цикл — 5 недель: четыре рабочих и разгрузка (подходов вдвое меньше). Как растёт вес: цель подхода, например, 8–10 раз. Сделал 11 и больше — в следующий раз приложение само поставит на шаг тяжелее (обычно +2,5 кг). Сделал 8–10 — вес остаётся. Так в программе Грега Наколса.</p>`;
}
// версия 57: разгрузочная неделя — пояснение на «Сегодня»
function deloadCard() {
  return cycNow().deload ? '<div class="card"><h3>Разгрузка</h3><div class="tsub">Неделя лёгкая: подходов вдвое меньше (с округлением вверх), вес примерно на 10 % ниже. Упражнения те же, тренировки короче. Так советуют Bell 2022 (PMID 36619355) и RP: разгрузка раз в 4–6 недель.</div></div>' : '';
}
// версия 57: после разгрузки (1-я неделя нового цикла) — «4 недели прошли — меняем». Раз в цикл, не больше двух на день; решение — по кнопке
function swapOffers(day) {
  const bw = cycNow(); if (!bw.fresh || S.active) return [];
  if (!S.sw || S.sw.c !== bw.cycle) S.sw = { c: bw.cycle, hist: (S.sw && S.sw.hist) || [], d: {} };
  if (!S.sw.d[day]) { S.sw.d[day] = Fit.swapPlan(S.program, S.sw.hist, bw.cycle, day); save(); }
  return S.sw.d[day].filter((o) => !o.r);
}
function swapCard(day) {
  const of = swapOffers(day); if (!of.length) return '';
  return `<div class="card" id="swapc"><h3>4 недели прошли — меняем</h3>${of.map((o) => `<div class="vadv"><b>${esc(o.fromName)} → ${esc(o.toName)}</b><div class="muted small">Вес нового — «подбери» или тот, что уже был.</div><div class="row"><button class="ghost" data-act="sw-yes" data-day="${day}" data-slot="${o.slot}">Заменить</button><button class="ghost" data-act="sw-no" data-day="${day}" data-slot="${o.slot}">Оставить</button></div></div>`).join('')}<p class="muted small">Раз в цикл и не больше двух на день: Nippard — те же упражнения четыре недели, потом смена; RP — свежие упражнения после разгрузки; слишком частая случайная смена вредит (Kassiano 2022, PMID 35438660).</p></div>`;
}
function swapAnswer(d, ok) {
  const o = ((S.sw && S.sw.d[d.day]) || []).find((x) => x.slot === d.slot && !x.r); if (!o) return;
  if (ok) { const p = Fit.swapTo(S.program, S.sessions, d.day, o.from, o.to); if (!p) { o.r = 'no'; save(); render(); return toast('Уже заменено'); } S.program = p; o.r = 'ok'; toast(`Теперь ${o.toName}`); } else o.r = 'no';
  S.sw.hist.push({ c: S.sw.c, day: d.day, slot: o.slot, ok: ok ? 1 : 0 }); save(); render();
}
/* app-018: карточка недели (лента Пн–Вс, серия «N из 3», неделя блока) и схема тела за 7 дней — по Hevy Statistics (r12 §15), данные Fit.weekStrip/blockWeek/muscleSets */
function weekCard() {
  const days = Fit.weekStrip(S.sessions), n = days.filter((d) => d.done).length, bw = cycNow();
  const strip = days.map((d) => `<div class="wd${d.done ? ' on' : ''}${d.today ? ' now' : ''}${d.future ? ' fut' : ''}"><small>${d.dow}</small><i>${d.done ? ico('check') : d.dom}</i></div>`).join('');
  const blk = !bw.started ? '<div class="tnum">—</div><div class="tsub">цикл начнётся с первой тренировки</div>'
    : `<div class="tnum">${bw.week} <small>из ${bw.len}</small></div><div class="tsub">${bw.deload ? 'неделя цикла · <b class="amber">разгрузка</b>' : `неделя цикла · разгрузка через ${bw.deloadIn}`}</div>`;
  return `<div class="card wk"><div class="strip">${strip}</div>
    <div class="row between"><div><div class="tnum">${n} <small>из ${Fit.WEEK_GOAL}</small></div><div class="tsub">${n >= Fit.WEEK_GOAL ? 'неделя закрыта' : 'тренировок на неделе'}</div></div><div class="ta-r">${blk}</div></div></div>`;
}
// схема тела: спереди и сзади, группы подсвечены по подходам за 7 дней (0 / 1–5 / 6–11 / 12+). Рисунок — body.js (MIT), карта 4.11: новый вместо прямоугольного «чувака»
const heat = (n) => (n >= 12 ? 1 : n >= 6 ? .65 : n > 0 ? .35 : 0);
function bodySvg(side, ms) {
  const B = BODY_PATHS[side], ps = (ds) => ds.map((d) => `<path d="${d}"/>`).join('');
  const groups = Object.entries(B.m).map(([g, ds]) => { const h = heat(ms[g]); return `<g fill="${h ? 'var(--blue)' : 'var(--track)'}" fill-opacity="${h || 1}"><title>${Fit.MUSCLE_RU[g]}: ${fmt(ms[g])}</title>${ps(ds)}</g>`; }).join('');
  return `<svg class="body" viewBox="${B.vb}" stroke="var(--glass)" stroke-width="2" aria-label="${side === 'front' ? 'спереди' : 'сзади'}"><g fill="var(--glass-2)">${ps(B.base)}</g>${groups}</svg>`;
}
/* карта 4.11: вкладка «Прогресс» (решение Дениса 13.10 по листу shots/app-029-me-scales.png: кольца убрать, вынести в свою вкладку, чтобы не мешала).
   Полоса на каждую мышцу (№10 листа) видом как №1 — толстая сине-зелёная, под ней процент до следующего уровня; по нажатию — упражнения этой мышцы
   как в №9: старт, сейчас, что прибавил; тап по упражнению — его экран (график, рекорды, цель). Счёт — Fit.gameStats и Fit.muscleProgress.
   Руки сверху — его цель 13.10 (карта 2.10). */
const MUS_TOP = ['biceps', 'triceps'];
let musOpen = null;
const setTxt = (x) => `${fmt(x.kg)} кг × ${x.reps}`, pc100 = (x) => Math.floor(x * 100 + 1e-6);
function exGrow(e) {
  const dk = e.best.kg - e.first.kg, dr = e.best.reps - e.first.reps, p = Math.round(Math.min(1, e.growth / (e.lvl * Fit.LVL_STEP)) * 100);
  const off = Fit.ORDER.some((d) => S.program[d].some((x) => x.id === e.id)) ? '' : '<div class="muted small">сейчас не в программе</div>';
  const gain = e.n < 2 ? '<span class="muted small">первая запись — это старт</span>' : e.growth <= 0 ? '<span class="muted small">пока как на старте</span>'
    : `<b class="pos">${dk > 0 ? `+${fmt(dk)} кг` : dk === 0 && dr > 0 ? `+${dr} повт` : `+${fmt(e.growth * 100)} %`}</b>`;
  return `<div class="mex" data-act="prog" data-id="${e.id}" role="button"><div class="row between"><div class="grow">${esc(e.name)}${off}</div>${gain}</div>
    <div class="egoal"><i style="width:${p}%"></i><u style="left:${p}%"></u></div>
    <div class="etri"><div>старт<b>${setTxt(e.first)}</b></div><div>${e.isLast ? 'сейчас' : 'лучшее'}<b>${setTxt(e.best)}</b></div><div>до ур. ${e.lvl + 1}<b>${setTxt(e.next)}</b></div></div></div>`;
}
const bwGrow = (e) => `<div class="mex" data-act="prog" data-id="${e.id}" role="button"><div class="row between"><div class="grow">${esc(e.name)}</div>${e.best > e.first ? `<b class="pos">+${e.best - e.first} повт</b>` : ''}</div>
    <div class="muted small" style="margin-top:4px">Свой вес: старт ${e.first} повт, лучшее ${e.best} повт. В уровень не идёт.</div></div>`;
function screenGrow() {
  const g = Fit.gameStats(S.sessions, S.program), mp = Fit.muscleProgress(S.sessions), ms = Fit.muscleSets(S.sessions);
  const since = g.start ? `старт ${new Date(g.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })} — уровень 1` : 'начнёт расти после первой тренировки';
  const kv = (n, v) => `<div class="kv"><span>${n}</span><b>${v}</b></div>`;
  const keys = [...MUS_TOP, ...Object.keys(Fit.MUSCLE_RU).filter((m) => !MUS_TOP.includes(m))], none = keys.filter((m) => !mp[m].lvl).map((m) => Fit.MUSCLE_RU[m].toLowerCase());
  const bars = keys.filter((m) => mp[m].lvl).map((m) => { const x = mp[m], open = musOpen === m, p = pc100(x.pct);
    return `<div class="mg" data-act="mus" data-m="${m}" role="button" aria-expanded="${open}"><div class="row between"><b>${Fit.MUSCLE_RU[m]}</b><span class="small ${x.growth > 0 ? 'pos' : 'muted'}">${x.growth > 0 ? `+${fmt(x.growth * 100)} % к старту` : 'старт'}<i class="chev">${open ? '⌃' : '⌄'}</i></span></div>
      <div class="gfat"><i style="width:${p}%"></i></div>
      <div class="gleg"><span>уровень ${x.lvl}</span><b>${p} %</b><span>уровень ${x.lvl + 1}</span></div></div>${open ? `<div class="mexs">${x.ex.map(exGrow).join('')}${x.bw.map(bwGrow).join('')}</div>` : ''}`; }).join('');
  return `<h1>Прогресс</h1>
    <div class="card game"><div class="row between"><div><div class="tsub" style="margin:0">Уровень</div><div class="lvl">${g.level}</div></div><div class="ta-r tsub">${since}</div></div>
      <div style="margin-top:12px">${kv('Сила · ур. ' + g.strength.lvl, pc100(g.strength.pct) + ' % до ур. ' + (g.strength.lvl + 1))}${kv('Объём · ур. ' + g.volume.lvl, `${g.volume.fact} из ${g.volume.goal} подходов`)}${kv('Постоянство · ур. ' + g.cons.lvl, `${g.cons.fact} из ${g.cons.goal} тренировок`)}</div>
      <p class="muted small" style="margin:10px 0 0">Сила: +5 % к твоему стартовому результату — плюс уровень. Объём и постоянство — счёт этой недели; закрыл неделю — плюс уровень.</p></div>
    <h2>Мышцы</h2><div class="card">${bars ? `<p class="muted small" style="margin:0 0 4px">Нажми на мышцу — откроются её упражнения: с чего начал и сколько прибавил.</p>${bars}` : '<span class="muted">Появится после первой тренировки.</span>'}
      ${bars && none.length ? `<p class="muted small" style="margin:12px 0 0">Пока без записей: ${none.join(', ')}.</p>` : ''}</div>
    <div class="card"><h3 style="margin-bottom:12px">Мышцы за 7 дней</h3><div class="bodies big">${bodySvg('front', ms)}${bodySvg('back', ms)}</div></div>`;
}
function muscleCard() {
  const ms = Fit.muscleSets(S.sessions), top = Object.entries(ms).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const leg = top.length ? top.slice(0, 6).map(([g, n]) => `<span><i style="opacity:${heat(n)}"></i>${Fit.MUSCLE_RU[g]} <b>${fmt(n)}</b></span>`).join('') : '<span class="tsub">За 7 дней тренировок не было — схема загорится после первой.</span>';
  return `<div class="card mus" data-tab="history" role="button"><h3>Мышцы за 7 дней</h3><div class="row between"><div class="bodies">${bodySvg('front', ms)}${bodySvg('back', ms)}</div><div class="leg">${leg}</div></div></div>`;
}
const workVol = (a) => a.items.reduce((n, it) => n + it.sets.reduce((v, s) => v + (s.done ? (+setKg(it, s) || 0) * s.reps : 0), 0), 0);
// экран записи тренировки — раскладка «Log Workout» Hevy: шапка с синим «Завершить», три метрики, упражнения с таблицей подходов
function screenWorkout() {
  const a = S.active;
  const done = a.items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0), total = a.items.reduce((n, it) => n + it.sets.length, 0);
  let html = `<div class="wtop"><div class="whead"><button class="link wchat" data-act="chat" aria-label="Спросить тренера">${ico('chat')}Тренер</button><b>Тренировка ${a.day}</b><button class="link" data-act="finish">Завершить</button></div>
    <div class="wline"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>`
    + statRow([['Время', `<span id="wdur">${durMin(a.start)} мин</span>`], ['Объём', `<span id="wvol">${fmt(workVol(a))} кг</span>`], ['Подходы', done]]);
  let i = 0, ssn = 0;
  while (i < a.items.length) { // группируем соседние упражнения одного суперсета
    const g = a.items[i].group, idx = [];
    while (i < a.items.length && a.items[i].group === g) idx.push(i++);
    html += `<div class="grp${idx.length > 1 ? ' ss c' + (ssn++ % 3) : ''}">${idx.length > 1 ? '<div class="sslab">Суперсет · по подходу каждого подряд, отдых после круга</div>' : ''}${idx.map(exHtml).join('')}</div>`;
  }
  return html + `<button class="link danger wcancel" data-act="cancel">Отменить тренировку</button>`;
}
const statRow = (cells) => `<div class="wstat">${cells.map(([n, v]) => `<div><small>${n}</small><b>${v}</b></div>`).join('')}</div>`;
const TMARK = { w: 'Р', f: 'О', d: 'Д' };
const setKg = (it, s) => s.kg; // у каждого подхода свой вес: первый тяжёлый, дальше легче
const setNo = (sets, j) => TMARK[sets[j].t] || sets.slice(0, j + 1).filter((s) => s.t !== 'w').length; // буква вместо номера; разминка номер не занимает
function setCmp(it, j) { const s = it.sets[j]; return s.done && s.kg != null && s.t !== 'w' ? Fit.compareSet(it.perf, Fit.prevIndex(it.perf, it.sets, j), setKg(it, s), s.reps) : null; }
// «40×8 Р · 60×6,6,5 · 45×8 Д»: соседние подходы одного веса и типа — одной группой
function setsText(e) {
  const g = [];
  for (const s of Fit.setsOf(e)) { const l = g[g.length - 1]; if (l && l.kg === s.kg && l.t === s.t) l.reps.push(s.reps); else g.push({ kg: s.kg, t: s.t, reps: [s.reps] }); }
  return g.map((x) => `${fmt(x.kg)}×${x.reps.join(',')}${x.t ? ' ' + TMARK[x.t] : ''}`).join(' · ');
}
const restText = (sec) => ((sec >= 60 ? Math.floor(sec / 60) + ' мин ' : '') + (sec % 60 ? (sec % 60) + ' с' : '')).trim();
const linkify = (s) => String(s).split(/(https?:\/\/[^\s<]*[^\s<.,;:!?)])/).map((p, i) => (i % 2 ? `<a href="${esc(p)}" target="_blank" rel="noopener">${esc(p)}</a>` : esc(p))).join(''); // ссылка в постоянной заметке кликается (Hevy)
const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
/* app-022: суперсеты. Правила, источники и пары тренера — program.js, блок «суперсеты». Группы — S.ss[день], отказ от предложенной пары — S.ssNo. */
const ssNow = () => (S.ss || {})[S.active.day] || [];
const inSS = (it) => S.active.items.filter((x) => x.group === it.group).length > 1;
function ssSet(groups) { const a = S.active; (S.ss = S.ss || {})[a.day] = groups; a.items = Fit.ssApply(a.items, groups); save(); closeSheet(); render(); }
// пара, которую тренер предлагает для упражнения k: обе на месте, не начаты, не в суперсете, от пары не отказывались
function ssOffer(k) {
  const a = S.active, it = a.items[k], p = (Fit.SS[a.day] || []).find((x) => x[0] === Fit.ssKey(it)); if (!p) return null;
  const j = a.items.findIndex((x) => Fit.ssKey(x) === p[1]), o = a.items[j], key = p.join('+');
  if (!o || (S.ssNo || {})[a.day + ':' + key] || [it, o].some((x) => inSS(x) || x.sets.some((s) => s.done))) return null;
  return { j, o, key, min: Fit.ssSave(it, o) };
}
// ⋮ → «Добавить в суперсет» (Hevy: «+ Add To Superset» → выбрать упражнение-пару)
function openSS(k) {
  const a = S.active, it = a.items[k], w = $('#sheet');
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Суперсет с «${esc(it.name)}»</div>
    <p class="muted small" style="margin:0 0 6px">Выбери пару: по подходу каждого подряд, отдых после круга. Лучше — разные мышцы (бицепс и трицепс, перед и зад бедра).</p>
    <div class="tlist">${a.items.map((x, j) => (j === k ? '' : `<button data-ss="${j}"><b class="num">${j + 1}</b>${esc(x.name)}${inSS(x) ? ' <span class="muted small">(уже в суперсете — добавится третьим)</span>' : ''}</button>`)).join('')}</div>
    <button class="link" id="ssx">Отмена</button></div>`;
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'ssx') return closeSheet();
    const b = e.target.closest('[data-ss]'); if (!b) return;
    ssSet(Fit.ssAdd(ssNow(), Fit.ssKey(it), Fit.ssKey(a.items[+b.dataset.ss]))); toast('Суперсет собран: отдых — после круга');
  };
}
// app-022: баннер рекорда при отметке подхода (Hevy Live PR); recs — Fit.liveRecord
function prBanner(name, recs) {
  const txt = { kg: (r) => `вес ${fmt(r.now)} кг — было ${fmt(r.was)}`, e1: (r) => `расчётный максимум ${fmt(Math.round(r.now * 10) / 10)} кг — было ${fmt(Math.round(r.was * 10) / 10)}`, reps: (r) => `${r.now} ${plural(r.now, ['повтор', 'повтора', 'повторов'])} — было ${r.was}` };
  document.querySelectorAll('.prban').forEach((x) => x.remove());
  const t = document.createElement('div'); t.className = 'prban'; t.setAttribute('role', 'status');
  t.innerHTML = `<b>Рекорд</b><span>${esc(name)}</span><small>${recs.map((r) => txt[r.type](r)).join(' · ')}</small>`;
  document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
}
function exHtml(k) {
  const it = S.active.items[k], pf = it.perf, first = !pf; // first — упражнение ещё ни разу не делал: вес и повторы вписывает сам
  const rows = it.sets.map((s, j) => {
    const pi = Fit.prevIndex(pf, it.sets, j), ps = pi >= 0 ? pf.sets[pi] : null, kg = setKg(it, s);
    const cmp = setCmp(it, j);
    // цель — диапазон повторов этого подхода, как колонка Target у Boostcamp; под ней прибавка веса к прошлому разу
    const rg = Fit.counted(s) ? Fit.rangeOf(it, it.sets.slice(0, j).filter(Fit.counted).length) : null;
    const plus = rg && ps && kg > ps.kg ? `<small>+${fmt(kg - ps.kg)} кг</small>` : '';
    const badge = cmp === 'pr' ? '<small class="pr">рекорд</small>' : cmp === 'up' ? '<small class="pos">↑ лучше</small>' : '';
    return `<div class="set${s.done ? ' done' : ''}">
    <button class="num t-${s.t || 'n'}" data-act="stype" data-k="${k}" data-j="${j}" aria-label="Тип подхода">${setNo(it.sets, j)}</button>
    <div class="prev">${ps ? `${fmt(ps.kg)} кг × ${ps.reps}` : '—'}${badge}</div>
    <div class="tg">${s.mx ? 'макс' : rg ? rg.join('–') : '—'}${plus}</div>
    <input class="cell" data-sk="${k}" data-j="${j}" type="text" inputmode="decimal" autocomplete="off" value="${kg == null ? '' : fmt(kg)}" placeholder="кг" aria-label="Вес, кг">
    <input class="cell" data-sr="${k}" data-j="${j}" type="text" inputmode="numeric" autocomplete="off" value="${(s.mx || first) && !s.done && !s.touched ? '' : s.reps}" placeholder="${s.mx ? '?' : first && rg ? rg[1] : ''}" aria-label="Повторы">
    <button class="chk" data-act="tick" data-k="${k}" data-j="${j}" aria-label="Готово"><i>${ico('check')}</i></button></div>`; }).join('');
  // заметки как у Hevy (features/exercise-notes): постоянная показывается каждый раз и тут не правится, под ней — заметка этой тренировки.
  // Заметка прошлого раза — серой и один раз (справка Hevy 34463684392983: «this note will be visible, but will be greyed out … you can write
  // a new workout note over it. Once the workout is saved, the greyed-out note will be deleted»): начал писать свою — серая прячется, в запись не идёт
  const ln = it.perf && it.perf.note;
  const rn = (S.notes || {})[it.id];
  // тренер: цель под названием, замер и застой — плашками; сброс предлагается, сам не применяется
  const gi = goalInfo(it.id, Fit.exLog(S.sessions, it.name)), canReset = it.sets.some((s) => Fit.counted(s) && !s.done && s.kg > 0);
  const off = ssOffer(k);
  const pickB = first && Fit.EQ[it.id] && it.sets.every((x) => !x.done) ? `<button data-act="pickw" data-k="${k}">Подобрать вес по тому, что уже делал</button>` : '';
  // первый раз, рабочий вес неизвестен (версия 56, research/warmup-first-time-1510.md): лесенка RP Hypertrophy (справка «How should I warm up and
  // select a starting weight?»): первое упражнение — 30RM×12, 20RM×8, 10RM×4, минута отдыха; остальные — только 8 и 4 или одно 4. Запас — как у «Подобрать вес»
  const rg0 = Fit.rangeOf(it, 0), res0 = introNow() ? '3–5' : '1–2', workT = `рабочий подход: ${rg0.join('–')} повторов, и чтобы ещё ${res0} оставалось в запасе — впиши этот вес. Второй и третий приложение сделает на 10 % легче.`;
  const firstHint = !first ? '' : k === 0 ? `<div class="cban fh"><b>Первый раз</b>Рабочий вес пока неизвестен — найди его лесенкой, так советует приложение RP Hypertrophy. 1) Вес, который поднял бы раз 30, — сделай 12 повторов, минута отдыха. 2) Вес раз на 20 — 8 повторов, минута. 3) Вес раз на 10 — 4 повтора, минута. Это разминка, не до усталости, вес на глаз. 4) Дальше ${workT} Со следующей тренировки разминку приложение ставит само.${pickB}</div>` : `<div class="cban fh"><b>Первый раз</b>Ты уже разогрет — лесенка короче (RP Hypertrophy): вес раз на 20 — 8 повторов, вес раз на 10 — 4 повтора; чувствуешь, что разогрет, — хватит одного на 4. Дальше ${workT}${pickB}</div>`;
  const coach = (gi ? `<div class="cgoal" data-act="prog" data-id="${it.id}">Цель ${fmt(gi.g.kg)} кг к ${dshort(gi.g.by)} · сейчас ${fmt(gi.e1)} · <span class="${gi.cls}">${gi.pace}</span></div>` : '')
    + firstHint + (it.sets.some((x) => !x.done) ? `<div class="eff" data-act="effhelp" role="button"><b>Как тяжело</b>${Fit.effort(it, introNow())}${it.test ? ' Это на все подходы, кроме последнего «О» — он на максимум.' : ' Это на каждый подход.'} <u>подробнее</u></div>` : '')
    + (SAFE[it.id] && it.sets.some((x) => !x.done) ? `<div class="cban fh"><b>Осторожно</b>${esc(SAFE[it.id])}</div>` : '')
    + (it.test ? '<div class="cban"><b>Проверка силы</b>Первые подходы делай как обычно. Последний (строка «О») — сколько сможешь: делай, пока получается ровно, без рывков. Потом впиши, сколько вышло.</div>' : '')
    + (it.ci ? `<div class="cban ci"><b>${it.ci.e ? (it.ci.m === 'deload' ? 'Легче' : 'Без прибавки') : 'Замер перенесён'}</b>${it.ci.e ? (it.ci.m === 'deload' ? 'Вес ниже планового примерно на 10 % — до шага снаряда' : 'Вес как в прошлый раз, прибавка подождёт') + ': ' : ''}${ciWhy(it.ci)}.${it.ci.e && it.ci.test ? ' Замер перенесён.' : ''}${it.ci.e ? ' Сил больше — поправь вес сам.' : ''}</div>` : '')
    + (off ? `<div class="cban"><b>Суперсет</b>Можно делать в паре с «${esc(off.o.name)}»: подход этого упражнения — сразу подход того — потом отдых. Подходы те же, тренировка короче примерно на ${fmt(off.min)} мин, по ощущению тяжелее.<div class="row"><button data-act="ss-yes" data-k="${k}" data-j="${off.j}">Объединить</button><button data-act="ss-no" data-p="${off.key}">Не надо</button></div></div>` : '')
    + (it.dl ? '<div class="cban"><b>Разгрузка</b>Подходов вдвое меньше, вес примерно на 10 % ниже. Заканчивай с запасом: сегодня восстанавливаемся.</div>' : '')
    + (it.added ? '<div class="cban"><b>Добавлен подход</b>Теперь на один подход больше. Если вес не пойдёт и дальше — предложим снизить его на 10 %.</div>' : '')
    + (it.stall && it.sadd ? `<div class="cban st"><b>Вес не растёт</b>Уже ${Fit.STALL_SESSIONS} тренировки подряд ни веса, ни повторов не прибавилось. На эту мышцу в неделю стоит меньше ${Fit.STALL_ADD_MAX} подходов — дай ей ещё один (отдача падает около 18–20 в неделю, ACSM 2026). Добавить подход?<div class="row"><button data-act="sadd-yes" data-k="${k}">Добавить</button><button data-act="sadd-no" data-k="${k}">Нет</button></div></div>` : '')
    + (it.stall && !it.sadd ? `<div class="cban st"><b>Вес не растёт</b>Уже ${Fit.STALL_SESSIONS} тренировки подряд ни веса, ни повторов не прибавилось.${canReset ? ` Сними 10 % веса — и снова пойдёшь вверх.<button data-act="deload" data-k="${k}">Сбросить на 10 %</button>` : ''}</div>` : '');
  return `<div class="ex"><div class="exh"><div class="exn" data-act="prog" data-id="${it.id}">${esc(it.name)}</div><button class="more q" data-act="tech" data-k="${k}" aria-label="Техника">?</button><button class="more" data-act="exmenu" data-k="${k}" aria-label="Меню упражнения">${ico('more')}</button></div>
    ${rn ? `<div class="rnote">${linkify(rn)}</div>` : ''}${ln ? `<div class="lnote"${it.note ? ' hidden' : ''}>${esc(ln)}</div>` : ''}<textarea class="xnote" data-xn="${k}" rows="1" placeholder="Добавить заметку…" aria-label="Заметка к этой тренировке">${esc(it.note || '')}</textarea>
    ${coach}<div class="exrest">${ico('clock')}Отдых: ${restText(it.restSec)}</div>
    <div class="shead"><span>СЕТ</span><span>БЫЛО</span><span>ЦЕЛЬ</span><span>КГ</span><span>ПОВТ</span><span></span></div>${rows}
    <button class="addset" data-act="addset" data-k="${k}">+ Подход</button></div>`;
}
function screenSummary() {
  const rows = summary.sum.map((s) => `<div class="kv"><div class="grow"><div>${esc(s.name)}${s.prs ? ' <b class="pr small">рекорд</b>' : ''}</div><div class="muted small">${s.text}</div>${s.goal ? `<div class="small cgl">${s.goal}</div>` : ''}</div>
    <div style="text-align:right;white-space:nowrap"><div class="${s.ups.length && !s.easy ? 'pos' : 'muted'}">${s.ups.length ? (s.easy ? 'дальше ' : '↑ ') + s.ups.map(fmt).join(' / ') + ' кг' : 'тот же вес'}</div>
    <div class="muted small">e1ПМ ${fmt(s.e1)}${s.delta != null ? ` (<span class="${s.delta >= 0 ? 'pos' : 'neg'}">${s.delta >= 0 ? '+' : ''}${fmt(s.delta)}</span>)` : ''}</div></div></div>`).join('');
  return `<h1>Готово</h1><div class="card"><div class="muted small">Тренировка ${summary.day} сохранена. Следующая: ${Fit.nextDay(S.sessions)}</div>${summary.empty ? '' : statRow([['Время', summary.dur + ' мин'], ['Объём', fmt(summary.volume) + ' кг'], ['Подходы', summary.sets], ['Рекорды', summary.prs]])}${summary.empty ? '<p>Ни одного сета не отмечено — ничего не записано.</p>' : rows}</div>
    <button class="primary" data-act="summary-ok">Ок</button>`;
}
function spark(vals) {
  if (vals.length < 2) return '<svg class="spark"></svg>';
  const min = Math.min(...vals), max = Math.max(...vals), w = 84, h = 26, r = max - min || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - min) / r) * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="#1f9bf0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function screenHistory() {
  // строка упражнения: расчётный 1ПМ (у своего веса — повторы), цель; тап — экран упражнения
  const sp = Fit.ORDER.flatMap((d) => S.program[d]).map((x) => {
    const l = Fit.exLog(S.sessions, x.name); if (!l.length) return '';
    const bw = !l.some((p) => p.e1 > 0), vals = l.map((p) => (bw ? p.reps : p.e1)), gi = goalInfo(x.id, l);
    return `<div class="kv" data-act="prog" data-id="${x.id}" role="button" style="align-items:center"><div class="grow">${esc(x.name)}${gi ? `<div class="muted small">цель ${fmt(gi.g.kg)} кг · <span class="${gi.cls}">${gi.pace}</span></div>` : ''}</div>
      <div class="muted small" style="margin-right:10px;white-space:nowrap">${bw ? vals[vals.length - 1] + ' повт' : fmt(vals[vals.length - 1]) + ' кг'}</div>${spark(vals)}</div>`; }).join('');
  const list = [...S.sessions].reverse().map((s) => `<div class="card"><div class="row between"><b>Тренировка ${s.day}</b><span class="muted small">${new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}${s.dur ? ' · ' + s.dur + ' мин' : ''} · ${fmt(Fit.sessionVolume(s))} кг</span></div>
    ${s.exercises.map((e) => `<div class="muted small" style="margin-top:4px">${esc(e.name)}: ${setsText(e)}</div>${e.note ? `<div class="hnote">${esc(e.note)}</div>` : ''}`).join('')}</div>`).join('');
  // app-019: подходы на мышцу за 7 дней против нормы 10–20 (Schoenfeld 2017; r4). Шкала до 25, зелёная зона 10–20, засечка — план программы
  const vol = Fit.muscleWeek(S.sessions, Date.now(), S.program), any = vol.some((g) => g.fact > 0), MAX = 25, px = (n) => Math.min(100, Math.round((n / MAX) * 100));
  const vrows = vol.map((g) => `<div class="vrow"><div class="vname">${g.name}</div><div class="vbar"><i class="zone" style="left:${px(g.lo)}%;width:${px(g.hi) - px(g.lo)}%"></i><i class="fill ${g.status}" style="width:${px(g.fact)}%"></i>${g.plan ? `<i class="tick" style="left:${px(g.plan)}%" title="план ${fmt(g.plan)}"></i>` : ''}</div><b class="vnum ${g.status}">${fmt(g.fact)}</b></div>`).join('');
  const lowMiss = vol.filter((g) => g.status === 'low' && g.fact > 0 && g.fact < g.plan - 0.5).map((g) => g.name.toLowerCase()), lowPlan = vol.filter((g) => g.status === 'low' && g.plan > 0 && g.plan < g.lo).map((g) => `${g.name.toLowerCase()} ${fmt(g.plan)}`), high = vol.filter((g) => g.status === 'high').map((g) => g.name.toLowerCase());
  const vnote = !any ? 'Появится после первой тренировки. Норма — 10–20 рабочих подходов на мышцу в неделю.'
    : high.length ? `Больше 20: ${high.join(', ')} — лишнее не растит, а копит усталость.`
    : lowMiss.length ? `Меньше плана: ${lowMiss.join(', ')} — пропущен день или подходы не отмечены.`
    : lowPlan.length ? `Программа даёт меньше 10 на ${lowPlan.join(', ')} — так задумано на старте блока; поднять объём можно подходом или упражнением.` : 'Все группы в норме 10–20.';
  const adv = Fit.volumeAdvice(S.sessions, S.program), advHtml = adv.map((g) => `<div class="row between vadv"><div class="grow"><b>${g.name}: пора +1 подход</b><div class="muted small">${g.exs.map((e) => esc(e.name)).join(', ')} — два раза подряд все повторы у верха. Сил на это хватало — жми +1; еле уходишь из зала — оставь.</div></div><button class="ghost" data-act="volplus" data-ids="${g.exs.map((e) => e.day + ':' + e.i).join(',')}">+1</button></div>`).join('');
  const vcard = `<div class="card vol"><div class="row between"><h3>Подходы на мышцу · 7 дней</h3><span class="muted small">норма 10–20</span></div>${vrows}${advHtml}<p class="muted small vnote">${vnote} Чёрточка на полосе — сколько подходов на эту мышцу стоит в программе за неделю (дни A, B и C вместе).</p></div>`;
  return `<h1>История</h1>${vcard}
    <h2>Прогресс по упражнениям</h2><div class="card">${sp || '<span class="muted">Появится после первой тренировки. Тап по упражнению — график, рекорды и цель.</span>'}</div>
    <h2>Тренировки</h2>${list || '<p class="muted">Пока пусто.</p>'}`;
}
/* ---------- питание (логика — food.js) ---------- */
let REF = [];
fetch('food_ru.json').then((r) => r.json()).then((j) => { REF = Food.prep(j.items || []); }).catch(() => {});
const food = { mode: 'eat', text: '', busy: '', photo: null, ans: '', plan: null, q: '', off: null, obusy: 0 };
const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
const spend = () => Coach.fromState(S, Fit.targets(S.profile).base, Fit.dstr(Date.now())); // адаптивный расход (coach.js)
const tdeeNow = () => { const e = spend(); return e.measured && !e.calibrating ? Math.round(e.current / 10) * 10 : null; };
const ctx = () => Food.context(S, Fit, Date.now(), tdeeNow());

function screenFood() {
  const c = ctx(), t = c.tot, pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
  const plK = t.pKcal ? ` <span style="color:var(--amber)">+${t.pKcal} план</span>` : '', plP = t.pProtein ? ` <span style="color:var(--amber)">+${fmt(t.pProtein)} план</span>` : '';
  const today = Fit.dstr(Date.now());
  const meals = S.meals.map((m, i) => ({ m, i })).filter((x) => x.m.date === today);
  let html = `<h1>Питание</h1><div class="card">
    <div class="row between"><span>Калории <span class="muted small">примерно</span></span><b>≈ ${t.kcal} / ${c.goalKcal}${plK}</b></div>
    <div class="bar" style="margin:6px 0 14px"><i style="width:${pct(t.kcal, c.goalKcal)}%"></i><i class="plan" style="width:${Math.min(100 - pct(t.kcal, c.goalKcal), pct(t.pKcal, c.goalKcal))}%"></i></div>
    <div class="row between"><span>Белок</span><b>${fmt(t.protein)} / ${c.goalProtein} г${plP}</b></div>
    <div class="bar" style="margin:6px 0 2px"><i style="width:${pct(t.protein, c.goalProtein)}%"></i><i class="plan" style="width:${Math.min(100 - pct(t.protein, c.goalProtein), pct(t.pProtein, c.goalProtein))}%"></i></div>
    <p class="muted small" style="margin:8px 0 0">Белок на глаз: 2 ладони мяса, рыбы или творога за раз, 3–4 раза в день. Калории даже при подсчёте ошибаются на 20–35 % — главное белок и вес раз в неделю.</p></div>`;
  html += `<div class="card fsr"><div class="row"><input id="fq" class="grow" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" placeholder="Продукт или штрихкод" value="${esc(food.q)}" aria-label="Поиск продукта">
    <button class="ghost" data-act="fscan" aria-label="Сфоткать штрихкод" ${food.obusy ? 'disabled' : ''}>${ico('barcode')}</button></div>
    <input id="fbc" type="file" accept="image/*" capture="environment" hidden><div id="fres">${foodResults()}</div></div>`;
  if (localStorage.getItem('fit.photo')) html += `<button class="primary" data-act="shoot" ${food.busy ? 'disabled' : ''}>${ico('camera').replace('class="ico"', 'class="ico" style="display:inline;vertical-align:-5px;margin-right:8px"')}Сфоткать еду</button>
    <input id="fph" type="file" accept="image/*" capture="environment" hidden>`;
  if (food.busy) html += `<div class="card row" style="margin-top:12px"><div class="spin"></div><span>${esc(food.busy)}</span></div>`;
  if (food.err && !food.busy) html += `<div class="card" style="margin-top:12px;border:1px solid #c33"><b>Не вышло:</b> ${esc(food.err)}<div class="muted small" style="margin-top:6px">429 — лимит ключа, подожди и повтори · 403 — включи VPN · нет ключа — «Я» → Настройки</div></div>`;
  if (food.photo) html += photoCard();
  html += `<div class="card" style="margin-top:12px"><div class="seg" style="margin-bottom:10px">${[['eat', 'Что съел'], ['ask', 'Вопрос'], ['plan', 'Дома есть…']].map(([k, n]) => `<button data-act="fmode" data-v="${k}" class="${food.mode === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <textarea id="ftxt" placeholder="${food.mode === 'plan' ? 'гречка, куриная грудка, яйца, творог' : food.mode === 'eat' ? 'две котлеты, тарелка гречки, скуп протеина' : 'Сколько белка добрать до вечера?'}">${esc(food.text)}</textarea>
    <p class="muted small" style="margin:6px 0 10px">${food.mode === 'eat' ? 'Голосом: нажми в поле, потом микрофон на клавиатуре и скажи, что съел и сколько. Граммы потом можно поправить.' : 'Голосом — микрофон на клавиатуре iOS. Текст «Дома есть: …» сам включит план.'}</p>
    <button class="primary" data-act="fsend" style="min-height:48px;font-size:17px" ${food.busy ? 'disabled' : ''}>Отправить</button></div>`;
  if (food.ans) html += `<div class="card"><div class="muted small">Тренер</div><div class="ans" style="margin-top:6px">${esc(food.ans)}</div></div>`;
  if (food.plan) html += planCards();
  if (meals.length) html += `<h2>Записано сегодня</h2><div class="card">${meals.map(({ m, i }) => `<div class="kv" style="align-items:center"><div class="grow"><div>${m.planned ? '<span style="color:var(--amber)">план</span> ' : ''}${esc(m.title || m.items.map((x) => x.name).join(', '))}</div>
      <div class="muted small">${m.total.kcal} ккал · ${fmt(m.total.protein)} г белка</div></div><button class="ghost danger" data-act="mdel" data-i="${i}" aria-label="Удалить" style="min-height:44px">✕</button></div>`).join('')}</div>`;
  if (!localStorage.getItem(GROQ)) html += '<p class="muted small" style="padding:0 4px">Поиск продукта работает без ключа. Для фото и вопросов нужен ключ ИИ (OpenRouter или Groq) — вкладка «Я», «Настройки».</p>';
  return html;
}
function photoCard() {
  const p = food.photo, tot = Food.totalOf(p.items);
  const rows = p.items.map((it, i) => `<div class="n" style="text-align:left;min-width:0">${esc(it.name)}<div class="muted small">${it.ref ? 'по базе: ' + esc(it.ref) : 'оценка ИИ'}</div></div><input data-fg="${i}" type="text" inputmode="decimal" value="${it.grams || ''}" placeholder="г" aria-label="Граммы, ${esc(it.name)}">
    <div class="n" data-fk="${i}">${it.kcal}</div><div class="n" data-fp="${i}">${fmt(it.protein)}</div>`).join('');
  const conf = { low: 'низкая', mid: 'средняя', high: 'высокая' }[p.confidence] || p.confidence || '—';
  return `<div class="card" style="margin-top:12px"><div class="row between"><b>${p.manual ? 'Записать еду' : p.src === 'text' ? 'Что съел' : 'Что на фото'}</b>${p.manual ? '' : `<span class="muted small">уверенность: ${esc(conf)}</span>`}</div>
    ${p.items.length ? `<div class="ftab" style="margin-top:10px"><span class="h">Продукт</span><span class="h n">Грамм</span><span class="h n">ккал</span><span class="h n">Белок</span>${rows}</div>
    <div class="kv" style="margin-top:10px"><b>Итого</b><b id="ftot">${tot.kcal} ккал · ${fmt(tot.protein)} г белка</b></div>` : '<p class="muted">Еда не найдена.</p>'}
    ${p.note ? `<p class="muted small" style="margin:8px 0 0">${esc(p.note)}</p>` : ''}
    <div class="row" style="margin-top:12px">${p.items.length ? '<button class="primary green grow" data-act="msave" style="min-height:48px;font-size:17px">Записать</button>' : ''}<button class="ghost" data-act="mdrop">Закрыть</button></div></div>`;
}
function planCards() {
  const pl = food.plan;
  return `<h2>План на день</h2>` + pl.meals.map((m) => `<div class="card"><div class="row between"><div><span class="tm" style="color:var(--blue);font-weight:700">${esc(m.time)}</span><b>${esc(m.title)}</b></div>
      <span class="muted small">${m.total.kcal} ккал · ${fmt(m.total.protein)} г</span></div>
      <div style="margin-top:6px">${m.items.map((i) => `<div class="kv"><span>${esc(i.name)}</span><span class="muted">${i.grams} г</span></div>`).join('')}</div>
      ${m.how ? `<p class="muted small" style="margin:8px 0 0">${esc(m.how)}</p>` : ''}</div>`).join('')
    + (pl.missing ? `<p class="muted small" style="padding:0 4px">Докупить: ${esc(pl.missing)}</p>` : '')
    + `<div class="row"><button class="grow" data-act="pshare">Отправить подруге</button><button class="primary green grow" data-act="psave" style="min-height:44px;font-size:16px;width:auto">Записать план</button></div>`;
}
/* поиск продукта без ИИ (поток MyFitnessPal: поиск → количество → запись): своя база USDA, затем Open Food Facts по кнопке */
function foodResults() {
  const q = food.q.trim(); if (!q) return '';
  const bc = Food.isBarcode(q), loc = bc ? [] : Food.search(q, REF, 8);
  const row = (act, i, name, sub, kcal, prot) => `<div class="kv fr" data-act="${act}" data-i="${i}" role="button"><div class="grow"><div>${esc(name)}</div>${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}</div>
    <div class="muted small fr100">${Math.round(kcal)} ккал · ${fmt(prot)} г<br>на 100 г</div></div>`;
  let h = loc.map((r) => row('fpick', REF.indexOf(r), r.name, '', r.kcal, r.protein)).join('');
  if (food.obusy) h += '<div class="row" style="margin-top:12px"><div class="spin"></div><span>Ищу в Open Food Facts…</span></div>';
  else if (food.off) h += food.off.length ? food.off.map((it, i) => row('fopick', i, it.name, it.ref, it.k100, it.p100)).join('') : '<p class="muted small" style="margin:12px 0 0">В Open Food Facts такого нет или у товара не заполнены калории.</p>';
  else if (bc || q.length >= 3) h += `<button class="ghost foff" data-act="foff">${bc ? 'Найти штрихкод' : loc.length ? 'Нет в списке — искать' : 'В базе нет — искать'} в Open Food Facts</button>`;
  return h;
}
const drawRes = () => { const r = $('#fres'); if (r) r.innerHTML = foodResults(); };
function foodAdd(it, grams) { // строка поиска → черновик (тот же, что после фото); граммы не подставляем, если их нет на упаковке
  if (!food.photo) food.photo = { items: [], manual: true, note: '' };
  food.photo.items.push(Food.recalc(it, grams)); food.q = ''; food.off = null; render();
  const g = $('#view').querySelector(`[data-fg="${food.photo.items.length - 1}"]`); if (g) { g.focus(); g.select(); }
}
const OFFC = 'fit.off';
async function offJson(url, tries = 2) { // поиск OFF отдаёт 503 через раз (замер 13.10: 5 из 13, без CORS-заголовка) — одна повторная попытка; 404 = «нет такого товара», тело — JSON
  for (let i = 1; ; i++) {
    try { const r = await fetch(url); if (r.ok || r.status === 404) return await r.json(); throw new Error('OFF ' + r.status); }
    catch (e) { if (i >= tries) throw e; await new Promise((ok) => setTimeout(ok, 1200)); }
  }
}
async function offProduct(code) { // найденный товар остаётся в телефоне: второй раз — без сети
  let c = {}; try { c = JSON.parse(localStorage.getItem(OFFC)) || {}; } catch (e) { /* кэша нет */ }
  if (c[code]) return c[code];
  const j = await offJson(Food.offUrl(code)), it = j.status === 1 ? Food.offItem(j.product) : null;
  if (it) { c[code] = it; const ks = Object.keys(c); if (ks.length > 200) delete c[ks[0]]; try { localStorage.setItem(OFFC, JSON.stringify(c)); } catch (e) { /* места нет */ } }
  return it;
}
async function foodOff() {
  const q = food.q.trim(); if (!q || food.obusy) return;
  food.obusy = 1; food.off = null; drawRes();
  try {
    if (Food.isBarcode(q)) food.off = [await offProduct(q)].filter(Boolean);
    else food.off = ((await offJson(Food.offSearchUrl(q))).products || []).map(Food.offItem).filter(Boolean);
  } catch (e) { food.off = null; toast('Open Food Facts не ответил — попробуй позже'); }
  food.obusy = 0; if (food.q.trim() !== q) food.off = null;
  drawRes();
}
let bcLib = null;
function barcodeLib() { // в Safari на iOS BarcodeDetector только за флажком — при первом скане подгружаем barcode-detector + zxing-wasm (MIT)
  if (!bcLib) bcLib = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/barcode.js';
    s.onload = () => { BarcodeDetectionAPI.prepareZXingModule({ overrides: { locateFile: (p) => 'vendor/' + p } }); res(BarcodeDetectionAPI.BarcodeDetector); };
    s.onerror = () => { bcLib = null; rej(new Error('нет библиотеки')); }; document.head.appendChild(s);
  });
  return bcLib;
}
async function foodScan(file) { // фото штрихкода → цифры → Open Food Facts
  food.obusy = 1; food.off = null; food.q = ''; render();
  let code = '';
  try {
    const BD = await barcodeLib(), img = await createImageBitmap(file);
    const found = await new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(img);
    if (found.length) code = found[0].rawValue; else toast('Штрихкод не разобрал — сними ближе и ровнее или впиши цифры в поиск');
  } catch (e) { toast('Сканер не запустился — впиши цифры штрихкода в поиск'); }
  food.obusy = 0; food.q = code; render(); if (code) foodOff();
}
function resizeImg(file, max = 1024) { // макс. сторона 1024, JPEG 0.7
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.7));
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Не открылось фото')); };
    im.src = u;
  });
}
async function groqCall(messages) {
  try { return await Food.groq(localStorage.getItem(GROQ) || '', messages); }
  catch (e) {
    food.err = e.message || 'Ошибка запроса'; toast(food.err);
    if (e.code === 'nokey' || e.code === '401') { tab = 'me'; view = null; render(); setTimeout(() => { const g = $('#gk'); if (g) g.focus(); }, 50); }
    return null;
  }
}
async function foodPhoto(file) {
  if (!localStorage.getItem(GROQ)) return groqCall([]); // тост + переход в настройки
  food.busy = 'Смотрю на фото…'; food.photo = null; food.err = ''; render();
  try {
    const url = await resizeImg(file), c = ctx();
    const out = await groqCall([{ role: 'system', content: Food.systemPrompt(c, REF, 'photo') }, ...Food.userImage(Food.PHOTO_Q, url)]);
    if (out != null) {
      const j = Food.parseJSON(out);
      food.photo = { items: (j.items || []).map((i) => Food.makeItem(i, REF)), confidence: j.confidence, note: j.note || '' };
    }
  } catch (e) { toast(e.message === 'Не открылось фото' ? e.message : 'Не разобрал ответ модели — попробуй ещё раз'); }
  food.busy = ''; render();
}
async function foodSend() {
  const text = food.text.trim(); if (!text) return;
  if (!localStorage.getItem(GROQ)) return groqCall([]);
  const mode = Food.isPlanText(text) ? 'plan' : food.mode; food.mode = mode;
  food.busy = mode === 'plan' ? 'Составляю план…' : mode === 'eat' ? 'Считаю…' : 'Думаю…'; food.err = ''; render();
  try {
    const c = ctx();
    if (mode === 'eat') { // версия 58: «что съел» словами — тот же разбор и карточка, что у фото
      const out = await groqCall([{ role: 'system', content: Food.systemPrompt(c, REF, 'photo') }, { role: 'user', content: Food.eatQ(text) }]);
      if (out != null) { const j = Food.parseJSON(out); food.photo = { src: 'text', items: (j.items || []).map((i) => Food.makeItem(i, REF)), confidence: j.confidence, note: j.note || '' }; food.text = ''; }
      food.busy = ''; render(); const ft = document.querySelector('.ftab'); if (ft) ft.scrollIntoView({ block: 'center' }); return;
    }
    const out = await groqCall([{ role: 'system', content: Food.systemPrompt(c, REF, mode) }, { role: 'user', content: mode === 'plan' ? Food.planQ(c, text) : text }]);
    if (out != null) {
      if (mode === 'plan') { const j = Food.parseJSON(out); food.plan = { meals: (j.meals || []).map((m) => Food.planMeal(m, REF)), missing: j.missing || '' }; food.ans = ''; }
      else { food.ans = out.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); food.plan = null; }
    }
  } catch (e) { toast('Не разобрал ответ модели — попробуй ещё раз'); }
  food.busy = ''; render();
}
function addMeals(list) { S.meals.push(...list); save(); }
async function sharePlan() {
  const text = Food.shareText(food.plan);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Скопировано — вставь в чат'); } catch (e) { toast('Не удалось скопировать'); }
}

function screenMe() {
  const p = S.profile, ex = spend(), td = tdeeNow(), t = Fit.targets(p, td), ws = Fit.weightStats(S.weights), today = Fit.dstr(Date.now()), h = S.habits[today] || {};
  const pct = ws.pct == null ? '—' : (ws.pct > 0 ? '+' : '') + fmt(ws.pct).replace(',', ',') + ' %';
  const key = localStorage.getItem(GROQ) || '', bs = bkStatus();
  return `<h1>Я</h1>
    <h2>Вес</h2><div class="card"><div class="muted small" style="margin-bottom:8px">Раз в неделю, утром, до еды. Цель — плюс ${fmtP(Fit.GAIN_LO)}–${fmtP(Fit.GAIN_HI)} % в неделю: ${(() => { const g = Fit.gainKg(ws.avg || +p.weight); return Math.round(g.lo * 1000) + '–' + Math.round(g.hi * 1000); })()} г (Iraki 2019).</div><div class="row"><input id="wnow" type="text" inputmode="decimal" placeholder="кг, утром" autocomplete="off"><button class="chip" data-act="wsave">Записать</button></div>
      <div class="kv" style="margin-top:12px"><span>Среднее за 7 дней</span><b>${ws.avg == null ? '—' : fmt(ws.avg) + ' кг'}</b></div>
      <div class="kv"><span>Изменение за неделю</span><b>${pct}</b></div>
      <div class="kv"><span>Тренд веса</span><b>${ex.trendKg == null ? '—' : fmt(ex.trendKg) + ' кг'}</b></div>
      <div class="kv"><span>Расход</span><b>${td ? td + ' ккал' : `калибровка ${Math.min(ex.dataDays, Coach.MIN_DAYS_TO_TRUST)}/${Coach.MIN_DAYS_TO_TRUST} дн.`}</b></div>
      <div class="muted small">${td ? 'Измерен: съеденное минус изменение тренда веса × 7700 ккал/кг, окно 14 дней.' : 'Расход измеряется по еде и весу: нужно 14 дней с записанной едой и вес минимум 2 раза за 2 недели. До этого цель — по формуле.'}</div></div>
    ${ws.warn === 'cut' ? '<div class="card warn">Набор быстрее +0,5 %/нед — режь 200 ккал.</div>' : ''}${ws.warn === 'add' ? '<div class="card warn">Вес не растёт 2 недели — добавь 200 ккал.</div>' : ''}
    ${measureCard()}
    <h2>Цели на день</h2><div class="card"><div class="kv"><span>Калории</span><b>${t.kcalLo}–${t.kcalHi}</b></div><div class="muted small">${td ? 'измеренный расход ' + t.base : fmt(p.weight) + ' кг × 33 = ' + t.base} ккал, +10–15 %</div>
      <div class="kv"><span>Белок</span><b>${t.protein} г</b></div><div class="muted small">1,8 г/кг; норма 1,6–2,2 г/кг = ${t.proteinLo}–${t.proteinHi} г (Morton 2018). На глаз — 2 ладони за раз, 3–4 раза в день. Протеин считай тоже: «скуп протеина» в «Что съел».</div><div class="kv"><span>Креатин</span><b>5 г</b></div><div class="kv"><span>Сон</span><b>≥ 7 ч</b></div></div>
    <h2>Привычки сегодня</h2><div class="card">${[['protein', 'Белок в норме'], ['creatine', 'Креатин 5 г'], ['sleep', 'Сон ≥ 7 ч']].map(([k, n]) => `<label class="habit" style="margin:0;color:var(--ink);font-size:16px"><input type="checkbox" data-hab="${k}" ${h[k] ? 'checked' : ''}>${n}</label>`).join('')}</div>
    <h2>Профиль</h2><div class="card">
      ${[['weight', 'Вес, кг'], ['height', 'Рост, см'], ['age', 'Возраст']].map(([k, n]) => `<label for="p-${k}">${n}</label><input id="p-${k}" data-prof="${k}" type="text" inputmode="decimal" value="${esc(p[k])}">`).join('')}
      <label for="p-back">Вернулся в зал после перерыва — с какого дня</label><input id="p-back" type="date" value="${esc(p.back || '')}"><p class="muted small" style="margin:6px 4px 0">${introNow() ? `Идут первые две недели, осталось ${introNow().left} дн.: приложение просит брать вес полегче.` : 'Не было перерыва — оставь пустым. Если был: две недели с этого дня приложение просит брать вес полегче и не ставит проверку силы.'}</p></div>
    <h2>Настройки</h2><div class="card"><label for="gk" style="margin-top:0">Ключ ИИ (хранится только на телефоне): OpenRouter sk-or-… или Groq gsk_…</label><input id="gk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" value="${esc(key)}" placeholder="sk-or-… / gsk_…"><p class="muted small" style="margin:6px 4px 0">Сейчас: ${key ? esc(Food.provider(key).name + ' - ' + Food.provider(key).model) : 'ключа нет'}</p>
      <div class="row" style="margin-top:12px"><button class="grow" data-act="export">Экспорт</button><button class="grow" data-act="import">Импорт</button></div><p class="muted small" style="margin:6px 4px 0">Экспорт → AirDrop на Мак: разбор тренировок и чата с тренером.</p>
      <label for="bk" style="margin-top:14px">Автокопия: ключ GitHub (хранится только на телефоне)</label><input id="bk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" value="${esc(bkKey())}" placeholder="github_pat_…"><p class="${bs.warn ? 'neg' : 'muted'} small" id="bkst" style="margin:6px 4px 0">${esc(bs.text)}</p>
      <p class="muted small" style="margin:6px 4px 0">С ключом копия сама уходит в твой закрытый репозиторий fit-data: после каждой тренировки и раз в сутки при открытии.</p>
      ${bkKey() ? '<div class="row" style="margin-top:10px"><button class="grow" data-act="bk-now">Скопировать</button><button class="grow" data-act="bk-restore">Восстановить</button></div>' : ''}
      <label class="habit" style="margin:12px 0 0;color:var(--ink);font-size:16px"><input type="checkbox" data-opt="ci" ${S.ciOff ? '' : 'checked'}>Чек-ин перед тренировкой</label><p class="muted small" style="margin:6px 4px 0">Вопрос «как ты сегодня» на кнопке «Начать»: готовность, сон, что болит. В плохой день вес без прибавки или −10 %.</p>
      <input id="imp" type="file" accept="application/json,.json" hidden></div>`;
}

/* ---------- автокопия на GitHub (карта 7.2; логика и образец — backup.js) ---------- */
const bkKey = () => localStorage.getItem(BK) || '';
const bkMeta = () => { try { return JSON.parse(localStorage.getItem(BKM)) || {}; } catch (e) { return {}; } };
const bkText = () => JSON.stringify(S, null, 1);
const bkStatus = () => Backup.status(!!bkKey(), bkMeta(), bkKey() ? bkText() : '');
function bkSetKey(v) { v = String(v || '').trim(); if (v === bkKey()) return; if (v) localStorage.setItem(BK, v); else localStorage.removeItem(BK); const m = bkMeta(); delete m.err; delete m.code; localStorage.setItem(BKM, JSON.stringify(m)); }
const bkWarn = () => { const b = bkStatus(); return b.warn ? `<div class="card warn" data-tab="me" style="margin-bottom:12px"><b>Копия данных не проходит:</b> ${esc(b.why)}. <span class="muted">Нажми — открою настройки.</span></div>` : ''; };
let bkBusy = false;
// manual — нажал сам: тост и перерисовка; force — писать, даже если в копии тренировок больше
async function backupNow(manual, force) {
  if (!bkKey() || bkBusy || !S.program) return;
  if (force && bkMeta().err === 'older' && !confirm('В копии тренировок больше, чем в телефоне. Всё равно записать поверх? Прошлая копия останется в истории репозитория.')) return;
  bkBusy = true; const st0 = $('#bkst'); if (manual && st0) st0.textContent = 'Копирую…';
  const r = await Backup.save(fetch.bind(window), { token: bkKey() }, S, Date.now(), !!force && bkMeta().err === 'older'), m = bkMeta();
  bkBusy = false;
  localStorage.setItem(BKM, JSON.stringify(r.ok ? { at: r.at, sig: r.sig, n: r.n } : { at: m.at, sig: m.sig, n: m.n, err: r.err, code: r.code }));
  if (manual) { toast(r.ok ? 'Скопировано на GitHub' : 'Не скопировано: ' + (Backup.ERR[r.err] || Backup.ERR.http)); render(); }
  else { const st = $('#bkst'); if (st) st.textContent = bkStatus().text; }
}
function bkMaybe() { const m = bkMeta(); if (bkKey() && S.program && (m.err === 'net' || Backup.due(m, bkText()))) backupNow(); }
async function restoreBackup() {
  if (!bkKey()) { toast('Сначала вставь ключ GitHub'); return false; }
  const r = await Backup.load(fetch.bind(window), { token: bkKey() });
  if (!r.ok) { toast('Не восстановлено: ' + (Backup.ERR[r.err] || Backup.ERR.http)); return false; }
  if (S.program && !confirm(`В копии тренировок: ${r.n}, в телефоне: ${S.sessions.length}. Заменить данные телефона копией?`)) return false;
  S = r.S; if (!S.meals) S.meals = []; toLayout(); upgradeProgram();
  save(); localStorage.setItem(BKM, JSON.stringify({ at: Date.now(), sig: Backup.sig(bkText()), n: r.n }));
  tab = 'today'; view = null; render(); toast(`Восстановлено: тренировок ${r.n}`); return true;
}

/* ---------- онбординг ---------- */
function onboarding() {
  const el = document.createElement('div'); el.className = 'ob'; el.id = 'ob';
  el.innerHTML = `<h1>Привет</h1><p class="muted">Три числа — и первая тренировка готова.</p>
    ${[['weight', 'Вес, кг'], ['height', 'Рост, см'], ['age', 'Возраст']].map(([k, n]) => `<label for="o-${k}">${n}</label><input id="o-${k}" type="text" inputmode="decimal">`).join('')}
    <p class="muted small" style="margin-top:16px">Веса подберёшь на первой тренировке: в каждом упражнении будет подсказка — лесенка из лёгких подходов до рабочего веса.</p>
    <button class="primary" id="o-go" style="margin-top:24px">Поехали</button>
    <p class="muted small" style="margin-top:28px">Уже занимался здесь и включал автокопию? Вставь ключ GitHub — верну всю историю.</p>
    <input id="o-bk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" placeholder="github_pat_…" value="${esc(bkKey())}"><button id="o-rs" style="margin-top:10px">Восстановить из копии</button>`;
  document.body.appendChild(el);
  el.querySelector('#o-rs').addEventListener('click', async () => { bkSetKey(el.querySelector('#o-bk').value); if (await restoreBackup()) el.remove(); });
  el.querySelector('#o-go').addEventListener('click', () => {
    const num = (id) => parseFloat(el.querySelector(id).value.replace(',', '.'));
    const w = num('#o-weight'); if (!(w > 20)) { el.querySelector('#o-weight').focus(); return; }
    S.profile = { weight: w, height: num('#o-height') || '', age: num('#o-age') || '' };
    S.program = Fit.buildProgram(); S.mach = 5; S.pv = 2; S.arms = 4; S.lay = Fit.LAYOUT; S.cyc0 = Date.now(); // версия 56: в днях уже тренажёры, замены не нужны
    S.weights.push({ date: Fit.dstr(Date.now()), kg: w });
    save(); el.remove(); render();
  });
}

/* ---------- каркас ---------- */
function render() {
  if (!S.program) return;
  const v = $('#view'), top = v.scrollTop;
  v.innerHTML = { today: screenToday, history: screenHistory, grow: screenGrow, food: screenFood, me: screenMe }[tab]();
  const scr = tab === 'today' ? (S.active ? 'workout' : summary ? 'summary' : 'today') : tab; // тренировка и итог — свои экраны: открываются сверху
  const sameTab = v.dataset.scr === scr; v.dataset.scr = scr; // не data-tab: ловится делегированием вкладок
  v.querySelectorAll('.xnote').forEach(grow);
  v.scrollTop = sameTab ? top : 0;
  $('#tabs').innerHTML = [['today', 'Сегодня'], ['history', 'История'], ['grow', 'Прогресс'], ['food', 'Питание'], ['me', 'Я']].map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${ico(k)}${n}</button>`).join('');
  drawRest();
}
function toast(msg) { const t = document.createElement('div'); t.className = 'card'; t.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(var(--sat) + 10px);z-index:60;text-align:center;margin:0'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 4000); }
// меню типа подхода по тапу на номер (Hevy: Warm Up / Normal / Failure / Drop Set), выбор применяется сразу
function openType(k, j) {
  const it = S.active.items[k], s = it.sets[j], w = $('#sheet'); w.hidden = false;
  const no = Math.max(1, it.sets.slice(0, j + 1).filter((x) => x.t !== 'w').length);
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Тип подхода</div><div class="tlist">
    ${['w', '', 'f', 'd'].map((x) => `<button data-t="${x}" class="${x === (s.t || '') ? 'on' : ''}"><b class="num t-${x || 'n'}">${TMARK[x] || no}</b>${Fit.TYPES[x]}</button>`).join('')}
    ${it.sets.length > 1 ? '<button id="tdel" class="danger"><b class="num">✕</b>Убрать подход</button>' : ''}</div></div>`;
  w.onclick = (e) => {
    if (e.target === w) { w.hidden = true; return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'tdel') it.sets.splice(j, 1);
    else { const t = b.dataset.t; if (t) s.t = t; else delete s.t; }
    save(); w.hidden = true; render();
  };
}
/* Калькуляторы Hevy. ⋮ у упражнения → «Добавить разминку» (Add Warm Up Sets: рабочий вес, формула, «Insert Warmup Sets»)
   и «Калькулятор блинов» (у Hevy — кнопка Calculator над клавиатурой; в PWA её туда не поставить). Расчёт — program.js warmup/plates. */
const calcCfg = () => (S.calc = { warm: Fit.WARM.map((x) => x.slice()), round: { b: 5, o: 2.5 }, bar: 20, plates: Fit.PLATES.slice(0, 7), ...(S.calc || {}) });
const eqKey = (id) => (Fit.EQ[id] === 'b' ? 'b' : 'o'); // округление: своё у штанги, своё у гантелей и тренажёров
function warmSets(id, target, method) {
  const c = calcCfg(), b = eqKey(id) === 'b';
  return Fit.warmup(target, method || c.warm, c.round[eqKey(id)], b ? c.bar : 0).filter((s) => s.kg > 0 && s.reps > 0).map((s) => ({ ...s, done: false }));
}
const fmtP = (v) => String(v).replace('.', ','); // 1,25 — без округления до десятых
const chips = (vals, on, attr) => vals.map((v) => `<button class="chip${on(v) ? ' on' : ''}" data-${attr}="${v}">${fmtP(v)}</button>`).join('');
const closeSheet = () => { const w = $('#sheet'); w.hidden = true; w.oninput = null; w.onchange = null; };
function openMenu(k) {
  const it = S.active.items[k], w = $('#sheet'), eq = Fit.EQ[it.id] || '';
  w.hidden = false; // у своего веса (eq '') ни разминки, ни блинов
  w.innerHTML = `<div class="sheet"><div class="sheet-t">${esc(it.name)}</div><div class="tlist">
    ${eq ? `<button data-go="pickw"><b class="num">кг</b>Подобрать вес</button>` : ''}
    ${eq ? `<button data-go="warm"><b class="num t-w">Р</b>Добавить разминку</button>` : ''}
    ${eq === 'b' ? `<button data-go="plates"><b class="num">${ico('disc')}</b>Калькулятор блинов</button>` : ''}
    <button data-go="note"><b class="num">${ico('note')}</b>Постоянная заметка</button>
    <button data-go="swap"><b class="num">${ico('swap')}</b>Заменить упражнение</button>
    ${inSS(it) ? '<button data-go="ssoff"><b class="num">⇅</b>Убрать из суперсета</button>' : S.active.items.length > 1 ? '<button data-go="ss"><b class="num">⇅</b>Добавить в суперсет</button>' : ''}
    <button data-go="chat"><b class="num">${ico('chat')}</b>Спросить тренера</button></div></div>`;
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    const b = e.target.closest('[data-go]'); if (b) ({ pickw: openPickW, warm: openWarm, plates: openPlates, note: openNote, swap: openSwap, chat: openChat, ss: openSS, ssoff: () => ssSet(Fit.ssRemove(ssNow(), Fit.ssKey(it))) })[b.dataset.go](k);
  };
}
// app-016: список замен автора (Fit.alternatives) — тап заменяет упражнение
function openSwap(k) {
  const a = S.active, it = a.items[k], w = $('#sheet'), alts = Fit.alternatives(S.program, a.day, it);
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Заменить «${esc(it.name)}»</div>
    <p class="muted small" style="margin:0 0 6px">Замены автора программы; диапазоны повторов и отдых остаются.</p>
    <div class="tlist">${alts.map((c) => `<button data-sw="${c.id}"><b class="num">${ico('swap')}</b>${esc(c.name)}${it.slot === c.id ? ' <span class="muted small">(исходное)</span>' : ''}</button>`).join('') || '<p class="muted">Замен нет.</p>'}</div>
    <button class="link" id="swx">Отмена</button></div>`;
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'swx') return closeSheet();
    const b = e.target.closest('[data-sw]'); if (b) applySwap(k, b.dataset.sw);
  };
}
// app-016: чат с тренером (Groq, как «Питание → Вопрос»). История — в S.active.chat, живёт до конца тренировки. k — про какое упражнение
let chatBusy = false;
function openChat(k = null) {
  const a = S.active, w = $('#sheet'); a.chat = a.chat || [];
  const draw = () => {
    const msgs = a.chat.map((m) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.text != null ? m.text : m.content)}${m.failed ? '<small class="muted"> · без ответа</small>' : ''}${m.swap && a.items.some((it) => it.id === m.swap.from) ? `<button class="swbtn" data-sw="${m.swap.from}>${m.swap.to}">Заменить на «${esc(m.swap.toName)}»</button>` : ''}</div>`).join('');
    const cur = k != null ? a.items[k] : null;
    w.innerHTML = `<div class="sheet"><div class="sheet-t">Тренер${cur ? ` · ${esc(cur.name)}` : ''}</div>
      <div class="chat" id="chatlog">${msgs || '<p class="muted small" style="margin:4px 0 8px">Спроси про вес, технику, замену упражнения — тренер видит эту тренировку и историю.</p>'}${chatBusy ? '<div class="msg ai muted">Думаю…</div>' : ''}</div>
      <div class="crow2"><textarea id="cq" rows="1" placeholder="${cur ? `Про «${esc(cur.name)}»…` : 'Вопрос тренеру…'}" aria-label="Вопрос тренеру"></textarea><button class="primary" id="csend" style="width:auto;min-width:96px;margin:0" ${chatBusy ? 'disabled' : ''}>Отправить</button></div></div>`;
    const l = $('#chatlog'); if (l) l.scrollTop = l.scrollHeight;
  };
  w.hidden = false; draw(); w.oninput = (e) => { if (e.target.id === 'cq') grow(e.target); };
  w.onclick = async (e) => {
    if (e.target === w) return closeSheet();
    const sb = e.target.closest('[data-sw]'); if (sb) { const [from, to] = sb.dataset.sw.split('>'); const i = a.items.findIndex((it) => it.id === from); if (i >= 0) applySwap(i, to); return; }
    if (e.target.id !== 'csend' || chatBusy) return;
    const q = $('#cq').value.trim(); if (!q) return;
    if (!localStorage.getItem(GROQ)) return groqCall([]); // тост + переход в «Я» за ключом
    const lst = a.chat[a.chat.length - 1]; if (lst && lst.failed && lst.content === q) a.chat.pop(); // повтор неотправленного — без дубля
    a.chat.push({ role: 'user', content: q }); chatBusy = true; save(); draw();
    const c = Trainer.context(S, Fit, a, Food.sessionLines(S.sessions), k);
    const hist = a.chat.filter((m) => !m.failed).slice(-8).map((m) => ({ role: m.role, content: m.content }));
    const out = await groqCall([{ role: 'system', content: Trainer.systemPrompt(c) }, ...hist]);
    chatBusy = false;
    if (out != null) { const r = Trainer.parse(out, c.items); a.chat.push({ role: 'assistant', content: r.text, text: r.text, swap: r.swap }); }
    else a.chat[a.chat.length - 1].failed = 1; // ошибка показана тостом — вопрос остаётся в истории с пометкой (для разбора), текст вернём в поле
    save(); if (!w.hidden) { draw(); if (out == null) { $('#cq').value = q; } }
  };
}
// постоянная заметка (у Hevy — Routine note, пишется в редакторе рутины; у нас редактора нет, поэтому лист из ⋮). Лежит в S.notes по id упражнения
// app-015: техника — 2 рисунка Everkinetic (CC BY-SA 4.0) + подсказки из free-exercise-db; у 6 упражнений только текст
function openTech(k) {
  const it = S.active.items[k], t = TECH[it.id], w = $('#sheet'); w.hidden = false;
  const ext = (t && t.ext) || 'png', pics = t && t.img ? Array.from({ length: t.img }, (_, i) => `<img src="tech/${it.id}-${i}.${ext}" alt="${i ? 'конечное' : 'исходное'} положение">`).join('') : '';
  const imgs = pics ? `<div class="tpic${t.img === 1 ? ' one' : ''}">${pics}</div><div class="muted small tcr">${t.cap ? esc(t.cap) + '<br>' : ''}${t.credit || TECH_CREDIT}</div>` : '<div class="muted small tcr">Рисунка пока нет — только подсказки.</div>';
  const safe = SAFE[it.id] ? `<div class="cban fh"><b>Осторожно</b>${esc(SAFE[it.id])}</div>` : '';
  const tips = t ? t.tips.map((x) => `<li>${esc(x)}</li>`).join('') : '<li>Подсказок пока нет.</li>';
  w.innerHTML = `<div class="sheet"><div class="sheet-t">${esc(it.name)}</div>${imgs}${safe}<ol class="tips">${tips}</ol><button class="primary" id="tok" style="margin-top:12px">Понятно</button></div>`;
  w.onclick = (e) => { if (e.target === w || e.target.id === 'tok') closeSheet(); };
}
function openEffortHelp() {
  const w = $('#sheet'); w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Как тяжело делать подход</div>${Fit.EFFORT_HELP.map(([h, t]) => `<p class="ehelp"><b>${h}</b>${esc(t)}</p>`).join('')}<button class="primary" id="tok" style="margin-top:12px">Понятно</button></div>`;
  w.onclick = (e) => { if (e.target === w || e.target.id === 'tok') closeSheet(); };
}
function openNote(k) {
  const it = S.active.items[k], w = $('#sheet'); w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">${esc(it.name)}</div>
    <textarea id="rn" placeholder="Постоянная заметка: видна у этого упражнения на каждой тренировке. Можно вставить ссылку на видео." aria-label="Постоянная заметка">${esc((S.notes || {})[it.id] || '')}</textarea>
    <button class="primary" id="rnok" style="margin-top:12px">Сохранить</button></div>`;
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    if (e.target.id !== 'rnok') return;
    const v = $('#rn').value.trim(); S.notes = S.notes || {};
    if (v) S.notes[it.id] = v; else delete S.notes[it.id];
    save(); closeSheet(); render();
  };
}
function openWarm(k) {
  const it = S.active.items[k], c = calcCfg(), eq = eqKey(it.id), w = $('#sheet'), first = it.sets.find(Fit.counted);
  let target = first && first.kg > 0 ? first.kg : 0;
  const calc = () => Fit.warmup(target, c.warm, c.round[eq], eq === 'b' ? c.bar : 0);
  const out = (s) => (s.kg > 0 && s.reps > 0 ? `${fmt(s.kg)} кг × ${s.reps}` : '—');
  const draw = () => {
    const rows = calc();
    w.innerHTML = `<div class="sheet"><div class="sheet-t">Разминка</div>
      <label class="ctarget"><span>Рабочий вес, кг</span><input id="wt" class="cell" type="text" inputmode="decimal" autocomplete="off" value="${target ? fmt(target) : ''}" placeholder="кг"></label>
      <div class="wfr wfh"><span></span><span>Формула</span><span>Разминка</span></div>
      ${c.warm.map(([p, r], i) => `<div class="wfr"><b class="num t-w">Р</b><span><input class="cell" data-wp="${i}" type="text" inputmode="numeric" autocomplete="off" value="${p}" aria-label="Процент"> % × <input class="cell" data-wr="${i}" type="text" inputmode="numeric" autocomplete="off" value="${r}" aria-label="Повторы"></span><span data-wo="${i}">${out(rows[i])}</span></div>`).join('')}
      <div class="crow"><span>Округлять до, кг</span><div class="chipr">${chips([1, 2.5, 5, 10], (v) => v === c.round[eq], 'rd')}</div></div>
      <div class="seg"><button id="wrm"${c.warm.length < 2 ? ' disabled' : ''}>− Подход</button><button id="wadd"${c.warm.length > 5 ? ' disabled' : ''}>+ Подход</button></div>
      <button class="primary" id="wins">Вставить разминку</button>
      <button class="link" id="wdef">Формула по умолчанию</button></div>`;
  };
  w.hidden = false; draw();
  w.oninput = (e) => { // без перерисовки листа: фокус остаётся в поле
    const t = e.target, v = parseFloat(t.value.replace(',', '.'));
    if (t.id === 'wt') target = v > 0 ? v : 0;
    else if (t.dataset.wp != null) c.warm[+t.dataset.wp][0] = v > 0 ? Math.min(v, 100) : 0;
    else if (t.dataset.wr != null) c.warm[+t.dataset.wr][1] = v > 0 ? Math.round(v) : 0;
    else return;
    save(); calc().forEach((s, i) => { w.querySelector(`[data-wo="${i}"]`).textContent = out(s); });
  };
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rd) c.round[eq] = +b.dataset.rd;
    else if (b.id === 'wrm') c.warm.pop();
    else if (b.id === 'wadd') c.warm.push(c.warm[c.warm.length - 1].slice());
    else if (b.id === 'wdef') c.warm = Fit.WARM.map((x) => x.slice());
    else if (b.id === 'wins') {
      const add = warmSets(it.id, target); if (!add.length) { $('#wt').focus(); return; }
      let n = it.sets.findIndex((s) => s.t !== 'w'); if (n < 0) n = it.sets.length;
      it.sets = [...it.sets.slice(0, n).filter((s) => s.done), ...add, ...it.sets.slice(n)]; // несделанную разминку сверху заменяем, сделанную оставляем
      save(); closeSheet(); render(); return;
    }
    save(); draw();
  };
}
/* Подбор стартового веса (карта 3.10): «делаю 40 × 15» → рабочие подходы и разминка. Расчёт — Fit.startKg, вход как у Liftosaur Rep Max Calculator. */
function openPickW(k) {
  const it = S.active.items[k], w = $('#sheet'), RIR = [[0, 'Больше не мог'], [1, 'Ещё 1–2'], [3, 'Ещё 3 и больше']];
  let kg = 0, reps = 0, rir = 0;
  const res = () => Fit.startKg(it, kg, reps, rir, introNow() ? Fit.INTRO_RIR : undefined), warm = (r) => (S.warmOff ? [] : warmSets(it.id, r.kgs[0], Fit.warmFor(it)));
  const out = () => {
    const r = res(); if (!r) return 'Впиши вес и повторы — посчитаю подходы.';
    const ws = warm(r);
    return (ws.length ? `<b>Разминка</b>${ws.map((x) => `${fmt(x.kg)} × ${x.reps}`).join(' · ')}<br>` : '') + `<b>Рабочие</b>${r.kgs.map((x, i) => `${fmt(x)} × ${it.ranges[i][0]}–${it.ranges[i][1]}`).join(' · ')}`
      + (r.rough ? `<br>Ты вписал больше 10 повторов — по такому подходу вес считается неточно. Если первый рабочий подход вышел легко — прибавь ${fmt((exById(it.id) || {}).incKg || 2.5)} кг.` : '');
  };
  const draw = () => {
    w.innerHTML = `<div class="sheet"><div class="sheet-t">Подобрать вес</div>
      <div class="ehelp">Впиши любой подход, который ты делал в этом упражнении: вес и сколько раз. Рабочие подходы и разминку посчитаю сам.</div>
      <div class="row" style="justify-content:center;gap:16px"><label class="ctarget"><span>Вес, кг</span><input id="pwk" class="cell" type="text" inputmode="decimal" autocomplete="off" value="${kg ? fmt(kg) : ''}" placeholder="кг"></label>
      <label class="ctarget"><span>Повторов</span><input id="pwr" class="cell" type="text" inputmode="numeric" autocomplete="off" value="${reps || ''}" placeholder="раз"></label></div>
      <div class="crow"><span>Сколько ещё мог сделать</span></div><div class="seg">${RIR.map(([v, t]) => `<button data-rir="${v}"${v === rir ? ' class="on"' : ''}>${t}</button>`).join('')}</div>
      <div class="eff" id="pwo" style="font-size:15px;margin:12px 0">${out()}</div>
      <button class="primary" id="pwok">Поставить</button></div>`;
  };
  w.hidden = false; draw();
  w.oninput = (e) => { // без перерисовки листа: фокус остаётся в поле
    const t = e.target, v = parseFloat(t.value.replace(',', '.'));
    if (t.id === 'pwk') kg = v > 0 ? v : 0; else if (t.id === 'pwr') reps = v > 0 ? Math.min(Math.round(v), 30) : 0; else return;
    $('#pwo').innerHTML = out();
  };
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rir != null) { rir = +b.dataset.rir; return draw(); }
    if (b.id !== 'pwok') return;
    const r = res(); if (!r) { $(kg ? '#pwr' : '#pwk').focus(); return; }
    const work = it.sets.filter((x) => x.t !== 'w');
    work.filter(Fit.counted).forEach((x, i) => { if (!x.done && r.kgs[i] != null) { x.kg = r.kgs[i]; if (i) x.auto = 1; else delete x.auto; } });
    it.sets = [...it.sets.filter((x) => x.t === 'w' && x.done), ...warm(r), ...work]; // несделанную разминку пересчитываем от нового веса
    save(); closeSheet(); render();
  };
}
function openPlates(k) {
  const it = S.active.items[k], c = calcCfg(), w = $('#sheet');
  const kgs = [...new Set(it.sets.map((s) => s.kg).filter((x) => x > 0))], cur = it.sets.find((s) => !s.done && s.kg > 0);
  let target = cur ? cur.kg : kgs[0] || 0;
  const pic = () => {
    const r = Fit.plates(target, c.bar, c.plates);
    return `<div class="barbell"><i>${fmt(c.bar)}</i>${r.side.map((p) => `<b style="height:${Math.round(34 + Math.sqrt(p) * 12)}px">${fmtP(p)}</b>`).join('')}<u></u></div>
      <div class="pnote">${!target ? 'Введи вес' : (r.exact ? '' : `Ближайший возможный вес — ${fmt(r.total)} кг. `) + (r.side.length ? 'На сторону: ' + r.side.map(fmtP).join(' + ') : 'Пустой гриф')}</div>`;
  };
  const draw = () => {
    w.innerHTML = `<div class="sheet"><div class="sheet-t">Калькулятор блинов</div>
      <label class="ctarget"><span>Вес, кг</span><input id="pt" class="cell" type="text" inputmode="decimal" autocomplete="off" value="${target ? fmt(target) : ''}" placeholder="кг"></label>
      ${kgs.length > 1 ? `<div class="chipr">${chips(kgs, (v) => v === target, 'kg')}</div>` : ''}
      <div id="ppic">${pic()}</div>
      <div class="crow"><span>Блины, кг</span><div class="chipr">${chips(Fit.PLATES, (v) => c.plates.includes(v), 'pl')}</div></div>
      <div class="crow"><span>Гриф, кг</span><div class="chipr">${Fit.BARS.map(([n, v]) => `<button class="chip${v === c.bar ? ' on' : ''}" data-bar="${v}">${n} ${fmt(v)}</button>`).join('')}</div></div></div>`;
  };
  w.hidden = false; draw();
  w.oninput = (e) => { if (e.target.id !== 'pt') return; const v = parseFloat(e.target.value.replace(',', '.')); target = v > 0 ? v : 0; $('#ppic').innerHTML = pic(); };
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.kg) target = +d.kg;
    else if (d.pl) { const v = +d.pl; c.plates = c.plates.includes(v) ? c.plates.filter((x) => x !== v) : [...c.plates, v]; }
    else if (d.bar) c.bar = +d.bar;
    else return;
    save(); draw();
  };
}
/* Экран упражнения — по Hevy (hevyapp.com/features/exercise-performance): график за три месяца / год / всё время, под ним рекорды
   и рекорды по повторам. Цель, её линия на графике и «по плану сегодня» — наше (program.js goalDefault/goalState). */
const pv = { range: 'all', m: 'e1' };
const PM = { e1: 'Расчётный 1ПМ', kg: 'Вес', vol: 'Объём', reps: 'Повторы' };
function chart(pts, goal, sel, minR) { // sel — выбранная точка (точки становятся кнопками), minR — шкала не уже стольких единиц
  if (!pts.length) return '<p class="muted small">За этот срок записей нет.</p>';
  const W = 340, H = 150, L = 8, R = 8, T = 16, B = 20;
  const vs = pts.map((p) => p.v).concat(goal ? [goal] : []), span = Math.max(...vs) - Math.min(...vs), pad = Math.max(0, (minR || 0) - span) / 2, lo = Math.min(...vs) - pad, hi = Math.max(...vs) + pad, r = hi - lo || 1;
  const t0 = pts[0].t, dt = pts[pts.length - 1].t - t0;
  const X = (t) => (dt ? L + ((t - t0) / dt) * (W - L - R) : W / 2), Y = (v) => T + (1 - (v - lo) / r) * (H - T - B);
  const xy = pts.map((p) => [X(p.t).toFixed(1), Y(p.v).toFixed(1)]), day = (t) => dshort(new Date(t).toISOString());
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График">
    ${goal ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}" stroke="#34c759" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${L}" y="${(Y(goal) - 4).toFixed(1)}" style="fill:#34c759">цель ${fmt(goal)}</text>` : ''}
    <polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#1f9bf0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.map((p, i) => (sel != null && i === sel ? `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#1f9bf0" stroke="var(--glass)" stroke-width="2"/>` : `<circle cx="${p[0]}" cy="${p[1]}" r="${sel != null ? 4 : i === xy.length - 1 ? 4.5 : 3}" fill="#1f9bf0"/>`)).join('')}
    ${sel == null ? '' : xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="16" fill="transparent" data-pt="${i}"><title>${day(pts[i].t)}: ${fmt(pts[i].v)}</title></circle>`).join('')}
    <text x="${L}" y="${H - 5}">${day(t0)}</text>${dt ? `<text x="${W - R}" y="${H - 5}" text-anchor="end">${day(pts[pts.length - 1].t)}</text>` : ''}
    <text x="${L}" y="${(goal && Math.abs(Y(pts[0].v) - 4 - Y(goal)) < 14 ? Y(pts[0].v) + 16 : Math.max(10, Y(pts[0].v) - 8)).toFixed(1)}">${fmt(pts[0].v)}</text></svg>`;
}
function openProgress(id) {
  const ex = exById(id); if (!ex) return;
  const w = $('#sheet'), all = Fit.exLog(S.sessions, ex.name), bw = !all.some((p) => p.e1 > 0), last = all[all.length - 1];
  const kv = (n, v) => `<div class="kv"><span>${n}</span><b>${v}</b></div>`;
  const draw = () => {
    const m = bw ? 'reps' : pv.m, now = Date.now(), from = pv.range === '3m' ? now - 92 * 864e5 : pv.range === 'y' ? now - 365 * 864e5 : 0;
    const pts = all.filter((p) => p.t >= from).map((p) => ({ t: p.t, v: p[m] })), rec = Fit.records(all), gi = goalInfo(id, all), g = gi && gi.g;
    const d0 = all.length > 1 ? last[m] - all[0][m] : null, unit = m === 'reps' ? 'повт' : 'кг';
    const gain = Math.round((Fit.GAIN[id === 'hack' || id === 'legpress' || id === 'hipthrust' ? 'leg' : 'up']) * 1000) / 10;
    const goalHtml = !Fit.hasGoal(id, ex.slot) ? '' : `<h3>Цель</h3>` + (!all.length ? '<p class="muted small">Появится после первой тренировки: тренер замерит упражнение и поставит цель на 12 недель.</p>'
      : (g ? `<div class="row between"><b>${fmt(gi.e1)} → ${fmt(g.kg)} кг</b><span class="${gi.cls}">${gi.text}</span></div>${goalBar(gi.st)}
        <p class="muted small">Старт ${fmt(g.from)} кг, ${dshort(new Date(g.t0).toISOString())}. По плану сегодня — ${fmt(gi.st.plan)} кг.</p>
        <div class="gin"><label>Цель, кг<input id="gkg" type="text" inputmode="decimal" autocomplete="off" value="${fmt(g.kg)}"></label><label>Срок<input id="gby" type="date" value="${g.by}"></label></div>
        <button class="primary" id="gsave">Сохранить цель</button>` : '')
      + `<button class="link" id="gnew">${g ? 'Новая цель от текущего' : 'Поставить цель'}: +${fmt(gain)} % за ${Fit.GOAL_WEEKS} недель</button>
        <p class="muted small">+${fmt(gain)} % за 12 недель — столько прибавили новички в исследовании Gentil 2010 (${gain > 15 ? 'жим ногами' : 'жим лёжа'}). Цифру и срок можно поправить.</p>`);
    const sr = Object.keys(rec.byReps).map(Number).sort((a, b) => a - b).map((r) => kv(`${r} ${plural(r, ['повтор', 'повтора', 'повторов'])}`, fmt(rec.byReps[r]) + ' кг')).join('');
    w.innerHTML = `<div class="sheet pg"><div class="row between"><b class="pgt">${esc(ex.name)}</b><button class="link" id="pgx">Готово</button></div>
      ${!all.length ? '<p class="muted">Записей пока нет — график и рекорды появятся после первой тренировки.</p>' : `
      <div class="pbig">${m === 'reps' ? last[m] : fmt(last[m])} <small>${unit} · ${PM[m][0].toLowerCase() + PM[m].slice(1)}</small></div>
      <div class="muted small">${d0 == null ? 'первая запись' : `<span class="${d0 >= 0 ? 'pos' : 'neg'}">${d0 >= 0 ? '+' : '−'}${fmt(Math.abs(d0))} ${unit}</span> с ${dshort(new Date(all[0].t).toISOString())} · ${all.length} ${plural(all.length, ['тренировка', 'тренировки', 'тренировок'])}`}</div>
      ${chart(pts, m === 'e1' && g ? g.kg : 0)}
      <div class="chipr eq">${[['3m', '3 месяца'], ['y', 'Год'], ['all', 'Всё время']].map(([k, n]) => `<button class="chip${pv.range === k ? ' on' : ''}" data-rg="${k}">${n}</button>`).join('')}</div>
      ${bw ? '' : `<div class="chipr eq" style="margin-top:6px">${['e1', 'kg', 'vol'].map((k) => `<button class="chip${m === k ? ' on' : ''}" data-pm="${k}">${PM[k]}</button>`).join('')}</div>`}`}
      ${goalHtml}
      ${!all.length ? '' : `<h3>Рекорды</h3>${rec.kg > 0 ? kv('Тяжелейший вес', fmt(rec.kg) + ' кг') + kv('Расчётный 1ПМ', fmt(rec.e1) + ' кг') + kv('Лучший подход', `${fmt(rec.bset.kg)} кг × ${rec.bset.reps}`) + kv('Объём за тренировку', sp3(rec.vol) + ' кг')
        : kv('Больше всего повторов в подходе', rec.reps) + kv('Больше всего повторов за тренировку', rec.allReps)}
      ${sr ? `<h3>Рекорды по повторам</h3>${sr}` : ''}`}</div>`;
  };
  w.hidden = false; draw();
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'pgx') { closeSheet(); render(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rg) pv.range = b.dataset.rg;
    else if (b.dataset.pm) pv.m = b.dataset.pm;
    else if (b.id === 'gsave') {
      const kg = num($('#gkg').value), by = $('#gby').value, g = S.goals[id];
      if (!(kg > 0)) return $('#gkg').focus();
      if (!/^\d{4}-\d\d-\d\d$/.test(by) || new Date(by + 'T12:00:00').getTime() <= g.t0) return $('#gby').focus();
      S.goals[id] = { ...g, kg, by }; save(); toast('Цель сохранена');
    }
    else if (b.id === 'gnew') { (S.goals = S.goals || {})[id] = Fit.goalDefault(id, last.e1, Date.now()); save(); toast('Цель поставлена'); }
    else return;
    draw();
  };
}
/* ---------- замеры тела и фото прогресса (app-020) ----------
   Поток Hevy (hevyapp.com/features/track-body-measurements, /progress-photos): «+» → запись на дату, заполняешь сколько хочешь, фото — в той же
   записи → каждый замер на своём графике, кнопки замеров под графиком. Три слота Спереди / Сбоку / Сзади, по одному на день — MacroFactor
   Help 121, 117. Две даты рядом (цифры и фото) — MacroFactor Help 122, Hevy «side-by-side». «Как мерить» — MacroFactor Help 118.
   Наше: «было N» в пустом поле, тап по точке графика, шкала не уже 2 см (суточный шум около 1 см — Help 118).
   Картинки лежат в IndexedDB (в localStorage не влезут), в записи — только метки ph {f, s, b}; в экспорт JSON фото не идут. */
const Ph = {
  db: null,
  open() { return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open('fit-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('ph'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  tx(mode, fn) { return this.open().then((db) => new Promise((res, rej) => { const t = db.transaction('ph', mode), q = fn(t.objectStore('ph')); t.oncomplete = () => res(q.result); t.onerror = t.onabort = () => rej(t.error); })); },
  get(k) { return this.tx('readonly', (s) => s.get(k)); },
  put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
  del(k) { return this.tx('readwrite', (s) => s.delete(k)); },
};
const phKey = (date, v) => date + ':' + v;
function fillPhotos(root, pend) { // pend — ещё не сохранённые фото формы {вид: dataURL}
  root.querySelectorAll('img[data-ph]').forEach((im) => {
    const k = im.dataset.ph, v = k.slice(11);
    if (pend && pend[v]) { im.src = pend[v]; return; }
    Ph.get(k).then((u) => { if (u) im.src = u; else im.alt = 'фото не найдено'; }).catch(() => { im.alt = 'фото не открылось'; });
  });
}
const dfull = (d) => new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/\s*г\.?$/, '');
const sgn = (d) => (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d));
const mv = { k: 'waist', a: null, b: null, sel: null, pv: 'f' };
function measureCard() {
  const ms = S.measures || [], du = Fit.measureDue(ms), pd = Fit.photoDue(ms), rows = Fit.measureLast(ms).filter((r) => r.v != null);
  const ago = (n) => (n === 0 ? 'сегодня' : `${n} ${plural(n, ['день', 'дня', 'дней'])} назад`);
  const note = [du.last ? `Последний замер — ${dshort(du.last)}, ${ago(du.days)}.${du.due ? ' Прошло две недели — пора мерить снова.' : ''}` : '',
    pd.last ? `Фото — ${dshort(pd.last)}, ${ago(pd.days)}.${pd.due ? ' Прошло четыре недели — пора снять новые.' : ''}` : ''].filter(Boolean).join(' ');
  return `<h2>Замеры тела</h2><div class="card">${!ms.length
    ? '<p class="muted small" style="margin:0 0 12px">Грудь, талия, бицепс, бедро — лентой, раз в две-три недели; фото — раз в месяц. Лента и фото показывают то, чего не видно на весах.</p>'
    : rows.map((r) => `<div class="kv" data-act="mopen" data-k="${r.key}"><span>${r.name}</span><b>${r.d == null ? '' : `<small class="muted">${sgn(r.d)}</small> `}${fmt(r.v)} см</b></div>`).join('')
      + `<p class="muted small" style="margin:8px 0 12px">${note}</p>`}
    <div class="row"><button class="chip grow" data-act="mnew">Записать замеры и фото</button>${ms.length ? '<button class="chip" data-act="mopen">Графики</button>' : ''}</div></div>`;
}
// форма на дату: запись этой даты открывается на правку; значения не подставляются — прошлое видно серым «было N»
function openMeasure(date, back) {
  const w = $('#sheet'), today = Fit.dstr(Date.now()), ms = () => S.measures || [];
  let day = date || today, vals = {}, had = false, ph = {}, pend = {}, cur = null, busy = false, first = true;
  const pull = () => {
    const e = ms().find((m) => m.date === day);
    if (e) { vals = {}; pend = {}; Fit.MEASURES.forEach(([k]) => { if (e[k] != null) vals[k] = fmt(e[k]); }); } else if (had) { vals = {}; pend = {}; } // ушёл с записанной даты на пустую — не копируем
    had = !!e; ph = (e && e.ph) || {};
  };
  const has = (v) => (pend[v] !== undefined ? !!pend[v] : !!ph[v]);
  const draw = () => {
    const prev = Fit.measureLast(ms().filter((m) => m.date < day)), sc = first ? 0 : w.firstElementChild.scrollTop; first = false;
    w.innerHTML = `<div class="sheet pg"><div class="row between"><b class="pgt">${had ? 'Замеры' : 'Новые замеры'}</b><button class="link" id="pgx">Отмена</button></div>
      <div class="gin one"><label>Дата<input id="mdate" type="date" max="${today}" value="${day}"></label></div>
      <div class="gin">${Fit.MEASURES.map(([k, n], i) => `<label>${n}, см<input data-mv="${k}" type="text" inputmode="decimal" autocomplete="off" value="${esc(vals[k] || '')}" placeholder="${prev[i].v == null ? '' : 'было ' + fmt(prev[i].v)}"></label>`).join('')}</div>
      <div class="phr">${Fit.PHOTO_VIEWS.map(([v, n]) => `<div class="pht${has(v) ? ' has' : ''}" data-pv="${v}">${has(v) ? `<img data-ph="${phKey(day, v)}" alt=""><button class="phx" data-px="${v}" aria-label="Убрать фото">×</button>` : ico('camera')}<span>${n}</span></div>`).join('')}</div>
      <input id="mph" type="file" accept="image/*" hidden>
      <p class="muted small">Заполни что хочешь — пустое не записывается. Фото — раз в 4–5 недель: то же место, свет и поза; телефон поставь на уровне торса, не селфи.</p>
      <button class="primary" id="msv">Сохранить</button>
      ${had ? '<button class="link danger" id="mrm">Удалить запись</button>' : ''}
      <details class="how"><summary>Как мерить</summary><ul>
        <li>Талию — утром до еды: еда и вода меняют её на 2–5 см.</li>
        <li>Руки и ноги — когда мышцы не болят после тренировки: отёк добавляет до 1–1,5 см.</li>
        <li>Напряжённая рука или расслабленная — выбери одно и мерь всегда так.</li>
        <li>Лента каждый раз в одном месте: талия — по пупку, рука и бедро — самое широкое место.</li>
        <li>Мерь дважды. Не сошлось — третий раз, пиши то, что совпало.</li></ul></details></div>`;
    fillPhotos(w, pend); w.firstElementChild.scrollTop = sc;
  };
  const leave = () => { if (back) openMeasures(back); else { closeSheet(); render(); } };
  pull(); w.hidden = false; draw();
  w.oninput = (e) => { const k = e.target.dataset.mv; if (k) vals[k] = e.target.value; };
  w.onchange = (e) => {
    const t = e.target;
    if (t.id === 'mdate' && /^\d{4}-\d\d-\d\d$/.test(t.value) && t.value <= today) { day = t.value; pull(); draw(); }
    else if (t.id === 'mph' && t.files[0]) { const f = t.files[0], v = cur; t.value = ''; resizeImg(f, 1280).then((u) => { pend[v] = u; draw(); }).catch((er) => toast(er.message)); }
  };
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'pgx') return leave();
    const x = e.target.closest('[data-px]'); if (x) { pend[x.dataset.px] = null; return draw(); }
    const tile = e.target.closest('[data-pv]'); if (tile) { cur = tile.dataset.pv; return w.querySelector('#mph').click(); }
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.id === 'msv') {
      const bad = Fit.MEASURES.find(([k]) => isNaN(Fit.measureVal(vals[k]))), flags = {};
      if (bad) { w.querySelector(`[data-mv="${bad[0]}"]`).focus(); return toast('Замер в сантиметрах: от 10 до 250'); }
      Fit.PHOTO_VIEWS.forEach(([v]) => { if (has(v)) flags[v] = 1; });
      if (!Fit.MEASURES.some(([k]) => Fit.measureVal(vals[k]) != null) && !Object.keys(flags).length) return w.querySelector('[data-mv]').focus();
      busy = true;
      Promise.all(Fit.PHOTO_VIEWS.map(([v]) => (pend[v] ? Ph.put(phKey(day, v), pend[v]) : pend[v] === null && ph[v] ? Ph.del(phKey(day, v)) : null))).then(() => {
        S.measures = Fit.measureSet(ms(), day, vals, flags); save();
        if (Object.keys(flags).length && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // просим не чистить хранилище
        toast('Записано'); leave();
      }).catch(() => { busy = false; toast('Фото не сохранилось: хранилище телефона закрыто или нет места'); });
    }
    else if (b.id === 'mrm' && confirm(`Удалить замеры и фото за ${dfull(day)}?`)) {
      Promise.all(Object.keys(ph).map((v) => Ph.del(phKey(day, v)))).catch(() => {}).then(() => { S.measures = Fit.measureSet(ms(), day, {}); save(); leave(); });
    }
  };
}
// история: свой график на каждый замер, кнопки под графиком (Hevy); ниже две даты рядом — цифры и фото (MacroFactor, Hevy) — и все записи
function openMeasures(key) {
  const w = $('#sheet'), has = (k) => (S.measures || []).some((m) => m[k] != null);
  if (key && Fit.MEASURES.some(([k]) => k === key)) mv.k = key;
  else if (!has(mv.k)) mv.k = (Fit.MEASURES.find(([k]) => has(k)) || ['waist'])[0];
  mv.sel = null; mv.a = mv.b = null; let first = true; // каждый раз с начала: первая запись против последней
  const draw = () => {
    const ms = S.measures || [], name = Fit.MEASURES.find(([k]) => k === mv.k)[1], pts = Fit.measureSeries(ms, mv.k), dates = ms.map((m) => m.date);
    const sel = mv.sel != null && pts[mv.sel] ? mv.sel : pts.length - 1, p = pts[sel], sc = first ? 0 : w.firstElementChild.scrollTop; first = false;
    if (!dates.includes(mv.a)) mv.a = dates[0]; if (!dates.includes(mv.b)) mv.b = dates[dates.length - 1];
    const cmp = Fit.measureCompare(ms, mv.a, mv.b, S.weights).filter((r) => r.a != null || r.b != null), at = (d) => ms.find((m) => m.date === d) || {};
    const opts = (cur) => ms.map((m) => `<option value="${m.date}"${m.date === cur ? ' selected' : ''}>${dfull(m.date)}${m.ph ? ' · фото' : ''}</option>`).join('');
    w.innerHTML = `<div class="sheet pg"><div class="row between"><b class="pgt">Замеры тела</b><button class="link" id="pgx">Готово</button></div>
      ${!pts.length ? `<p class="muted">${name}: записей пока нет.</p>` : `
      <div class="pbig">${fmt(p.v)} <small>см · ${name.toLowerCase()} · ${dshort(p.date)}</small></div>
      <div class="muted small">${sel > 0 ? `${sgn(p.v - pts[0].v)} см с ${dshort(pts[0].date)}` : 'первый замер'} · всего ${pts.length} ${plural(pts.length, ['замер', 'замера', 'замеров'])}</div>
      ${chart(pts, 0, sel, 2)}`}
      <div class="chipr g3">${Fit.MEASURES.map(([k, n]) => `<button class="chip${mv.k === k ? ' on' : ''}" data-mk="${k}">${n}</button>`).join('')}</div>
      <button class="primary" id="madd" style="margin-top:12px">Записать замеры и фото</button>
      ${dates.length < 2 ? (dates.length ? '<p class="muted small">Сравнение двух дат появится после второй записи.</p>' : '') : `<h3>Сравнение</h3>
      <div class="gin"><label>Было<select id="mca">${opts(mv.a)}</select></label><label>Стало<select id="mcb">${opts(mv.b)}</select></label></div>
      ${!cmp.length ? '' : `<div class="cmp"><span class="h"></span><span class="h">${dshort(mv.a)}</span><span class="h">${dshort(mv.b)}</span><span class="h">Разница</span>
        ${cmp.map((r) => `<span>${r.name}, ${r.unit}</span><b>${fmt(r.a)}</b><b>${fmt(r.b)}</b><b>${r.d == null ? '—' : sgn(r.d)}</b>`).join('')}</div>`}
      ${!ms.some((m) => m.ph) ? '' : `<div class="chipr eq" style="margin-top:14px">${Fit.PHOTO_VIEWS.map(([v, n]) => `<button class="chip${mv.pv === v ? ' on' : ''}" data-pw="${v}">${n}</button>`).join('')}</div>
      <div class="ph2">${[mv.a, mv.b].map((d) => `<figure>${(at(d).ph || {})[mv.pv] ? `<img data-ph="${phKey(d, mv.pv)}" alt="">` : '<div class="phn">нет фото</div>'}<figcaption>${dfull(d)}</figcaption></figure>`).join('')}</div>`}`}
      ${!dates.length ? '' : `<h3>Все записи · ${name.toLowerCase()}</h3>${ms.slice().reverse().map((m) => `<div class="kv" data-md="${m.date}"><span>${dfull(m.date)}${m.ph ? ' <small class="muted">· фото</small>' : ''}</span><b>${m[mv.k] == null ? '—' : fmt(m[mv.k]) + ' см'} <span class="muted">›</span></b></div>`).join('')}
      <p class="muted small">Тап по строке — поправить или удалить запись.</p>`}</div>`;
    fillPhotos(w); w.firstElementChild.scrollTop = sc;
  };
  w.hidden = false; draw();
  w.oninput = null;
  w.onchange = (e) => { const t = e.target; if (t.id === 'mca') mv.a = t.value; else if (t.id === 'mcb') mv.b = t.value; else return; draw(); };
  w.onclick = (e) => {
    const t = e.target;
    if (t === w || t.id === 'pgx') { closeSheet(); render(); return; }
    if (t.dataset.pt != null) { mv.sel = +t.dataset.pt; return draw(); }
    const r = t.closest('[data-md]'); if (r) return openMeasure(r.dataset.md, mv.k);
    const b = t.closest('button'); if (!b) return;
    if (b.dataset.mk) { mv.k = b.dataset.mk; mv.sel = null; draw(); }
    else if (b.dataset.pw) { mv.pv = b.dataset.pw; draw(); }
    else if (b.id === 'madd') openMeasure(null, mv.k);
  };
}
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), name = `fit-${Fit.dstr(Date.now())}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: name }).catch(() => {});
  else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
}

document.addEventListener('click', (e) => {
  const tb = e.target.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; if (tab !== 'today') view = null; render(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const d = el.dataset, a = S.active, set = a && d.k != null ? a.items[+d.k].sets[+d.j] : null;
  switch (d.act) {
    case 'start': if (S.ciOff) startWorkout(); else openCheckin(); break;
    case 'pickday': openPickDay(); break;
    case 'sw-yes': swapAnswer(d, true); break;
    case 'sw-no': swapAnswer(d, false); break;
    case 'sadd-yes': { // застой: +1 подход (копия последнего), не больше одного на упражнение за цикл
      const it = a.items[+d.k], i = S.program[a.day].findIndex((e) => e.id === it.id), l = [...it.sets].reverse().find(Fit.counted); if (i < 0 || !l) break;
      S.program[a.day][i] = Fit.addSet(S.program[a.day][i]); (S.sadd = S.sadd || {})[a.day + ':' + it.id] = { c: cycNow().cycle || 0 };
      it.sets.push({ kg: l.kg, reps: l.reps, done: false }); it.ranges = [...it.ranges, it.ranges[it.ranges.length - 1].slice()]; delete it.stall; delete it.sadd; it.added = 1; save(); render(); toast('+1 подход'); break;
    }
    case 'sadd-no': (S.sadd = S.sadd || {})[a.day + ':' + a.items[+d.k].id] = { c: cycNow().cycle || 0, no: 1 }; delete a.items[+d.k].sadd; save(); render(); break;
    case 'ss-yes': ssSet(Fit.ssAdd(ssNow(), Fit.ssKey(a.items[+d.j]), Fit.ssKey(a.items[+d.k]))); toast('Суперсет собран: отдых — после второго упражнения'); break;
    case 'ss-no': (S.ssNo = S.ssNo || {})[a.day + ':' + d.p] = 1; save(); render(); break;
    case 'cancel': if (confirm('Отменить тренировку? Отметки пропадут.')) { S.active = null; save(); stopRest(); unlockScreen(); render(); } break;
    case 'finish': finishWorkout(); break;
    case 'summary-ok': view = null; summary = null; render(); break;
    case 'tick': {
      const it = a.items[+d.k];
      if (setKg(it, set) == null) { const i = el.closest('.set').querySelector('[data-sk]'); if (i) i.focus(); break; } // веса нет — сначала ввести
      if (!set.done && !(+set.reps > 0)) { const i = el.closest('.set').querySelector('[data-sr]'); if (i) i.focus(); toast(set.mx ? 'Замер: впиши, сколько повторов вышло' : 'Впиши, сколько повторов сделал'); break; }
      set.done = !set.done; save();
      const nx = it.sets[+d.j + 1], turn = set.done && Fit.counted(set) ? Fit.ssTurn(a.items, +d.k) : null; // суперсет: чей ход дальше
      if (set.done) { if (turn && !turn.rest) stopRest(); else if (!(nx && nx.t === 'd')) startRest(it.restSec); } // Hevy: перед дроп-сетом таймер отдыха не стартует; внутри круга суперсета — тоже
      else if (!a.items.some((i) => i.sets.some((s) => s.done))) stopRest();
      render();
      const recs = set.done && set.t !== 'w' ? Fit.liveRecord(Fit.records(Fit.exLog(S.sessions, it.name)), it.sets.filter((s, j) => j !== +d.j && s.done && s.t !== 'w').map((s) => ({ kg: setKg(it, s) || 0, reps: +s.reps })), setKg(it, set), +set.reps) : [];
      if (recs.length) prBanner(it.name, recs);
      if (turn && turn.k !== +d.k) { // Hevy Smart Superset Scrolling: экран едет к упражнению, чей ход
        const exs = document.querySelectorAll('#view .ex'); if (exs[turn.k]) exs[turn.k].scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!turn.rest && !recs.length) toast(`Без отдыха — ${a.items[turn.k].name}`);
      }
      break;
    }
    case 'stype': openType(+d.k, +d.j); break;
    case 'exmenu': openMenu(+d.k); break;
    case 'chat': openChat(); break;
    case 'tech': openTech(+d.k); break;
    case 'prog': openProgress(d.id); break;
    case 'mus': musOpen = musOpen === d.m ? null : d.m; render(); break;
    case 'effhelp': openEffortHelp(); break;
    case 'pickw': openPickW(+d.k); break;
    case 'volplus': { const names = []; d.ids.split(',').forEach((k) => { const [day, i] = k.split(':'); const ex = S.program[day] && S.program[day][+i]; if (ex && ex.ranges.length < Fit.VOL_MAX_SETS) { S.program[day][+i] = Fit.addSet(ex); names.push(ex.name); } });
      save(); toast(names.length ? `+1 подход: ${names.join(', ')} — теперь ${S.program[d.ids.split(':')[0]][+d.ids.split(':')[1].split(',')[0]].ranges.length}` : 'Уже максимум'); render(); break; }
    case 'deload': { // сброс при застое: зачётные несделанные подходы — 0,9 веса вниз до шага, повторы — верх диапазона
      const it = a.items[+d.k], inc = exById(it.id).incKg || 2.5;
      it.sets.forEach((s, j) => { if (!Fit.counted(s) || s.done || !(s.kg > 0)) return; s.kg = Fit.resetKg(s.kg, inc); s.reps = Fit.rangeOf(it, it.sets.slice(0, j).filter(Fit.counted).length)[1]; delete s.auto; });
      delete it.stall; it.reset = 1; save(); render(); toast('Вес снижен на 10 %'); break;
    }
    case 'addset': { const it = a.items[+d.k], l = it.sets[it.sets.length - 1]; it.sets.push({ kg: l ? l.kg : null, reps: l ? l.reps : it.ranges[0][0], done: false }); save(); render(); break; }
    case 'rest-add': if (rest) { rest.end += 30000; rest.beeped = false; drawRest(); } break;
    case 'rest-stop': stopRest(); break;
    case 'shoot': { const f = $('#fph'); if (f) f.click(); break; }
    case 'fmode': food.mode = d.v; render(); break;
    case 'fsend': foodSend(); break;
    case 'fpick': foodAdd(Food.fromRef(REF[+d.i]), 0); break;
    case 'fopick': { const it = food.off[+d.i]; foodAdd({ ...it }, it.serv || 0); break; }
    case 'foff': foodOff(); break;
    case 'fscan': { const f = $('#fbc'); if (f) f.click(); break; }
    case 'mdrop': food.photo = null; render(); break;
    case 'msave': {
      const its = food.photo.items.filter((i) => i.grams > 0); if (!its.length) { toast('Впиши граммы'); break; }
      addMeals([{ date: Fit.dstr(Date.now()), items: its.map(Food.plain), total: Food.totalOf(its) }]);
      food.photo = null; toast('Записано'); render(); break;
    }
    case 'mdel': S.meals.splice(+d.i, 1); save(); render(); break;
    case 'pshare': sharePlan(); break;
    case 'psave': {
      const day = Fit.dstr(Date.now());
      S.meals = S.meals.filter((m) => !(m.planned && m.date === day));
      addMeals(food.plan.meals.map((m) => ({ date: day, planned: true, time: m.time, title: m.title, items: m.items, total: m.total })));
      food.plan = null; toast('План записан'); render(); break;
    }
    case 'wsave': {
      const v = parseFloat($('#wnow').value.replace(',', '.')); if (!(v > 20 && v < 400)) { $('#wnow').focus(); break; }
      const day = Fit.dstr(Date.now()); S.weights = S.weights.filter((w) => w.date !== day); S.weights.push({ date: day, kg: v });
      S.profile.weight = v; save(); render(); break;
    }
    case 'mnew': openMeasure(); break;
    case 'mopen': openMeasures(d.k); break;
    case 'export': exportData(); break;
    case 'import': $('#imp').click(); break;
    case 'bk-now': backupNow(true, true); break;
    case 'bk-restore': restoreBackup(); break;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.opt === 'ci') { if (t.checked) delete S.ciOff; else S.ciOff = 1; save(); }
  if (t.dataset.hab) { const day = Fit.dstr(Date.now()); (S.habits[day] = S.habits[day] || {})[t.dataset.hab] = t.checked; save(); }
  else if (t.id === 'p-back') { if (t.value) S.profile.back = t.value; else delete S.profile.back; save(); render(); }
  else if (t.dataset.prof) { const v = parseFloat(t.value.replace(',', '.')); if (v > 0) { S.profile[t.dataset.prof] = v; save(); render(); } }
  else if (t.id === 'fph' && t.files[0]) { const f = t.files[0]; t.value = ''; foodPhoto(f); }
  else if (t.id === 'fbc' && t.files[0]) { const f = t.files[0]; t.value = ''; foodScan(f); }
  else if (t.id === 'gk') { localStorage.setItem(GROQ, t.value.trim()); toast('Ключ сохранён'); }
  else if (t.id === 'bk') { bkSetKey(t.value); if (bkKey()) backupNow(true); else render(); }
  else if (t.id === 'imp' && t.files[0]) {
    t.files[0].text().then((txt) => { const j = JSON.parse(txt); if (!j.program || !j.sessions) throw 0; S = j; save(); tab = 'today'; render(); toast('Импортировано'); }).catch(() => toast('Неверный файл'));
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'ftxt') food.text = t.value;
  else if (t.id === 'fq') { food.q = t.value; food.off = null; drawRes(); } // список — без перерисовки экрана, фокус в поле остаётся
  else if (t.dataset.xn != null && S.active) { S.active.items[+t.dataset.xn].note = t.value; save(); grow(t); const l = t.previousElementSibling; if (l && l.classList.contains('lnote')) l.hidden = !!t.value; } // заметка этой тренировки — без перерисовки
  else if (t.dataset.sk != null && S.active) { // вес в строке подхода — без перерисовки, фокус не теряем
    const it = S.active.items[+t.dataset.sk], j = +t.dataset.j, s = it.sets[j], v = parseFloat(t.value.replace(',', '.'));
    s.kg = v >= 0 ? v : null; delete s.auto;
    // подбор веса: следующие подходы без своего веса — каждый примерно на 10 % легче (заметка автора к неделе 1)
    for (let n = j + 1, kg = s.kg; kg != null && Fit.counted(s) && n < it.sets.length; n++) {
      const x = it.sets[n];
      if (!Fit.counted(x) || x.done || (x.kg != null && !x.auto)) break;
      x.kg = kg = Fit.stepDown(kg); x.auto = 1;
      const i = $('#view').querySelector(`[data-sk="${t.dataset.sk}"][data-j="${n}"]`); if (i) i.value = fmt(kg);
    }
    save(); const e2 = $('#wvol'); if (e2) e2.textContent = fmt(workVol(S.active)) + ' кг';
  }
  else if (t.dataset.sr != null && S.active) {
    const rs = S.active.items[+t.dataset.sr].sets[+t.dataset.j]; rs.reps = Math.max(0, parseInt(t.value, 10) || 0); rs.touched = 1; // touched — введённое не стирать при перерисовке
    save(); const e2 = $('#wvol'); if (e2) e2.textContent = fmt(workVol(S.active)) + ' кг';
  }
  else if (t.dataset.fg != null && food.photo) { // граммы поменял — пересчёт локально, без перерисовки (не теряем фокус)
    const i = +t.dataset.fg, it = food.photo.items[i]; Food.recalc(it, num(t.value));
    const v = $('#view'); v.querySelector(`[data-fk="${i}"]`).textContent = it.kcal; v.querySelector(`[data-fp="${i}"]`).textContent = fmt(it.protein);
    const tot = Food.totalOf(food.photo.items); $('#ftot').textContent = `${tot.kcal} ккал · ${fmt(tot.protein)} г белка`;
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render(); if (!S.program) onboarding(); else if (S.active) lockScreen(); else bkMaybe();
