/* Данные программы и чистая логика: прогрессия, e1ПМ, статистика. Без DOM.
   Программа 11.10 (PID 3): три дня A-B-C, всё тело + акцент дня, сборка по r26/r27 (частота 2–3×/нед на мышцу, 7–10 подходов/нед на группу,
   прогрессия как у Nuckols/GZCLP). Запрет Дениса: присед со штангой, становая, жим стоя, выпады, гакк — колени/поясница.
   Ниже — история: PID 2 была Greg Nuckols Beginner Program, вариант Strength (Boostcamp, сверка — research/r17-nuckols-verify.md):
   четыре тренировки A-B-C по кругу, 3 раза в неделю; в каждом упражнении 3 подхода со своим диапазоном повторов
   и своим весом. Денис 10.10: без тяг с пола и приседа со штангой — «где я могу потянуть». Замены автора (поле alternatives в данных
   программы): присед -> гакк-присед, тяга в наклоне -> тяга гантелей с упором грудью, Good Morning -> гиперэкстензия. Становая: у автора
   замены без штанги нет — стоят сгибания ног в тренажёре (выбор наш). У сгибаний и гиперэкстензии диапазоны изоляции (тоже наше). */
const Fit = (() => {
  const PID = 3; // метка программы в записи тренировки: круг A-B-C считается только по ним
  const ORDER = ['A', 'B', 'C']; // версия 57: всё тело 3× (раньше, версия 56, — раздельные дни A грудь+бицепс, B ноги+плечи, C спина+трицепс)
  const LAYOUT = 57; // флаг раскладки в данных (S.lay): телефон с меньшим числом переносится через split
  // диапазоны по подходам: c — базовые, i — изоляция
  const RANGES = { c: [[3, 5], [5, 8], [8, 10]], i: [[8, 10], [10, 12], [12, 15]], w: [[10, 20], [10, 20], [10, 20]] }; // w (версия 57): предплечья и пресс — 10–20 повторов (Nippard, предплечья 10–20; research/r40-abs.md, пресс 10–20)
  // ex: [id, имя, диапазоны, шаг кг, отдых с, свой вес?]. Шаг — «5–10 lbs» автора: 2,5 кг, ноги и тяги с пола 5 кг.
  // Отдых у автора «от 1 до 5 минут, сколько нужно»; здесь старт таймера: база 2,5–3 мин, изоляция 1,5 мин.
  /* Версия 57 (Денис 15.10 одобрил): всё тело 3× в неделю, большой акцент на руки и предплечья. Раскладка — research/r39-ИТОГ.md, r40-arms.md, r40-abs.md
     (tools/v57_sheet.py, PLAN). Порядок в тренировке = порядок строк: большие мышцы, ноги, руки, предплечья последними (хват для тяг). Подходов в неделю
     (главная мышца 1, вторая 0,5): грудь 10, спина 10, квадрицепс 10, задняя сторона бедра 7, бицепс 14 прямых (+ от тяг), трицепс 12, предплечья 10
     (Nuckols 10–12, RP MAV 8–24), пресс 2×3. Повторы 10–20 («w») — предплечья (Nippard) и пресс (r40-abs). Седьмое поле — подходов, если не 3.
     Один и тот же id в нескольких днях (жим ногами A/C, махи в стороны A/B/C, трицепс с гантелью A/C) — вес каждый день берётся по id (split/migrate). */
  const RAW = {
    A: [ // грудь, спина, ноги, руки, предплечья, пресс
      ['chestpress', 'Жим в тренажёре от груди', 'c', 2.5, 150, 0, 4],
      ['latpull', 'Тяга верхнего блока', 'c', 2.5, 150, 0, 4],
      ['legpress', 'Жим ногами', 'c', 5, 180],
      ['seatcurl', 'Сгибания ног сидя в тренажёре', 'i', 2.5, 90],
      ['cablelat', 'Махи в стороны на блоке', 'i', 1, 90],
      ['dbcurl', 'Сгибания на бицепс с гантелями', 'i', 2.5, 90, 0, 5],
      ['dbtri', 'Разгибания на трицепс с гантелью', 'i', 2.5, 90, 0, 4],
      ['wristcurl', 'Сгибания запястий с гантелями сидя', 'w', 1, 90], // ладони вверх
      ['floorcrunch', 'Скручивания на полу', 'w', 2.5, 90, 1],
    ],
    B: [
      ['incmach', 'Наклонный жим в тренажёре', 'i', 2.5, 120],
      ['leverrow', 'Тяга с упором грудью в тренажёре', 'c', 2.5, 150], // вес — на одну руку
      ['legext', 'Разгибания ног в тренажёре', 'i', 2.5, 90],
      ['legcurl', 'Сгибания ног в тренажёре', 'i', 2.5, 90, 0, 4],
      ['cablelat', 'Махи в стороны на блоке', 'i', 1, 90],
      ['cablecurl', 'Сгибания на бицепс на блоке', 'i', 2.5, 90, 0, 5],
      ['pushdown', 'Разгибания на блоке', 'i', 2.5, 90, 0, 4],
      ['revwrist', 'Разгибания запястий с гантелями сидя', 'w', 1, 90], // ладони вниз
      ['calf', 'Икры в тренажёре', 'i', 5, 90],
      ['revfly', 'Обратные разведения в тренажёре', 'i', 2.5, 90], // задняя дельта
    ],
    C: [
      ['shpress', 'Жим на плечи в тренажёре', 'c', 2.5, 150],
      ['cablefly', 'Сведения рук на блоках', 'i', 2.5, 90],
      ['leverpull', 'Тяга сверху в рычажном тренажёре', 'i', 2.5, 120], // Денис 15.10: Т5 = Life Fitness Insignia Dual Axis Pulldown, грузоблок — вес общий по стопке
      ['legpress', 'Жим ногами', 'c', 5, 180, 0, 4],
      ['cablelat', 'Махи в стороны на блоке', 'i', 1, 90],
      ['hammer', 'Молотки', 'i', 2.5, 90, 0, 4],
      ['dbtri', 'Разгибания на трицепс с гантелью', 'i', 2.5, 90, 0, 4],
      ['revcurl', 'Сгибания рук обратным хватом', 'w', 2.5, 90, 0, 4], // штанга, хват сверху
      ['legraise', 'Подъёмы ног в висе', 'w', 0, 90, 1],
    ],
  };

  /* карта 3.12 (Денис 13.10: «взял одну базу и на всех натягиваешь, под каждое упражнение своя методика»): диапазон — по упражнению,
     а не только по слоту. Лесенка автора 3–5 / 5–8 / 8–10 остаётся у штанги и подтягиваний; тренажёры, блоки и гантели в «тяжёлом» слоте
     идут 8–10 / 10–12 / 12–15. Nuckols (strongerbyscience.com/hypertrophy-range-fact-fiction): «low reps on machines just seems silly»,
     тяги 8–15, «Dumbbell pressing of all sorts: Sets of 8-15», подтягивания 5–10; RP (back-training-tips-hypertrophy): тяги вниз и машинные
     тяги 10–30; ACSM 2009 новичку и вернувшемуся после перерыва: 8–12. Сверка — research/r36. Буквы 'c'/'i' в RAW не трогаем:
     по ним считаются главные упражнения (MAIN), цель и проверка силы. */
  const SLOT_KIND = {}; ORDER.forEach((d) => { SLOT_KIND[d] = {}; RAW[d].forEach((e) => { SLOT_KIND[d][e[0]] = e[2]; }); });
  const isHeavy = (id) => EQ[id] === 'b' || id === 'pullup';
  const rkind = (id, sk) => (sk === 'c' && !isHeavy(id) ? 'i' : sk);
  // диапазоны упражнения id в слоте slot дня day; n — сколько подходов уже стоит (4-й добавляется по факту, повторяет последний)
  const rangesFor = (day, slot, id, n = 3) => { const b = RANGES[rkind(id, (SLOT_KIND[day] || {})[slot] || 'i')]; return Array.from({ length: Math.max(n, b.length) }, (_, i) => b[Math.min(i, b.length - 1)].slice()); };
  const round25 = (x) => Math.round(x / 2.5) * 2.5;
  // следующий подход «примерно на 10 % легче» (заметка автора к неделе 1); до 20 кг округляем до 1 кг, дальше до 2,5
  const stepDown = (kg) => { const x = kg * 0.9; return x >= 20 ? round25(x) : Math.round(x); };

  // kgs — вес каждого подхода; null — «подбери» на первой тренировке; свой вес — 0 (в поле пишется добавочный)
  const mkEx = (d, [id, name, r, incKg, restSec, bw, n = 3]) => { const ranges = rangesFor(d, id, id, n); return { id, name, ranges, incKg, group: id, restSec, bw: !!bw, kgs: ranges.map(() => (bw ? 0 : null)) }; };
  function buildProgram() {
    const p = {};
    for (const d of ORDER) p[d] = RAW[d].map((row) => mkEx(d, row));
    return p;
  }
  /* карта 2.10: упражнения, дописанные в конец дня (руки в дне B), доезжают в сохранённую программу добавкой — то, что уже стоит, не трогаем
     (замены, веса, порядок). Вес берём у этого же упражнения из другого дня, если повторы те же, иначе «подбери». Повторно — без изменений. */
  /* версия 54 (Денис 14.10: «такое ощущение, что ты напихал рандомно… перепроверь, что ставил чётко по дням»). Добавки дописывались в конец дня, и в днях A и C
     мышцы шли вперемешку: в дне A тяга сидя стояла после бицепса, грудь и спина были разорваны руками. SEQ — порядок в тренировке и на экране: сначала большие
     мышцы блоком (грудь, спина), потом ноги, плечи, руки в конце — «large muscle group before small, multiple-joint before single-joint» (ACSM 2009, PMID 19204579).
     Ключ — слот. Сохранённая программа и RAW остаются в порядке добавления: isCurrent сверяет их по местам, arms дописывает в конец. День B уже шёл так. */
  const SEQ = {}; // версия 56: RAW уже стоит в порядке тренировки
  function seq(day, list) {
    const o = SEQ[day]; if (!o) return list.slice();
    const at = (e) => { const i = o.indexOf(e.slot || e.id); return i < 0 ? o.length : i; };
    return list.map((e, i) => [e, i]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map((x) => x[0]);
  }
  const BASE_N = Object.fromEntries(ORDER.map((d) => [d, RAW[d].length])); // версия 57: добавок нет — программа та же, только если дни совпадают целиком
  function arms(prog) {
    const p = { ...prog }, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const d of ORDER) for (let i = (prog[d] || []).length; i < RAW[d].length; i++) {
      const e = mkEx(d, RAW[d][i]), twin = ORDER.flatMap((x) => prog[x] || []).find((x) => x.id === e.id && same(x.ranges, e.ranges) && x.kgs.some((k) => k != null)); // версия 54: и у того, что стоит заменой (тяга сидя в дне C)
      if (twin) e.kgs = twin.kgs.slice();
      if (p[d] === prog[d]) p[d] = prog[d].slice();
      p[d].push(e);
    }
    return p;
  }
  const isCurrent = (prog) => !!(prog && ORDER.every((d) => Array.isArray(prog[d]) && prog[d].length >= BASE_N[d] && prog[d].length <= RAW[d].length && prog[d].every((e, i) => e.ranges && e.kgs && (e.id === RAW[d][i][0] || e.slot === RAW[d][i][0]))));
  // прежний состав -> текущий: веса упражнений, которые остались, переезжают по id; из совсем старой A/B — в упражнение
  // с тем же названием (первый подход, дальше −10 %); у новых упражнений вес «подбери»
  function migrate(old) {
    const p = buildProgram(), was = {}, kept = {}, inDay = {}, has = (kgs) => kgs && kgs.some((k) => k != null);
    for (const d in old || {}) for (const e of old[d] || []) { if (e && Array.isArray(e.kgs)) { if (has(e.kgs) || !kept[e.id]) kept[e.id] = e.kgs; if (has(e.kgs)) inDay[d + ':' + e.id] = e.kgs; } else if (e && e.kg > 0) was[e.name] = e.kg; } // версия 56: пустой вес из другого дня не затирает записанный
    for (const d of ORDER) for (const e of p[d]) {
      const k = inDay[d + ':' + e.id] || kept[e.id]; // упражнение в двух днях (сгибания ног B×4 и C×3) — вес своего дня, нет — из другого
      if (has(k)) e.kgs = e.kgs.map((_, i) => k[Math.min(i, k.length - 1)]); // подходов стало больше — лишний с весом последнего, как addSet
      else if (was[e.name]) { const w = was[e.name], ks = [w, stepDown(w), stepDown(stepDown(w))]; e.kgs = e.kgs.map((_, i) => ks[Math.min(i, 2)]); }
    }
    return p;
  }
  /* версия 56: что Денис сделал во вторник 13.10 (день C) — его слова: вес × повторы и как далось. Где после переноса вес «подбери», ставим расчёт
     кнопки «Подобрать вес» (startKg). Как далось → кнопка «Сколько ещё мог сделать»: «легко» — «ещё 3 и больше», «средне», «выше среднего» и без оценки — «ещё 1–2».
     Вес у тяг в рычажных тренажёрах — на одну руку. Бицепс стоя гантелями 10 кг — это dbcurl (в дне A). Вес, который уже стоит, не трогаем. */
  const TUE = { latpull: [40, 10, 1], leverrow: [15, 10, 3], leverpull: [20, 10, 1], dbcurl: [10, 10, 1], legcurl: [35, 8, 1], dbtri: [14, 10, 3], pushdown: [30, 10, 1], revfly: [20, 12, 1] };
  function split(old, keep) {
    const p = migrate(old);
    for (const d of ORDER) p[d] = p[d].map((e) => { const t = TUE[e.id]; if (!t || e.kgs.some((k) => k != null)) return e; const r = startKg(e, t[0], t[1], t[2], keep); return r ? { ...e, kgs: r.kgs } : e; });
    return p;
  }
  const rangeOf = (ex, i) => ex.ranges[Math.min(i, ex.ranges.length - 1)];

  /* Прогрессия автора: тот же вес, пока не сделаешь на повтор больше верха диапазона (5–8 -> 9), тогда вес выше
     (гайд программы: 185×6 при 3–5 -> в следующий раз 190). Считается на каждый подход отдельно.
     Правила срыва у автора нет («снизь вес и сделай легче») — запоминаем тот вес, с которым подход сделан.
     done — зачётные подходы по порядку: {kg, reps} или null, если подход не отмечен. */
  function progress(ex, done, keep) { // keep — лёгкий день по чек-ину (app-021): вес программы вниз не переписываем
    const kgs = ex.kgs.slice();
    done.forEach((s, i) => {
      if (!s || s.kg == null || i >= kgs.length) return;
      kgs[i] = s.reps > ex.ranges[i][1] ? s.kg + ex.incKg : s.kg;
      if (keep && ex.kgs[i] != null && kgs[i] < ex.kgs[i]) kgs[i] = ex.kgs[i];
    });
    return { ...ex, kgs };
  }
  // сколько повторов ставить в подход i: на один больше прошлого раза с тем же весом; вес новый — низ диапазона;
  // первая тренировка — верх (вес подбирается так, чтобы весь диапазон дался с запасом 1–2 повтора)
  function targetReps(ex, i, last) {
    const [min, max] = rangeOf(ex, i), kg = ex.kgs[Math.min(i, ex.kgs.length - 1)];
    if (kg == null || !last) return max;
    return last.kg === kg ? Math.max(min, Math.min(max + 1, last.reps + 1)) : min;
  }

  // Epley, только 1–8 повторов
  const e1rm = (kg, r) => (kg > 0 && r >= 1 && r <= 8 ? kg * (1 + r / 30) : null);
  // лучший оценочный 1ПМ записи: по зачётным подходам, у каждого свой вес
  function bestE1(e) {
    let b = null;
    for (const x of setsOf(e)) { const v = counted(x) ? e1rm(x.kg, x.reps) : null; if (v != null && (b == null || v > b)) b = v; }
    return b;
  }
  function e1Series(sessions, name) {
    const s = [];
    for (const se of sessions) {
      const e = se.exercises.find((x) => x.name === name);
      const v = e && bestE1(e);
      if (v != null) s.push(v);
    }
    return s;
  }

  /* Тип подхода: '' обычный, 'w' разминка, 'f' до отказа, 'd' дроп-сет — меню по тапу на номер, как у Hevy
     (hevyapp.com/features/workout-set-types). Что считать — как в IronTrack src/performance.js (MIT):
     рекорды без разминки (workingSets, 13–17), прогрессия без разминки и дропов (COUNTED, 92). */
  const TYPES = { w: 'Разминка', '': 'Обычный', f: 'До отказа', d: 'Дроп-сет' };
  const counted = (s) => s.t !== 'w' && s.t !== 'd';
  // все подходы записи: с типами лежат в sets [{t, kg, reps}], у старых записей — только kg и reps
  const setsOf = (e) => e.sets || e.reps.map((r) => ({ t: '', kg: e.kg || 0, reps: r }));
  // запись упражнения из отмеченных подходов: kg — вес первого зачётного, reps — зачётные, sets — все, если есть тип или свой вес
  function record(name, kg, done) {
    const sets = done.map((s) => ({ t: s.t || '', kg: s.kg != null ? s.kg : kg, reps: s.reps }));
    const out = { name, kg, reps: sets.filter(counted).map((s) => s.reps) };
    if (sets.some((s) => s.t || s.kg !== kg)) out.sets = sets;
    return out;
  }
  // с каким подходом прошлого раза сравнивать подход j: тот же по счёту среди разминочных или среди остальных; -1 — не с чем
  function prevIndex(entry, sets, j) {
    if (!entry) return -1;
    const warm = (s) => s.t === 'w', w = warm(sets[j]);
    let n = 0;
    for (let i = 0; i < j; i++) if (warm(sets[i]) === w) n++;
    for (let i = 0; i < entry.sets.length; i++) if (warm(entry.sets[i]) === w && n-- === 0) return i;
    return -1;
  }

  /* Рекорд на подходе — порт epley1RM (src/model.js) и compareSet (src/performance.js) из SKR18156592/IronTrack
     (MIT, © 2026 Suman Kumar Raj, текст лицензии — THIRD_PARTY_NOTICES.md). Здесь Эпли без потолка повторов: сравниваем подход с подходом. */
  const epley = (kg, r) => (r === 1 ? kg : kg * (1 + r / 30));
  // { best: лучший оценочный 1ПМ за всю историю, sets: подходы прошлого раза [{kg, reps}] }; null — упражнения в истории нет
  function perfEntry(sessions, name) {
    let entry = null;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const e = sessions[i].exercises.find((x) => x.name === name);
      const logged = e ? setsOf(e).filter((s) => s.reps > 0) : [];
      if (!logged.length) continue;
      if (!entry) { entry = { best: 0, sets: logged.map((s) => (s.t ? { kg: s.kg || 0, reps: s.reps, t: s.t } : { kg: s.kg || 0, reps: s.reps })) }; if (e.note) entry.note = e.note; } // заметка прошлого раза — подсказкой на один раз
      for (const s of logged) if (s.t !== 'w') entry.best = Math.max(entry.best, epley(s.kg || 0, s.reps)); // workingSets: разминка в рекорд не идёт
    }
    return entry;
  }
  // 'pr' — выше лучшего оценочного 1ПМ; 'up' — лучше того же подхода в прошлый раз (вес больше или тот же вес и больше повторов)
  function compareSet(entry, setIndex, kg, reps) {
    const w = +kg || 0, r = +reps;
    if (!entry || !(r > 0)) return null;
    if (entry.best > 0 && epley(w, r) > entry.best + 1e-9) return 'pr';
    const last = entry.sets[setIndex];
    if (last && (w > last.kg || (w === last.kg && r > last.reps))) return 'up';
    return null;
  }
  // объём = сумма вес × повторы (как в шапке записи тренировки у Hevy)
  const volume = (kg, reps) => (+kg || 0) * reps.reduce((a, b) => a + b, 0);
  const sessionVolume = (s) => s.exercises.reduce((a, e) => a + setsOf(e).reduce((v, x) => v + (+x.kg || 0) * x.reps, 0), 0);

  /* ---------- тренер (app-014): прогресс, застой, замер, цель. Источники и цитаты — research/r19-progress-goals.md ---------- */
  /* Прогресс упражнения — что Hevy показывает на его экране (hevyapp.com/features/exercise-performance): «the heaviest weight used,
     your true or projected 1RM, and your best set and session volume», Set Records — «the maximum amount of weight you've lifted for
     a given number of reps», у своего веса — «the most reps you've done in a set and a workout». Разминка не считается, как в рекордах.
     Точка на тренировку: top — топ-подход, kg — тяжелейший вес, e1 — расчётный 1ПМ, set — лучший подход (кг × повт), vol — объём. */
  function exLog(sessions, name) {
    const out = [];
    for (const se of sessions) {
      const e = se.exercises.find((x) => x.name === name);
      const sets = e ? setsOf(e).filter((s) => s.t !== 'w' && s.reps > 0).map((s) => ({ kg: +s.kg || 0, reps: s.reps })) : [];
      if (!sets.length) continue;
      const top = topSet(sets), bset = sets.reduce((b, s) => (s.kg * s.reps > b.kg * b.reps ? s : b));
      out.push({ t: Date.parse(se.date), sets, top, bset, test: !!e.test, dl: !!e.dl, kg: top.kg, e1: Math.max(...sets.map((s) => epley(s.kg, s.reps))), set: bset.kg * bset.reps,
        vol: sets.reduce((v, s) => v + s.kg * s.reps, 0), reps: Math.max(...sets.map((s) => s.reps)), allReps: sets.reduce((v, s) => v + s.reps, 0) });
    }
    return out;
  }
  function records(log) {
    const r = { kg: 0, e1: 0, set: 0, vol: 0, reps: 0, allReps: 0, bset: null, byReps: {} };
    for (const p of log) {
      if (p.set > r.set) r.bset = p.bset;
      for (const k of ['kg', 'e1', 'set', 'vol', 'reps', 'allReps']) r[k] = Math.max(r[k], p[k]);
      for (const s of p.sets) if (s.kg > 0 && s.kg > (r.byReps[s.reps] || 0)) r.byReps[s.reps] = s.kg;
    }
    return r;
  }

  /* Застой — порт AndreiBautin/LiftOS (MIT, © 2026 Andrei Bautin, текст лицензии — THIRD_PARTY_NOTICES.md):
     src/domain/logging/versus-last.ts — versusLast (35–47), topSet (54–64), isProgress (102–104);
     src/domain/programs/stall.ts — STALL_SESSIONS, RESET_SHARE, sessionsWithoutProgress, isStalled, resetLoad (25–62), FATIGUE_STALLS, RECENT_DAYS (99–102).
     Застой — три тренировки подряд, не побившие ЛУЧШИЙ топ-подход до них (вес выше или тот же вес и больше повторов; не «прошлый раз»:
     повторы 6, 5, 6 иначе читались бы как прогресс). Вес легче — новый подъём, счёт с нуля. Сброс −10 % предлагается, сам не применяется.
     То же правило у StrongLifts (support.stronglifts.com/article/71-progression): три срыва подряд -> −10 %. */
  const STALL_SESSIONS = 3, RESET_SHARE = 0.9, FATIGUE_STALLS = 3, RECENT_DAYS = 21;
  function versus(now, last) {
    const d = Math.round(((now.kg || 0) - (last.kg || 0)) * 100) / 100; // сотые: 2,5 и 1,25 вычитаются точно
    if (d > 0) return 'heavier';
    if (d < 0) return 'lighter';
    return now.reps > last.reps ? 'more' : now.reps < last.reps ? 'fewer' : 'same';
  }
  // топ-подход тренировки: самый тяжёлый вес и больше всего повторов с ним
  function topSet(sets) { return sets.reduce((b, s) => (!b || s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps) ? s : b), null); }
  // сколько тренировок подряд, считая последнюю, не побили лучший топ-подход до них; tops — от старых к новым
  function stalledFor(tops) {
    let best = tops[0], n = 0;
    for (const now of tops.slice(1)) {
      const v = versus(now, best);
      if (v === 'heavier' || v === 'more' || v === 'lighter') { best = now; n = 0; } else n++;
    }
    return n;
  }
  const isStalled = (tops) => stalledFor(tops) >= STALL_SESSIONS;
  // версия 57: тренировки разгрузочной недели в счёт застоя не идут (вес и подходы там снижены нарочно)
  const stallTops = (log) => log.filter((p) => !p.dl).map((p) => p.top);
  // вес после сброса: девять десятых, вниз до шага
  const resetKg = (kg, inc) => Number((Math.floor((kg * RESET_SHARE) / inc) * inc).toFixed(4));

  /* Чек-ин перед тренировкой (app-021). Порт gymcoach-app/gymcoach lib/progression.ts (MIT; с живым репо сверено 13.10): пороги — строки 43–58,
     решение — assessRecovery, 209–230. Готовность 1 (выжат) … 5 (заряжен); боль в главной мышце упражнения 1 (нет) … 5 (еле двигается).
     Готовность ≤ 2 или боль ≥ 4 — вес без прибавки; готовность 1 или боль 5 — один шаг −10 %. Чек-ин только держит или снижает,
     старше 36 ч не считается. 10 % — выбор автора gymcoach без ссылки на исследование: ориентир, так и пишем в листе.
     Сон у gymcoach в правило не входит (lib/coach.ts — уходит тренеру в контекст); у нас так же — в чат.
     Наше: вес считается на каждый подход (движок такой); «без прибавки» — вернуть вес прошлой тренировки этого дня, если программа его
     подняла; лёгкий день веса программы вниз не переписывает (progress(…, keep)) и замер не ставит. */
  const CI_HOURS = 36, CI_HOLD = 2, CI_DELOAD = 1, SORE_HOLD = 4, SORE_DELOAD = 5;
  const ciFresh = (ci, now) => !!ci && ci.ready >= 1 && now - ci.t <= CI_HOURS * 3600e3;
  // что чек-ин значит для упражнения: { mode: 'ok' | 'hold' | 'deload', why: 'ready' | 'sore', g: главная мышца, v: оценка }
  function recovery(ci, id, now) {
    if (!ciFresh(ci, now)) return { mode: 'ok' };
    const g = (MUSCLE[id] || [])[0], sore = g && ci.sore ? +ci.sore[g] || 0 : 0;
    const by = (ready) => (ready ? { why: 'ready', v: ci.ready } : { why: 'sore', g, v: sore });
    if (ci.ready <= CI_DELOAD || sore >= SORE_DELOAD) return { mode: 'deload', ...by(ci.ready <= CI_DELOAD) };
    if (ci.ready <= CI_HOLD || sore >= SORE_HOLD) return { mode: 'hold', ...by(ci.ready <= CI_HOLD) };
    return { mode: 'ok' };
  }
  // зачётные подходы прошлой тренировки ЭТОГО дня программы: от них видно, поднят ли вес (одно упражнение бывает в двух днях с разными весами)
  function dayLast(sessions, day, name) {
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (sessions[i].p !== PID || sessions[i].day !== day) continue;
      const e = sessions[i].exercises.find((x) => x.name === name);
      if (e) return setsOf(e).filter(counted);
    }
    return null;
  }
  // −10 % на снаряде с шагом inc — как selectDirectionalWeight у gymcoach (lib/gym-loads.ts 139–159): из весов НИЖЕ текущего ближайший
  // к цели, при равенстве — меньший; ниже некуда — вес остаётся. 80 → 72,5; гантели 10 при шаге 2,5 → 7,5 (меньше шага не снять)
  function easeKg(kg, inc) {
    const t = kg * RESET_SHARE, lo = Math.floor(t / inc + 1e-9) * inc, c = [lo, lo + inc].map((v) => Number(v.toFixed(4))).filter((v) => v > 0 && v < kg - 1e-9);
    return c.length ? c.reduce((b, v) => (Math.abs(v - t) < Math.abs(b - t) - 1e-9 ? v : b)) : kg;
  }
  // веса подходов на сегодня: hold — прибавку снять; deload — после этого ещё −10 % до шага снаряда. Свой вес и «подбери» не трогаем
  function easeKgs(ex, last, mode) {
    return ex.kgs.map((kg, i) => {
      if (mode === 'ok' || !(kg > 0)) return kg;
      const l = last && last[i], held = l && l.kg > 0 && Math.abs(l.kg + ex.incKg - kg) < 1e-6 ? l.kg : kg;
      return mode === 'deload' ? easeKg(held, ex.incKg) : held;
    });
  }

  /* Суперсеты (app-022). Механика Hevy (hevyapp.com/features/what-are-supersets, открыта 13.10): ⋮ → «+ Add To Superset» → выбрать пару; в суперсете
     может быть больше двух; «Remove From Superset»; у каждого суперсета свой цвет; Smart Superset Scrolling — после отметки подхода экран едет к следующему
     упражнению суперсета, после последнего — обратно к первому. Что с чем: «agonist-antagonist muscles (for example, the biceps and triceps)», «isolation
     exercises». Отдых: «not resting between sets is the most time-efficient… you can add up to 60-90 seconds» — у нас отдых после круга.
     Мета-анализ 2025 (PMID 39903375, 19 работ, n = 313): повторы и объём те же (SMD −0,03 / 0,05), сила и масса те же (0,10 / −0,05), занятие короче,
     по ощущению тяжелее (RPE SMD 0,77); пары антагонистов — больше повторов (0,68), пары на одну мышцу — меньше объёма (−1,08).
     SS — пары, которые тренер предлагает (сам не ставит): соседние изоляции на разные мышцы; выбор пар наш. Группы лежат отдельно от программы
     (S.ss[день] = [[ключ, ключ…]…], ключ — слот упражнения): порядок программы не трогаем, isCurrent сверяет её по местам. */
  const SS = { A: [['dbcurl', 'dbtri']], B: [['legext', 'legcurl'], ['cablecurl', 'pushdown']], C: [['hammer', 'dbtri']] }; // версия 57: соседние изоляции, мышцы-антагонисты (бицепс–трицепс, квадрицепс–задняя сторона бедра)
  const ssKey = (it) => it.slot || it.id;
  // расставить группы и порядок в идущей тренировке: участники суперсета встают подряд на месте первого из них
  function ssApply(items, groups) {
    const g = (groups || []).map((x) => x.filter((k) => items.some((it) => ssKey(it) === k))).filter((x) => x.length > 1), out = [];
    for (const it of items) {
      if (out.includes(it)) continue;
      const x = g.find((y) => y.includes(ssKey(it)));
      if (!x) { it.group = it.id; out.push(it); continue; }
      for (const k of x) { const m = items.find((i) => ssKey(i) === k); m.group = 'ss:' + x[0]; out.push(m); }
    }
    return out;
  }
  // группы после «добавить key в суперсет к to» и после «убрать key»
  const ssRemove = (groups, key) => (groups || []).map((x) => x.filter((k) => k !== key)).filter((x) => x.length > 1);
  function ssAdd(groups, key, to) {
    const g = (groups || []).map((x) => x.filter((k) => k !== key)), t = g.find((x) => x.includes(to));
    if (t) t.push(key); else g.push([to, key]);
    return g.filter((x) => x.length > 1);
  }
  // чей ход после отметки зачётного подхода упражнения k: { k, rest }; rest false — сразу, без отдыха; null — не суперсет или всё сделано
  function ssTurn(items, k) {
    const g = items.map((it, i) => i).filter((i) => items[i].group === items[k].group);
    if (g.length < 2) return null;
    const n = (i) => items[i].sets.filter((s) => counted(s) && s.done).length, open = (i) => items[i].sets.some((s) => counted(s) && !s.done);
    const next = g.filter((i) => i > k).find((i) => open(i) && n(i) < n(k));
    if (next != null) return { k: next, rest: false };
    const first = g.find(open);
    return first == null ? null : { k: first, rest: true };
  }
  // сколько минут экономит пара: отдых после подходов первого упражнения не нужен
  const ssSave = (a, b) => (Math.min(a.ranges.length, b.ranges.length) * a.restSec) / 60;

  /* Рекорд сразу при отметке подхода — Live PR у Hevy (hevyapp.com/features/live-pr, открыта 13.10): «instantly lets you know when you've achieved
     a new best 1RM, heaviest weight lifted for multiple reps, set volume, most reps, or duration… you're presented with a banner».
     Берём расчётный 1ПМ и тяжелейший вес, у своего веса — повторы. «Объём подхода» и «больше повторов» с весом не показываем: при двойной
     прогрессии они срабатывают от снижения веса. Первая запись упражнения — не рекорд.
     rec — records(exLog) до тренировки; before — зачётные подходы, уже сделанные сегодня [{kg, reps}]: планка поднимается по ходу тренировки. */
  function liveRecord(rec, before, kg, reps) {
    const w = +kg || 0, r = +reps, out = [];
    if (!rec || !(r > 0) || !(rec.reps > 0)) return out;
    const bar = (k, f) => Math.max(rec[k], ...before.map(f));
    if (w > 0) {
      const k0 = bar('kg', (s) => +s.kg || 0), e0 = bar('e1', (s) => epley(+s.kg || 0, s.reps)), e1 = epley(w, r);
      if (k0 > 0 && w > k0 + 1e-9) out.push({ type: 'kg', now: w, was: k0 });
      if (e0 > 0 && e1 > e0 + 1e-9) out.push({ type: 'e1', now: e1, was: e0 });
    } else if (!(rec.kg > 0)) {
      const r0 = bar('reps', (s) => s.reps);
      if (r > r0) out.push({ type: 'reps', now: r, was: r0 });
    }
    return out;
  }

  /* Замер. Fitbod «Max Effort Day» (fitbod.me/blog/fitbod-algorithm): «Every few workouts, one or two exercises will be flagged …
     you're asked to do as many reps as possible on the final set». Где остановиться — GZCLP у Liftosaur (liftosaur.com/programs/gzclp):
     «stop when you can't maintain good form for another rep». Замеряем базовые упражнения: первый заход — база (Денис 10.10: силовые
     замерить в зале на первой неделе), дальше раз в TEST_DAYS и не больше TEST_MAX за тренировку. 28 дней — число наше. */
  const MAIN = new Set(ORDER.flatMap((d) => RAW[d]).filter((e) => e[2] === 'c').map((e) => e[0]));
  const isMain = (id) => MAIN.has(id); // для заменённого упражнения передавать слот (e.slot || e.id): диапазоны и замер идут от слота
  const TEST_DAYS = 28, TEST_MAX = 2;
  // log — exLog упражнения; due: 'first' — замера ещё не было, 'again' — прошло TEST_DAYS, null — рано
  function testDue(log, now) {
    let last = 0;
    for (const p of log) if (p.test) last = p.t;
    if (!log.length) return { last, due: null }; // упражнение ещё не делал — замер не ставим: первый раз подбираем вес (Денис 12.10)
    return { last, due: !last ? 'first' : now - last >= TEST_DAYS * DAY ? 'again' : null };
  }
  // кого замерять сегодня: все первые замеры, повторные — самые давние, пока всего не станет TEST_MAX
  function pickTests(cands) {
    const first = cands.filter((c) => c.due === 'first').map((c) => c.id);
    const again = cands.filter((c) => c.due === 'again').sort((a, b) => a.last - b.last).slice(0, Math.max(0, TEST_MAX - first.length)).map((c) => c.id);
    return [...first, ...again];
  }

  /* Цель «расчётный 1ПМ X кг к дате» — как у StrengthLog (help.strengthlog.com/help-article/how-to-set-up-a-goal/, тип «Estimated 1RM»:
     «start and end dates», «What is your goal?», стартовое значение — от него считается процент; r20 §2). Наше, не из StrengthLog: цель ставится
     сама после первой записи, отметка «где надо быть сегодня», срок обязателен. Прогноза даты нет ни у кого. Прибавка по умолчанию — Gentil et al. 2010
     (J Strength Cond Res 24(1):37–42, PMID 19966591; нетренированные мужчины, 12 недель, 2 раза в неделю): жим лёжа 1ПМ +10,5…14,4 %,
     жим ногами +17,5…17,8 %. Жим лёжа распространён на весь верх — допущение. У своего веса цели нет. План на сегодня — прямая от старта к цели. */
  const GOAL_WEEKS = 12, GAIN = { leg: 0.175, up: 0.125 }, LEGS = ['hack', 'legpress'];
  const half = (x) => Math.round(x * 2) / 2;
  // slot — место в программе (e.slot): у замены главного упражнения цель остаётся (карта 2.9: жим в тренажёре на месте жима лёжа)
  const hasGoal = (id, slot) => (MAIN.has(id) || MAIN.has(slot)) && !!EQ[id];
  function goalDefault(id, e1, now) {
    return { from: Math.round(e1 * 10) / 10, t0: now, kg: half(e1 * (1 + (LEGS.includes(id) ? GAIN.leg : GAIN.up))), by: dstr(now + GOAL_WEEKS * 7 * DAY) };
  }
  // pct — доля пути от старта до цели; plan — где надо быть сегодня; delta — насколько впереди (+) или позади (−) плана
  function goalState(g, e1, now) {
    const t1 = new Date(g.by + 'T12:00:00').getTime(), span = g.kg - g.from;
    const k = Math.max(0, Math.min(1, (now - g.t0) / Math.max(1, t1 - g.t0))), plan = g.from + span * k;
    return { pct: span > 0 ? Math.max(0, Math.min(1, (e1 - g.from) / span)) : 1, k, plan, delta: e1 - plan, left: g.kg - e1, days: Math.ceil((t1 - now) / DAY), done: e1 >= g.kg };
  }

  // следующая по кругу A-B-C после последней тренировки этой программы; записи старой программы A/B круг не двигают
  function nextDay(sessions) {
    for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].p === PID) return ORDER[(ORDER.indexOf(sessions[i].day) + 1) % ORDER.length];
    return ORDER[0];
  }

  const DAY = 864e5;
  const dstr = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

  // Вес: среднее по окнам по 7 дней, [0]=последние 7, [1]=предыдущие и т.д.
  function weightStats(weights, now = Date.now()) {
    const avg = (i) => {
      const lo = now - (i + 1) * 7 * DAY, hi = i === 0 ? now + DAY : now - i * 7 * DAY;
      const v = weights.filter((w) => { const t = new Date(w.date + 'T12:00:00').getTime(); return t > lo && t <= hi; }).map((w) => w.kg);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const a0 = avg(0), a1 = avg(1), a2 = avg(2);
    const pct = a0 != null && a1 ? ((a0 - a1) / a1) * 100 : null;
    let warn = null;
    if (pct != null && pct > 0.5) warn = 'cut';
    else if (pct != null && pct < 0 && a2 && a1 < a2) warn = 'add';
    return { avg: a0, pct, warn };
  }

  // tdee — измеренный расход (Coach), если уже откалиброван; иначе формула вес × 33
  // версия 58: набор +0,25–0,5 % массы в неделю (Iraki 2019, PMID 31247944); взвешиваться раз в неделю, утром
  const PROT_LO = 1.6, PROT_HI = 2.2, GAIN_LO = 0.25, GAIN_HI = 0.5;
  const gainKg = (kg) => ({ lo: Math.round(kg * GAIN_LO * 10) / 1000, hi: Math.round(kg * GAIN_HI * 10) / 1000 });
  function targets(p, tdee) {
    const w = +p.weight || 0, base = tdee > 0 ? tdee : w * 33;
    // белок: цель 1,8 г/кг внутри нормы 1,6–2,2 (Morton 2018 PMID 28698222; Iraki 2019 PMID 31247944) — версия 58
    return { kcalLo: Math.round(base * 1.10), kcalHi: Math.round(base * 1.15), base: Math.round(base), protein: Math.round(w * 1.8), proteinLo: Math.round(w * PROT_LO), proteinHi: Math.round(w * PROT_HI), measured: tdee > 0 };
  }

  /* Калькуляторы Hevy — код свой, цифры сняты со скринов hevyapp.com/features/warm-up-set-calculator и /weight-plate-calculator
     (research/design-shots/hevy-calc). Снаряд: b — штанга (есть блины), d — гантели, m — тренажёр или блок; у своего веса нет. */
  const EQ = {};
  Object.entries({ b: 'bench ohp hipthrust revcurl', d: 'csrow dbcurl dbtri dbpress lunge twist dbbench hammer goblet incdbbench latraise crunch wristcurl revwrist', m: 'hack legcurl seatcurl latpull seatrow legpress pushdown shpress legext calf facepull cablefly leverrow leverpull revfly' })
    .forEach(([k, ids]) => ids.split(' ').forEach((id) => { EQ[id] = k; }));

  /* app-016: ЗАМЕНА УПРАЖНЕНИЯ. Список замен — поле alternatives автора (research/r17-raw/variations.json, вариант Strength);
     у замены те же диапазоны и отдых, что у слота (в данных автора подходы замены копируют подходы слота). Не предлагаем (Денис 10.10:
     «без тяг с пола и приседа со штангой»): Squat (Barbell), Bent Over Row (Barbell), Deadlift (Barbell/Smith), Good Morning.
     ALT_RAW: [id, имя, шаг кг, свой вес?, снаряд]. ALT: слот -> замены автора (через наши id; у слотов-замен — замены исходного упражнения автора). */
  const ALT_RAW = [
    ['chestpress', 'Жим в тренажёре от груди', 2.5, 0, 'm'], ['smithbench', 'Жим лёжа в Смите', 2.5, 0, 'b'],
    ['dbrow', 'Тяга гантели одной рукой с упором в скамью', 2.5, 0, 'd'], ['smithsquat', 'Присед в Смите', 5, 0, 'b'],
    ['cablecurl', 'Сгибания на бицепс на блоке', 2.5, 0, 'm'], ['shpress', 'Жим на плечи в тренажёре', 2.5, 0, 'm'],
    ['latpullrev', 'Тяга верхнего блока обратным хватом', 2.5, 0, 'm'], ['hipthrust', 'Ягодичный мост со штангой', 5, 0, 'b'],
    ['legext', 'Разгибания ног в тренажёре', 2.5, 0, 'm'], ['crunch', 'Скручивания с весом', 2.5, 0, 'd'],
    ['incdbbench', 'Жим гантелей на наклонной', 2.5, 0, 'd'], ['incbench', 'Жим штанги на наклонной', 2.5, 0, 'b'],
    ['tbarrow', 'Тяга Т-грифа', 2.5, 0, 'm'], ['cablerow', 'Тяга нижнего блока сидя', 2.5, 0, 'm'],
    ['splitsq', 'Сплит-присед с гантелями', 2.5, 0, 'd'], ['bblunge', 'Выпады со штангой', 2.5, 0, 'b'],
    ['rdl', 'Румынская тяга', 5, 0, 'b'],
    ['hack', 'Гакк-присед', 5, 0, 'm'], ['lunge', 'Выпады с гантелями', 2.5, 0, 'd'], ['twist', 'Русские скручивания с гантелью', 2.5, 0, 'd'],
    ['dbtri', 'Разгибания на трицепс с гантелью', 2.5, 0, 'd'], ['dbbench', 'Жим гантелей лёжа', 2.5, 0, 'd'], ['seatrow', 'Тяга сидя в тренажёре', 2.5, 0, 'm'],
    ['ohp', 'Жим стоя', 2.5, 0, 'b'], ['goblet', 'Гоблет-присед', 2.5, 0, 'd'], ['legraise', 'Подъёмы ног в висе', 0, 1, ''], ['backext', 'Гиперэкстензия', 2.5, 1, ''],
    ['cablelat', 'Махи в стороны на блоке', 1, 0, 'm'], ['reardb', 'Разведения на заднюю дельту с гантелями', 1, 0, 'd'], ['seatcalf', 'Икры сидя', 5, 0, 'm'],
    ['incmach', 'Наклонный жим в тренажёре', 2.5, 0, 'm'], // не из списка автора: тренажёр зала Дениса (13.10), см. MACH
    ['glutemach', 'Ягодичный мост в тренажёре', 5, 0, 'm'], // снят 13.10 (Денис: «не буду это делать, отменяй»); в каталоге остаётся, чтобы телефон с версией 50 узнал упражнение до переноса (MACH3)
    ['floorcrunch', 'Скручивания на полу', 2.5, 1, ''], // не из списка автора: Денис 13.10 — «просто какой-нибудь пресс на полу»; то же скручивание без диска (MACH4)
    // версия 56: ушли из дней при переходе на раздельные дни — в каталоге остаются с прежними именами, чтобы история и замены их узнавали
    ['bench', 'Жим лёжа', 2.5, 0, 'b'], ['latraise', 'Махи гантелями в стороны', 1, 0, 'd'], ['csrow', 'Тяга гантелей с упором грудью', 2.5, 0, 'd'],
    ['pullup', 'Подтягивания', 2.5, 1, ''], ['dbpress', 'Жим гантелей сидя', 2.5, 0, 'd'], ['facepull', 'Задняя дельта на блоке', 2.5, 0, 'm'],
    ['dbfly', 'Разводка гантелей лёжа', 2.5, 0, 'd'], ['pecdeck', 'Сведения в тренажёре «бабочка»', 2.5, 0, 'm'], // замены для сведений на блоках (карта 2.11): то же движение, не из списка автора
  ];
  const CAT = {}; // все упражнения по id: {id, name, incKg, bw, eq}
  ORDER.forEach((d) => RAW[d].forEach(([id, name, r, incKg, restSec, bw]) => { CAT[id] = { id, name, incKg, bw: !!bw, eq: EQ[id] || '' }; }));
  ALT_RAW.forEach(([id, name, incKg, bw, eq]) => { CAT[id] = { id, name, incKg, bw: !!bw, eq }; EQ[id] = eq; });
  const ALT = {
    bench: 'chestpress smithbench dbbench', incdbbench: 'incbench dbbench chestpress incmach', latpull: 'pullup latpullrev seatrow', legpress: 'hack smithsquat legext',
    latraise: 'cablelat shpress', dbcurl: 'hammer cablecurl', pushdown: 'dbtri', dbtri: 'pushdown', legext: 'legpress goblet', legcurl: 'hipthrust rdl seatcurl', seatcurl: 'legcurl',
    chestpress: 'bench smithbench dbbench', incmach: 'incdbbench incbench dbbench', cablelat: 'latraise', cablecurl: 'dbcurl hammer', floorcrunch: 'crunch legraise twist',
    leverrow: 'seatrow dbrow tbarrow cablerow', leverpull: 'latpull latpullrev', revfly: 'reardb facepull',
    revcurl: 'hammer', // версия 57: у wristcurl и revwrist замен нет (запястья вверх/вниз — разные движения), у них пустой список
    shpress: 'dbpress ohp', calf: 'seatcalf', crunch: 'floorcrunch legraise twist', csrow: 'dbrow seatrow tbarrow cablerow', pullup: 'latpull latpullrev',
    dbpress: 'shpress ohp', hipthrust: 'legcurl rdl backext hack', hammer: 'dbcurl cablecurl', facepull: 'reardb legext', cablefly: 'dbfly pecdeck', dbfly: 'cablefly pecdeck', seatrow: 'cablerow tbarrow dbrow',
  };
  // допустимые замены для упражнения e в дне day: исходное упражнение слота + замены автора, без текущего и без тех, что уже стоят в этом дне
  function alternatives(prog, day, e) {
    const slot = e.slot || e.id, inDay = new Set((prog[day] || []).map((x) => x.id));
    return [slot, ...(ALT[slot] || '').split(' ')].filter((id) => id && id !== e.id && !inDay.has(id) && CAT[id]).map((id) => CAT[id]);
  }
  // заменить упражнение fromId в дне day на toId: диапазоны и отдых — от слота, вес «подбери» (или прежний, если к нему уже возвращались).
  // Возвращает новую программу; null — замена не из списка
  function swap(prog, day, fromId, toId) {
    const i = (prog[day] || []).findIndex((e) => e.id === fromId); if (i < 0) return null;
    const old = prog[day][i];
    if (!alternatives(prog, day, old).some((c) => c.id === toId)) return null;
    const slot = old.slot || old.id, ranges = rangesFor(day, slot, toId, old.ranges.length); // карта 3.12: диапазон — по упражнению (штанга 3–5, тренажёр 8–10)
    const c = CAT[toId], was = { ...(old.was || {}), [old.id]: old.kgs.slice() }, kgs = was[toId] && was[toId].length === ranges.length ? was[toId] : ranges.map(() => (c.bw ? 0 : null));
    const e = { id: c.id, name: c.name, ranges, incKg: c.incKg, group: c.id, restSec: old.restSec, bw: c.bw, kgs: kgs.slice(), was };
    if (slot !== c.id) e.slot = slot; // вернулись к исходному — слот не нужен
    const p = { ...prog, [day]: prog[day].slice() }; p[day][i] = e; return p;
  }
  /* карта 2.9 (Денис 13.10: «пока все упражнения будут тренажёры, кроме рук — там, где нужна техника, добью потом»). Тренажёр берём из
     списка замен автора (ALT). Разницы для роста мышц нет: Haugen 2023 (PMID 37582807), p = 0,751. У наклонного жима гантелей и моста
     со штангой тренажёра в списке автора нет; Денис 13.10: в его зале оба тренажёра есть — MACH2, движение то же (подсказки наклонного жима —
     free-exercise-db, Leverage Incline Chest Press). MACH2 доезжает вторым заходом (S.mach 1 → 2): первые пять замен повторно не трогаем —
     вдруг штангу уже вернули руками. Свою замену (e.slot) не трогаем; назад — обычной заменой в тренировке.
     Мост (версия 51): Денис 13.10 — мост делать не будет ни со штангой, ни в тренажёре; в зале есть присед в тренажёре с блинами → гакк-присед.
     Для ягодиц присед растит так же, как мост, и больше нагружает бедро: Plotkin 2023 (PMID 37877099; в работе присед со штангой).
     MACH3 (S.mach 2 → 3) снимает мост в тренажёре, поставленный версией 50: own = true — меняем и то, что стоит заменой. */
  const MACH2 = { incdbbench: 'incmach', hipthrust: 'hack' }, MACH3 = { glutemach: 'hack' };
  /* версия 53 (S.mach 3 → 4), ответ Дениса 13.10 по листу с картинками: гакк-приседа в зале нет → гиперэкстензия (из замен автора для моста
     осталась одна она: сгибания ног уже стоят в дне C, румынская тяга — штанга); скручивания с весом → на полу без диска;
     own = true: гакк стоит заменой на месте моста.
     Версия 54 (Денис 13.10, второй ответ): заднюю дельту «убирай, я не буду это делать» — ни на блоке, ни с гантелями. Дельты без неё 16,5 → 13,5
     подхода в неделю — в норме 10–20. Место в дне C не пустует: после ухода гакка ноги спереди упали с 12 до 9 подходов → разгибания ног
     в тренажёре (стоят в дне B, тренажёр в зале есть), станет 12. Вес берём из дня B (twin). MACH5 (S.mach 4 → 5) — для тех, у кого версия 53
     уже поставила гантели. Вернуть заднюю дельту можно обычной заменой. */
  const MACH4 = { hack: 'backext', crunch: 'floorcrunch', facepull: 'legext' }, MACH5 = { reardb: 'legext' };
  const MACH = { bench: 'chestpress', csrow: 'seatrow', pullup: 'latpull', dbpress: 'shpress', latraise: 'cablelat', ...MACH2 };
  function machines(prog, map = MACH, own = false, twin = false) {
    let p = prog; const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const d of ORDER) for (const id of (prog[d] || []).filter((e) => (own || !e.slot) && map[e.id]).map((e) => e.id)) {
      const q = swap(p, d, id, map[id]); if (!q) continue; p = q;
      if (!twin) continue; // twin: упражнение уже стоит в другом дне с теми же повторами — вес оттуда, а не «подбери»
      const i = p[d].findIndex((e) => e.id === map[id]), e = p[d][i], t = e.kgs.every((k) => k == null) && ORDER.flatMap((x) => (x === d ? [] : p[x] || [])).find((x) => x.id === e.id && !x.slot && same(x.ranges, e.ranges) && x.kgs.some((k) => k != null));
      if (t) p[d][i] = { ...e, kgs: t.kgs.slice() };
    }
    return p;
  }
  /* карта 3.12: сохранённая программа -> диапазоны по упражнению (rangesFor). Где диапазон сменился, вес под прежние повторы не годится:
     берём вес этого же упражнения из другого дня, если там диапазон уже такой, иначе «подбери». Веса «на возврат» (was) под прежние
     повторы у не-штанги стираем. Вызывается один раз (флаг в данных); там, где диапазон уже верный, ничего не меняет. */
  function methods(prog) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), p = { ...prog };
    for (const d of ORDER) p[d] = (prog[d] || []).map((e) => {
      const slot = e.slot || e.id, r = rangesFor(d, slot, e.id, e.ranges.length);
      const was = e.was && SLOT_KIND[d][slot] === 'c' ? Object.fromEntries(Object.entries(e.was).filter(([id]) => isHeavy(id))) : e.was;
      if (same(e.ranges, r)) return was === e.was ? e : { ...e, was };
      let kgs = null;
      for (const d2 of ORDER) for (const o of prog[d2] || []) if (o !== e && o.id === e.id && same(o.ranges, r) && o.kgs.every((k) => k != null)) kgs = o.kgs.slice();
      return { ...e, ranges: r, kgs: kgs || r.map(() => (e.bw ? 0 : null)), ...(was ? { was } : {}) };
    });
    return p;
  }
  const WARM = [[40, 5], [60, 5], [80, 3]]; // формула по умолчанию: % рабочего веса × повторы
  /* Разминка по упражнению — гайд автора программы (research/r17-raw/guide_2024.txt:82–93): «1-4 sets to warm up to the prescribed weight…
     lighter exercises require fewer warm-up sets, and heavier exercises need more». Его примеры: жим в Смите 45 % × 8, 65 % × 5–8, 85 % × 3;
     жим ногами на 10–15 — 33 % × 5–8, 67 % × 3; сгибания с гантелями — 50 % × 10, «That's it!». */
  const WARM_BY = { h: [[45, 8], [65, 5], [85, 3]], m: [[33, 8], [67, 3]], i: [[50, 10]] };
  const MULTI = new Set('bench ohp hipthrust csrow dbpress lunge dbbench goblet incdbbench hack latpull seatrow legpress shpress pullup chestpress smithbench incbench tbarrow cablerow dbrow latpullrev smithsquat splitsq bblunge rdl incmach glutemach leverrow leverpull'.split(' ')); // 13.10: дописаны замены автора — у жима в тренажёре разминка стояла как у бицепса
  const warmKind = (ex) => (!MULTI.has(ex.id) ? 'i' : kindOf(ex) === 'c' ? 'h' : 'm'); // тяжёлое многосуставное / многосуставное на 8+ / изоляция
  const warmFor = (ex) => WARM_BY[warmKind(ex)].map((x) => x.slice());
  /* Подбор стартового веса (карта 3.10), research/r35. Правило автора (guide_2024.txt:64, 100): первый рабочий подход — в своём диапазоне
     и «1-2 reps left in the tank», следующие легче. Вход «вес × повторы × запас» — как Rep Max Calculator у Liftosaur (вес/повторы/RPE → вес
     на другие повторы); код свой, пересчёт — Эпли, что уже стоит в приложении. Выше 10 повторов оценка грубая (Reynolds 2006, PMID 16937972:
     «no more than 10 repetitions should be used») — поэтому округляем вниз и помечаем rough. */
  const START_RIR = 2;
  function startKg(ex, kg, reps, rir, keep = START_RIR) { // keep — сколько повторов оставить в запасе (вводные недели — INTRO_RIR)
    const rm = (reps || 0) + (rir || 0); if (!(kg > 0) || !(reps >= 1) || !ex || !ex.ranges) return null;
    const e1 = rm === 1 ? kg : kg * (1 + rm / 30), x = e1 / (1 + (ex.ranges[0][1] + keep) / 30);
    const kgs = [x >= 20 ? Math.floor(x / 2.5 + 1e-9) * 2.5 : Math.floor(x + 1e-9)];
    for (let i = 1; i < ex.ranges.length; i++) kgs.push(stepDown(kgs[i - 1]));
    return { e1, kgs, rough: rm > 10 };
  }
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5], BARS = [['Стандарт', 20], ['Короткий', 15], ['EZ', 7.5]];
  // разминочные подходы: процент от рабочего веса, округлённый до шага; не легче min (пустой гриф) и не тяжелее рабочего
  function warmup(target, method, step, min) {
    return method.map(([pct, reps]) => ({ t: 'w', kg: target > 0 ? Math.min(target, Math.max(min || 0, Math.round((target * pct) / 100 / step) * step)) : 0, reps }));
  }
  // блины на одну сторону: ближайший к цели вес из доступных блинов, наименьшим числом блинов (штук каждого — сколько нужно)
  function plates(target, bar, avail) {
    const U = 4, need = Math.max(0, Math.round(((target - bar) / 2) * U)), coins = avail.map((x) => Math.round(x * U)).filter((x) => x > 0).sort((a, b) => b - a);
    const top = need + (coins[0] || 0), cnt = new Array(top + 1).fill(Infinity), from = new Array(top + 1).fill(0); cnt[0] = 0;
    for (let s = 1; s <= top; s++) for (const c of coins) if (c <= s && cnt[s - c] + 1 < cnt[s]) { cnt[s] = cnt[s - c] + 1; from[s] = c; }
    let best = 0;
    for (let s = 0; s <= top; s++) if (cnt[s] < Infinity && Math.abs(s - need) < Math.abs(best - need)) best = s;
    const side = []; for (let s = best; s > 0; s -= from[s]) side.push(from[s] / U);
    side.sort((a, b) => b - a);
    const total = bar + (best * 2) / U;
    return { side, total, exact: total === target };
  }

  /* app-018: мышцы за 7 дней, неделя, блок 8 недель. MUSCLE: id -> группы (первая — главная); по ней считаем подходы (counted) из записей.
     13.10: у гиперэкстензии не была записана задняя поверхность бедра. В обеих базах она вторая: everkinetic `hyperextensions` — secondary hamstrings,
     free-exercise-db `Hyperextensions_Back_Extensions` — secondary glutes, hamstrings (research/r24-raw). Вторых групп может быть несколько — каждой половина подхода. */
  const MUSCLE = {
    bench: ['chest', 'triceps'], incdbbench: ['chest', 'shoulders'], dbbench: ['chest', 'triceps'], chestpress: ['chest', 'triceps'], smithbench: ['chest', 'triceps'], incbench: ['chest', 'shoulders'], incmach: ['chest', 'shoulders'],
    latpull: ['back', 'biceps'], latpullrev: ['back', 'biceps'], pullup: ['back', 'biceps'], csrow: ['back', 'reardelt'], seatrow: ['back', 'biceps'], dbrow: ['back', 'biceps'], tbarrow: ['back'], cablerow: ['back', 'biceps'], leverrow: ['back', 'biceps'], leverpull: ['back', 'biceps'],
    shpress: ['shoulders', 'triceps'], dbpress: ['shoulders', 'triceps'], ohp: ['shoulders', 'triceps'], latraise: ['shoulders'], cablelat: ['shoulders'], facepull: ['reardelt', 'back'], reardb: ['reardelt'], revfly: ['reardelt'],
    wristcurl: ['forearms'], revwrist: ['forearms'], revcurl: ['forearms', 'biceps'], // версия 57: предплечья (r40-arms.md); у обратных сгибаний бицепс вторичный, ×0,5 как у других вторичных
    dbcurl: ['biceps'], hammer: ['biceps'], cablecurl: ['biceps'], pushdown: ['triceps'], dbtri: ['triceps'],
    legpress: ['quads', 'glutes'], legext: ['quads'], hack: ['quads', 'glutes'], goblet: ['quads', 'glutes'], lunge: ['quads', 'glutes'], bblunge: ['quads', 'glutes'], splitsq: ['quads', 'glutes'], smithsquat: ['quads', 'glutes'],
    legcurl: ['hams'], seatcurl: ['hams'], rdl: ['hams', 'glutes'], hipthrust: ['glutes', 'hams'], glutemach: ['glutes', 'hams'], backext: ['lowback', 'glutes', 'hams'], calf: ['calves'], seatcalf: ['calves'], crunch: ['abs'], floorcrunch: ['abs'], legraise: ['abs'], twist: ['abs'], cablefly: ['chest'], dbfly: ['chest'], pecdeck: ['chest'],
  };
  const MUSCLE_RU = { chest: 'Грудь', back: 'Спина', shoulders: 'Плечи', reardelt: 'Задние дельты', biceps: 'Бицепс', triceps: 'Трицепс', forearms: 'Предплечья', quads: 'Квадрицепс', hams: 'Задняя поверхность', glutes: 'Ягодицы', calves: 'Икры', abs: 'Пресс', lowback: 'Поясница' };
  const NAME_ID = {}; Object.values(CAT).forEach((c) => { NAME_ID[c.name] = c.id; });
  NAME_ID['Тяга гантели в наклоне'] = 'dbrow'; // версия 56: имя до переименования — для старых записей
  const dayKey = (d) => { d = new Date(d); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
  // подходы на группу за последние days суток: главная группа — подход целиком, вторая — половина (Hevy считает так же: primary 1, secondary 0.5)
  function muscleSets(sessions, now = Date.now(), days = 7) {
    const out = {}; Object.keys(MUSCLE_RU).forEach((g) => { out[g] = 0; });
    for (const s of sessions) {
      if (now - new Date(s.date) > days * 864e5 || new Date(s.date) > now) continue;
      for (const e of s.exercises) {
        const id = NAME_ID[e.name], m = MUSCLE[id]; if (!m) continue;
        const n = setsOf(e).filter(counted).length;
        out[m[0]] += n; m.slice(1).forEach((g) => { out[g] += n / 2; });
      }
    }
    return out;
  }
  /* app-019: подходы на мышцу за 7 дней против нормы 10–20/нед (Schoenfeld 2017 meta; Helms/3DMJ, SBS «More Training, More Gaining» — research/r4-practitioners.md:8,12).
     Группы: грудь, спина, квадрицепс, задняя поверхность, дельты (передняя/средняя + задняя), бицепс, трицепс — руки раздельно, норма на мышцу, не на пару.
     plan — сколько даёт программа за неделю при всех трёх днях (подходы = число диапазонов); fact считает счётные подходы, вторая группа — пополам (как muscleSets). */
  const VOL_LO = 10, VOL_HI = 20;
  const VOL_GROUPS = [['chest', ['chest']], ['back', ['back']], ['quads', ['quads']], ['hams', ['hams']], ['shoulders', ['shoulders', 'reardelt']], ['biceps', ['biceps']], ['triceps', ['triceps']], ['forearms', ['forearms']]]; // предплечья: норма как у соседних групп, 10–20 (Nuckols 10–12, RP MAV 8–24 — внутри)
  const VOL_RU = { chest: 'Грудь', back: 'Спина', quads: 'Квадрицепс', hams: 'Бицепс бедра', shoulders: 'Дельты', biceps: 'Бицепс', triceps: 'Трицепс', forearms: 'Предплечья' };
  function planSets(program) {
    const out = {}; Object.keys(MUSCLE_RU).forEach((g) => { out[g] = 0; }); if (!program) return out;
    for (const d of ORDER) for (const x of program[d] || []) { const m = MUSCLE[x.id] || MUSCLE[NAME_ID[x.name]]; if (!m) continue; const n = (x.ranges || []).length || 3; out[m[0]] += n; m.slice(1).forEach((g) => { out[g] += n / 2; }); }
    return out;
  }
  function muscleWeek(sessions, now = Date.now(), program = null, days = 7) {
    const f = muscleSets(sessions, now, days), pl = planSets(program), sum = (o, gs) => gs.reduce((n, g) => n + (o[g] || 0), 0);
    return VOL_GROUPS.map(([key, gs]) => { const fact = sum(f, gs), plan = sum(pl, gs);
      return { key, name: VOL_RU[key], fact, plan, lo: VOL_LO, hi: VOL_HI, status: fact < VOL_LO ? 'low' : fact > VOL_HI ? 'high' : 'ok' }; });
  }
  /* app-019b (Денис 11.10: «быстро раскачиваюсь, мышечная память, четыре возвращения»): +1 подход по факту, а не по календарю.
     Упражнение «готово» — 2 последние тренировки подряд все счётные подходы у верха диапазона (или выше). Совет даём по группам, где план < 10; потолок 5 подходов. */
  const VOL_MAX_SETS = 5, READY_SESSIONS = 2;
  function readyForSet(sessions, ex) {
    if ((ex.ranges || []).length >= VOL_MAX_SETS) return false;
    const log = exLog(sessions, ex.name).slice(-READY_SESSIONS); if (log.length < READY_SESSIONS) return false;
    return log.every((l) => l.sets.length >= ex.ranges.length && l.sets.every((s, i) => s.reps >= ex.ranges[Math.min(i, ex.ranges.length - 1)][1]));
  }
  function volumeAdvice(sessions, program, now = Date.now()) {
    if (!program) return [];
    return muscleWeek(sessions, now, program).filter((g) => g.plan < g.lo).map((g) => {
      const gs = VOL_GROUPS.find((x) => x[0] === g.key)[1], exs = [];
      for (const d of ORDER) (program[d] || []).forEach((x, i) => { const m = MUSCLE[x.id] || MUSCLE[NAME_ID[x.name]]; if (m && gs.includes(m[0]) && readyForSet(sessions, x)) exs.push({ day: d, i, id: x.id, name: x.name }); });
      return { key: g.key, name: g.name, plan: g.plan, exs };
    }).filter((g) => g.exs.length);
  }
  const addSet = (ex) => ({ ...ex, ranges: [...ex.ranges, ex.ranges[ex.ranges.length - 1].slice()], kgs: [...ex.kgs, ex.kgs[ex.kgs.length - 1]] });
  /* Усилие в подходе (Денис 11.10: «должно быть пояснение — жать на максимум или нет»). Автор программы (Nuckols guide_2024.txt:97,100):
     «stop your set 1-2 reps before failure on most sets»; ПЛАН §: изоляция — запас 0–1 (Robinson/Pelland 2024). На максимум — только подход-замер (mx). */
  const kindOf = (ex) => ex.kind || (ex.ranges && ex.ranges[0] && ex.ranges[0][0] <= 5 ? 'c' : 'i');
  // Текст для самого простого чтения (Денис 11.10: «максимально понятно»): без слов «изоляция», «отказ», «запас»
  const EFFORT = {
    c: 'Не на максимум. Остановись, когда чувствуешь: ещё 1–2 повтора выжал бы. До последнего не выжимай.', // Денис 13.10 прочитал прежний текст как «жми на максимум» — ответ вынесен в первые слова
    i: 'Делай, пока повторы идут чисто. Чувствуешь, что следующий уже еле-еле — стоп.', // Денис 13.10: «пока мышца не загорится» — слово неправильное (жжение ≠ близость к пределу); мерило — следующий повтор
  };
  const EFFORT_MAX = 'Этот подход — на максимум: делай, пока получается чисто, без рывков. Не поднял — стоп.';
  const EFFORT_HELP = [
    ['Что значит «ещё 1–2 выжал бы»', 'Цель 8 повторов. Сделал 8 и чувствуешь: 9-й и 10-й ещё вышли бы, тяжело, но вышли бы — это правильно. Так и надо.'],
    ['Если легко', 'Сделал 8 и мог бы ещё 5 и больше — вес маленький. В следующем подходе добавь 2,5–5 кг.'],
    ['Если не дотянул', 'Не смог сделать нижнюю цифру цели (например 5 из «5–8») — вес большой. Сбавь прямо сейчас на 5–10 %: было 40 кг — поставь 36–38 кг.'],
    ['Почему не до последнего', 'Выжатый до конца подход съедает следующий и копит усталость. Сила и мышцы растут и так — пока ты каждую тренировку делаешь на повтор больше или на 2,5 кг тяжелее. Это приложение само считает.'],
    ['Когда на максимум', 'Только там, где написано «ЗАМЕР»: раз в несколько недель последний подход — до упора, пока техника чистая. Так мы меряем силу.'],
    ['Большие и маленькие упражнения', 'Жимы, тяги, жим ногами — большие: останавливайся за 1–2 повтора. Махи, сгибания на бицепс, разгибания, икры, пресс — маленькие: можно идти дальше — до момента, когда следующий повтор еле идёт.'],
  ];
  /* карта 3.12: вводные две недели после перерыва. Eure, физиотерапевт SBS (strongerbyscience.com/risks-of-returning): «Use moderate reps
     (5-8) with a moderate approximation to failure (3-5 RIR)», «Do not scratch the itch of chasing PRs»; Zourdos
     (strongerbyscience.com/returning-to-training): «Nothing strenuous at all… first two weeks». Из них взято: запас 3–5 повторов, срок
     2 недели, без подхода «на максимум». Число подходов не режем — цифры в источниках нет. back — дата возврата в зал из профиля. */
  const INTRO_DAYS = 14, INTRO_RIR = 4;
  function intro(back, now = Date.now()) {
    if (!back) return null; const t = new Date(back + 'T00:00:00').getTime(), n = Math.floor((now - t) / 864e5);
    return n >= 0 && n < INTRO_DAYS ? { day: n + 1, left: INTRO_DAYS - n } : null;
  }
  const EFFORT_INTRO = 'Первые две недели после перерыва — вес полегче. Остановись, когда чувствуешь: ещё 3–5 повторов сделал бы.';
  // большое упражнение (жим, тяга, ноги) — запас 1–2 повтора, маленькое — до «еле-еле»; делим по упражнению, а не по повторам:
  // с карты 3.12 у жима в тренажёре и тяги блока повторы 8–10, но они остаются большими
  const effort = (ex, iw) => (iw ? EFFORT_INTRO : EFFORT[MULTI.has(ex.id) ? 'c' : 'i']);
  // календарная неделя Пн–Вс: 7 дней с отметкой тренировки и «сегодня»; серия = тренировок на этой неделе из 3
  function weekStrip(sessions, now = Date.now()) {
    const d = new Date(now), mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    const had = new Set(sessions.map((s) => dayKey(s.date))), today = dayKey(now);
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i), k = dayKey(x); return { key: k, dom: x.getDate(), dow: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i], done: had.has(k), today: k === today, future: k > today }; });
  }
  /* Цикл (версия 57, Денис 15.10 «встраивай»): 5 недель = 4 рабочих + 5-я разгрузка. Bell и др. 2022 (PMID 36619355): разгрузку программируют
     «every 4 to 6 weeks», 5–7 дней; RP («Every 4–8 weeks… cut volume and intensity in half», rpstrength.com/blogs/video-guides/transform-your-body-like-thor-full-scientific-workout-plan);
     Bell 2023, Delphi (PMID 37730925): частоту можно не менять, сессии короче, упражнения те же. На разгрузке подходов вдвое меньше (вверх, минимум 1),
     вес — как в режиме «deload» чек-ина (−10 % до шага снаряда, easeKgs). «Контроль 1ПМ» на 8-й неделе (app-024) из цикла убран: это была только надпись на карточке,
     замер сил идёт отдельно, по упражнению, раз в TEST_DAYS (testDue); на разгрузочной неделе его не ставим. Предложение сменить упражнения — в 1-й неделе цикла ≥ 2 (swapPlan). */
  const WEEK_GOAL = 3, BLOCK_WEEKS = 5, DELOAD_WEEK = 5;
  // неделя цикла: от первой тренировки текущей программы (p === pid) не раньше from (миг переноса на версию 57); дальше цикл идёт по кругу
  function blockWeek(sessions, now = Date.now(), pid = PID, from = 0) {
    const first = sessions.filter((s) => s.p === pid && +new Date(s.date) >= from).map((s) => new Date(s.date)).sort((a, b) => a - b)[0]; if (!first) return { week: 0, len: BLOCK_WEEKS, started: false };
    const n = Math.max(0, Math.floor((now - first) / (7 * 864e5))), week = (n % BLOCK_WEEKS) + 1, cycle = Math.floor(n / BLOCK_WEEKS) + 1;
    return { week, len: BLOCK_WEEKS, started: true, cycle, deload: week === DELOAD_WEEK, deloadIn: week < DELOAD_WEEK ? DELOAD_WEEK - week : null, fresh: week === 1 && cycle >= 2 };
  }
  // подходов на разгрузке: вдвое меньше, вверх, не меньше одного
  const deloadSets = (n) => Math.max(1, Math.ceil(n / 2));
  // упражнение на разгрузочную неделю: первые deloadSets подходов; вес — как у режима deload (веса считает easeKgs)
  const deloadEx = (ex, kgs) => { const n = deloadSets(ex.ranges.length); return { ...ex, ranges: ex.ranges.slice(0, n), kgs: (kgs || ex.kgs).slice(0, n) }; };

  /* Застой -> +1 подход (версия 57). Раньше при застое только предлагался сброс до 90 %. Теперь при первом застое упражнения, если у его главной мышцы
     в программе меньше 20 подходов в неделю, сначала предлагаем +1 подход (копия последнего): ACSM 2026 (PMID 41843416) и Pelland 2026 (PMID 41343037) — отдача от объёма
     падает около 18–20 подходов в неделю. Не больше +1 на упражнение за цикл (added[день:id] = {c: номер цикла}); повторный застой в том же цикле, мышца ≥ 20 или 5 подходов
     (VOL_MAX_SETS) — прежний сброс до 90 %. Подходы в неделю считает planSets, группа — как в «Подходах на мышцу» (дельты вместе с задними). */
  const STALL_ADD_MAX = 20;
  function weekSetsOf(program, id) {
    const g = (MUSCLE[id] || [])[0]; if (!g) return null;
    const grp = VOL_GROUPS.find((x) => x[1].includes(g)), pl = planSets(program);
    return (grp ? grp[1] : [g]).reduce((n, k) => n + (pl[k] || 0), 0);
  }
  function stallAddOk(program, day, ex, added, cycle) {
    const w = weekSetsOf(program, ex.id); if (w == null || w >= STALL_ADD_MAX || (ex.ranges || []).length >= VOL_MAX_SETS) return false;
    const a = (added || {})[day + ':' + ex.id]; return !(a && a.c === (cycle || 0));
  }

  /* Смена упражнений после разгрузки (версия 57). Nippard Essentials: «same exercises for four weeks before they are swapped out»; RP: «Reset to MEV with fresh exercises»;
     Kassiano 2022 (PMID 35438660): «excessive, random variation may compromise» — поэтому раз в цикл, не больше SWAP_MAX на день, только изолирующие с непустой заменой (ALT),
     по очереди (сначала те, что давно не предлагали) и не те, что меняли в прошлом цикле. hist: [{c, day, slot, ok}], cycle — номер цикла (blockWeek.cycle). */
  const SWAP_MAX = 2;
  function swapPlan(program, hist, cycle, day) {
    const h = (hist || []).filter((x) => x.day === day), lastC = (slot) => h.filter((x) => x.slot === slot).reduce((m, x) => Math.max(m, x.c), 0);
    // замена — только на то, чего нет в других днях: упражнение, которое и так делаем, — не новое (сидя → лёжа, когда лёжа уже в дне B, = два раза лёжа)
    const other = new Set(ORDER.flatMap((d) => (d === day ? [] : (program[d] || []).map((x) => x.id)))), fresh = (e) => alternatives(program, day, e).filter((x) => !other.has(x.id));
    const c = (program[day] || []).map((e, i) => ({ e, i, slot: e.slot || e.id })).filter(({ e, slot }) => !MULTI.has(e.id) && SLOT_KIND[day][slot] !== 'c'
      && lastC(slot) !== cycle && !h.some((x) => x.slot === slot && x.c === cycle - 1 && x.ok) && fresh(e).length);
    c.sort((a, b) => lastC(a.slot) - lastC(b.slot) || a.i - b.i);
    return c.slice(0, SWAP_MAX).map(({ e, slot }) => { const to = fresh(e)[0]; return { slot, from: e.id, fromName: e.name, to: to.id, toName: to.name }; });
  }
  // замена с весом: «подбери», либо вес этого упражнения в другом дне (те же повторы), либо вес его последней тренировки из истории
  function swapTo(prog, sessions, day, fromId, toId) {
    const p = swap(prog, day, fromId, toId); if (!p) return null;
    const i = p[day].findIndex((e) => e.id === toId), e = p[day][i]; if (e.kgs.some((k) => k != null)) return p;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const twin = ORDER.flatMap((x) => (x === day ? [] : p[x] || [])).find((x) => x.id === toId && same(x.ranges, e.ranges) && x.kgs.every((k) => k != null));
    let kgs = twin ? twin.kgs.slice() : null;
    if (!kgs) { const pe = perfEntry(sessions || [], e.name), ws = pe ? pe.sets.filter((x) => x.t !== 'w' && x.t !== 'd' && x.kg > 0) : []; if (ws.length) kgs = e.ranges.map((_, j) => ws[Math.min(j, ws.length - 1)].kg); }
    if (kgs) p[day][i] = { ...e, kgs };
    return p;
  }

  /* ---------- замеры тела (app-020) ----------
     Одна запись на дату, любое поле можно не заполнять — схема BodyMeasurement в API Hevy (api.hevyapp.com/docs, /v1/body_measurements/{date}).
     «Раз в две-три недели» — hevyapp.com/features/track-body-measurements. Две даты рядом — MacroFactor Help 122 (Compare All Metrics);
     разница в сантиметрах и строка веса из S.weights — наше. Порядок полей наш: пары Л/П стоят рядом в форме.
     Фото — в той же записи (Hevy «Add Picture», остальные поля можно не заполнять), три вида, по одному на день (MacroFactor Help 121, 117);
     в записи только метки ph {f, s, b}, сами картинки — в IndexedDB. Фото раз в 4–5 недель — hevyapp.com/features/progress-photos. */
  const PHOTO_VIEWS = [['f', 'Спереди'], ['s', 'Сбоку'], ['b', 'Сзади']], PHOTO_DAYS = 28;
  const MEASURES = [['chest', 'Грудь'], ['waist', 'Талия'], ['bicL', 'Бицепс Л'], ['bicR', 'Бицепс П'], ['thighL', 'Бедро Л'], ['thighR', 'Бедро П']];
  const MEASURE_DAYS = 14, MEASURE_MIN = 10, MEASURE_MAX = 250;
  const noon = (date) => new Date(date + 'T12:00:00').getTime();
  // значение поля: пусто → null; не число или вне 10–250 см → NaN (форма вернёт фокус в поле)
  function measureVal(v) {
    if (v == null || String(v).trim() === '') return null;
    const n = Math.round(parseFloat(String(v).replace(',', '.')) * 10) / 10;
    return n >= MEASURE_MIN && n <= MEASURE_MAX ? n : NaN;
  }
  // запись на дату заменяется целиком; все поля пустые и фото нет → запись этой даты убирается
  function measureSet(list, date, vals, ph) {
    const e = { date }, p = {};
    PHOTO_VIEWS.forEach(([v]) => { if (ph && ph[v]) p[v] = 1; }); if (Object.keys(p).length) e.ph = p;
    MEASURES.forEach(([k]) => { const v = measureVal(vals[k]); if (v != null && !isNaN(v)) e[k] = v; });
    const rest = (list || []).filter((m) => m.date !== date);
    return (Object.keys(e).length > 1 ? rest.concat([e]) : rest).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  const measureSeries = (list, key) => (list || []).filter((m) => m[key] != null).map((m) => ({ t: noon(m.date), v: m[key], date: m.date }));
  // последнее значение каждого замера и разница с прошлой записью ЭТОГО ЖЕ замера (поля бывают пустыми — прошлая дата не годится)
  function measureLast(list) {
    return MEASURES.map(([key, name]) => {
      const s = measureSeries(list, key), l = s[s.length - 1], p = s[s.length - 2];
      return { key, name, v: l ? l.v : null, date: l ? l.date : null, d: l && p ? Math.round((l.v - p.v) * 10) / 10 : null };
    });
  }
  // две даты рядом; вес — последняя запись S.weights не старше 7 дней до даты
  function measureCompare(list, d1, d2, weights) {
    const at = (d) => (list || []).find((m) => m.date === d) || {};
    const wAt = (d) => { const w = (weights || []).filter((x) => x.date <= d && noon(d) - noon(x.date) <= 7 * DAY).sort((a, b) => (a.date < b.date ? -1 : 1)).pop(); return w ? w.kg : null; };
    const row = (key, name, unit, a, b) => ({ key, name, unit, a: a == null ? null : a, b: b == null ? null : b, d: a != null && b != null ? Math.round((b - a) * 10) / 10 : null });
    const A = at(d1), B = at(d2);
    return [row('kg', 'Вес', 'кг', wAt(d1), wAt(d2))].concat(MEASURES.map(([k, n]) => row(k, n, 'см', A[k], B[k])));
  }
  function measureDue(list, now = Date.now()) {
    return dueOf((list || []).filter((m) => MEASURES.some(([k]) => m[k] != null)), now, MEASURE_DAYS); // запись из одних фото замером не считается
  }
  const photoDue = (list, now = Date.now()) => dueOf((list || []).filter((m) => m.ph), now, PHOTO_DAYS);
  function dueOf(l, now, every) {
    const x = l[l.length - 1]; if (!x) return { last: null, days: null, due: true };
    const days = Math.round((noon(dstr(now)) - noon(x.date)) / DAY);
    return { last: x.date, days, due: days >= every };
  }

  /* карта 4.11: «Я» как в игре (Денис 13.10: «мои силовые — точка 1, дальше показатели растут»). Образец подачи — Liftoff (уровень каждой мышцы и общий,
     расчётный максимум по Эпли; research/r37), но шкала Liftoff не опубликована, поэтому счёт идёт от своего старта, чужих нормативов нет.
     Сила: уровень = 1 + каждые 5 % прироста расчётного максимума к первой записи упражнения (шаг наш; у ACSM 2009 прибавка веса 2–10 %, PMID 19204579).
     Мышца — средний прирост её упражнений (главная группа MUSCLE). Объём и постоянство: +1 уровень за каждую закрытую неделю Пн–Вс
     (объём — не меньше 90 % подходов плана, постоянство — WEEK_GOAL тренировок). fact/goal/pct — текущая неделя. «Ловкость» из записей зала не считается ни у кого — не делаем. */
  const LVL_STEP = 0.05, VOL_SHARE = 0.9;
  const weekStart = (d) => { d = new Date(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime(); };
  function gameStats(sessions, program, now = Date.now()) {
    sessions = sessions.filter((se) => new Date(se.date) <= now); // запись с датой из будущего (сбитые часы) в счёт не идёт
    const grow = {}, names = new Set();
    for (const se of sessions) for (const e of se.exercises) names.add(e.name);
    for (const name of names) {
      const m = MUSCLE[NAME_ID[name]]; if (!m) continue;
      const log = exLog(sessions, name).filter((p) => p.e1 > 0).sort((a, b) => a.t - b.t); if (!log.length) continue;
      (grow[m[0]] = grow[m[0]] || []).push(Math.max(...log.map((p) => p.e1)) / log[0].e1 - 1);
    }
    const muscles = {}; let sum = 0, n = 0;
    Object.keys(MUSCLE_RU).forEach((g) => { const a = grow[g]; if (!a) { muscles[g] = 0; return; }
      const gr = a.reduce((x, y) => x + y, 0) / a.length; muscles[g] = 1 + Math.floor(gr / LVL_STEP + 1e-9); sum += gr; n++; });
    const growth = n ? sum / n : 0, x = growth / LVL_STEP + 1e-9;
    const wk = {};
    for (const se of sessions) { if (new Date(se.date) > now) continue; const k = weekStart(se.date), w = wk[k] = wk[k] || { n: 0, sets: 0 };
      w.n++; w.sets += se.exercises.reduce((v, e) => v + setsOf(e).filter(counted).length, 0); }
    const goal = program ? ORDER.reduce((v, d) => v + (program[d] || []).reduce((q, e) => q + ((e.ranges || []).length || 3), 0), 0) : 0;
    const cur = wk[weekStart(now)] || { n: 0, sets: 0 }, all = Object.values(wk);
    const strength = { lvl: 1 + Math.floor(x), pct: x - Math.floor(x), growth };
    const volume = { lvl: 1 + (goal ? all.filter((w) => w.sets >= VOL_SHARE * goal).length : 0), fact: cur.sets, goal, pct: goal ? cur.sets / goal : 0 };
    const cons = { lvl: 1 + all.filter((w) => w.n >= WEEK_GOAL).length, fact: cur.n, goal: WEEK_GOAL, pct: cur.n / WEEK_GOAL };
    const first = sessions.map((se) => Date.parse(se.date)).filter((t) => t <= now).sort((a, b) => a - b)[0];
    return { level: Math.floor((strength.lvl + volume.lvl + cons.lvl) / 3), strength, volume, cons, muscles, start: first || null };
  }
  /* карта 4.11, вкладка «Прогресс» (Денис 13.10: полоса на каждую мышцу, по нажатию — её упражнения: старт, сейчас, что прибавил).
     Счёт тот же, что в gameStats: прирост расчётного максимума к первой записи; lvl мышцы равен gameStats().muscles. pct — доля пути до следующего уровня.
     Упражнение: first — лучший подход первой записи, best — лучший подход за всё время (isLast — он из последней тренировки), next — сколько повторов на том же весе
     даёт следующий уровень упражнения (+5 % к старту): вес, которого нет на снаряде, не предлагаем; прибавил вес раньше — уровень тоже придёт. Свой вес (0 кг) в уровень не идёт — отдельным списком bw, в повторах. */
  function muscleProgress(sessions, now = Date.now()) {
    sessions = sessions.filter((se) => new Date(se.date) <= now);
    const names = new Set(), by = {};
    for (const se of sessions) for (const e of se.exercises) names.add(e.name);
    const bestSet = (p) => p.sets.reduce((b, x) => (epley(x.kg, x.reps) > epley(b.kg, b.reps) ? x : b));
    for (const name of names) {
      const id = NAME_ID[name], m = MUSCLE[id]; if (!m) continue;
      const all = exLog(sessions, name).sort((a, b) => a.t - b.t), log = all.filter((p) => p.e1 > 0); if (!all.length) continue;
      const o = by[m[0]] = by[m[0]] || { ex: [], bw: [] };
      if (!log.length) { o.bw.push({ id, name, n: all.length, first: all[0].reps, best: Math.max(...all.map((p) => p.reps)) }); continue; }
      const top = log.reduce((b, p) => (p.e1 >= b.e1 ? p : b)), growth = top.e1 / log[0].e1 - 1, step = Math.floor(growth / LVL_STEP + 1e-9);
      const best = bestSet(top), need = log[0].e1 * (1 + (step + 1) * LVL_STEP);
      o.ex.push({ id, name, n: log.length, first: bestSet(log[0]), best, isLast: top === log[log.length - 1], growth, lvl: 1 + step, pct: Math.max(0, growth / LVL_STEP - step),
        next: { kg: best.kg, reps: Math.max(best.reps + 1, Math.ceil((need / best.kg - 1) * 30 - 1e-6)) } });
    }
    const out = {};
    Object.keys(MUSCLE_RU).forEach((g) => { const o = by[g] || { ex: [], bw: [] };
      if (!o.ex.length) { out[g] = { lvl: 0, pct: 0, growth: 0, ex: [], bw: o.bw }; return; }
      const gr = o.ex.reduce((x, e) => x + e.growth, 0) / o.ex.length, st = Math.floor(gr / LVL_STEP + 1e-9);
      out[g] = { lvl: 1 + st, pct: Math.max(0, gr / LVL_STEP - st), growth: gr, ex: o.ex, bw: o.bw }; });
    return out;
  }
  const api = { LAYOUT, stallTops, deloadSets, deloadEx, STALL_ADD_MAX, weekSetsOf, stallAddOk, SWAP_MAX, swapPlan, swapTo, split, TUE, machines, methods, arms, seq, SEQ, BASE_N, MACH, MACH2, MACH3, MACH4, MACH5, rangesFor, intro, INTRO_DAYS, INTRO_RIR, EFFORT_INTRO, gameStats, muscleProgress, LVL_STEP, VOL_SHARE, WARM_BY, warmKind, warmFor, startKg, PHOTO_VIEWS, PHOTO_DAYS, photoDue, MEASURES, MEASURE_DAYS, measureVal, measureSet, measureSeries, measureLast, measureCompare, measureDue, MUSCLE, MUSCLE_RU, NAME_ID, muscleSets, muscleWeek, planSets, kindOf, effort, EFFORT, EFFORT_MAX, EFFORT_HELP, volumeAdvice, readyForSet, addSet, VOL_MAX_SETS, READY_SESSIONS, VOL_LO, VOL_HI, VOL_RU, weekStrip, blockWeek, WEEK_GOAL, BLOCK_WEEKS, DELOAD_WEEK, PID, ORDER, RAW, buildProgram, isCurrent, migrate, rangeOf, stepDown, progress, targetReps, e1rm, bestE1, e1Series, epley, TYPES, counted, setsOf, EQ, WARM, PLATES, BARS, warmup, plates, CAT, ALT, alternatives, swap, record, prevIndex, perfEntry, compareSet, volume, sessionVolume, exLog, records, STALL_SESSIONS, RESET_SHARE, FATIGUE_STALLS, RECENT_DAYS, versus, topSet, stalledFor, isStalled, resetKg, CI_HOURS, ciFresh, recovery, dayLast, easeKg, easeKgs, SS, ssKey, ssApply, ssAdd, ssRemove, ssTurn, ssSave, liveRecord, isMain, TEST_DAYS, TEST_MAX, testDue, pickTests, GOAL_WEEKS, GAIN, hasGoal, goalDefault, goalState, nextDay, weightStats, targets, PROT_LO, PROT_HI, GAIN_LO, GAIN_HI, gainKg, round25, dstr };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Fit;
