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
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
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
  if (!Fit.isCurrent(S.program) && !S.active) { S.program = Fit.split(S.program, Fit.intro(S.profile && S.profile.back) ? Fit.INTRO_RIR : undefined); ch = true; } // версия 98: идёт тренировка — перенос после неё, не обнуляем
  // v115 (Денис 24.10 «в C вернуть жим ногами»): один раз снимаем его замену жима ногами на разгибания в дне C; вес жима — из дня A (Fit.migrate)
  if (!S.f115 && !S.active) { const p = (S.program.C || []).some((e) => e.slot === 'legpress' && e.id === 'legext') && Fit.swap(S.program, 'C', 'legext', 'legpress'); if (p) { const l = p.C.find((e) => e.id === 'legpress'), src = (p.A || []).find((e) => e.id === 'legpress'); if (l && src && l.kgs.every((x) => x == null)) l.kgs = l.kgs.map((_, i) => src.kgs[Math.min(i, src.kgs.length - 1)]); S.program = p; } S.f115 = 1; ch = true; }
  if (S.lay !== Fit.LAYOUT) { S.lay = Fit.LAYOUT; if (S.cyc0 == null) S.cyc0 = Date.now(); ch = true; }
  return ch;
}
if (toLayout()) save();
const cycNow = (now = Date.now()) => Fit.blockWeek(S.sessions, now, Fit.PID, S.cyc0 || 0); // неделя цикла (5 недель: 4 рабочих + разгрузка)
// карта 2.9 и 3.12: один раз и не посреди тренировки — тренажёры вместо свободных весов (кроме рук), диапазоны повторов по упражнению.
// Круг A-B-C, неделя блока и история не трогаются: номер программы тот же, меняются упражнения в своих слотах
function upgradeProgram() {
  if (!S.program || S.active || (S.mach >= 5 && S.pv >= 2 && S.arms >= 4 && S.flat >= 1)) return false;
  if (!(S.mach >= 3)) { // 0 → все замены; 1 (версия 49) → только наклонный жим и мост; 2 (версия 50) → мост в тренажёре снят, на его месте гакк-присед
    if (!(S.mach >= 2)) S.program = Fit.machines(S.program, S.mach ? Fit.MACH2 : Fit.MACH);
    S.program = Fit.machines(S.program, Fit.MACH3, true); S.mach = 3;
  }
  if (!(S.mach >= 4)) { S.program = Fit.machines(S.program, Fit.MACH4, true, true); S.mach = 4; } // версия 53: гакк → гиперэкстензия, пресс на полу; версия 54: задняя дельта снята, на её месте разгибания ног (вес из дня B)
  if (!(S.mach >= 5)) { S.program = Fit.machines(S.program, Fit.MACH5, true, true); S.mach = 5; } // версия 53 успела поставить гантели на заднюю дельту — снять
  if (!(S.pv >= 2)) { S.program = Fit.methods(S.program); S.pv = 2; }
  if (!(S.arms >= 4)) { S.program = Fit.arms(S.program); S.arms = 4; } // карта 2.10: руки в дне B; 2.11 (S.arms 1 → 2): сведения на блоках в дне C; версия 54 (2 → 3): тяга сидя и разводка гантелей в дне A; (3 → 4): сгибания ног сидя в дне A
  if (!(S.flat >= 1)) { S.program = Fit.flat(S.program); S.flat = 1; } // 20.10: лесенка → все подходы одним весом и одним диапазоном
  return true;
}
if (upgradeProgram()) save(); stepsFromNotes(); gymSteps();
// Денис 20.10: «самое первое упражнение» (жим от груди) он делал в тренажёре DECLINE CHEST PRESS — запись 20.10 переносим на decline, а у жима от груди
// вес из прошлой записи жима от груди (нет такой — «подбери»): тренажёры разные, веса не сравнить. Один раз.
function fixDecline() {
  if (S.dec20 || S.active || !S.program) return false; S.dec20 = 1;
  const cp = 'Жим в тренажёре от груди', dp = 'Жим вниз в тренажёре (decline)', d20 = (x) => { const d = new Date(x.date); return d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 20; };
  let hit = false; S.sessions.forEach((x) => { if (d20(x)) (x.exercises || []).forEach((e) => { if (e.name === cp) { e.name = dp; hit = true; } }); });
  if (!hit) return true;
  const prev = S.sessions.slice().reverse().map((x) => (x.exercises || []).find((e) => e.name === cp)).find(Boolean);
  Fit.ORDER.forEach((d) => (S.program[d] || []).forEach((e) => { if (e.id === 'chestpress') e.kgs = e.kgs.map(() => (prev && prev.kg != null ? prev.kg : null)); }));
  return true;
}
if (fixDecline()) save();
const introNow = (now = Date.now()) => Fit.intro(S.profile && S.profile.back, now); // вводные две недели после перерыва (карта 3.12)
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.program) return s; } catch (e) { /* пусто */ }
  return { profile: null, program: null, sessions: [], weights: [], habits: {}, meals: [], active: null };
}
/* Денис 20.10: шаг веса — как на стеке ЕГО зала (разгибания ног +5, обратные разведения +10; в программе было 2,5). S.inc[id] — шаг, выставленный им в ⋮.
   Прогрессия при крупном шаге та же двойная: повторы до верха диапазона, потом шаг (Feigenbaum, Alpha Progression — r50-wrist-steps.md §C). */
function gymSteps() { if (!S || !S.program) return; const m = { legext: 5, revfly: 10, ...(S.inc || {}) }; Fit.ORDER.forEach((d) => (S.program[d] || []).forEach((e) => { if (m[e.id] && e.incKg !== m[e.id]) e.incKg = m[e.id]; })); knownKgs(); dbGrid(); }
/* 22.10 обход. День C ещё не делался — у жима ногами и махов на блоке «—», хотя в A вес есть. Берём вес того же упражнения из другого дня,
   как Hevy «Previous» (по упражнению, не по дню); диапазон другой — пересчёт Эпли (Fit.startKg без запаса). Нигде не делал — остаётся «—». */
function knownKgs() {
  const all = Fit.ORDER.flatMap((d) => S.program[d] || []);
  all.forEach((e) => { if (!e || !e.kgs || !e.ranges || e.kgs.some((k) => k != null)) return;
    const o = all.find((x) => x && x !== e && x.id === e.id && x.ranges && (x.kgs || []).some((k) => k > 0)); if (!o) return;
    const k = o.kgs.find((x) => x > 0), r = o.ranges[0][1] === e.ranges[0][1] ? null : Fit.startKg(e, k, o.ranges[0][1], 0, 0);
    if (r || o.ranges[0][1] === e.ranges[0][1]) e.kgs = e.kgs.map(() => (r ? r.kgs[0] : k)); });
}
/* Гантели: шаг из заметок Дениса (S.inc, «+2 кг») — плановый вес на сетку шага (13 → 12: гантели 13 кг в зале нет), половина — вниз.
   У гантельного без своей заметки шаг тот же, если его вес уже на сетке (сгибания 12 кг: в программе +2,5, в зале по 2); махи 5 кг не трогаем. */
function dbGrid() {
  const inc = S.inc || {}, n = {}; Object.keys(inc).forEach((id) => { if (Fit.EQ[id] === 'd') n[inc[id]] = (n[inc[id]] || 0) + 1; });
  const st = +Object.keys(n).sort((a, b) => n[b] - n[a])[0] || 0;
  Fit.ORDER.forEach((d) => (S.program[d] || []).forEach((e) => { if (!e || Fit.EQ[e.id] !== 'd' || !e.kgs) return;
    if (inc[e.id]) { e.kgs = e.kgs.map((k) => (k > 0 ? Math.ceil(k / inc[e.id] - 0.5) * inc[e.id] : k)); return; }
    if (st && e.kgs.some((k) => k > 0) && e.kgs.every((k) => k == null || k % st === 0)) e.incKg = st; }));
}
function save() { gymSteps(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Не удалось сохранить'); } }
let summary = S.lastSum || null; // итог лежит в S до «Ок»: iOS PWA перезагружает страницу (сворачивание, обновление SW) — 20.10 итог пропал
let tab = 'today', view = summary ? 'summary' : null; // view: null | 'summary'

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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { saveScroll(true); return; }
  if (rest && !rest.beeped && rest.end <= Date.now()) stopRest(); else if (rest) drawRest(); // iOS замораживал таймер: пересчёт от времени окончания; отдых кончился в фоне — без писка
  if (S.active) lockScreen(); else bkMaybe();
});
// v18: позиция прокрутки экрана тренировки (отдельный ключ, с троттлингом)
const SCRK = KEY + '_scr'; let scrT = 0;
function saveScroll(now) {
  const v = $('#view'); if (!v || !S.active || v.dataset.scr !== 'workout') return;
  const w = () => { scrT = 0; try { localStorage.setItem(SCRK, JSON.stringify({ start: S.active.start, top: Math.round(v.scrollTop) })); } catch (e) { /* нет места */ } };
  if (now) { clearTimeout(scrT); w(); } else if (!scrT) scrT = setTimeout(w, 400);
}
function loadScroll() { try { const j = JSON.parse(localStorage.getItem(SCRK) || 'null'); return j && S.active && j.start === S.active.start ? j.top : 0; } catch (e) { return 0; } }
window.addEventListener('pagehide', () => saveScroll(true));

function startRest(sec) {
  rest = { end: Date.now() + sec * 1000, total: sec, beeped: false };
  if (S.active) { S.active.rest = rest; save(); } // v18: время окончания хранится — свернул/обновил, таймер не теряется
  clearInterval(restTick); restTick = setInterval(drawRest, 250); drawRest();
}
function stopRest() { rest = null; clearInterval(restTick); if (S.active && S.active.rest) { delete S.active.rest; save(); } drawRest(); }
function restoreRest() { // при загрузке: не вышло — продолжаем с остатком; вышло, пока было закрыто, — тихо убираем
  const r = S.active && S.active.rest; if (!r) return;
  if (r.end > Date.now()) { rest = r; clearInterval(restTick); restTick = setInterval(drawRest, 250); } else { delete S.active.rest; save(); }
}
function restPad() { // v18: нижний отступ экрана = высота панели отдыха; текущий подход не под панелью
  const el = $('#rest'), v = $('#view'); if (!el || !v) return;
  if (el.hidden) { v.style.paddingBottom = ''; return; }
  const top = el.getBoundingClientRect().top; v.style.paddingBottom = Math.max(0, Math.ceil(window.innerHeight - top + 16)) + 'px';
}
function keepSetVisible(k) {
  const el = $('#rest'), v = $('#view'); if (!el || el.hidden || !v) return;
  restPad(); const row = v.querySelector(`[data-exk="${k}"] .set:not(.done)`); if (!row) return;
  const lim = el.getBoundingClientRect().top - 8, bt = row.getBoundingClientRect().bottom;
  if (bt > lim) v.scrollTop += bt - lim;
}
const durMin = (t0) => Math.max(0, Math.floor((Date.now() - t0) / 60000));
function drawRest() {
  const el = $('#rest'), v = $('#view'), wd = $('#wdur');
  if (wd && S.active) wd.textContent = durMin(S.active.start) + ' мин';
  if (!rest || !S.active) { el.hidden = true; v.classList.remove('resting'); restPad(); return; }
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
  restPad();
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
  const pace = st.done ? 'цель взята' : st.delta > -0.05 ? (st.delta >= 0.5 ? `опережаешь план на ${fmt(st.delta)} кг` : 'идёшь по плану') : `отстаёшь от плана на ${fmt(-st.delta)} кг`;
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
  const sets = ranges.map((r, i) => ({ kg: kgs[i], reps: (dl || rc.mode === 'deload') && kgs[i] !== ex.kgs[i] ? r[1] : Fit.targetReps(exd, i, Fit.lastAt(last, i, kgs[i])), done: false }));
  const coach = dl ? { dl: 1 } : {};
  if (!dl && rc.mode !== 'ok' && (eased || c.test)) coach.ci = { m: rc.mode, why: rc.why, v: rc.v, ...(rc.g ? { g: rc.g } : {}), ...(eased ? { e: 1 } : {}), ...(c.test ? { test: 1 } : {}) }; // в плохой день замер не ставим — придёт в следующий раз
  if (c.test && rc.mode === 'ok') { const l = sets[sets.length - 1]; l.t = 'f'; l.mx = 1; l.reps = 0; coach.test = 1; } // замер: повторы не подставляем — Денис 11.10: «цель макс, а повторы 10 — это как?» // замер: последний подход — максимум повторов
  if (c.stall && !dl) { coach.stall = 1; if (c.sadd) coach.sadd = 1; }
  if (!S.warmOff && !ex.bw) sets.unshift(...warmSets(ex.id, sets[0].kg, Fit.warmFor(ex))); // разминка по нарастающей стоит сама: число подходов — по тяжести упражнения (гайд автора, Fit.WARM_BY); веса ещё нет — нет и разминки
  return { id: ex.id, name: ex.name, slot: ex.slot, group: ex.group, restSec: ex.restSec, ranges, sets, perf, ...coach };
}
// день: по кругу A-B-C, либо выбранный руками на «Сегодня» (S.pick живёт до старта тренировки)
const dayNow = () => (S.pick && Fit.ORDER.includes(S.pick) ? S.pick : Fit.nextDay(S.sessions));
/* v102 (Денис 22.10: «зачем здесь разминка» у бицепса после тяги): разминка — только у первого упражнения на мышцу, как и написано в подсказке
   первого раза (Fitbod: разминочные подходы — только первому упражнению на группу мышц; Alpha Progression: дальше «one light set or none»).
   Мышца разогрета, если она главная или вторичная у упражнения выше (Fit.MUSCLE): бицепс — тягой, трицепс — жимом, предплечья — первым кистевым */
function warmOnce(items) {
  const hot = new Set();
  return items.map((it) => { const m = Fit.MUSCLE[it.id] || [], was = m[0] && hot.has(m[0]); Fit.warmHot(it.id).forEach((g) => hot.add(g));
    return was ? { ...it, sets: it.sets.filter((x) => x.t !== 'w') } : it; });
}
function startWorkout(ci) {
  const day = dayNow(), cd = coachDay(day); delete S.pick;
  const items = Fit.ssApply(warmOnce(Fit.seq(day, S.program[day]).map((ex) => buildItem(ex, cd[ex.id], ci, day))), (S.ss || {})[day]);
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
// v86: лист дня из календаря «Вес за месяц» — тренировки этого дня (их может быть несколько: пробы), подходы и удаление (тот же sdel, что в «Истории»)
function openCalDay(k) {
  const w = $('#sheet'), ss = S.sessions.filter((s) => Fit.dstr(new Date(s.date)) === k); if (!ss.length) return;
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">${new Date(k + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</div>
    ${ss.map((s) => `<div class="card"><div class="row between"><b>Тренировка ${s.day}</b><span class="muted small">${new Date(s.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}${s.dur ? ' · ' + s.dur + ' мин' : ''} · ${fmt(Fit.sessionVolume(s))} кг</span></div>
      ${s.exercises.map((e) => `<div class="muted small" style="margin-top:4px">${esc(e.name)}: ${setsText(e)}</div>`).join('')}<button class="link" data-act="sdel" data-d="${s.date}" style="min-height:44px;color:#F0524F;padding:0">Удалить тренировку</button></div>`).join('')}
    <button class="link" id="cdx">Закрыть</button></div>`;
  w.onclick = (e) => { if (e.target === w || e.target.id === 'cdx') closeSheet(); };
}
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
  const a = S.active, exercises = [], sum = [], L0 = Fit.slLevels(S.sessions, slBw()), lv0 = L0.overall;
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
    const bs = done.filter((s) => s.t !== 'w' && s.reps > 0).sort((x, y) => Fit.epley(+y.kg || 0, y.reps) - Fit.epley(+x.kg || 0, x.reps))[0];
    sum.push({ id: it.id, cn: done.filter(Fit.counted).length, name: it.name, best: bs && +bs.kg ? `${fmt(bs.kg)} кг × ${bs.reps}` : '', text: setsText(rec), goal: goalAfter(it.id, rec), n: done.length, reps: done.filter(Fit.counted).reduce((v, s) => v + (+s.reps || 0), 0), prs, ups, easy: !!rec.ci, e1, delta: e1 != null && e0 != null ? e1 - e0 : null });
  }
  const dur = durMin(a.start);
  const at = new Date().toISOString();
  if (exercises.length) S.sessions.push({ date: at, day: a.day, p: Fit.PID, dur, exercises, ...(a.ci ? { ci: a.ci } : {}), ...(a.chat && a.chat.length ? { chat: a.chat } : {}) }); // чат уходит в запись — для разбора после зала
  const L1 = Fit.slLevels(S.sessions, slBw()), lv1 = L1.overall; // v60: общий уровень вырос — на итоге «Новый уровень»
  // v12: «Новый уровень 2 — ну и чё?» — какие упражнения подняли (ступень/процент было → стало) и что дальше (вес × 10 до следующей ступени)
  const ups = Object.values(L1.ex).map((o) => ({ o, b: L0.ex[o.id] })).filter(({ o, b }) => !b || o.score > b.score + .5).sort((x, y) => (y.o.score - (y.b ? y.b.score : 0)) - (x.o.score - (x.b ? x.b.score : 0))).slice(0, 3)
    .map(({ o, b }) => ({ name: o.name, l0: b ? b.lvl : 0, l1: o.lvl, p0: b ? b.p : null, p1: o.p }));
  const nexts = Object.values(L1.ex).filter((o) => o.need10).sort((x, y) => y.frac - x.frac).slice(0, 2).map((o) => ({ name: o.name, to: o.to, kg: o.need10 }));
  summary = { at, day: a.day, sum, lvl: exercises.length && lv1.lvl > lv0.lvl ? { lvl: lv1.lvl, p: lv1.p, p0: lv0.p, ups, nexts } : null, empty: !exercises.length, dur, volume: Fit.sessionVolume({ exercises }), sets: sum.reduce((n, s) => n + s.n, 0), prs: sum.filter((s) => s.prs).length, reps: sum.reduce((n, s) => n + (s.reps || 0), 0) };
  if (exercises.length) { const AL = achList(); summary.ach = Ach.fresh(S, AL); Ach.seeAll(S, AL); } // v100: новые награды — на итоге
  S.lastSum = summary; S.active = null; toLayout(); save(); stopRest(); unlockScreen(); view = 'summary'; render(); // версия 98: отложенный перенос раскладки. v114: комментарий v98 съел конец строки — окно итога не открывалось (Денис 24.10)
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
  // v13 (Денис 20.10): без дней A/B/C и «сменить», без калорий, белка и цели; главное — вес лесенкой по дням; «до нормы» внизу. Вариант — ?tv=1..10
  const TV = +(new URLSearchParams(location.search).get('tv')) || 6;
  const day = dayNow(), prog = Fit.seq(day, S.program[day]);
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const bwT = cycNow(), nsets = prog.reduce((n, e) => n + (bwT.deload ? Fit.deloadSets(e.ranges.length) : e.ranges.length), 0);
  const kgText = (e) => (e.kgs.some((k) => k == null) ? 'подбери' : e.kgs.every((k) => !k) ? 'свой вес' : e.kgs.map(fmt).join(' / ') + ' кг');
  const iw = introNow();
  const top = `<div class="hi"><span>${date[0].toUpperCase() + date.slice(1)}</span>Сегодня</div>${bkWarn()}${deloadCard()}${swapCard(day)}
    ${iw ? `<div class="card" id="introc"><h3>После перерыва</h3><div class="tsub">Первые две недели, осталось ${iw.left} дн. Вес бери полегче: в каждом подходе заканчивай, когда мог бы сделать ещё 3–5 повторов.</div></div>` : ''}`;
  if (UI16) return (SV ? T17 : today16)(top.replace(/^<div class="hi">.*?<\/div>/, ''), day, prog, nsets);
  if (TV !== 6) return `${top}<div class="v9">${workCard(TV, prog, nsets, kgText)}</div>`; // старые виды — ?tv=N
  return home81(top.replace(/^<div class="hi">.*?<\/div>/, ''), day, prog, nsets); // v81: главная B + тело // v80 (Денис 21.10): вес месяцем — в «Я», «Сегодня загорятся» убрано
}
/* вес по дням: последние 14 дней (или 21 для недельных ступеней), пропуски — пустые */
function wDays(n) {
  const by = {}; S.weights.forEach((w) => { by[w.date] = w.kg; });
  const t = new Date(); t.setHours(12, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => { const d = new Date(t.getTime() - (n - 1 - i) * 864e5), k = Fit.dstr(d); return { d, k, kg: by[k] ?? null, today: i === n - 1 }; });
}
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const wsgn = (v) => (v == null ? '' : (v > 0 ? '↑' : v < 0 ? '↓' : '=') + (Math.abs(v) < .05 ? '' : fmt(Math.abs(v))));
// словами, как FatSecret «Сброшено: 9 кг»: набрал / сбросил / не изменился
const wword = (v) => (Math.abs(v) < .05 ? 'вес не изменился' : `${v > 0 ? 'набрал' : 'сбросил'} ${fmt(Math.abs(v))} кг`);
function wHead(D) {
  const has = D.filter((x) => x.kg != null), last = has[has.length - 1], first = has[0], ws = Fit.weightStats(S.weights);
  const todayKg = D[D.length - 1].kg, wk = has.length > 1 ? last.kg - first.kg : null;
  return { has, last, first, ws, todayKg, wk, min: Math.min(...has.map((x) => x.kg)), max: Math.max(...has.map((x) => x.kg)) };
}
// ввод утреннего веса прямо здесь, если сегодня ещё не взвешивался (тот же wsave, что во вкладке «Я»)
const wInput = (force) => `<div class="win9"><input id="wnow" inputmode="decimal" placeholder="Вес утром, кг"><button class="primary" data-act="wsave">Записать</button></div>`;
function weightLadder(tv) {
  const D = wDays(tv === 4 ? 21 : tv === 6 ? 30 : 14), H = wHead(D);
  if (!H.has.length) return `<div class="glass"><div class="cap9">ВЕС</div><div class="lb">Взвешивайся каждое утро — здесь вырастет лесенка по дням.</div>${wInput()}</div>`;
  const need = D[D.length - 1].kg == null || tv === 8, inp = need ? wInput() : '';
  const rng = Math.max(.6, H.max - H.min), y = (kg, h, pad = 18) => pad + (1 - (kg - H.min) / rng) * (h - pad * 2);
  const headline = `<div class="row between" style="align-items:flex-end"><div><div class="cap9">ВЕС</div><div class="lb">утренний замер · ${H.has.length} из ${D.length} дн.</div></div>
    <div style="text-align:right"><b class="wbig">${fmt(H.last.kg)}<small> кг</small></b><div class="lb">${H.wk != null ? `за ${D.length} дней ${wword(H.wk)}` : ''}</div></div></div>`;
  const W = 330;
  if (tv === 1 || tv === 10) { // ступени: каждый день — ступенька, вес над ней
    const h = tv === 10 ? 200 : 170, sw = W / D.length; let p = '', lab = '', prev = null;
    D.forEach((x, i) => { if (x.kg == null) return; const yy = y(x.kg, h), x0 = i * sw, x1 = x0 + sw;
      p += prev == null ? `M${x0} ${yy}` : `V${yy}`; p += `H${x1}`; prev = yy;
      lab += `<text x="${x0 + sw / 2}" y="${yy - 5}" font-size="${x.today ? 11 : 8.5}" font-weight="${x.today ? 800 : 600}" text-anchor="middle" fill="${x.today ? '#fff' : '#A3ADAC'}">${fmt(x.kg)}</text>`;
      lab += `<text x="${x0 + sw / 2}" y="${h + 12}" font-size="8.5" text-anchor="middle" fill="${x.today ? '#56CCBF' : '#7C8685'}">${x.today ? 'сег' : x.d.getDate()}</text>`; });
    const t = D[D.length - 1], ty = t.kg != null ? y(t.kg, h) : null;
    return `<div class="glass v9bg">${headline}<svg viewBox="-4 0 ${W + 8} ${h + 16}" width="100%" style="margin-top:8px;overflow:visible"><defs><linearGradient id="wst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14B8A6" stop-opacity=".35"/><stop offset="1" stop-color="#093030" stop-opacity="0"/></linearGradient></defs>
      <path d="${p}V${h}H0Z" fill="url(#wst)"/><path d="${p}" fill="none" stroke="#14B8A6" stroke-width="2.4" stroke-linejoin="round"/>${ty != null ? `<rect x="${W - sw}" y="${ty - 1.5}" width="${sw}" height="3" fill="#8ADCD2" class="wglow"/>` : ''}${lab}</svg>${inp}</div>`;
  }
  if (tv === 2 || tv === 8) { // лесенка строк: сверху сегодня, полоса сдвинута по весу
    const rows = D.slice().reverse().map((x, i, a) => { if (x.kg == null) return `<div class="wr9 off"><span>${DOW[x.d.getDay()]} ${x.d.getDate()}</span><span class="lb">не взвешивался</span></div>`;
      const nx = a.slice(i + 1).find((z) => z.kg != null), dv = nx ? x.kg - nx.kg : null, f = (x.kg - H.min) / rng;
      return `<div class="wr9${x.today ? ' now' : ''}"><span>${x.today ? 'сегодня' : DOW[x.d.getDay()] + ' ' + x.d.getDate()}</span><span class="wtrk"><i style="left:${(f * 82).toFixed(1)}%"></i></span><b>${fmt(x.kg)}</b><small class="${dv > 0 ? 'up' : dv < 0 ? 'dn' : ''}">${dv == null ? '' : wsgn(dv)}</small></div>`; }).join('');
    return `<div class="glass">${headline}${tv === 8 ? inp : ''}<div style="margin-top:8px">${rows}</div>${tv === 8 ? '' : inp}</div>`;
  }
  if (tv === 3) { // столбики по дням: высота от минимума, градиент CB, сегодня светится
    const h = 150, sw = W / D.length; const bars = D.map((x, i) => { if (x.kg == null) return `<text x="${i * sw + sw / 2}" y="${h + 12}" font-size="8.5" text-anchor="middle" fill="#3F4948">${x.d.getDate()}</text>`;
      const yy = y(x.kg, h, 22) - 6; return `<rect x="${i * sw + 3}" y="${yy}" width="${sw - 6}" height="${h - yy}" rx="4" fill="url(#wbar)"${x.today ? ' class="wglow"' : ' opacity=".8"'}/><text x="${i * sw + sw / 2}" y="${yy - 4}" font-size="${x.today ? 10.5 : 8}" font-weight="700" text-anchor="middle" fill="${x.today ? '#fff' : '#A3ADAC'}">${fmt(x.kg)}</text><text x="${i * sw + sw / 2}" y="${h + 12}" font-size="8.5" text-anchor="middle" fill="${x.today ? '#56CCBF' : '#7C8685'}">${x.today ? 'сег' : x.d.getDate()}</text>`; }).join('');
    return `<div class="glass v9bg">${headline}<svg viewBox="0 0 ${W} ${h + 16}" width="100%" style="margin-top:8px;overflow:visible"><defs><linearGradient id="wbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ADCD2"/><stop offset=".35" stop-color="#14B8A6"/><stop offset="1" stop-color="#0C5450"/></linearGradient></defs>${bars}</svg>${inp}</div>`;
  }
  if (tv === 4) { // неделя к неделе: три широкие ступени (среднее недели) и точки дней на них
    const h = 170, wks = [0, 1, 2].map((k) => { const xs = D.slice(k * 7, k * 7 + 7).filter((x) => x.kg != null); return xs.length ? xs.reduce((s, x) => s + x.kg, 0) / xs.length : null; });
    const sw = W / 21; let st = '', dots = '';
    wks.forEach((a, k) => { if (a == null) return; const yy = y(a, h); st += `<rect x="${k * 7 * sw + 2}" y="${yy}" width="${7 * sw - 4}" height="${h - yy}" rx="8" fill="${CB9[k + 1]}" opacity=".85"/><text x="${(k * 7 + 3.5) * sw}" y="${yy + 22}" font-size="15" font-weight="800" text-anchor="middle" fill="#fff">${fmt(a)}</text><text x="${(k * 7 + 3.5) * sw}" y="${h + 13}" font-size="9" text-anchor="middle" fill="#A3ADAC">${['3 нед. назад', '2 нед. назад', 'эта неделя'][k]}</text>`; });
    D.forEach((x, i) => { if (x.kg != null) dots += `<circle cx="${(i + .5) * sw}" cy="${y(x.kg, h)}" r="${x.today ? 4 : 2.6}" fill="${x.today ? '#fff' : '#8ADCD2'}"${x.today ? ' class="wglow"' : ''}/>`; });
    return `<div class="glass v9bg">${headline}<svg viewBox="0 0 ${W} ${h + 18}" width="100%" style="margin-top:8px;overflow:visible">${st}${dots}</svg><div class="lb" style="margin-top:4px">ступень — средний вес недели, точки — каждое утро</div>${inp}</div>`;
  }
  if (tv === 5) { // крупно сегодня + 7 последних замеров настоящей лестницей из блоков
    const L = D.slice(-7), sw = W / 7, h = 120, bl = L.map((x, i) => { if (x.kg == null) return ''; const yy = y(x.kg, h, 14);
      return `<rect x="${i * sw + 1}" y="${yy}" width="${sw - 2}" height="${h - yy}" fill="${x.today ? '#14B8A6' : rampCB(.25 + i / 12)}"${x.today ? ' class="wglow"' : ''}/><text x="${i * sw + sw / 2}" y="${yy + 15}" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">${fmt(x.kg)}</text><text x="${i * sw + sw / 2}" y="${h + 13}" font-size="9.5" text-anchor="middle" fill="#A3ADAC">${x.today ? 'сегодня' : DOW[x.d.getDay()]}</text>`; }).join('');
    return `<div class="glass v9bg" style="text-align:center"><div class="cap9">ВЕС УТРОМ</div><div class="ton">${fmt(H.last.kg)}<small style="font-size:22px"> кг</small></div><div class="lb">${H.ws.pct != null ? `${wsgn(H.ws.avg - H.ws.avg / (1 + H.ws.pct / 100))} кг за неделю (среднее 7 дней)` : ''}</div>
      <svg viewBox="0 0 ${W} ${h + 16}" width="100%" style="margin-top:10px">${bl}</svg>${inp}</div>`;
  }
  if (tv === 6) { // v78: календарь как Gravl (design/v4 V4 экран 2), в клетке — утренний вес; цвет — насколько тяжелее самого лёгкого замера за 30 дней, ярче и со свечением — тяжелее (цель — набор)
    const pad = (D[0].d.getDay() + 6) % 7, hd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<div class="wh9">${w}</div>`).join(''), rg = Math.max(.3, H.max - H.min);
    const cells = D.map((x, i) => { const dl = `animation-delay:${i * 18}ms`; if (x.kg == null) return `<div class="wc6 off${x.today ? ' now' : ''}" style="${dl}"><small>${x.d.getDate()}</small></div>`;
      const t = (x.kg - H.min) / rg, c = ramp(.15 + t * .85); return `<div class="wc6${x.today ? ' now' : ''}" style="background:${c};color:${t > .75 ? '#093030' : '#fff'};${t > .85 ? `box-shadow:0 0 12px ${c}88;` : ''}${dl}"><small>${x.d.getDate()}</small><b>${fmt(x.kg)}</b></div>`; }).join('');
    return `<div class="glass"><div class="cap9">ВЕС УТРОМ</div><div class="three6"><div><b>${fmt(H.last.kg)}</b><span class="lb">кг сейчас</span></div><div><b style="color:${H.wk > 0 ? '#14B8A6' : '#A3ADAC'}">${H.wk == null ? '—' : (H.wk > 0 ? '+' : H.wk < 0 ? '−' : '') + fmt(Math.abs(H.wk))}</b><span class="lb">кг за ${D.length} дн.</span></div><div><b>${H.has.length}</b><span class="lb">замеров из ${D.length}</span></div></div>
      <div class="wgrid9">${hd}${'<div></div>'.repeat(pad)}${cells}</div><div class="row lb" style="gap:8px;margin-top:10px;min-height:0">легче ${gbar(1, 120, 8)} тяжелее</div>${inp}</div>`;
  }
  if (tv === 7) { // как Happy Scale / MacroFactor: точки по дням + линия среднего за 7 дней
    const h = 160, sw = W / D.length, all = S.weights.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const avg7 = (k) => { const t = Date.parse(k), xs = all.filter((w) => { const d = (t - Date.parse(w.date)) / 864e5; return d >= 0 && d < 7; }); return xs.length ? xs.reduce((s, w) => s + w.kg, 0) / xs.length : null; };
    const tr = D.map((x, i) => [i, avg7(x.k)]).filter((z) => z[1] != null), path = tr.map(([i, a], j) => `${j ? 'L' : 'M'}${(i + .5) * sw} ${y(a, h)}`).join('');
    const dots = D.map((x, i) => (x.kg == null ? '' : `<circle cx="${(i + .5) * sw}" cy="${y(x.kg, h)}" r="${x.today ? 4.5 : 3}" fill="${x.today ? '#fff' : '#56CCBF'}" opacity="${x.today ? 1 : .75}"/><text x="${(i + .5) * sw}" y="${h + 12}" font-size="8.5" text-anchor="middle" fill="${x.today ? '#56CCBF' : '#7C8685'}">${x.today ? 'сег' : x.d.getDate()}</text>`)).join('');
    const ta = tr.length ? tr[tr.length - 1][1] : null;
    return `<div class="glass v9bg">${headline}<svg viewBox="0 0 ${W} ${h + 16}" width="100%" style="margin-top:8px;overflow:visible"><path d="${path}" fill="none" stroke="#14B8A6" stroke-width="3" stroke-linecap="round" class="wglow"/>${dots}</svg>
      <div class="row between lb" style="margin-top:4px"><span><i class="dot" style="background:#56CCBF"></i> каждое утро</span><span><i class="dot" style="background:#14B8A6"></i> среднее 7 дней: <b style="color:#fff">${fmt(ta)}</b></span></div>${inp}</div>`;
  }
  if (tv === 9) { // таблетки дней лесенкой: каждая выше/ниже по весу, лента прокручивается
    const h = 150, sw = 62, pills = D.map((x, i) => { if (x.kg == null) return ''; const yy = y(x.kg, h, 10); const pv = D.slice(0, i).reverse().find((z) => z.kg != null), dv = pv ? x.kg - pv.kg : null;
      return `<div class="wp9${x.today ? ' now' : ''}" style="left:${i * sw}px;top:${yy - 10}px"><small>${x.today ? 'сегодня' : DOW[x.d.getDay()] + ' ' + x.d.getDate()}</small><b>${fmt(x.kg)}</b><i class="${dv > 0 ? 'up' : dv < 0 ? 'dn' : ''}">${dv == null ? '' : wsgn(dv)}</i></div>`; }).join('');
    return `<div class="glass v9bg">${headline}<div class="wsc9" id="wsc9"><div style="position:relative;width:${D.length * sw}px;height:${h + 40}px">${pills}</div></div>${inp}</div>`;
  }
  return '';
}
/* карточка тренировки без дня и «сменить»: A — список с весами, B — чипы, C — кольцо долями, D — свёрнутый список */
function workCard(tv, prog, nsets, kgText) {
  const kind = { 1: 'A', 2: 'B', 3: 'A', 4: 'C', 5: 'A', 6: 'B', 7: 'A', 8: 'D', 9: 'C', 10: 'D' }[tv];
  const meta = `${prog.length} ${plural(prog.length, ['упражнение', 'упражнения', 'упражнений'])} · ${nsets} ${plural(nsets, ['подход', 'подхода', 'подходов'])}`;
  // Денис 20.10 (в зале): «почему нет смены дня?» — вернул ссылку на выбор A/B/C (лист openPickDay); все три дня — всё тело, порядок не важен
  const btn = `<button class="primary go9" data-act="start">Начать тренировку ${dayNow()}</button><button class="link" data-act="pickday" style="min-height:44px;width:100%">Сменить день (A · B · C)</button>`;
  const pod = prog.some((e) => e.kgs.some((k) => k == null)) ? '<div class="lb" style="margin-top:8px">«подбери» — вес найдёшь на первой тренировке, шаги в подсказке над упражнением.</div>' : '';
  if (kind === 'A') return `<div class="glass"><div class="row between"><div class="cap9">ТРЕНИРОВКА</div><span class="lb">${meta}</span></div>
    <div style="margin:8px 0">${prog.map((e, i) => `<div class="rowx"><span style="color:#7C8685;width:16px">${i + 1}</span><span style="min-width:0"><b style="font-weight:600">${esc(e.name)}</b><br><small class="lb">${e.ranges.map((r) => r.join('–')).join(' · ')}</small></span><span>${kgText(e)}</span></div>`).join('')}</div>${btn}${pod}</div>`;
  if (kind === 'B') return `<div class="glass"><div class="cap9">ТРЕНИРОВКА</div><div class="lb">${meta}</div><div class="chips9">${prog.map((e) => `<span>${esc(e.name)} <b>${kgText(e)}</b></span>`).join('')}</div>${btn}</div>`;
  if (kind === 'C') { const wk = weeksBack(1)[0];
    return `<div class="glass" style="display:flex;align-items:center;gap:14px">${ring9(wk.n / Fit.WEEK_GOAL, 92, 9, `<text x="46" y="44" font-size="20" font-weight="800" text-anchor="middle" fill="#fff">${wk.n}/${Fit.WEEK_GOAL}</text><text x="46" y="60" font-size="9" text-anchor="middle" fill="#A3ADAC">за 7 дней</text>`)}
      <div style="flex:1;min-width:0"><div class="cap9">ТРЕНИРОВКА</div><div class="lb" style="margin:2px 0 10px">${meta}</div>${btn}</div></div>
      <div class="glass" style="padding:4px 14px">${prog.map((e) => `<div class="rowx"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name)}</span><span>${kgText(e)}</span></div>`).join('')}</div>`; }
  return `<div class="glass"><div class="row between"><div><div class="cap9">ТРЕНИРОВКА</div><div class="lb">${meta}</div></div></div>
    <details class="det9"><summary>Что сегодня ⌄</summary>${prog.map((e) => `<div class="rowx"><span>${esc(e.name)}</span><span>${kgText(e)}</span></div>`).join('')}</details>${btn}</div>`;
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
/* v62 (Денис 20.10 выбрал вариант 4 «как Fitbod» из design/v10): нетронутая мышца — серо-синяя #525C5B→#2A3534, нагрузка — 9 ступеней
   от светло-розового #119789 через #10867B к густо-красному #0F766C (норма), сверху светлее (объём), тёмный шов --edge, норма мягко светится (.hot).
   Градиенты — в <defs> один раз на всё приложение. Рисунок — body.js (MIT). */
const mixC = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// t(g) 0..1 → цвет мышцы; col(g) — свой цвет (итог тренировки); h — высота в px; cls(g) — класс мышцы (hot/soon)
function bodySvg(side, t, o = {}) {
  const B = BODY_PATHS[side], [, , w, hh] = B.vb.split(' ').map(Number), h = o.h || 150, ps = (ds) => ds.map((d) => `<path d="${d}"/>`).join('');
  const groups = Object.entries(B.m).map(([g, ds], i) => `<g data-g="${g}" style="--i:${i}" fill="${o.col ? o.col(g) : mcol(t(g))}" class="${o.cls ? o.cls(g) : ''}"><title>${Fit.MUSCLE_RU[g]}</title>${ps(ds)}</g>`).join('');
  return `<svg class="body" width="${Math.round(h * w / hh)}" height="${h}" viewBox="${B.vb}" aria-label="${side === 'front' ? 'спереди' : 'сзади'}"><g fill="#202A2D">${ps(B.base)}</g>${groups}</svg>`;
}
const halo = (w, h) => `<div class="rglow" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px"></div>`;
const BODY_G = Object.keys(BODY_PATHS.front.m).concat(Object.keys(BODY_PATHS.back.m)).filter((g, i, a) => a.indexOf(g) === i); // 12 групп на рисунке
// v115: норма у каждой мышцы своя (Fit.normOf: большие 10, ягодицы 8, икры 6, задние дельты и пресс 4 — RP); у поясницы нормы нет — серая, в счёт и «докачать» не идёт
const NB = (g) => Fit.normOf(g), BODY_N = BODY_G.filter((g) => NB(g) != null), nok = (v, g) => NB(g) != null && v >= NB(g), nfr = (v, g) => (NB(g) ? v / NB(g) : 0);
const slBw = () => { const a = Fit.weightStats(S.weights).avg; return a != null ? a : +S.profile.weight || 80; };
const slLine = (R) => (R ? `${R.lvl ? `сильнее <b class="blt">${R.p} %</b> людей${R.need10 ? ' · ' : ''}` : ''}${R.need10 ? `до «${Fit.SL_RU[R.to]}» — <b>${fmt(R.need10)} кг × 10</b>` : ''}` : '');
/* v78 — графика из design/v4/kit.js (выбор Дениса 20.10); шкала одна — CRIM вида 1, тусклая DIM — мышца в норме */
const CRIM = ['#093030', '#0C5450', '#10867B', '#14B8A6', '#8ADCD2'], DIM = ['#092B2C', '#0B4744', '#0E655E'];
const ramp = (t, R = CRIM) => { t = Math.max(0, Math.min(1, t)) * (R.length - 1); const i = Math.min(R.length - 2, Math.floor(t)); return mixC(R[i], R[i + 1], t - i); };
/* v107 (Денис 23.10: «тело должно постепенно загораться… чуть-чуть светлее стало… полностью забил — становится красным»):
   t = подходы/норма; 0 — серая, дальше одна бирюза от тёмной к яркой (каждый подход светлее), норма — красная #F0524F (как RED81) */
const LIT107 = ['#123A39', '#0F5E58', '#10867B', '#14B8A6', '#5EEAD4'];
const mcol = (t) => (t >= 1 ? '#F0524F' : t <= 0 ? '#2A3534' : ramp(t, LIT107));
const stops = (R = CRIM, op = 1) => R.map((c, i) => `<stop offset="${i / (R.length - 1)}" stop-color="${c}" stop-opacity="${op}"/>`).join('');
let UID = 0; const uid = (p = 'u') => p + (++UID);
const fluid = (w, h) => `viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;width:100%;height:auto"`;
// полоса: градиент натянут на всю дорожку, видна пройденная часть; opts.marks — риски (старт, нормы), opts.fluid — на всю ширину
function gbar(p, w, h, R = CRIM, track = '#1F3334', opts = {}) {
  const id = uid('b'), fw = Math.max(h, w * Math.max(0, Math.min(1, p || 0))), r = opts.r ?? h / 2;
  const marks = (opts.marks || []).map((m) => `<rect x="${w * m - 1}" y="-3" width="2" height="${h + 6}" rx="1" fill="#ffffff55"/>`).join('');
  return `<svg ${opts.fluid ? fluid(w, h) : `width="${w}" height="${h}" style="overflow:visible;display:block;flex:none"`}><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" x2="${w}">${stops(R)}</linearGradient></defs>
  <rect width="${w}" height="${h}" rx="${r}" fill="${track}"/><rect class="grow" width="${fw}" height="${h}" rx="${r}" fill="url(#${id})"/>${marks}</svg>`;
}
function smooth(P) { return P.map((p, i) => { if (!i) return `M${p[0]} ${p[1]}`; const a = P[i - 1], dx = (p[0] - a[0]) / 2.2; return `C${a[0] + dx} ${a[1]} ${p[0] - dx} ${p[1]} ${p[0]} ${p[1]}`; }).join(' '); }
// область под кривой: линия набирает цвет слева направо, заливка тает вниз; всегда на всю ширину
function garea(vals, w, h, R = CRIM, opts = {}) {
  const pad = opts.pad ?? 10, mn = opts.min ?? Math.min(...vals) * 0.85, mx = opts.max ?? Math.max(...vals) * 1.05;
  const X = (i) => pad + i * (w - 2 * pad) / Math.max(1, vals.length - 1), Y = (v) => h - 22 - (v - mn) / ((mx - mn) || 1) * (h - 40);
  const P = vals.map((v, i) => [X(i), Y(v)]), d = smooth(P), lg = uid('l'), fg = uid('f'), mk = uid('m'), last = P[P.length - 1], lc = R[R.length - 1];
  const lbl = (opts.labels || []).map((l, i) => (i % 2 === (opts.labels.length - 1) % 2 ? `<text x="${X(i)}" y="${h - 4}" font-size="10" text-anchor="middle" fill="#7C8685">${l}</text>` : '')).join('');
  const grid = [0.25, 0.5, 0.75].map((t) => `<line x1="${pad}" x2="${w - pad}" y1="${(h - 22) - t * (h - 40)}" y2="${(h - 22) - t * (h - 40)}" stroke="#ffffff0d"/>`).join('');
  return `<svg ${fluid(w, h)}><defs><linearGradient id="${lg}" gradientUnits="userSpaceOnUse" x1="${pad}" x2="${w - pad}">${stops(R)}</linearGradient>
  <linearGradient id="${fg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${mk}"><path d="${d} L${last[0]} ${h - 22} L${P[0][0]} ${h - 22}Z" fill="url(#${fg})"/></mask></defs>${opts.grid === false ? '' : grid}
  <rect x="0" y="0" width="${w}" height="${h - 22}" fill="url(#${lg})" mask="url(#${mk})" opacity="${opts.fill ?? .45}"/>
  <path class="draw" pathLength="1" d="${d}" fill="none" stroke="url(#${lg})" stroke-width="${opts.sw || 3}" stroke-linecap="round" style="filter:drop-shadow(0 0 6px ${lc}88)"/>
  <circle cx="${last[0]}" cy="${last[1]}" r="9" fill="${lc}" opacity=".25"/><circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${lc}"/>${lbl}</svg>`;
}
// дуга-шкала из долей (WHOOP, V5): каждая доля — свой цвет шкалы
function garc(p, size, w, R = CRIM, opts = {}) {
  const from = opts.from ?? -225, span = opts.span ?? 270, n = opts.n ?? 54, r = (size - w) / 2, c = size / 2;
  const pt = (a) => [c + r * Math.cos(a * Math.PI / 180), c + r * Math.sin(a * Math.PI / 180)];
  let o = '';
  for (let i = 0; i < n; i++) {
    const a0 = from + span * i / n, a1 = from + span * (i + 1) / n - (opts.gapDeg ?? 1.6), on = (i + .5) / n <= p, [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    o += `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" stroke="${on ? ramp(i / (n - 1), R) : (opts.track || '#1F3334')}" stroke-width="${w}" fill="none" ${on ? `class="seg9" style="animation-delay:${i * 12}ms"` : ''}/>`;
  }
  return `<svg width="${size}" height="${size}" style="display:block;overflow:visible;max-width:100%">${o}${opts.inner || ''}</svg>`;
}
const CB9 = CRIM, rampCB = (t) => ramp(t); // старые места (лесенка веса, ring9)
const ring9 = (p, size, w, inner = '') => { const n = Math.round(size / 1.6), r = (size - w) / 2, c = size / 2, on = Math.max(0, Math.min(1, p || 0));
  const pt = (a) => `${(c + r * Math.cos(a * Math.PI / 180)).toFixed(2)} ${(c + r * Math.sin(a * Math.PI / 180)).toFixed(2)}`; let s = '';
  for (let i = 0; i < n; i++) { const lit = (i + .5) / n <= on; s += `<path d="M${pt(-90 + 360 * i / n)} A${r} ${r} 0 0 1 ${pt(-90 + 360 * (i + 1) / n - 2.2)}" stroke="${lit ? rampCB(i / (n - 1)) : 'var(--tr9)'}" stroke-width="${w}" fill="none"${lit ? ` class="seg9" style="animation-delay:${i * 12}ms"` : ''}/>`; }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none;overflow:visible">${s}${inner}</svg>`; };
// 3) полоса как sbar в v7: градиент натянут на всю дорожку (цвет набирается по мере заполнения); ниже нормы — тёмная пара, в норме — палитра 1 и свечение
const bar9 = (p, ok) => { const f = Math.max(0, Math.min(1, p || 0)); return `<span class="b9"><i class="grow9${ok ? ' ok' : ''}" style="width:${Math.round(f * 100)}%;background-size:${f ? (100 / f).toFixed(1) : 100}% 100%"></i></span>`; };
// последние 7 дней и такие же 7-дневные окна назад (Денис 20.10: неделя Пн–Вс во вторник давала нули): зачётные подходы, тренировки, поднято (кг);
// t — последний день окна. Для плиток Обзора и «Подходов за неделю»
function weeksBack(n) {
  const now = Date.now(), d0 = new Date(now), end = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1).getTime(), wk = 7 * 864e5;
  const W = Array.from({ length: n }, (_, i) => ({ t: end - (n - 1 - i) * wk - 864e5, sets: 0, n: 0, kg: 0 }));
  for (const se of S.sessions) { const t = Date.parse(se.date); if (t > now) continue; const i = n - 1 - Math.floor((end - 1 - t) / wk), w = W[i]; if (!w) continue;
    w.n++; w.kg += Fit.sessionVolume(se); w.sets += se.exercises.reduce((v, e) => v + Fit.setsOf(e).filter(Fit.counted).length, 0); }
  return W;
}
/* «Прогресс» — три вкладки как v9 экраны 1–3: Обзор (общий уровень Strength Level — среднее «сильнее X %» по упражнениям, как Symmetric Strength), Тело (подходы за 7 дней против нормы 10), Подходы (подходы + сила главного упражнения мышцы) */
let growSeg = 'Обзор', growSide = 'back';
const pctS = (p) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)} %`;
// «Сила: старт → сейчас» (V6) — по каждому упражнению с весом: первая запись → последняя, полоса от максимума, риска — старт
function liftsAll() {
  const names = [...new Set(S.sessions.flatMap((se) => se.exercises.map((e) => e.name)))];
  return names.map((n) => { const lg = Fit.exLog(S.sessions, n).sort((x, y) => x.t - y.t); if (!lg.length || !(lg[lg.length - 1].kg > 0)) return null;
    const k0 = lg[0].kg, k1 = lg[lg.length - 1].kg; return { n, id: Fit.NAME_ID[n], k0, k1, mx: Math.max(...lg.map((x) => x.kg)), c: lg.length, p: k0 > 0 ? Math.round((k1 / k0 - 1) * 100) : 0, lg }; })
    .filter(Boolean).sort((x, y) => y.p - x.p || y.k1 - x.k1);
}
// Денис 22.10: «прогресс — за всё время: начал поднимать с 50 и как идёт» — линия рабочего веса по тренировкам, старт выделен
// v95 (Денис 22.10: «линии по нарастающей у тренажёров нету» — была только с 2-й тренировки): пунктир к следующему весу по программе (nextKg)
function kgLine(lg, nx) {
  const v = lg.map((x) => x.kg), all = nx ? v.concat(nx) : v, w = 320, h = 58, mn = Math.min(...all), r = Math.max(...all) - mn || 1, e = v.length - 1;
  const X = (i) => 10 + (i / Math.max(1, all.length - 1)) * (w - 56), Y = (k) => h - 14 - ((k - mn) / r) * (h - 28);
  const pts = v.map((k, i) => `${X(i).toFixed(1)},${Y(k).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block;margin-top:6px">${v.length > 1 ? `<polyline points="${pts}" fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${nx ? `<path d="M${X(e)} ${Y(v[e])} L${X(e + 1)} ${Y(nx)}" stroke="#14B8A6" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round"/><circle cx="${X(e + 1)}" cy="${Y(nx)}" r="4.5" fill="#071216" stroke="#14B8A6" stroke-width="2"/><text x="${X(e + 1) + 8}" y="${Y(nx) + 4}" font-size="11" font-weight="600" fill="#14B8A6">${fmt(nx)} кг</text>` : ''}
    <circle cx="${X(0)}" cy="${Y(v[0])}" r="5" fill="#071216" stroke="#8ADCD2" stroke-width="2.5"/><text x="${X(0)}" y="${h - 1}" font-size="10.5" fill="#8ADCD2">старт</text>${e ? `<circle cx="${X(e)}" cy="${Y(v[e])}" r="4.5" fill="#fff"/>` : ''}</svg>`;
}
const nextKg = (id, kg) => { const ex = exById(id); if (!ex || ex.bw || !(kg > 0) || !ex.kgs) return null; const nk = ex.kgs[0]; return nk != null && nk > kg ? nk : ex.incKg > 0 ? kg + ex.incKg : null; };
const weightCard = (x, L) => `<div class="glass lift6"${x.id ? ` data-act="prog" data-id="${x.id}" role="button"` : ''}><div class="row between" style="align-items:baseline;min-height:0"><span style="font-weight:600;font-size:14.5px;flex:1;min-width:0">${esc(x.n)}</span><span style="white-space:nowrap">${x.c > 1 ? `<span style="color:#7C8685">${fmt(x.k0)} →</span> ` : ''}<b style="font-size:18px">${fmt(x.k1)} кг</b>${x.c > 1 ? ` <span style="color:${x.p > 0 ? '#56CCBF' : '#7C8685'};font-size:12.5px;font-weight:600">${pctS(x.p)}</span>` : ''}</span></div>
  <div style="font-size:12px;color:#8ADCD2;margin-top:3px">старт: ${fmt(x.k0)} кг · ${new Date(x.lg[0].t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · ${x.c} ${plural(x.c, ['тренировка', 'тренировки', 'тренировок'])}</div>
  ${x.c > 1 || (x.id && nextKg(x.id, x.k1)) ? kgLine(x.lg, x.id && nextKg(x.id, x.k1)) : ''}${x.id ? nextStep(x.id, x.k1) : ''}<div style="font-size:11.5px;color:#A3ADAC;margin-top:3px">сила (расчётный 1ПМ): ${fmt(Math.round(x.lg[x.lg.length - 1].e1))} кг${x.c > 1 ? ` · было ${fmt(Math.round(x.lg[0].e1))}` : ''}</div>${L.ex[x.id] ? `<div style="font-size:11.5px;color:#A3ADAC;margin-top:3px">${slLine(L.ex[x.id])}</div>` : ''}</div>`;
function screenGrow() {
  const L = Fit.slLevels(S.sessions, slBw()), ms = Fit.muscleSets(S.sessions), ov = L.overall;
  const seg = `<div class="seg3">${['Обзор', 'Тело', 'Сила', 'Веса'].map((t) => `<button data-act="gseg" data-s="${t}" class="${t === growSeg ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  let html = '';
  if (growSeg === 'Обзор') { // V5 WHOOP: огромная шкала уровня + строки метрик
    const W = weeksBack(2), cur = W[1], prev = W[0], okN = BODY_N.filter((g) => nok(ms[g], g)).length, P = Math.round(ov.frac * 100);
    // v108 (Денис 23.10: «что значит ▲70?») — стрелка = разница с прошлыми 7 днями; прошлой недели нет — стрелки нет; подписи в одно слово, «за 7 дней» — заголовком
    const up = (x, y) => (!y || Math.abs(x - y) < .05 ? '' : `${x > y ? '▲' : '▼'} ${fmt(Math.round(Math.abs(x - y) * 10) / 10)}`);
    const met = [['подходов', cur.sets, up(cur.sets, prev.sets)], ['тонн', fmt(Math.round(cur.kg / 100) / 10), up(cur.kg / 1000, prev.kg / 1000)], ['мышц в норме', `${okN}/${BODY_N.length}`, '']], anyUp = met.some((m) => m[2]);
    const goalS = BODY_N.reduce((n, g) => n + NB(g), 0), sq = [[cur.sets / goalS, met[0]], [cur.kg / Math.max(1, prev.kg), met[1]], [okN / BODY_N.length, met[2]]].map(([f, m]) => `<div class="glass sq"><div>${ring9(Math.min(1, f || 0), 30, 4)}</div><b>${m[1]}</b><span>${m[0]}</span>${anyUp ? `<i>${m[2]}</i>` : ''}</div>`);
    html = `<div class="st9h st107"><div class="aur9h"><i></i><i></i><i></i></div><div class="g9h ov107 sheen"><div class="lb" style="text-align:center;letter-spacing:2px;margin-top:4px">СИЛА · УРОВЕНЬ ${ov.lvl} · ${Fit.SL_RU[ov.lvl].toUpperCase()}</div>
      <div class="ring5">${garc(ov.frac, 290, 20, CRIM, { n: 66, inner: `<text x="145" y="150" font-size="76" font-weight="700" text-anchor="middle" fill="#fff" letter-spacing="-3">${P}<tspan font-size="32">%</tspan></text><text x="145" y="180" font-size="12" text-anchor="middle" fill="#14B8A6" letter-spacing="2">${ov.lvl < 5 ? 'ДО УРОВНЯ ' + (ov.lvl + 1) : 'ВЕРХНЯЯ СТУПЕНЬ'}</text>` })}</div>
      ${ov.lvl < 5 ? `<div class="lb" style="text-align:center;margin:-4px 0 10px">${ov.lvl + 1} — «${Fit.SL_RU[ov.lvl + 1]}»: сильнее ${Fit.SL_PCT[ov.lvl]} % людей</div>` : ''}
      <div class="cap9" style="text-align:center;margin:2px 0 8px">ЗА 7 ДНЕЙ</div><div class="sq80 sq108">${sq.join('')}</div>${anyUp ? '<div class="lb" style="text-align:center;margin-top:8px">▲ — больше, чем прошлые 7 дней</div>' : ''}</div></div>`;
  } else if (growSeg === 'Тело') { // V1 Fitbod: одно большое тело, «докачать» горит, пульсирует и подписано
    const need = BODY_N.filter((g) => ms[g] < NB(g)).sort((x, y) => ms[x] - ms[y]);
    html = `<div class="two9"><div><b style="color:#F0524F">${BODY_G.length - need.length}</b>мышц в норме</div><div><b style="color:#14B8A6">${need.length}</b>докачать</div></div>
      <div class="chips" style="margin:6px 0 2px;justify-content:center">${[['front', 'Спереди'], ['back', 'Сзади']].map(([k, n]) => `<button data-act="gside" data-s="${k}" class="${growSide === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="bodies lt107" data-call style="height:390px">${halo(300, 380)}${bodySvg(growSide, (g) => nfr(ms[g], g), { h: 380, cls: (g) => (NB(g) != null && ms[g] < NB(g) ? 'need' : '') })}</div>
      ${need.length ? `<div class="glass" style="background:#132427;border-color:#ff4d6d22;padding:12px 14px"><div class="lb" style="margin-bottom:6px">Докачать на этой неделе</div>${need.map((g) => `<div class="rowx" style="padding:5px 0;border:0"><span style="width:104px">${Fit.MUSCLE_RU[g]}</span>${gbar(nfr(ms[g], g), 150, 8)}<span>ещё ${fmt(Math.ceil(NB(g) - ms[g]))} из ${NB(g)}</span></div>`).join('')}</div>` : ''}${normWhy()}`;
  } else if (growSeg === 'Сила') { // v111 (Денис 23.10: «сила измеряется в подходах, что ли? в весе поднятом»): как Hevy/Boostcamp/JEFIT (research/r46-strength) — объём кг за тренировку + расчётный 1ПМ по каждому упражнению
    const ss = S.sessions.slice().sort((x, y) => Date.parse(x.date) - Date.parse(y.date)).slice(-10).map((se) => ({ d: new Date(se.date).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }),
      kg: Math.round(se.exercises.reduce((v, e) => v + Fit.setsOf(e).filter(Fit.counted).reduce((u, x) => u + (+x.kg || 0) * (x.reps || 0), 0), 0)) }));
    const top = Math.max(1, ...ss.map((x) => x.kg)); // v113 (Денис 23.10: «сила по упражнениям и веса — одно и то же»): список 1ПМ убран, 1ПМ — строкой в карточке «Веса»
    html = `<div class="h6">Поднято за тренировку</div><div class="lb" style="margin:-6px 0 12px">кг: вес × повторы по всем рабочим подходам, без разминки</div>${ss.length ? `<div class="bars110">${ss.map((x) => `<div><b>${x.kg.toLocaleString('ru-RU')}</b><i style="height:${Math.round(x.kg / top * 150)}px"></i><small>${x.d}</small></div>`).join('')}</div>` : '<p class="muted">Появится после первой тренировки.</p>'}
`;
  } else { // Веса (Денис 22.10): подходы за 7 дней живут в «Истории», здесь — каждое упражнение за всё время
    const lifts = liftsAll();
    html = `<div class="lb" style="margin:0 0 8px">рабочий вес за всё время · точка «старт» — первая тренировка · тап — подробно</div>${lifts.length ? lifts.map((x) => weightCard(x, L)).join('') : '<p class="muted">Появится после первой тренировки.</p>'}`;
  }
  return `<div class="v9"><h1>Прогресс</h1>${seg}${html}</div>`;
}
// 6) Денис 20.10: «норма — откуда?» — Schoenfeld 2017 (J Sports Sci, PMID 27433992): 15 исследований, при 10+ подходах на мышцу в неделю рост больше, чем при 5–9 и меньше 5
// v115: малым мышцам своя норма — нижняя планка роста у RP (Renaissance Periodization, research/r39-rp.md)
const normWhy = () => `<div class="why9">Норма в неделю: большим мышцам — от 10 подходов (в разборе 15 исследований так росли больше всего, Schoenfeld, 2017); ягодицам 8, икрам 6, задним дельтам и прессу 4 — с этого они начинают расти (Renaissance Periodization). Пояснице отдельной нормы нет.</div>`;
/* следующий шаг главного упражнения — по прогрессии самой программы (Fit.progress, v69: тот же вес, пока ВСЕ подходы не сделаны
   до верха диапазона, тогда +incKg). Денис 20.10: вместо «+0 %» — что делать, чтобы вес пошёл вверх */
const raz = (n) => n + ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? ' раза' : ' раз');
function nextStep(id, kg) {
  const ex = exById(id); if (!ex || ex.bw || !(kg > 0) || !ex.ranges || !ex.ranges.length) return '';
  const nk = ex.kgs[0], top = ex.ranges[0][1];
  const t = nk != null && nk > kg ? `в следующий раз <b style="color:#fff">${fmt(nk)} кг</b> — повторы сделал` : `дальше: <b style="color:#fff">все подходы по ${raz(top)} с ${fmt(kg)} кг</b> → потом ${fmt(kg + ex.incKg)} кг`;
  return `<div style="font-size:11.5px;color:var(--blt);margin-top:3px">${t}</div>`;
}
// короткие подписи выносок: «Задние» (дельты) и «Задняя» (бедро) путались — Денис 20.10
const CALL_RU = { reardelt: 'Задние плечи', hams: 'Бицепс бедра' };
// выноски «докачать» на вкладке «Тело»: после вставки в DOM — нужны координаты мышц
function callouts(box) {
  const ms = Fit.muscleSets(S.sessions), br = box.getBoundingClientRect(), lx = br.width - 74, seen = {};
  const items = [...box.querySelectorAll('g.need')].map((g) => { const r = g.getBoundingClientRect(); return { g: g.dataset.g, x: r.left + r.width * .7 - br.left, y: r.top + r.height / 2 - br.top }; })
    .filter((i) => !seen[i.g] && (seen[i.g] = 1)).sort((a, b) => a.y - b.y);
  let last = -99; items.forEach((i) => { i.ly = Math.max(i.y, last + 32); last = i.ly; });
  box.insertAdjacentHTML('beforeend', `<svg class="call" width="${br.width}" height="${br.height}">${items.map((i) => `<circle cx="${i.x}" cy="${i.y}" r="3" fill="var(--blt)"/><path d="M${i.x} ${i.y} L${lx - 14} ${i.ly} L${lx - 4} ${i.ly}" fill="none" stroke="#FF7A9299" stroke-dasharray="2 3"/><text x="${lx}" y="${i.ly - 3}" fill="var(--blt)">${CALL_RU[i.g] || Fit.MUSCLE_RU[i.g].split(' ')[0]}</text><text x="${lx}" y="${i.ly + 11}" fill="#fff">${fmt(ms[i.g])}${NB(i.g) == null ? ' подх.' : ' из ' + NB(i.g)}</text>`).join('')}</svg>`);
}
/* «Сегодня загорятся» (v9 экран 4): подходы этого дня по плану (главная группа — подход, вторая — половина, как muscleSets) + подходы за 7 дней; мигают те, что дойдут до нормы */
function todayCard(day, prog) {
  const ms = Fit.muscleSets(S.sessions), dl = cycNow().deload, add = {};
  prog.forEach((e) => { const m = Fit.MUSCLE[e.id]; if (!m) return; const n = dl ? Fit.deloadSets(e.ranges.length) : e.ranges.length; add[m[0]] = (add[m[0]] || 0) + n; m.slice(1).forEach((g) => { add[g] = (add[g] || 0) + n / 2; }); });
  const aft = (g) => ms[g] + (add[g] || 0), soon = (g) => add[g] && !nok(ms[g], g) && nok(aft(g), g);
  const rows = Object.keys(add).filter((g) => add[g] >= 1 && NB(g) != null).sort((a, b) => aft(b) - aft(a)).map((g) => { const ok = nok(aft(g), g);
    return `<div class="rowx"><span style="width:112px">${Fit.MUSCLE_RU[g]}</span><span>за 7 дней — <b style="color:#fff">${Math.round(ms[g])}</b> ${plural(Math.round(ms[g]), ['подход', 'подхода', 'подходов'])}<br><small style="color:#A3ADAC">сегодня добавится <b style="color:#56CCBF">${Math.round(add[g])}</b></small></span><span style="${ok ? 'color:var(--blt);font-weight:700' : ''}">${nok(ms[g], g) ? 'хватает ✓' : ok ? 'после сегодня хватит ✓' : 'не хватает ' + Math.ceil(NB(g) - aft(g))}</span></div>`; }).join('');
  return `<div class="v9"><div class="glass v9bg" data-act="gbody" role="button" style="padding:12px 14px"><div class="cap9">СЕГОДНЯ ЗАГОРЯТСЯ</div><div class="lb" style="font-size:11.5px">Сколько подходов на каждую мышцу ты сделал за последние 7 дней. Чтобы мышца росла, нужно в неделю: большим мышцам 10–20 подходов, ягодицам от 8, икрам от 6, задним дельтам и прессу от 4.</div>
    <div class="bodies" style="margin:6px 0 4px">${halo(300, 260)}${['front', 'back'].map((s) => bodySvg(s, null, { col: (g) => (soon(g) ? '#14B8A6' : add[g] ? '#10867B' : nok(ms[g], g) ? mcol(nfr(ms[g], g)) : '#092B2C'), h: 210, cls: (g) => (soon(g) ? 'soon' : nok(ms[g], g) ? 'hot' : '') })).join('')}</div>${rows}</div></div>`;
}
/* итог (v9 экраны 5–6): мышцы тренировки загораются по очереди (основные — норма, вторые — почти), мышца с рекордом вспыхивает; общий уровень вырос — «Новый уровень» */
function summaryCards() {
  const s = summary, m1 = new Set(), m2 = new Set(), rec = new Set();
  const nm = {}, nh = {}; // подходы за эту тренировку: главная мышца упражнения — основные, остальные — помогали
  s.sum.forEach((x) => { const m = Fit.MUSCLE[x.id] || Fit.MUSCLE[Fit.NAME_ID[x.name]]; if (!m) return; const n = x.cn != null ? x.cn : x.n; m1.add(m[0]); nm[m[0]] = (nm[m[0]] || 0) + n; m.slice(1).forEach((g) => { m2.add(g); nh[g] = (nh[g] || 0) + n; }); if (x.prs) rec.add(m[0]); });
  const pd = (n) => `${n} ${plural(n, ['подход', 'подхода', 'подходов'])}`;
  const mrows = [...Object.keys(nm).sort((a, b) => nm[b] - nm[a]).map((g) => `<div class="rowx"><span>${Fit.MUSCLE_RU[g]}</span><span><b style="color:#fff">${pd(nm[g])}</b>${nh[g] ? ` <small style="color:#A3ADAC">+ ${nh[g]} вторым</small>` : ''}</span></div>`),
    ...Object.keys(nh).filter((g) => !nm[g]).sort((a, b) => nh[b] - nh[a]).map((g) => `<div class="rowx"><span style="color:#A3ADAC">${Fit.MUSCLE_RU[g]}</span><span style="color:#A3ADAC">вторая мышца · ${pd(nh[g])}</span></div>`)].join('');
  const col = (g) => (m1.has(g) ? '#14B8A6' : m2.has(g) ? '#8ADCD2' : '#092B2C'), prs = s.sum.filter((x) => x.prs && x.best);
  const lv = s.lvl, Lr = Fit.SL_RU;
  return `<div class="v9"><div class="glass ignite" data-relight data-m1="${[...m1]}" data-m2="${[...m2].filter((g) => !m1.has(g))}" data-rec="${[...rec]}" role="button" style="position:relative;overflow:hidden"><div class="cap9" style="text-align:center">МЫШЦЫ СЕГОДНЯ</div>
    <div class="row" style="gap:12px;justify-content:center;font-size:11.5px;color:#A3ADAC;margin:4px 0 6px;flex-wrap:wrap"><span><i class="dot" style="background:#14B8A6"></i> основные</span><span><i class="dot" style="background:#8ADCD2"></i> вторые</span>${rec.size ? '<span>🏆 вспыхнет — рекорд</span>' : ''}</div>
    <div class="bodies"><div class="burst"></div>${['front', 'back'].map((sd) => bodySvg(sd, null, { h: 250, col })).join('')}</div>${mrows ? `<div class="lv9" style="text-align:left">${mrows}</div>` : ''}</div>
    ${prs.length ? `<div class="glass" style="padding:4px 14px">${prs.map((x) => `<div class="rowx" style="border-top:0;border-bottom:1px solid #ffffff10">🏆 ${esc(x.name)} — рекорд<span style="color:#fff;font-weight:600">${x.best}</span></div>`).join('')}</div>` : ''}
    ${lv ? `<div class="glass levelup" data-relight role="button" style="text-align:center;position:relative;overflow:hidden;padding:18px 14px"><div class="gj" style="font-size:22px">НОВЫЙ УРОВЕНЬ</div><div class="ton" style="font-size:40px;margin:6px 0 0">${lv.lvl} · ${Lr[lv.lvl]}</div>
      <div style="font-size:15px;margin-top:6px;line-height:1.35">ты сильнее <b class="blt">${lv.p} %</b> мужчин твоего веса${lv.p0 != null ? ` — было ${lv.p0} %` : ''}</div>
      <div class="lb" style="font-size:11.5px">по таблицам Strength Level, среднее по твоим упражнениям</div>
      ${lv.ups && lv.ups.length ? `<div class="lv9"><div class="lb">ЧТО ПОДНЯЛО</div>${lv.ups.map((u) => `<div class="rowx"><span>${esc(u.name)}</span><span>${u.l1 > u.l0 ? `${Lr[u.l0]} → <b style="color:#fff">${Lr[u.l1]}</b>` : `<b style="color:#fff">${Lr[u.l1]}</b>`}${u.p1 != null ? ` · <b class="blt">${u.p0 != null ? u.p0 + ' → ' : ''}${u.p1} %</b>` : ''}</span></div>`).join('')}</div>` : ''}
      ${lv.lvl < 5 && lv.nexts && lv.nexts.length ? `<div class="lv9"><div class="lb">ЧТО ДАЛЬШЕ · до «${Lr[lv.lvl + 1]}» — сильнее ${Fit.SL_PCT[lv.lvl]} %</div>${lv.nexts.map((x) => `<div class="rowx"><span>${esc(x.name)}</span><span>до «${Lr[x.to]}» — <b style="color:#fff">${fmt(x.kg)} кг × 10</b></span></div>`).join('')}</div>` : ''}<div class="ladder" style="margin:12px 10px 0">${Lr.map((n, i) => `<i class="${i <= lv.lvl ? 'done' : ''}"></i>`).join('')}</div>
      <div class="row between" style="font-size:9.5px;color:#7C8685;margin:4px 6px 0">${Lr.map((n) => `<span>${n}</span>`).join('')}</div>
      <div class="bodies" style="margin-top:10px"><div class="burst"></div>${['front', 'back'].map((sd) => bodySvg(sd, null, { h: 230, col: () => '#14B8A6' })).join('')}</div></div>` : ''}</div>`;
}
// зажечь: мышцы по очереди; мышцы с рекордом потом трижды вспыхивают; на новом уровне — всё тело разом
function ignite(card) {
  const burst = card.querySelector('.burst'); burst.style.animation = 'none'; void burst.offsetWidth; burst.style.animation = '';
  const all = card.classList.contains('levelup'), sp = (k) => (card.dataset[k] ? card.dataset[k].split(',') : []), m1 = sp('m1'), rec = sp('rec'), ord = all ? BODY_G : [...m1, ...sp('m2')];
  card.querySelectorAll('g[data-g]').forEach((g) => {
    g.classList.remove('ign', 'hot', 'warm', 'rec'); const k = ord.indexOf(g.dataset.g); if (k < 0) return;
    const d = all ? 100 + k * 40 : 150 + k * 170, r = !all && rec.includes(g.dataset.g); g.style.setProperty('--c', g.getAttribute('fill')); g.style.animationDelay = d + 'ms'; void g.getBBox(); g.classList.add('ign');
    setTimeout(() => { g.classList.add(all || m1.includes(g.dataset.g) ? 'hot' : 'warm'); if (r) { g.classList.remove('ign'); g.style.animationDelay = '0ms'; g.classList.add('rec'); } }, d + 1100 + (r ? 700 : 0));
  });
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
// Денис 20.10: «перерывы больше минуты не делаю» — отдых у всех упражнений не длиннее минуты (у автора 1,5–3 мин в данных остаются)
const REST_MAX = 60, restOf = (it) => Math.min(it.restSec || REST_MAX, REST_MAX);
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
// первый раз: после подхода — «сколько ещё мог» и вес следующего числом (Денис 20.10: «на шаг тяжелее — что дальше?»).
// Fitbod: стартовый вес «with roughly 2 to 3 reps in reserve, and then adjusts … based on what you actually log» (research/warmup-first-time-1510.md)
const stepOf = (it) => (exById(it.id) || {}).incKg || 2.5;
/* v102 (Денис 22.10: «пишу в заметке разбег 7,5 — запомни на будущее»): заметка со словом «разбег»/«шаг» и числом с «кг» = шаг этого тренажёра.
   Пишется в S.inc (тот же, что ⋮ → Шаг веса) и сразу идёт в прибавку следующего раза и в округление разминки. */
function noteStep(t) { t = String(t || ''); if (!/разб|шаг/i.test(t)) return null; const m = t.match(/(\d+(?:[.,]\d+)?)\s*кг/i), v = m && parseFloat(m[1].replace(',', '.')); return v >= 0.5 && v <= 20 ? v : null; }
function stepsFromNotes() { // разово: заметки, написанные до v102, — в шаги (по порядку тренировок, поздняя главнее)
  if (S.incN) return; S.inc = S.inc || {};
  S.sessions.forEach((x) => (x.exercises || []).forEach((e) => { const v = noteStep(e.note), id = Fit.NAME_ID[e.name]; if (v && id) S.inc[id] = v; }));
  S.incN = 1;
}
const noteFoot = (it, k) => { const v = noteStep(it.note), q = /\?/.test(it.note || '');
  return `<div class="nfoot" data-nf="${k}"${(it.note || '').trim() ? '' : ' hidden'}>${v ? `<b>Шаг ${fmt(v)} кг — запомнил</b>: прибавлять буду по ${fmt(v)} кг. ` : ''}Заметка уйдёт в историю и в следующий раз покажется серым над полем.${q ? `<button data-act="nask" data-k="${k}">Спросить тренера</button>` : ''}</div>`; };
function askHtml(it, k) {
  const open = (j) => it.sets.slice(j + 1).some((x) => Fit.counted(x) && !x.done);
  const j = it.sets.findLastIndex((s) => s.done && Fit.counted(s));
  if (j < 0 || !open(j)) return '';
  const s = it.sets[j], n = it.sets.slice(0, j + 1).filter(Fit.counted).length;
  if (s.rir == null) return `<div class="cban ask"><b>Подход ${n}</b>Сколько ещё раз мог сделать?<div class="row">${[['0', 0], ['1–2', 1], ['3 и больше', 3]].map(([t, v]) => `<button data-act="rir" data-k="${k}" data-j="${j}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  const nk = s.nk, d = nk - s.kg;
  return `<div class="cban ask"><b>Следующий подход</b><span class="big">${fmt(nk)} кг</span> — ${d > 0 ? `тяжелее на ${fmt(d)} кг` : d < 0 ? `легче на ${fmt(-d)} кг` : 'тот же вес'}. Повторов — сколько выйдет, от ${Fit.rangeOf(it, n)[0]} до ${Fit.rangeOf(it, n)[1]}.</div>`;
}
// v18: из «Когда стоп / Осторожно / Проверка силы» сверху одна, самая важная, одной строкой; остальные — «ещё N» (раскрытие помнится в тренировке)
function hintsH(k, info, ban) {
  const ord = [['fh', (x) => x[0] === 'fh'], ['Проверка силы', (x) => x[1] === 'Проверка силы'], ['eff', (x) => x[0] === 'eff']];
  const have = ord.filter(([, f]) => info.some(f)); if (!have.length) return '';
  if (S.active.hx && S.active.hx[k]) return ban(['eff', 'fh', 'Проверка силы']);
  const x = info.find(have[0][1]), n = have.length - 1;
  return `<div style="display:flex;gap:8px;align-items:center;margin:6px 0"><div class="cban${x[0] ? ' ' + x[0] : ''}" data-act="hmore" data-k="${k}" role="button" style="flex:1;min-width:0;margin:0;padding:7px 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${x[1]}</b>${x[2]}</div>${n ? `<button data-act="hmore" data-k="${k}" style="flex:none;min-height:36px;padding:0 12px;border-radius:8px;background:var(--glass-2);font-size:14px">ещё ${n}</button>` : ''}</div>`;
}
function exHtml(k) {
  const a0 = S.active, it = a0.items[k], pf = it.perf, first = !pf; // first — упражнение ещё ни разу не делал: вес и повторы вписывает сам
  const rows = it.sets.map((s, j) => {
    const pi = Fit.prevIndex(pf, it.sets, j), ps = pi >= 0 ? pf.sets[pi] : null, kg = setKg(it, s);
    const cmp = setCmp(it, j);
    // цель — диапазон повторов этого подхода, как колонка Target у Boostcamp; под ней прибавка веса к прошлому разу
    const rg = Fit.counted(s) ? Fit.rangeOf(it, it.sets.slice(0, j).filter(Fit.counted).length) : null;
    const plus = rg && ps && kg > ps.kg ? `<small>тяжелее на ${fmt(kg - ps.kg)}</small>` : '';
    const badge = cmp === 'pr' ? '<small class="pr">рекорд</small>' : cmp === 'up' ? '<small class="pos">↑ лучше</small>' : '';
    const ik = (exById(it.id) || {}).bw ? '<div class="cell bwc" aria-label="Свой вес">свой вес</div>' : `<input class="cell" data-sk="${k}" data-j="${j}" type="text" inputmode="decimal" autocomplete="off" value="${kg == null ? '' : fmt(kg)}" placeholder="кг" aria-label="Вес, кг">`;
    const ir = `<input class="cell" data-sr="${k}" data-j="${j}" type="text" inputmode="numeric" autocomplete="off" value="${(s.mx || first) && !s.done && !s.touched ? '' : s.reps}" placeholder="${s.mx ? '?' : first && rg ? rg[1] : ''}" aria-label="Повторы">`;
    if (SV) return R17({ s, ps, kg, rg, plus, badge, first, it, k, j, ik, ir, no: setNo(it.sets, j) }); // v17: 10 видов строки, ui17.js
    return `<div class="set${s.done ? ' done' : ''}">
    <button class="num t-${s.t || 'n'}" data-act="stype" data-k="${k}" data-j="${j}" aria-label="Тип подхода">${setNo(it.sets, j)}</button>
    <div class="prev">${ps ? `${fmt(ps.kg)} кг × ${ps.reps}` : '—'}${badge}</div>
    <div class="tg">${s.mx ? 'макс' : rg ? rg.join('–') : '—'}${plus}</div>
    ${ik}
    ${ir}
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
  // первый раз (Денис 20.10: «раз 30 / раз 20 — расплывчато, разминки до хуя, „ты уже разогрет“ везде не надо»): пробный подход и поправка по факту —
  // Fitbod: вес «with roughly 2 to 3 reps in reserve, and then adjusts … based on what you actually log»; RP: старт — любой вес в диапазоне 5–30 RM.
  // Разминка — один лёгкий подход и только на первом упражнении (Fitbod: только первое упражнение на мышцу; Alpha Progression: дальше «one light set or none»)
  const rg0 = Fit.rangeOf(it, 0);
  const firstHint = !first ? '' : k === 0 ? `<div class="cban fh"><b>Первый раз — подбери вес</b>Разминка: один лёгкий подход на 12. Первый рабочий — вес, с которым точно сделаешь ${rg0[1]}. После каждого подхода спрошу, сколько ещё мог, и сам впишу вес следующего: мог ещё 3 и больше — тяжелее на ${fmt(stepOf(it))} кг; не дотянул до ${rg0[0]} — легче на ${fmt(stepOf(it))} кг.${pickB}</div>` : pickB ? `<div class="cban fh">${pickB}</div>` : '';
  // справочные плашки: [класс, заголовок, текст]; в ui16 — чипами (ui16.js), иначе — как было
  const effT = `${Fit.effort(it, introNow())}${it.test ? ' Это на все подходы, кроме последнего «О» — он на максимум.' : ' Это на каждый подход.'}`, left = it.sets.some((x) => !x.done);
  const info = [left && ['eff', 'Когда стоп', effT], SAFE[it.id] && left && ['fh', 'Осторожно', esc(SAFE[it.id])],
    it.test && ['', 'Проверка силы', 'Первые подходы делай как обычно. Последний (строка «О») — сколько сможешь: делай, пока получается ровно, без рывков. Потом впиши, сколько вышло.'],
    it.ci && ['ci', it.ci.e ? (it.ci.m === 'deload' ? 'Легче' : 'Без прибавки') : 'Замер перенесён', `${it.ci.e ? (it.ci.m === 'deload' ? 'Вес ниже планового примерно на 10 % — до шага снаряда' : 'Вес как в прошлый раз, прибавка подождёт') + ': ' : ''}${ciWhy(it.ci)}.${it.ci.e && it.ci.test ? ' Замер перенесён.' : ''}${it.ci.e ? ' Сил больше — поправь вес сам.' : ''}`],
    it.dl && ['', 'Разгрузка', 'Подходов вдвое меньше, вес примерно на 10 % ниже. Заканчивай с запасом: сегодня восстанавливаемся.'],
    it.added && ['', 'Добавлен подход', 'Теперь на один подход больше. Если вес не пойдёт и дальше — предложим снизить его на 10 %.']].filter(Boolean);
  const ban = (ks) => info.filter((x) => ks.includes(x[1]) || ks.includes(x[0])).map(([c, t, x]) => (c === 'eff' ? `<div class="eff" data-act="effhelp" role="button"><b>${t}</b>${x} <u>подробнее</u></div>` : `<div class="cban${c ? ' ' + c : ''}"><b>${t}</b>${x}</div>`)).join('');
  const offH = off ? `<div class="cban"><b>Суперсет</b>Можно делать в паре с «${esc(off.o.name)}»: подход этого упражнения — сразу подход того — потом отдых. Подходы те же, тренировка короче примерно на ${fmt(off.min)} мин, по ощущению тяжелее.<div class="row"><button data-act="ss-yes" data-k="${k}" data-j="${off.j}">Объединить</button><button data-act="ss-no" data-p="${off.key}">Не надо</button></div></div>` : '';
  const stallH = (it.stall && it.sadd ? `<div class="cban st"><b>Вес не растёт</b>Уже ${Fit.STALL_SESSIONS} тренировки подряд ни веса, ни повторов не прибавилось. На эту мышцу в неделю стоит меньше ${Fit.STALL_ADD_MAX} подходов — дай ей ещё один (отдача падает около 18–20 в неделю, ACSM 2026). Добавить подход?<div class="row"><button data-act="sadd-yes" data-k="${k}">Добавить</button><button data-act="sadd-no" data-k="${k}">Нет</button></div></div>` : '')
    + (it.stall && !it.sadd ? `<div class="cban st"><b>Вес не растёт</b>Уже ${Fit.STALL_SESSIONS} тренировки подряд ни веса, ни повторов не прибавилось.${canReset ? ` Сними 10 % веса — и снова пойдёшь вверх.<button data-act="deload" data-k="${k}">Сбросить на 10 %</button>` : ''}</div>` : '');
  const goalH = gi ? `<div class="cgoal" data-act="prog" data-id="${it.id}">Цель ${fmt(gi.g.kg)} кг к ${dshort(gi.g.by)} · сейчас ${fmt(gi.e1)} · <span class="${gi.cls}">${gi.pace}</span></div>` : '';
  const coach = UI16 ? goalH + firstHint + chips16(k, info) + offH + stallH
    : goalH + firstHint + hintsH(k, info, ban) + ban(['ci']) + offH + ban(['Разгрузка', 'Добавлен подход']) + stallH;
  const allDone = it.sets.length && it.sets.every((x) => x.done), nk = a0.items.findIndex((x, i) => i > k && !x.closed);
  if (allDone && it.closed) return `<div class="ex exdone" data-exk="${k}" data-act="exopen" data-k="${k}" role="button"><i>${ico('check')}</i><div class="grow"><b>${esc(it.name)}</b><small>${setsText(Fit.record(it.name, it.sets[0].kg, it.sets.map((x) => ({ ...x, reps: +x.reps }))))}</small></div><span class="lb">открыть</span></div>`;
  return `<div class="ex" data-exk="${k}"><div class="exh">${UI16 ? thumb16(it.id, 44) : ''}<div class="exn" data-act="prog" data-id="${it.id}">${esc(it.name)}</div><button class="more q" data-act="tech" data-k="${k}" aria-label="Техника">?</button><button class="more" data-act="exmenu" data-k="${k}" aria-label="Меню упражнения">${ico('more')}</button></div>
    ${rn ? `<div class="rnote">${linkify(rn)}</div>` : ''}${ln ? `<div class="lnote"${it.note ? ' hidden' : ''}>${esc(ln)}</div>` : ''}<textarea class="xnote" data-xn="${k}" rows="1" placeholder="Добавить заметку…" aria-label="Заметка к этой тренировке">${esc(it.note || '')}</textarea>${noteFoot(it, k)}
    ${coach}<div class="exrest">${ico('clock')}План: ${it.sets.filter(Fit.counted).length} ${plural(it.sets.filter(Fit.counted).length, ['подход', 'подхода', 'подходов'])} · отдых ${restText(restOf(it))}</div>
    ${SV ? SET17(it, k, rows) : `<div class="shead"><span>СЕТ</span><span>БЫЛО</span><span>ЦЕЛЬ</span><span>КГ</span><span>ПОВТ</span><span></span></div>${rows}`}${first ? askHtml(it, k) : ''}
    ${allDone ? `<button class="primary exnext" data-act="exnext" data-k="${k}">Готово → ${nk >= 0 ? 'дальше: ' + esc(a0.items[nk].name) : 'завершить тренировку'}</button>` : ''}</div>`;
}
function screenSummary() {
  const rows = summary.sum.map((s) => `<div class="kv"><div class="grow"><div>${esc(s.name)}${s.prs ? ' <b class="pr small">рекорд</b>' : ''}</div><div class="muted small">${s.text}</div>${s.goal ? `<div class="small cgl">${s.goal}</div>` : ''}</div>
    <div style="text-align:right;white-space:nowrap"><div class="${s.ups.length && !s.easy ? 'pos' : 'muted'}">${s.ups.length ? 'в следующий раз ' + s.ups.map(fmt).join(' / ') + ' кг' : 'в следующий раз тот же вес'}</div>
    ${s.e1 == null ? '' : `<div class="muted small">сила на 1 раз ≈ ${fmt(s.e1)} кг${s.delta != null && Math.abs(s.delta) >= .05 ? ` · <span class="${s.delta >= 0 ? 'pos' : 'neg'}">${s.delta >= 0 ? 'выросла' : 'упала'} на ${fmt(Math.abs(s.delta))}</span>` : ''}</div>`}</div></div>`).join('');
  // v78 — итог как Gymverse (design/v4 V3) в малиновой гамме: «ОТЛИЧНО!», огромная цифра кг, подходы/повторы/рекорды, тело, строки упражнений
  // v101 (лист app-118 №26, №27 — Gentler Streak 1 и 4): кг набегают, под ними кривая «подход за подходом», снизу наезжает косая лента
  const sm = summary, top = sm.empty ? '' : `<div class="glass"><div class="gj3">ОТЛИЧНО!</div><div class="ton3"><span class="cu81" data-cu="${Math.round(sm.volume)}" data-sp="1" data-ms="1600">${sp3(sm.volume)}</span><span style="font-size:34px"> кг</span></div>${curve101(sm)}<div class="lb" style="text-align:center">поднято за тренировку · ${sm.dur} мин</div>
    <div class="tri3"><div><div class="ton3 s">${sm.sets}</div><div class="lb">${plural(sm.sets, ['подход', 'подхода', 'подходов'])}</div></div><div><div class="ton3 s">${sm.reps ?? '—'}</div><div class="lb">повторов</div></div><div><div class="ton3 s" style="color:#14B8A6">${sm.prs ? '+' + sm.prs : 0}</div><div class="lb">${plural(sm.prs, ['рекорд', 'рекорда', 'рекордов'])}</div></div></div></div>
    <div class="rb101"><span>ТРЕНИРОВКА ЗАСЧИТАНА!</span></div>`;
  return `<div class="sum3"><h1>Готово</h1><div class="muted small" style="margin:-8px 4px 12px">Тренировка ${sm.day} сохранена. Следующая: ${Fit.nextDay(S.sessions)}</div>${top}
    ${achNew100(sm.ach)}
    ${sm.empty ? '<div class="card"><p>Ни одного сета не отмечено — ничего не записано.</p></div>' : summaryCards() + `<div class="card">${rows}</div>`}
    <button class="primary" data-act="summary-ok">Ок</button>${!sm.empty && sm.at ? '<button class="link" data-act="sdel" data-d="' + sm.at + '" style="min-height:44px;width:100%;color:#F0524F">Это была проба — удалить тренировку</button>' : ''}</div>`;
}
// кривая итога: поднятые кг нарастающим итогом по подходам тренировки (тот же счёт, что Fit.sessionVolume), рисуется за то же время, что набегает цифра
function curve101(sm) {
  const ses = S.sessions.find((s) => s.date === sm.at); if (!ses) return '';
  let acc = 0; const v = [0]; ses.exercises.forEach((e) => Fit.setsOf(e).forEach((x) => { acc += (+x.kg || 0) * x.reps; v.push(acc); }));
  if (v.length < 3 || !acc) return '';
  const w = 300, h = 70, pts = v.map((a, i) => [(i / (v.length - 1)) * (w - 12) + 6, h - 6 - (a / acc) * (h - 14)]);
  return `<svg class="cv101" viewBox="0 0 ${w} ${h}" width="100%" height="${h}"><polyline points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" pathLength="1" fill="none" stroke="#14B8A6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="5" fill="#fff"/></svg>`;
}
function spark(vals) {
  if (vals.length < 2) return '<svg class="spark"></svg>';
  const min = Math.min(...vals), max = Math.max(...vals), w = 84, h = 26, r = max - min || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - min) / r) * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="#14B8A6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function screenHistory() {
  // строка упражнения: расчётный 1ПМ (у своего веса — повторы), цель; тап — экран упражнения
  const sp = Fit.ORDER.flatMap((d) => S.program[d]).map((x) => {
    const l = Fit.exLog(S.sessions, x.name); if (!l.length) return '';
    const bw = !l.some((p) => p.e1 > 0), vals = l.map((p) => (bw ? p.reps : p.e1)), gi = goalInfo(x.id, l);
    return `<div class="kv" data-act="prog" data-id="${x.id}" role="button" style="align-items:center"><div class="grow">${esc(x.name)}${gi ? `<div class="muted small">цель ${fmt(gi.g.kg)} кг · <span class="${gi.cls}">${gi.pace}</span></div>` : ''}</div>
      <div class="muted small" style="margin-right:10px;white-space:nowrap">${bw ? vals[vals.length - 1] + ' повт' : fmt(vals[vals.length - 1]) + ' кг'}</div>${spark(vals)}</div>`; }).join('');
  const wk7 = [...S.sessions].reverse().filter((x) => Date.now() - Date.parse(x.date) < 7 * 864e5), list = wk7.map((s) => `<div class="card"><div class="row between"><b>Тренировка ${s.day}</b><span class="muted small">${new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}${s.dur ? ' · ' + s.dur + ' мин' : ''} · ${fmt(Fit.sessionVolume(s))} кг</span></div>
    ${s.exercises.map((e) => `<div class="muted small" style="margin-top:4px">${esc(e.name)}: ${setsText(e)}</div>${e.note ? `<div class="hnote">${esc(e.note)}</div>` : ''}`).join('')}<button class="link" data-act="sdel" data-d="${s.date}" style="min-height:44px;color:#F0524F;padding:0">Удалить тренировку</button></div>`).join('');
  // app-019: подходы на мышцу за 7 дней против нормы 10–20 (Schoenfeld 2017; r4). Шкала до 32 (версия 98: предплечья до 30), зелёная зона 10–20, засечка — план программы
  const vol = Fit.muscleWeek(S.sessions, Date.now(), S.program), any = vol.some((g) => g.fact > 0), MAX = 32, px = (n) => Math.min(100, Math.round((n / MAX) * 100));
  const vrows = vol.map((g) => `<div class="vrow"><div class="vname">${g.name}</div><div class="vbar"><i class="zone" style="left:${px(g.lo)}%;width:${px(g.hi) - px(g.lo)}%"></i><i class="fill ${g.status}" style="width:${px(g.fact)}%"></i>${g.plan ? `<i class="tick" style="left:${px(g.plan)}%" title="план ${fmt(g.plan)}"></i>` : ''}</div><b class="vnum ${g.status}">${fmt(g.fact)}</b></div>`).join('');
  const lowMiss = vol.filter((g) => g.status === 'low' && g.fact > 0 && g.fact < g.plan - 0.5).map((g) => g.name.toLowerCase()), lowPlan = vol.filter((g) => g.status === 'low' && g.plan > 0 && g.plan < g.lo).map((g) => `${g.name.toLowerCase()} ${fmt(g.plan)}`), high = vol.filter((g) => g.status === 'high').map((g) => g.name.toLowerCase());
  const vnote = !any ? 'Появится после первой тренировки. Норма — 10–20 рабочих подходов на мышцу в неделю.'
    : high.length ? `Больше нормы: ${high.join(', ')} — лишнее не растит, а копит усталость.`
    : lowMiss.length ? `Меньше плана: ${lowMiss.join(', ')} — пропущен день или подходы не отмечены.`
    : lowPlan.length ? `Программа даёт меньше 10 на ${lowPlan.join(', ')} — так задумано на старте блока; поднять объём можно подходом или упражнением.` : 'Все группы в норме 10–20.';
  const adv = Fit.volumeAdvice(S.sessions, S.program), advHtml = adv.map((g) => `<div class="row between vadv"><div class="grow"><b>${g.name}: пора +1 подход</b><div class="muted small">${g.exs.map((e) => esc(e.name)).join(', ')} — два раза подряд все повторы у верха. Сил на это хватало — жми +1; еле уходишь из зала — оставь.</div></div><button class="ghost" data-act="volplus" data-ids="${g.exs.map((e) => e.day + ':' + e.i).join(',')}">+1</button></div>`).join('');
  const vcard = `<div class="card vol"><div class="row between"><h3>Подходы на мышцу · 7 дней</h3><span class="muted small">норма 10–20</span></div>${vrows}${advHtml}<p class="muted small vnote">${vnote} Чёрточка на полосе — сколько подходов на эту мышцу стоит в программе за неделю (дни A, B и C вместе).</p></div>`;
  return `<h1>История</h1><div class="muted small" style="margin:-8px 4px 12px">за 7 дней · веса за всё время — «Прогресс» → «Веса»</div>${vcard}${list ? `<h2>Тренировки · 7 дней</h2>${list}` : '<p class="muted" style="margin:12px 4px">За 7 дней тренировок нет.</p>'}`;
}
/* ---------- питание (логика — food.js) ---------- */
let REF = [];
fetch('food_ru.json').then((r) => r.json()).then((j) => { REF = Food.prep(j.items || []); }).catch(() => {});
const food = { mode: 'eat', text: '', busy: '', photo: null, ans: '', plan: null, q: '', off: null, obusy: 0 };
const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
const spend = () => Coach.fromState(S, Fit.targets(S.profile).base, Fit.dstr(Date.now())); // адаптивный расход (coach.js)
const tdeeNow = () => { const e = spend(); return e.measured && !e.calibrating ? Math.round(e.current / 10) * 10 : null; };
const ctx = () => Food.context(S, Fit, Date.now(), tdeeNow());
const mine = () => Food.myFoods(S.meals, Date.now(), S.myOff);

function screenFood() {
  const c = ctx(), t = c.tot, pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
  const today = Fit.dstr(Date.now());
  const meals = S.meals.map((m, i) => ({ m, i })).filter((x) => x.m.date === today);
  let html = `<h1>Питание</h1><div class="v9">${home9(c, t, 1)}</div>`; // v105: №9 и здесь
  const my = mine().slice(0, 8);
  if (my.length) html += `<div class="card my85"><div class="row between"><b>Мои блюда</b><button class="ghost" data-act="myedit">${food.myEdit ? 'Готово' : 'Убрать лишнее'}</button></div>
    <div class="chips85">${my.map((r) => `<button data-act="${food.myEdit ? 'myoff' : 'mypick'}" data-k="${esc(r.key)}">${esc(r.name)} <small>${Math.round(r.grams)} г${food.myEdit ? ' ✕' : ''}</small></button>`).join('')}</div></div>`;
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
    <p class="muted small" style="margin:6px 0 10px">${food.mode === 'eat' ? 'Голосом: «Сказать» → что съел и сколько → «Стоп», дальше посчитаю сам. Граммы потом можно поправить.' : food.mode === 'plan' ? 'Голосом: «Сказать» → перечисли, что есть дома → «Стоп».' : 'Голосом: «Сказать» → вопрос → «Стоп». Фраза «Дома есть: …» сама включит план.'}</p>
    <div class="row"><button id="fmic" class="mic${food.rec ? ' on' : ''}" data-act="fmic" ${food.busy ? 'disabled' : ''} aria-label="${food.rec ? 'Остановить запись' : 'Сказать голосом'}">${food.rec ? '■ Стоп' : ico('mic') + 'Сказать'}</button>
    <button class="primary grow" data-act="fsend" style="min-height:48px;font-size:17px" ${food.busy || food.rec ? 'disabled' : ''}>Отправить</button></div></div>`;
  if (food.ans) html += `<div class="card"><div class="muted small">Тренер</div><div class="ans" style="margin-top:6px">${esc(food.ans)}</div></div>`;
  if (food.plan) html += planCards();
  if (meals.length) html += `<h2>Записано сегодня</h2><div class="card">${meals.map(({ m, i }) => `<div class="kv" style="align-items:center"><div class="grow"><div>${m.planned ? '<span style="color:var(--amber)">план</span> ' : ''}${esc(m.title || m.items.map((x) => x.name).join(', '))}</div>
      <div class="muted small">${m.total.kcal} ккал · ${fmt(m.total.protein)} г белка</div></div><button class="ghost danger" data-act="mdel" data-i="${i}" aria-label="Удалить" style="min-height:44px">✕</button></div>`).join('')}</div>`;
  if (!aiKey()) html += '<p class="muted small" style="padding:0 4px">Поиск продукта работает без ключа. Для фото и вопросов нужен ключ ИИ (OpenRouter или Groq) — вкладка «Я», «Ключи».</p>';
  return html;
}
function photoCard() {
  const p = food.photo, tot = Food.totalOf(p.items);
  const rows = p.items.map((it, i) => `<div class="n" style="text-align:left;min-width:0">${esc(it.name)}<div class="muted small">${it.mine ? esc(it.ref) : it.ref ? 'по базе: ' + esc(it.ref) : 'оценка ИИ'}</div></div><input data-fg="${i}" type="text" inputmode="decimal" value="${it.grams || ''}" placeholder="г" aria-label="Граммы, ${esc(it.name)}">
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
/* v83 мост «Claude (Мак)» (Денис 21.10: «удали грок, чтобы ты считал»): адрес и секрет туннеля — fit-data/bridge.json (пишет tools/bridge_up.sh на Маке),
   читается ключом автокопии; Мак выключен или нет сети — Groq запасом. Голос с v96 — Whisper на Маке через тот же мост (voiceToggle). */
let brg = null, brgAt = 0;
async function bridgeCfg() {
  if (!bkKey() && !macTok()) return null;
  if (Date.now() - brgAt < 10 * 60e3) return brg;
  if (macTok()) { const u = await macUrl(); brg = u ? { url: u, secret: macTok() } : null; brgAt = Date.now(); return brg; }
  try { const r = await fetch(`https://api.github.com/repos/${Backup.REPO}/contents/bridge.json`, { headers: { Accept: 'application/vnd.github.raw+json', Authorization: 'Bearer ' + bkKey() }, cache: 'no-store' });
    brg = r.ok ? await r.json() : null; } catch (e) { brg = null; }
  brgAt = Date.now(); return brg;
}
const aiKey = () => localStorage.getItem(GROQ) || bkKey() || macTok();
async function groqCall(messages) {
  const b = messages.length ? await bridgeCfg() : null;
  if (b && b.url && b.secret) {
    try { return await Food.groq(b.secret, messages, { pv: { url: b.url + '/v1/chat/completions', model: 'sonnet', name: 'Claude (Мак)', mac: 1 } }); }
    catch (e) { brgAt = 0; if (!localStorage.getItem(GROQ) || e.code === '429') { food.err = e.code === 'net' ? 'Мак не отвечает — включи Мак или вставь ключ Groq в «Я»' : e.message; toast(food.err); return null; } }
  }
  try { return await Food.groq(localStorage.getItem(GROQ) || '', messages); }
  catch (e) {
    food.err = e.message || 'Ошибка запроса'; food.errCode = e.code; toast(food.err);
    if (e.code === 'nokey' || e.code === '401') { tab = 'me'; view = null; meOpen.keys = true; render(); setTimeout(() => { const g = $('#gk'); if (g) g.focus(); }, 50); }
    return null;
  }
}
async function foodPhoto(file) {
  if (!aiKey()) return groqCall([]); // тост + переход в настройки
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
  const mode = Food.isPlanText(text) ? 'plan' : food.mode; food.mode = mode;
  if (!aiKey()) { if (mode === 'eat') return eatLocal(text, 'ключа ИИ нет'); return groqCall([]); }
  food.errCode = ''; food.busy = mode === 'plan' ? 'Составляю план…' : mode === 'eat' ? 'Считаю…' : 'Думаю…'; food.err = ''; render();
  try {
    const c = ctx();
    if (mode === 'eat') { // версия 58: «что съел» словами — тот же разбор и карточка, что у фото
      const out = await groqCall([{ role: 'system', content: Food.systemPrompt(c, REF, 'photo') }, { role: 'user', content: Food.eatQ(text) }]);
      if (out != null) { const j = Food.parseJSON(out); food.photo = { src: 'text', items: Food.applyMine((j.items || []).map((i) => Food.makeItem(i, REF)), mine(), text), confidence: j.confidence, note: j.note || '' }; food.text = ''; }
      else if (food.errCode !== 'nokey' && food.errCode !== '401') return eatLocal(text, 'ИИ не ответил');
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
// «что съел» без ИИ: по своей базе food_ru.json (лимит Groq, нет сети, нет ключа) — та же карточка, граммы правятся
function eatLocal(text, why) {
  const items = Food.applyMine(Food.localEat(text, REF), mine(), text); food.busy = '';
  if (!items.length) { render(); return; }
  food.err = ''; food.photo = { src: 'text', items, confidence: 'low', note: why + ' — посчитал по своей базе продуктов. Проверь граммы.' }; food.text = ''; render();
  const ft = document.querySelector('.ftab'); if (ft) ft.scrollIntoView({ block: 'center' });
}
/* голос (v63): запись → Groq Whisper → текст в поле → сразу «Отправить»; ключ OpenRouter или нет MediaRecorder — распознавание браузера, если есть */
const SRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceLim = 0; // до какого времени голос мимо Groq (лимит)
const canRec = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const voiceText = (t) => { food.text = (food.text.trim() ? food.text.trim() + ' ' : '') + t; };
// v96 (Денис 22.10: «нет ключа грок — мы от него ушли»): сначала Мак (Whisper в мосте), Groq — только если ключ остался, дальше — сам телефон
async function voiceToggle() {
  if (food.rec) return food.rec.stop();
  const key = localStorage.getItem(GROQ) || '', free = !(SRec && voiceLim > Date.now());
  if (canRec() && free) { const b = await bridgeCfg(); if (b && b.url && b.secret) return voiceRecord(b.secret, { pv: { url: b.url + '/v1/audio/transcriptions', name: 'Мак', mac: 1 } }); }
  if (key && Food.provider(key).name === 'Groq' && canRec() && free) return voiceRecord(key);
  if (SRec) return voiceBrowser();
  if (!aiKey()) return groqCall([]); // тост + переход в настройки
  toast('Голос — микрофоном на клавиатуре: нажми в поле, потом 🎤');
}
async function voiceRecord(key, opts = {}) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Нет доступа к микрофону — разреши его для сайта в настройках'); return; }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 48000 }), chunks = [], t0 = Date.now(); // v99: 48 кбит — запись меньше, речи хватает
  const tick = setInterval(() => { const b = $('#fmic'), s = Math.floor((Date.now() - t0) / 1000); if (b) b.textContent = `■ Стоп · 0:${String(s).padStart(2, '0')}`; if (s >= 59) food.rec && food.rec.stop(); }, 250);
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    clearInterval(tick); stream.getTracks().forEach((t) => t.stop()); food.rec = null;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
    if (Date.now() - t0 < 800 || !blob.size) { render(); toast('Слишком коротко — нажми, скажи и потом «Стоп»'); return; }
    food.busy = 'Слушаю…'; food.err = ''; render();
    try {
      const text = await Food.transcribe(key, blob, opts); food.busy = '';
      if (!text) { render(); toast('Не расслышал — скажи ещё раз'); return; }
      voiceText(text); foodSend();
    } catch (e) {
      food.busy = ''; food.err = e.message || 'Ошибка распознавания';
      if (opts.pv) { // v99 (Денис 22.10: «Мак не ответил», в мост не дошло): причину — на экран и в журнал моста, телефон-запасной только на 1 нажатие
        brgAt = 0; voiceErr(opts.pv.url, e, blob, Date.now() - t0);
        food.err = `Мак не ответил: ${e.message} · ${Math.round(blob.size / 1024)} КБ` + (SRec ? ' — нажми «Сказать» ещё раз: послушает сам телефон' : '');
        if (SRec) voiceLim = Date.now() + 60e3;
      }
      else if (e.code === '429' && SRec) { voiceLim = Date.now() + 36e5; food.err = 'Groq на лимите — нажми 🎤 ещё раз: час слушает сам телефон'; }
      render(); toast(food.err);
    }
  };
  food.rec = { stop: () => { if (mr.state !== 'inactive') mr.stop(); } }; mr.start(); render();
}
// v99: отчёт о сбое голоса в журнал моста (без ключа, только причина и размер) — чтобы видеть, что случилось на телефоне
function voiceErr(url, e, blob, ms) {
  try { fetch(url.replace('/v1/audio/transcriptions', '/voice-err'), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ code: e.code || '', msg: String(e.message || '').slice(0, 150), kb: Math.round(blob.size / 1024), type: blob.type, sec: Math.round(ms / 1000), online: navigator.onLine }) }).catch(() => {}); } catch (x) { /* нет сети */ }
}
function voiceBrowser() {
  const r = new SRec(); r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e) => { food.rec = null; voiceText(e.results[0][0].transcript); foodSend(); };
  r.onerror = (e) => { food.rec = null; render(); toast(e.error === 'not-allowed' ? 'Нет доступа к микрофону' : 'Не расслышал — скажи ещё раз'); };
  r.onend = () => { if (food.rec) { food.rec = null; voiceLim = 0; render(); toast('Телефон не расслышал — нажми «Сказать» ещё раз, пойдёт через Мак'); } };
  food.rec = { stop: () => r.stop() }; r.start(); render();
}
function addMeals(list) { S.meals.push(...list); save(); bkSoon(); }
// v89: копия через 20 с после еды и галочки — Мак в 21:00 видит сегодняшний белок; серия правок = одна копия
let bkT = 0; function bkSoon() { clearTimeout(bkT); bkT = setTimeout(() => backupNow(), 20000); }
async function sharePlan() {
  const text = Food.shareText(food.plan);
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Скопировано — вставь в чат'); } catch (e) { toast('Не удалось скопировать'); }
}

// v95: Профиль и Настройки в «Я» свёрнуты (Денис 22.10: «плюсик — открыть-закрыть»); открытое помнится до перезагрузки
// v106: фон и цвет — Theme (theme.js); образцы рисуются уже в цвете своей темы
function look106() {
  const T = Theme.get(), B = { deep: '#071216', black: '#000000', graphite: '#1C1C1E' }, C = { sea: '#14B8A6', blue: '#0A84FF', indigo: '#5E5CE6', orange: '#FF9F0A' };
  const btn = (k, v, n, sw) => `<button class="lk106${T[k] === v ? ' on' : ''}" data-act="theme" data-k="${k}" data-v="${v}"><i style="background:${sw}" data-raw="1"></i>${n}</button>`;
  return `<div class="lb">Фон</div><div class="lks106">${Theme.BG.map(([v, n]) => btn('bg', v, n, B[v])).join('')}</div>
    <div class="lb" style="margin-top:12px">Цвет</div><div class="lks106">${Theme.ACC.map(([v, n]) => btn('acc', v, n, C[v])).join('')}</div>
    <p class="muted small" style="margin:8px 4px 0">Цвета — системные Apple для тёмной темы. Приложение перезагрузится.</p>`;
}
const meOpen = {}, fold = (k, n) => `<h2 class="fold" data-act="fold" data-k="${k}" role="button">${n}<span>${meOpen[k] ? '−' : '+'}</span></h2>`;
/* ---------- v100 награды (ach.js; доноры research/r66-achievements/ДОНОРЫ.md — Apple Watch Awards, Liftoff) ---------- */
let achMemo = { k: '', L: null };
function achList() { const k = S.sessions.length + '|' + (S.sessions.length ? S.sessions[S.sessions.length - 1].date : '') + '|' + slBw(); if (achMemo.k !== k) achMemo = { k, L: Ach.list(S, Fit, slBw()) }; return achMemo.L; }
const achSub = (o) => (o.got ? (o.kind === 'm' ? o.sub : o.times > 1 ? '×' + o.times : fdate100(o.date)) : o.kind === 'm' ? 'не открыта' : o.cnt != null && o.n ? `${o.kind === 't' ? fmt(Math.floor(o.cnt * 10) / 10) : Math.floor(o.cnt)} из ${o.n}` : o.need ? `${o.cnt} из ${o.need}` : 'ещё нет');
const fdate100 = (d) => { d = new Date(d); return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`; };
let achUid = 0;
// ступени мышцы (Денис 22.10: «на руки одно — а где прогрессия?»): 5 делений, закрашены полученные; полоска — путь до следующей (как №49 STRIDE)
const lv100 = (o) => `<span class="lv100">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= o.tier ? 'on' : k === o.tier + 1 && o.frac > 0 ? 'nx' : ''}"${k === o.tier + 1 && o.frac > 0 ? ` style="--f:${Math.round(o.frac * 100)}%"` : ''}></i>`).join('')}</span>`;
const ladder100 = (o) => `<div class="ld100">${[1, 2, 3, 4, 5].map((k) => { const d = o.steps && o.steps[k], nx = k === o.tier + 1;
  return `<div class="${d ? 'on' : nx ? 'nx' : ''}"><span class="n">${d ? '✓' : k}</span><b>${esc(Fit.SL_RU[k])}</b><em>${d ? fdate100(d) : nx ? (o.frac > 0 ? Math.round(o.frac * 100) + ' % пути' : 'следующая') : ''}</em></div>`; }).join('')}</div>`;
const achCell = (o, isNew, i) => `<button class="c100${o.got ? ' got' : ''}${isNew ? ' new100' : ''}" data-act="ach" data-id="${o.id}"${isNew ? ` style="--dl:${i * .25}s"` : ''}>${Ach.medal(o, BODY_PATHS, 74, ++achUid)}<b>${esc(o.title)}</b><small>${esc(achSub(o))}</small>${o.kind === 'm' ? lv100(o) : ''}${!o.got && o.frac > 0 ? `<span class="pb100"><i style="width:${Math.max(4, Math.round(o.frac * 100))}%"></i></span>` : ''}</button>`;
// v102 (Денис 22.10: «ачивки вниз, плюсом — нажал, открылись»): свёрнуты в конце «Я», в заголовке — сколько получено и новые
function awardsFold() {
  const L = achList(), got = L.filter((o) => o.got).length, nw = Ach.fresh(S, L).length;
  return `${fold('aw', `<div>Награды <small class="lb" style="font-weight:500">${got} из ${L.length}${nw ? ` · <b style="color:#56CCBF">${nw} ${plural(nw, ['новая', 'новые', 'новых'])}</b>` : ''}</small></div>`)}${meOpen.aw ? awards100() : ''}`;
}
function awards100() {
  const L = achList(), nw = new Set(Ach.fresh(S, L).map((o) => o.id)), got = L.filter((o) => o.got).length; let i = 0;
  const secs = [...new Set(L.map((o) => o.sec))].map((sec) => `<div class="cap9 sec100">${sec.toUpperCase()}</div><div class="gr100">${L.filter((o) => o.sec === sec).map((o) => achCell(o, nw.has(o.id), nw.has(o.id) ? i++ : 0)).join('')}</div>`).join('');
  return `<div class="glass aw100"><div class="row between" style="min-height:0;align-items:baseline"><span class="cap9">НАГРАДЫ</span><span class="lb">получено <b style="color:#56CCBF">${got}</b> из ${L.length}</span></div>${secs}<p class="lb" style="margin:10px 2px 0">Нажми на медаль — покрути пальцем, на обороте дата.</p></div>`;
}
function achNew100(list) {
  if (!list || !list.length) return '';
  return `<div class="glass nb100"><div class="cap9" style="text-align:center">${list.length > 1 ? 'НОВЫЕ НАГРАДЫ' : 'НОВАЯ НАГРАДА'}</div><div class="gr100">${list.map((o, i) => achCell(o, true, i)).join('')}</div></div>`;
}
// медаль крупно: крутится пальцем с инерцией и встаёт лицом или оборотом (как Awards в Apple Watch); новая — влетает с оборотами
function openAch(id) {
  const o = achList().find((x) => x.id === id) || ((summary && summary.ach) || []).find((x) => x.id === id); if (!o) return;
  const fr = !(S.achSeen || {})[Ach.key(o)] && o.got, el = document.createElement('div'); el.className = 'am100';
  const prog = o.got ? `<div class="lb" style="text-align:center">получено ${new Date(o.date).toLocaleDateString('ru-RU')}${o.times > 1 ? ` · ${o.times} ${plural(o.times, ['раз', 'раза', 'раз'])}` : ''}</div>` : `<div class="lb" style="text-align:center">${esc(achSub(o))}</div>`;
  el.innerHTML = `<div class="st100"><div class="fl100"><div>${Ach.medal(o, BODY_PATHS, 240, ++achUid)}</div><div class="bk">${Ach.back(o, 240)}</div></div></div>
    <h2 style="margin:18px 0 4px;text-align:center">${esc(o.title)}</h2>${o.kind === 'm' && o.got ? `<div style="text-align:center;color:#56CCBF;font-weight:700">${esc(o.sub)}</div>` : ''}${prog}
    ${o.kind === 'm' ? ladder100(o) : ''}${o.next ? `<div class="lb" style="text-align:center;margin-top:8px">${esc(o.next)}</div>` : ''}<p class="muted small" style="text-align:center;max-width:320px;margin:12px auto 0">${esc(o.how)}</p>
    <button class="primary" style="margin-top:18px;max-width:320px">Закрыть</button>`;
  document.body.appendChild(el);
  const st = el.querySelector('.st100'), fl = el.querySelector('.fl100'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let a = fr && !still ? -720 : 0, v = 0, tgt = a ? 0 : null, drag = null, raf = 0;
  const set = () => { fl.style.transform = `rotateY(${a}deg)`; fl.style.filter = `brightness(${(1 + .45 * Math.abs(Math.sin(a * Math.PI / 180))).toFixed(3)})`; };
  const run = () => { cancelAnimationFrame(raf); const step = () => { if (drag) return;
    if (Math.abs(v) > .3) { a += v; v *= .94; } else { const t = tgt != null ? tgt : Math.round(a / 180) * 180; a += (t - a) * (tgt != null ? .05 : .14); v = 0; if (Math.abs(t - a) < .2) { a = t; tgt = null; set(); return; } }
    set(); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
  st.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, a, t: e.timeStamp }; v = 0; tgt = null; st.setPointerCapture(e.pointerId); });
  st.addEventListener('pointermove', (e) => { if (!drag) return; const na = drag.a + (e.clientX - drag.x) * .9; v = na - a; a = na; set(); });
  const up = () => { if (!drag) return; drag = null; run(); }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('button')) { cancelAnimationFrame(raf); el.remove(); } });
  set(); if (a) run();
  if (fr) { Ach.seeAll(S, achList()); save(); }
}

function screenMe() {
  const p = S.profile, ex = spend(), td = tdeeNow();
  const key = localStorage.getItem(GROQ) || '', bs = bkStatus();
  return `<h1>Я</h1><div class="v9">${weightMeasures81()}</div>
    <h2>Вес</h2>${weight9()}<p class="muted small" style="margin:6px 4px 0">Расход: ${td ? td + ' ккал — съеденное минус изменение тренда веса × 7700 ккал/кг, окно 14 дней.' : `калибровка ${Math.min(ex.dataDays, Coach.MIN_DAYS_TO_TRUST)}/${Coach.MIN_DAYS_TO_TRUST} дн.: нужно 14 дней с записанной едой и вес минимум 2 раза за 2 недели. До этого цель — по формуле.`} Цель набора — плюс ${fmtP(Fit.GAIN_LO)}–${fmtP(Fit.GAIN_HI)} % в неделю (Iraki 2019).</p>

    ${awardsFold()}
    ${fold('prof', 'Профиль')}<div class="card"${meOpen.prof ? '' : ' hidden'}>
      ${[['weight', 'Вес, кг'], ['height', 'Рост, см'], ['age', 'Возраст']].map(([k, n]) => `<label for="p-${k}">${n}</label><input id="p-${k}" data-prof="${k}" type="text" inputmode="decimal" value="${esc(p[k])}">`).join('')}
      <label for="p-back">Вернулся в зал после перерыва — с какого дня</label><input id="p-back" type="date" value="${esc(p.back || '')}"><p class="muted small" style="margin:6px 4px 0">${introNow() ? `Идут первые две недели, осталось ${introNow().left} дн.: приложение просит брать вес полегче.` : 'Не было перерыва — оставь пустым. Если был: две недели с этого дня приложение просит брать вес полегче и не ставит проверку силы.'}</p></div>
    ${fold('look', 'Оформление')}<div class="card"${meOpen.look ? '' : ' hidden'}>${look106()}</div>
    ${fold('set', 'Настройки')}<div class="card"${meOpen.set ? '' : ' hidden'}>
      <div class="row" style="margin-top:0"><button class="grow" data-act="export">Экспорт</button><button class="grow" data-act="import">Импорт</button></div><button data-act="xfer" style="margin-top:10px;width:100%">Перенести на значок «Зал»</button><p class="muted small" style="margin:6px 4px 0">Значок на экране «Домой» хранит записи отдельно от браузера: нажми здесь, потом открой значок → «Перенести из браузера».</p><p class="muted small" style="margin:6px 4px 0">Экспорт → AirDrop на Мак: разбор тренировок и чата с тренером.</p>
      ${macTok() ? '<p class="muted small" style="margin:6px 4px 0">Копия идёт через Мак (привязан кодом).</p>' : '<button data-act="mac-pair" style="margin-top:10px;width:100%">Привязать к Маку (код из 6 цифр)</button><p class="muted small" style="margin:6px 4px 0">Без ключа GitHub: Мак пришлёт 6 цифр в Напоминания «Зал», копия пойдёт через Мак.</p>'}
      ${bkOn() ? '<div class="row" style="margin-top:10px"><button class="grow" data-act="bk-now">Скопировать</button><button class="grow" data-act="bk-restore">Восстановить</button></div>' : ''}
      <label class="habit" style="margin:12px 0 0;color:var(--ink);font-size:16px"><input type="checkbox" data-opt="ci" ${S.ciOff ? '' : 'checked'}>Чек-ин перед тренировкой</label><p class="muted small" style="margin:6px 4px 0">Вопрос «как ты сегодня» на кнопке «Начать»: готовность, сон, что болит. В плохой день вес без прибавки или −10 %.</p>
      <input id="imp" type="file" accept="application/json,.json" hidden></div>
    ${fold('keys', 'Ключи')}<div class="card"${meOpen.keys ? '' : ' hidden'}><p class="muted small" style="margin:0 4px 12px">${macTok() ? 'Сейчас не нужны: фото, голос и копия идут через Мак. Ключи — запас на случай, если Мак выключен.' : 'Нужны, пока телефон не привязан к Маку (кнопка в «Настройках»): ключ ИИ — для фото еды и вопросов, ключ GitHub — для автокопии.'}</p><label for="gk" style="margin-top:0">Ключ ИИ (хранится только на телефоне): OpenRouter sk-or-… или Groq gsk_…</label><input id="gk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" value="${esc(key)}" placeholder="sk-or-… / gsk_…"><p class="muted small" style="margin:6px 4px 0">Сейчас: ${key ? esc(Food.provider(key).name + ' - ' + Food.provider(key).model) : 'ключа нет'}</p>
      <label for="bk" style="margin-top:14px">Автокопия: ключ GitHub (хранится только на телефоне)</label><input id="bk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" value="${esc(bkKey())}" placeholder="github_pat_…"><p class="${bs.warn ? 'neg' : 'muted'} small" id="bkst" style="margin:6px 4px 0">${esc(bs.text)}</p>
      <p class="muted small" style="margin:6px 4px 0">С ключом копия сама уходит в твой закрытый репозиторий fit-data: после каждой тренировки и раз в сутки при открытии.</p>
    </div><div class="ver80">версия 106</div>`;
}

/* ---------- автокопия на GitHub (карта 7.2; логика и образец — backup.js) ---------- */
const bkKey = () => localStorage.getItem(BK) || '';
/* v90 копия без ключа GitHub (Денис 21.10: «код из 6 цифр»): Мак шлёт 6 цифр в Напоминания «Зал», мост выдаёт телефону свой ключ (fit.mac).
   Адрес моста меняется при перезапуске туннеля — его кладёт в закрытый gist tools/bridge_up.sh. Мост пускает только к fit-data/fit.json. */
const MAC = 'fit.mac', GIST = 'https://api.github.com/gists/6e807584e61b69784f4f8c3fd2dfda0c';
const macTok = () => localStorage.getItem(MAC) || '', bkOn = () => !!(bkKey() || macTok());
async function macUrl() {
  try { const r = await fetch(GIST, { cache: 'no-store' }); if (!r.ok) return '';
    return (JSON.parse((await r.json()).files['bridge-url.json'].content).url || '').replace(/\/$/, ''); } catch (e) { return ''; }
}
// куда копировать: свой ключ GitHub — прямо в GitHub, иначе через мост на Маке (null — Мак не найден)
async function bkConn() { if (!macTok()) return bkKey() ? { token: bkKey() } : null; const u = await macUrl(); return u ? { token: macTok(), api: u } : null; } // привязан к Маку — копия через Мак, даже если вставлен ключ GitHub
async function macPair(quiet) {
  const u = await macUrl(); if (!u) { toast('Мак не найден — он включён?'); return false; }
  const post = (path, b) => fetch(u + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) }).then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }));
  const msg = (r) => (r.j.error || {}).message || 'Мак не ответил';
  try {
    let r = await post('/pair/start'); if (!r.ok) { toast(msg(r)); return false; }
    for (;;) {
      const code = prompt('Мак прислал 6 цифр в Напоминания «Зал». Введи их:'); if (code == null) return false;
      r = await post('/pair/confirm', { code: code.replace(/\D/g, '') });
      if (r.ok && r.j.token) {
        localStorage.setItem(MAC, r.j.token); brgAt = 0; const m = bkMeta(); delete m.err; delete m.code; localStorage.setItem(BKM, JSON.stringify(m));
        toast('Привязано к Маку'); if (!quiet) { render(); backupNow(true); } return true;
      }
      toast(msg(r)); if (!/осталось/.test(msg(r))) return false;
    }
  } catch (e) { toast('Мак не отвечает — он включён?'); return false; }
}
const bkMeta = () => { try { return JSON.parse(localStorage.getItem(BKM)) || {}; } catch (e) { return {}; } };
const bkText = () => JSON.stringify(S, null, 1);
const bkStatus = () => Backup.status(bkOn(), bkMeta(), bkOn() ? bkText() : '');
function bkSetKey(v) { v = String(v || '').trim(); if (v === bkKey()) return; if (v) localStorage.setItem(BK, v); else localStorage.removeItem(BK); const m = bkMeta(); delete m.err; delete m.code; localStorage.setItem(BKM, JSON.stringify(m)); }
const bkWarn = () => { const b = bkStatus(); return b.warn ? `<div class="card warn" data-tab="me" style="margin-bottom:12px"><b>Копия данных не проходит:</b> ${esc(b.why)}. <span class="muted">Нажми — открою настройки.</span></div>` : ''; };
let bkBusy = false;
// manual — нажал сам: тост и перерисовка; force — писать, даже если в копии тренировок больше
async function backupNow(manual, force) {
  if (!bkOn() || bkBusy || !S.program) return;
  if (force && bkMeta().err === 'older' && !confirm('В копии тренировок больше, чем в телефоне. Всё равно записать поверх? Прошлая копия останется в истории репозитория.')) return;
  bkBusy = true; const st0 = $('#bkst'); if (manual && st0) st0.textContent = 'Копирую…';
  const c = await bkConn(), r = c ? await Backup.save(fetch.bind(window), c, S, Date.now(), !!force && bkMeta().err === 'older') : { ok: false, err: 'net' }, m = bkMeta();
  bkBusy = false;
  if (r.ok && S.bkDel) { delete S.bkDel; save(); }
  localStorage.setItem(BKM, JSON.stringify(r.ok ? { at: r.at, sig: r.sig, n: r.n } : { at: m.at, sig: m.sig, n: m.n, err: r.err, code: r.code }));
  if (manual) { toast(r.ok ? 'Скопировано на GitHub' : 'Не скопировано: ' + (Backup.ERR[r.err] || Backup.ERR.http)); render(); }
  else { const st = $('#bkst'); if (st) st.textContent = bkStatus().text; }
}
function bkMaybe() { const m = bkMeta(); if (bkOn() && S.program && (m.err === 'net' || Backup.due(m, bkText()))) backupNow(); }
async function restoreBackup() {
  if (!bkOn()) { toast('Сначала привяжи к Маку'); return false; }
  const c = await bkConn(); if (!c) { toast('Мак не найден — он включён?'); return false; }
  const r = await Backup.load(fetch.bind(window), c);
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
    <p class="muted small" style="margin-top:28px">Занимался в браузере? Там «Я» → «Перенести на значок», потом сюда:</p>
    <button id="o-xf">Перенести из браузера</button><textarea id="o-xt" hidden rows="3" placeholder="Нажми и держи → Вставить" style="width:100%;margin-top:10px"></textarea>
    <p class="muted small" style="margin-top:28px">Уже занимался здесь и включал автокопию? Вставь ключ GitHub — верну всю историю.</p>
    <input id="o-bk" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" placeholder="github_pat_…" value="${esc(bkKey())}"><button id="o-rs" style="margin-top:10px">Восстановить из копии</button><button id="o-mac" style="margin-top:10px">Привязать к Маку и восстановить</button>`;
  document.body.appendChild(el);
  // v87 (Денис 21.10: поставил значок — «опять всё это, ключ, вес»): у значка своё хранилище, копии на GitHub нет — перенос буфером (S + ключи ИИ и копии)
  const xin = (txt) => { try { const j = JSON.parse(txt); if (!j.S || !j.S.program || !j.S.sessions) return false; S = j.S; if (j.gk) localStorage.setItem(GROQ, j.gk); if (j.bk) bkSetKey(j.bk); if (j.mac) localStorage.setItem(MAC, j.mac); save(); el.remove(); tab = 'today'; render(); toast(`Перенесено: ${S.sessions.length} ${plural(S.sessions.length, ['тренировка', 'тренировки', 'тренировок'])}`); return true; } catch (e) { return false; } };
  el.querySelector('#o-xf').addEventListener('click', async () => { const xt = el.querySelector('#o-xt');
    if (!xt.hidden && xin(xt.value)) return; let txt = ''; try { txt = await navigator.clipboard.readText(); } catch (e) { /* iOS без разрешения — вставка руками */ }
    if (txt && xin(txt)) return; xt.hidden = false; xt.focus(); toast('Вставь сюда: нажми и держи → Вставить, потом снова кнопку'); });
  el.querySelector('#o-rs').addEventListener('click', async () => { bkSetKey(el.querySelector('#o-bk').value); if (await restoreBackup()) el.remove(); });
  el.querySelector('#o-mac').addEventListener('click', async () => { if ((macTok() || await macPair(true)) && await restoreBackup()) el.remove(); });
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
/* v95 (Денис 22.10: «История мне не нужна — тело и так показывает»; «хочу Liquid Glass между кнопками»): панель-капсула на стекле,
   капля .tpill переезжает к выбранной кнопке пружиной. Кнопки строятся один раз — иначе капля не едет, а прыгает. screenHistory оставлен в коде. */
const TABS = [['today', 'Сегодня'], ['grow', 'Прогресс'], ['food', 'Питание'], ['me', 'Я']];
function tabsBar() {
  const nav = $('#tabs'), i = Math.max(0, TABS.findIndex(([k]) => k === tab));
  if (!nav.querySelector('.tpill')) nav.innerHTML = '<i class="tpill"></i>' + TABS.map(([k, n]) => `<button data-tab="${k}">${ico(k)}${n}</button>`).join('');
  const was = nav.style.getPropertyValue('--i'); nav.style.setProperty('--i', i);
  nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  if (was !== '' && +was !== i) { const p = nav.querySelector('.tpill'); p.classList.remove('mv'); void p.offsetWidth; p.classList.add('mv'); }
}
function render() {
  if (!S.program) return;
  const v = $('#view'), top = v.scrollTop;
  v.innerHTML = { today: screenToday, history: screenHistory, grow: screenGrow, food: screenFood, me: screenMe }[tab]();
  const scr = tab === 'today' ? (S.active ? 'workout' : summary ? 'summary' : 'today') : tab; // тренировка и итог — свои экраны: открываются сверху
  const sameTab = v.dataset.scr === scr; v.dataset.scr = scr; // не data-tab: ловится делегированием вкладок
  v.querySelectorAll('.xnote').forEach(grow);
  v.scrollTop = sameTab ? top : scr === 'workout' ? loadScroll() : 0; // v18: тренировка открывается там, где закрыли
  v.querySelectorAll('[data-call]').forEach(callouts);
  if (v.querySelector('img[data-ph]') && (tab === 'today' || tab === 'me')) fillPhotos(v);
  if (!sameTab) v.querySelectorAll('.ignite, .levelup').forEach(ignite);
  if (!sameTab) v.querySelectorAll('.cu81').forEach(countUp81);
  if (tab === 'me' && v.querySelector('.c100.new100')) { Ach.seeAll(S, achList()); save(); } // v100: новая медаль влетает один раз // v82: числа главной набегают
  v.querySelectorAll('.f12').forEach((c) => food12run(c, !sameTab)); // v93: дуга питания — пружиной только при входе
  v.querySelectorAll('.n9h').forEach((c) => home9run(c, !sameTab));
  if (!sameTab) v.querySelectorAll('.g9h').forEach((c) => c.classList.add('sheen', 'in105')); // v105: ранг — блик и полоска наливается только при входе // v104: №9 на главной — линза едет по шкале только при входе
  v.querySelectorAll('.fig81').forEach(lines81); // v110: линии от замеров к мышцам
  v.querySelectorAll('.w9').forEach((c) => weight9run(c, !sameTab)); // v94: вес в «Я» — ярлыки выезжают только при входе
  tabsBar();
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
  return Fit.warmup(target, method || c.warm, (S.inc || {})[id] || c.round[eqKey(id)], b ? c.bar : 0).filter((s) => s.kg > 0 && s.reps > 0).map((s) => ({ ...s, done: false }));
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
    ${eq ? `<button data-go="step"><b class="num">±</b>Шаг веса <span class="muted small">(сейчас ${fmt(stepOf(it))} кг)</span></button>` : ''}
    <button data-go="addset"><b class="num">+</b>Добавить подход <span class="muted small">(сверх плана)</span></button>
    <button data-go="note"><b class="num">${ico('note')}</b>Постоянная заметка</button>
    <button data-go="swap"><b class="num">${ico('swap')}</b>Заменить упражнение</button>
    ${inSS(it) ? '<button data-go="ssoff"><b class="num">⇅</b>Убрать из суперсета</button>' : S.active.items.length > 1 ? '<button data-go="ss"><b class="num">⇅</b>Добавить в суперсет</button>' : ''}
    <button data-go="chat"><b class="num">${ico('chat')}</b>Спросить тренера</button></div></div>`;
  w.onclick = (e) => {
    if (e.target === w) return closeSheet();
    const b = e.target.closest('[data-go]'); if (b) ({ step: openStep, addset: () => { closeSheet(); const l = it.sets[it.sets.length - 1]; delete it.closed; it.sets.push({ kg: l ? l.kg : null, reps: l ? l.reps : it.ranges[0][0], done: false }); save(); render(); }, pickw: openPickW, warm: openWarm, plates: openPlates, note: openNote, swap: openSwap, chat: openChat, ss: openSS, ssoff: () => ssSet(Fit.ssRemove(ssNow(), Fit.ssKey(it))) })[b.dataset.go](k);
  };
}
// шаг веса этого упражнения в зале Дениса: на сколько кг прибавлять, когда повторы дошли до верха
function openStep(k) {
  const it = S.active.items[k], w = $('#sheet'), cur = stepOf(it); w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Шаг веса: ${esc(it.name)}</div><p class="muted small" style="margin:0 0 6px">Сколько кг прибавляется на этом тренажёре или снаряде за раз. Сначала добираешь повторы до верха, потом — этот шаг.</p>
    <div class="tlist">${[...new Set([1, 2, 2.5, 5, 7.5, 10, cur])].sort((a, b) => a - b).map((v) => `<button data-st="${v}"><b class="num">${v === cur ? ico('check') : ''}</b>${fmt(v)} кг</button>`).join('')}</div><p class="muted small" style="margin:6px 0 0">Другой шаг — напиши в заметке к упражнению: «разбег 7,5 кг».</p><button class="link" id="stx">Отмена</button></div>`;
  w.onclick = (e) => { if (e.target === w || e.target.id === 'stx') return closeSheet(); const b = e.target.closest('[data-st]'); if (!b) return;
    S.inc = S.inc || {}; S.inc[it.id] = +b.dataset.st; save(); closeSheet(); render(); toast(`Шаг ${fmt(+b.dataset.st)} кг`); };
}
// app-016: список замен автора (Fit.alternatives) — тап заменяет упражнение
function openSwap(k) {
  const a = S.active, it = a.items[k], w = $('#sheet'), alts = Fit.alternatives(S.program, a.day, it);
  w.hidden = false;
  w.innerHTML = `<div class="sheet"><div class="sheet-t">Заменить «${esc(it.name)}»</div>
    <p class="muted small" style="margin:0 0 6px">Замены автора программы; диапазоны повторов и отдых остаются.</p>
    <div class="tlist">${alts.map((c) => `<button data-sw="${c.id}"><b class="num">${ico('swap')}</b>${esc(c.name)}${it.slot === c.id ? ' <span class="muted small">(исходное)</span>' : ''}${Fit.swapTip(a.day, it.slot || it.id, c.id) ? `<span class="muted small" style="display:block;color:#F59E0B">${esc(Fit.swapTip(a.day, it.slot || it.id, c.id))}</span>` : ''}</button>`).join('') || '<p class="muted">Замен нет.</p>'}</div>
    <button class="link" id="swx">Отмена</button></div>`;
  w.onclick = (e) => {
    if (e.target === w || e.target.id === 'swx') return closeSheet();
    const b = e.target.closest('[data-sw]'); if (b) applySwap(k, b.dataset.sw);
  };
}
// app-016: чат с тренером (Groq, как «Питание → Вопрос»). История — в S.active.chat, живёт до конца тренировки. k — про какое упражнение
let chatBusy = false;
function openChat(k = null, q = '') {
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
  if (q) { const t = $('#cq'); t.value = q; grow(t); }
  w.onclick = async (e) => {
    if (e.target === w) return closeSheet();
    const sb = e.target.closest('[data-sw]'); if (sb) { const [from, to] = sb.dataset.sw.split('>'); const i = a.items.findIndex((it) => it.id === from); if (i >= 0) applySwap(i, to); return; }
    if (e.target.id !== 'csend' || chatBusy) return;
    const q = $('#cq').value.trim(); if (!q) return;
    if (!aiKey()) return groqCall([]); // тост + переход в «Я» за ключом
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
    <polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.map((p, i) => (sel != null && i === sel ? `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#14B8A6" stroke="var(--glass)" stroke-width="2"/>` : `<circle cx="${p[0]}" cy="${p[1]}" r="${sel != null ? 4 : i === xy.length - 1 ? 4.5 : 3}" fill="#14B8A6"/>`)).join('')}
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
      <div class="muted small">${d0 == null ? 'первая запись' : `с ${dshort(new Date(all[0].t).toISOString())} <span class="${d0 >= 0 ? 'pos' : 'neg'}">${Math.abs(d0) < .05 ? 'без изменений' : (d0 > 0 ? 'выросло' : 'упало') + ' на ' + fmt(Math.abs(d0)) + ' ' + unit}</span> · ${all.length} ${plural(all.length, ['тренировка', 'тренировки', 'тренировок'])}`}</div>
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
const sgn = (d) => (Math.abs(d) < .05 ? 'не изменилось' : (d > 0 ? 'больше на ' : 'меньше на ') + fmt(Math.abs(d)));
const mv = { k: 'waist', a: null, b: null, sel: null, pv: 'f' };
function measureCard() {
  const ms = S.measures || [], du = Fit.measureDue(ms), pd = Fit.photoDue(ms), rows = Fit.measureLast(ms).filter((r) => r.v != null);
  const ago = (n) => (n === 0 ? 'сегодня' : `${n} ${plural(n, ['день', 'дня', 'дней'])} назад`);
  const note = [du.last ? `Последний замер — ${dshort(du.last)}, ${ago(du.days)}.${du.due ? ' Прошло две недели — пора мерить снова.' : ''}` : '',
    pd.last ? `Фото — ${dshort(pd.last)}, ${ago(pd.days)}.${pd.due ? ' Прошло четыре недели — пора снять новые.' : ''}` : ''].filter(Boolean).join(' ');
  return `<h2>Замеры тела</h2><div class="card">${!ms.length
    ? '<p class="muted small" style="margin:0 0 12px">Плечи, грудь, талия, ягодицы, руки и ноги — лентой, раз в две-три недели; фото — раз в месяц. Лента и фото показывают то, чего не видно на весах.</p>'
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
        <li>Лента каждый раз в одном месте: талия — по пупку, рука, предплечье, бедро и плечи — самое широкое место.</li>
        <li>Ягодицы — стоя, ноги вместе, по самой выступающей точке ягодиц; икра — самое широкое место между коленом и щиколоткой (протокол ACSM, measurement-toolkit.org).</li>
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
  const rl = e.target.closest('[data-relight]'); if (rl) { ignite(rl); return; } // v60: тап по телу на итоге — зажечь снова
  const tb = e.target.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; if (tab !== 'today') view = null; render(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const d = el.dataset, a = S.active, set = a && d.k != null ? a.items[+d.k].sets[+d.j] : null;
  switch (d.act) {
    case 'start': if (S.ciOff) startWorkout(); else openCheckin(); break;
    case 'pickday': openPickDay(); break;
    case 'calday': openCalDay(el.dataset.k); break;
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
    case 'finish': { // v18: недоделанные подходы молча не выпадают
      const n = a.items.reduce((c, i) => c + i.sets.filter((x) => Fit.counted(x) && !x.done).length, 0);
      if (!n) { finishWorkout(); break; }
      const w = $('#sheet'); w.hidden = false;
      w.innerHTML = `<div class="sheet"><div class="sheet-t">Не сделано ${n} ${plural(n, ['подход', 'подхода', 'подходов'])}. Завершить тренировку?</div><button class="primary" id="finyes">Завершить</button><button id="finno" style="width:100%;margin-top:8px">Продолжить</button></div>`;
      w.onclick = (e) => { if (e.target.id === 'finyes') { closeSheet(); finishWorkout(); } else if (e.target === w || e.target.id === 'finno') closeSheet(); };
      break;
    }
    case 'hmore': { (a.hx = a.hx || {})[+d.k] = 1; save(); render(); break; }
    case 'summary-ok': view = null; summary = null; delete S.lastSum; save(); render(); break;
    case 'sdel': { // Денис 21.10: «тестовую нажал — удалить, чтобы не засчитывалась»; копия на GitHub не откажет из-за «тренировок меньше» (S.bkDel)
      const d = el.dataset.d, s = S.sessions.find((x) => x.date === d); if (!s || !confirm(`Удалить тренировку ${s.day} за ${new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}? Она не будет считаться в рекордах и подходах.`)) break;
      S.sessions = S.sessions.filter((x) => x !== s); S.bkDel = (S.bkDel || 0) + 1; if (summary && summary.at === d) { view = null; summary = null; delete S.lastSum; }
      save(); closeSheet(); render(); toast('Тренировка удалена'); backupNow(); break; }
    case 'tick': {
      const it = a.items[+d.k];
      if (setKg(it, set) == null) { const i = el.closest('.set').querySelector('[data-sk]'); if (i) i.focus(); break; } // веса нет — сначала ввести
      if (!set.done && !(+set.reps > 0)) { const i = el.closest('.set').querySelector('[data-sr]'); if (i) i.focus(); toast(set.mx ? 'Замер: впиши, сколько повторов вышло' : 'Впиши, сколько повторов сделал'); break; }
      set.done = !set.done; if (!set.done) { delete set.rir; delete set.nk; } save();
      const nx = it.sets[+d.j + 1], turn = set.done && Fit.counted(set) ? Fit.ssTurn(a.items, +d.k) : null; // суперсет: чей ход дальше
      if (set.done) { if (turn && !turn.rest) stopRest(); else if (!(nx && nx.t === 'd')) startRest(restOf(it)); } // Hevy: перед дроп-сетом таймер отдыха не стартует; внутри круга суперсета — тоже
      else if (!a.items.some((i) => i.sets.some((s) => s.done))) stopRest();
      render(); if (set.done) keepSetVisible(+d.k);
      if (set.done) { const b = document.querySelector(`#view [data-act="tick"][data-k="${d.k}"][data-j="${d.j}"]`); if (b) { b.classList.add('pop101'); (b.closest('.set') || b.parentElement).classList.add('fl101'); } } // v101 (№33, Strong 1): строка заливается, галочка прыгает
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
    case 'nask': openChat(+d.k, S.active.items[+d.k].note.trim()); break;
    case 'chat': openChat(); break;
    case 'tech': openTech(+d.k); break;
    case 'prog': openProgress(d.id); break;
    case 'gseg': growSeg = d.s; render(); break;
    case 'ach': openAch(d.id); break;
    case 'gbody': growSeg = 'Тело'; tab = 'grow'; render(); break;
    case 'gside': growSide = d.s; render(); break;
    case 'effhelp': openEffortHelp(); break;
    case 'hint16': openHint16(d.h); break;
    case 'pickw': openPickW(+d.k); break;
    case 'volplus': { const names = []; d.ids.split(',').forEach((k) => { const [day, i] = k.split(':'); const ex = S.program[day] && S.program[day][+i]; if (ex && ex.ranges.length < Fit.VOL_MAX_SETS) { S.program[day][+i] = Fit.addSet(ex); names.push(ex.name); } });
      save(); toast(names.length ? `+1 подход: ${names.join(', ')} — теперь ${S.program[d.ids.split(':')[0]][+d.ids.split(':')[1].split(',')[0]].ranges.length}` : 'Уже максимум'); render(); break; }
    case 'rir': { // ответ «сколько ещё мог»: 3+ при верхе диапазона — тяжелее на шаг, не дотянул до низа — легче, иначе тот же вес
      const it = a.items[+d.k], j = +d.j, s = it.sets[j], v = +d.v, inc = stepOf(it), rg = Fit.rangeOf(it, it.sets.slice(0, j).filter(Fit.counted).length);
      const nk = +s.reps < rg[0] ? Math.max(0, s.kg - inc) : v >= 3 && +s.reps >= rg[1] ? s.kg + inc : s.kg;
      s.rir = v; s.nk = nk;
      for (let n = j + 1; n < it.sets.length; n++) { const x = it.sets[n]; if (!Fit.counted(x) || x.done) continue; if (x.kg != null && !x.auto && x.kg !== s.kg) break; x.kg = nk; x.auto = 1; }
      save(); render(); break;
    }
    case 'deload': { // сброс при застое: зачётные несделанные подходы — 0,9 веса вниз до шага, повторы — верх диапазона
      const it = a.items[+d.k], inc = exById(it.id).incKg || 2.5;
      it.sets.forEach((s, j) => { if (!Fit.counted(s) || s.done || !(s.kg > 0)) return; s.kg = Fit.resetKg(s.kg, inc); s.reps = Fit.rangeOf(it, it.sets.slice(0, j).filter(Fit.counted).length)[1]; delete s.auto; });
      delete it.stall; it.reset = 1; save(); render(); toast('Вес снижен на 10 %'); break;
    }
    case 'exnext': { // Денис 20.10: «закончил упражнение — кнопка, чтобы переходил к следующему»: сворачиваем в строку и едем к следующему
      a.items[+d.k].closed = 1; stopRest(); save(); render(); const nk = a.items.findIndex((x, i) => i > +d.k && !x.closed);
      if (nk < 0) { const f = $('[data-act=finish]'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); break; }
      const n = $(`[data-exk="${nk}"]`), v = $('#view'), t = $('.wtop'); // скроллится #view, не окно; шапку тренировки (sticky .wtop) не перекрываем
      if (n) v.scrollTo({ top: v.scrollTop + n.getBoundingClientRect().top - (t ? t.getBoundingClientRect().bottom : 0) - 8, behavior: 'smooth' }); break;
    }
    case 'exopen': delete a.items[+d.k].closed; save(); render(); break;
    case 'addset': { const it = a.items[+d.k], l = it.sets[it.sets.length - 1]; it.sets.push({ kg: l ? l.kg : null, reps: l ? l.reps : it.ranges[0][0], done: false }); save(); render(); break; }
    case 'rest-add': if (rest) { rest.end += 30000; rest.beeped = false; if (S.active) { S.active.rest = rest; save(); } drawRest(); } break;
    case 'rest-stop': stopRest(); break;
    case 'shoot': { const f = $('#fph'); if (f) f.click(); break; }
    case 'fmode': food.mode = d.v; render(); break;
    case 'fsend': foodSend(); break;
    case 'fmic': voiceToggle(); break;
    case 'fpick': foodAdd(Food.fromRef(REF[+d.i]), 0); break;
    case 'fopick': { const it = food.off[+d.i]; foodAdd({ ...it }, it.serv || 0); break; }
    case 'foff': foodOff(); break;
    case 'fscan': { const f = $('#fbc'); if (f) f.click(); break; }
    case 'mypick': { const r = mine().find((x) => x.key === d.k); if (r) foodAdd(Food.fromMine(r), r.grams); break; }
    case 'myedit': food.myEdit = !food.myEdit; render(); break;
    case 'myoff': S.myOff = [...(S.myOff || []), d.k]; save(); render(); break;
    case 'mdrop': food.photo = null; render(); break;
    case 'msave': {
      const its = food.photo.items.filter((i) => i.grams > 0); if (!its.length) { toast('Впиши граммы'); break; }
      addMeals([{ date: Fit.dstr(Date.now()), t: Date.now(), items: its.map(Food.plain), total: Food.totalOf(its) }]); // t — час для «моих блюд»
      food.photo = null; toast('Записано'); render(); break;
    }
    case 'mdel': S.meals.splice(+d.i, 1); save(); bkSoon(); render(); break;
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
    case 'xfer': { const txt = JSON.stringify({ fit: 1, S, gk: localStorage.getItem(GROQ) || '', bk: bkKey() || '', mac: macTok() });
      navigator.clipboard.writeText(txt).then(() => toast('Скопировано. Открой значок «Зал» → «Перенести из браузера»'), () => { exportData(); toast('Буфер не дал — сохрани файл, потом в значке «Я» → Импорт'); }); break; }
    case 'import': $('#imp').click(); break;
    case 'bk-now': backupNow(true, true); break;
    case 'bk-restore': restoreBackup(); break;
    case 'f12c': food12flip(el.closest('.f12')); break;
    case 'theme': Theme.set(el.dataset.k, el.dataset.v); break;
    case 'fold': meOpen[d.k] = !meOpen[d.k]; render(); break;
    case 'f12h': { const day = Fit.dstr(Date.now()), hb = (S.habits[day] = S.habits[day] || {}); hb[d.h] = !hb[d.h]; save(); bkSoon(); render(); break; }
    case 'mac-pair': macPair(); break;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.opt === 'ci') { if (t.checked) delete S.ciOff; else S.ciOff = 1; save(); }
  if (t.dataset.hab) { const day = Fit.dstr(Date.now()); (S.habits[day] = S.habits[day] || {})[t.dataset.hab] = t.checked; save(); bkSoon(); render(); }
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

// v18: тап в поле веса/повторов выделяет всё, первая цифра заменяет значение (Strong). iOS: select() на тапе ненадёжен — через setTimeout + setSelectionRange
document.addEventListener('focusin', (e) => {
  const t = e.target; if (!t.dataset || (t.dataset.sk == null && t.dataset.sr == null)) return;
  t.dataset.pv = t.value; const sel = () => { try { t.select(); t.setSelectionRange(0, t.value.length); } catch (er) { /* не поддержано */ } };
  sel(); setTimeout(sel, 0); setTimeout(sel, 60);
});
document.addEventListener('mouseup', (e) => { const t = e.target; if (t.dataset && (t.dataset.sk != null || t.dataset.sr != null) && t.selectionStart === 0 && t.selectionEnd === t.value.length) e.preventDefault(); });
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'ftxt') food.text = t.value;
  else if (t.id === 'fq') { food.q = t.value; food.off = null; drawRes(); } // список — без перерисовки экрана, фокус в поле остаётся
  else if (t.dataset.xn != null && S.active) { const it = S.active.items[+t.dataset.xn], v = noteStep(t.value); it.note = t.value; if (v) { S.inc = S.inc || {}; S.inc[it.id] = v; } save(); grow(t); const l = t.previousElementSibling; if (l && l.classList.contains('lnote')) l.hidden = !!t.value;
    const f = t.nextElementSibling; if (f && f.dataset.nf != null) { const d = document.createElement('div'); d.innerHTML = noteFoot(it, +t.dataset.xn); f.replaceWith(d.firstChild); } } // заметка этой тренировки — без перерисовки
  else if (t.dataset.sk != null && S.active) { // вес в строке подхода — без перерисовки, фокус не теряем
    const clean = t.value.replace(/[^0-9.,]/g, ''); if (clean !== t.value) t.value = clean;
    if (parseFloat(clean.replace(',', '.')) > 500) { t.value = t.dataset.pv || ''; toast('Вес не больше 500 кг'); return; }
    t.dataset.pv = t.value;
    const it = S.active.items[+t.dataset.sk], j = +t.dataset.j, s = it.sets[j], v = parseFloat(t.value.replace(',', '.'));
    s.kg = v >= 0 ? v : null; delete s.auto; s.typed = 1;
    // подбор веса: следующие подходы без своего веса — тем же весом (20.10, лесенка убрана)
    for (let n = j + 1, kg = s.kg; kg != null && Fit.counted(s) && n < it.sets.length; n++) {
      const x = it.sets[n];
      if (!Fit.counted(x) || x.done || x.typed) break; // v102: раньше стоп на любом весе — а план ставит вес в каждый подход, и подстановка не шла дальше первого
      x.kg = kg; x.auto = 1; // 20.10: все подходы одним весом
      const i = $('#view').querySelector(`[data-sk="${t.dataset.sk}"][data-j="${n}"]`); if (i) i.value = fmt(kg);
    }
    save(); const e2 = $('#wvol'); if (e2) e2.textContent = fmt(workVol(S.active)) + ' кг';
  }
  else if (t.dataset.sr != null && S.active) {
    const clean = t.value.replace(/[^0-9]/g, ''); if (clean !== t.value) t.value = clean;
    if (+clean > 100) { t.value = t.dataset.pv || ''; toast('Повторов не больше 100'); return; }
    t.dataset.pv = t.value;
    const rs = S.active.items[+t.dataset.sr].sets[+t.dataset.j]; rs.reps = Math.max(0, parseInt(t.value, 10) || 0); rs.touched = 1; // touched — введённое не стирать при перерисовке
    save(); const e2 = $('#wvol'); if (e2) e2.textContent = fmt(workVol(S.active)) + ' кг';
  }
  else if (t.dataset.fg != null && food.photo) { // граммы поменял — пересчёт локально, без перерисовки (не теряем фокус)
    const i = +t.dataset.fg, it = food.photo.items[i]; Food.recalc(it, num(t.value));
    const v = $('#view'); v.querySelector(`[data-fk="${i}"]`).textContent = it.kcal; v.querySelector(`[data-fp="${i}"]`).textContent = fmt(it.protein);
    const tot = Food.totalOf(food.photo.items); $('#ftot').textContent = `${tot.kcal} ккал · ${fmt(tot.protein)} г белка`;
  }
});

// v65 (Денис 20.10: «почему не внёс опять»): кэш отдавал старую версию до второго запуска — новая версия поставилась → перезагрузка сама, раз
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let rl = false;
  const rel = () => { if (had && !rl) { rl = true; location.reload(); } }; // v80: не дёргать открытое приложение — перезагрузка, только когда свёрнуто
  // v88 (Денис 21.10: «не обновилось»): новая версия скачалась при открытом приложении — плашка «Обновить», не ждать сворачивания
  const bar = () => { if (!had || rl || document.querySelector('.upd88') || S.active) return; const b = document.createElement('button'); b.className = 'upd88'; b.textContent = 'Вышла новая версия — нажми, обновлю'; b.onclick = rel; document.body.appendChild(b); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (document.hidden) rel(); else { bar(); document.addEventListener('visibilitychange', () => document.hidden && rel()); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); });
}
restoreRest(); render(); if (!S.program) onboarding(); else if (S.active) lockScreen(); else bkMaybe();
$('#view').addEventListener('scroll', () => saveScroll(), { passive: true });
