/* Питание: чистая логика (без DOM) — парсер JSON, пересчёт граммов, промпты, вызов Groq. Работает в браузере и в Node (тесты). */
const Food = (() => {
  'use strict';
  const MODEL = 'qwen/qwen3.8-27b', URL = 'https://api.groq.com/openai/v1/chat/completions';
  // Провайдер по ключу (11.10, r28): sk-or-… → OpenRouter, бесплатная модель со зрением, 50 запросов/день, CORS *; иначе Groq.
  const OR_URL = 'https://openrouter.ai/api/v1/chat/completions', OR_MODEL = 'google/gemma-4-31b-it:free';
  const provider = (key) => /^sk-or-/.test(key || '') ? { url: OR_URL, model: OR_MODEL, name: 'OpenRouter' } : { url: URL, model: MODEL, name: 'Groq' };
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- JSON из ответа модели: ```json-заборы, <think>, текст вокруг, обрезанный хвост ---------- */
  function repair(s) { // закрыть обрезанный (max_tokens) JSON: строку, скобки; последняя запятая убирается
    const st = []; let inStr = false, esc = false;
    for (const c of s) {
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === '{' || c === '[') st.push(c); else if (c === '}' || c === ']') st.pop();
    }
    let out = s + (inStr ? '"' : '');
    out = out.replace(/[,:\s]+$/, '').replace(/,\s*"[^"]*"$/, '');
    return out + st.reverse().map((c) => (c === '{' ? '}' : ']')).join('');
  }
  function parseJSON(text) {
    let t = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/gi, '');
    const a = t.indexOf('{'); if (a < 0) throw new Error('нет JSON в ответе');
    const b = t.lastIndexOf('}');
    if (b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* пробуем чинить */ } }
    try { return JSON.parse(repair(t.slice(a))); } catch (e) { throw new Error('не разобрать JSON'); }
  }

  /* ---------- справочник и пересчёт ---------- */
  /* Название в базе: «синоним, синоним (уточнение)» — скобки в счёт не идут, синонимы сравниваются по отдельности.
     Слова сравниваются по основе; «сухая» и «сырая» — отдельные строки базы; способ приготовления весит втрое меньше. */
  const STOP = new Set(['с', 'со', 'в', 'во', 'на', 'из', 'и', 'для', 'по', 'г', 'гр', 'шт', 'кг', 'мл']);
  const SYN = [[/^картошк/, 'картофел'], [/^отварн/, 'варен'], [/^курин/, 'куриц'], [/^говяж/, 'говядин'], [/^свин(ая|ой|ое|ые|ую|ого|ых)$/, 'свинин'], [/^индюш/, 'индейк'], [/^баран(ий|ья|ье|ьи)$/, 'баранин'], [/^гречнев/, 'гречк']];
  const ENDS = ['иями', 'ями', 'ами', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ый', 'ий', 'ой', 'ую', 'юю', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'ей', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й'];
  const SOFT = /^(варен|жарен|запеченн?|тушен|копчен|готов|домашн|свеж|консервированн|паров|замороженн)$/;
  const words = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/(\d)[.,](\d)/g, '$1.$2').replace(/(\d)\s+%/g, '$1%').replace(/без\s+[a-zа-я]+/g, ' ')
    .replace(/[^a-zа-я0-9%. ]/g, ' ').split(/\s+/).map((x) => x.replace(/^\.+|\.+$/g, '')).filter((x) => x && !STOP.has(x));
  function stem(t) {
    if (/\d/.test(t)) return t;
    for (const [re, to] of SYN) if (re.test(t)) return to;
    for (const e of ENDS) if (t.length - e.length >= 3 && t.endsWith(e)) return t.slice(0, -e.length);
    return t;
  }
  const isDry = (w) => /^сух(ой|ая|ое|ие|ого|ую|их|им)$/.test(w), isRaw = (w) => /^сыр(ой|ая|ое|ые|ого|ую|ых|ым|ыми)$/.test(w);
  const NC = new WeakMap();
  function parseName(name) { // → { st: '' | 'dry' | 'raw', alts: [[{ s: основа, w: вес }]] }
    let st = '';
    const alts = String(name || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/(\d),(\d)/g, '$1.$2').split(',').map((part) => words(part).filter((w) => {
      if (isDry(w)) { st = 'dry'; return false; } if (isRaw(w)) { st = 'raw'; return false; } return true;
    }).map((w) => { const s = stem(w); return { s, w: SOFT.test(s) ? 0.3 : 1 }; })).filter((x) => x.length);
    return { st, alts };
  }
  const fv = (s) => s.replace(/[ео]([бвгджзклмнпрстфхцчшщ])$/, '$1'); // беглая гласная: огурец — огурцы
  function sim(a, b) { // 1 — та же основа, 0.8 — общее начало, 0 — разные слова; числа («9%») только точно
    if (a === b) return 1;
    if (/\d/.test(a) || /\d/.test(b)) return 0;
    if (fv(a) === b || a === fv(b)) return 1;
    let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return k >= 5 || (k >= 4 && k >= Math.max(a.length, b.length) - 2) ? 0.8 : 0;
  }
  const cover = (xs, ys) => { let s = 0, w = 0; for (const x of xs) { w += x.w; s += x.w * Math.max(0, ...ys.map((y) => sim(x.s, y.s))); } return w ? s / w : 0; };
  function matchIn(qt, st, ref) {
    let best = null, bs = 0;
    for (const it of ref) {
      let r = NC.get(it); if (!r) { r = parseName(it.name); NC.set(it, r); }
      if (r.st !== st) continue;
      for (const a of r.alts) {
        const p = cover(qt, a); if (p < 0.6) continue; // запрос должен быть покрыт: «чай с сахаром» — не «сахар»
        const sc = 0.75 * p + 0.25 * cover(a, qt) + (sim(qt[0].s, a[0].s) ? 0.05 : 0); // «масло» — это «масло сливочное», а не «сардины в масле»
        if (sc > bs + 1e-9) { bs = sc; best = it; }
      }
    }
    return bs >= 0.6 ? best : null;
  }
  function matchRef(name, ref) { // ближайшая строка базы или null; при равенстве — та, что в базе выше
    if (!ref) return null;
    const q = parseName(name), qt = q.alts.flat(); if (!qt.length) return null;
    return matchIn(qt, q.st, ref) || (q.st === 'raw' ? matchIn(qt, '', ref) : null); // «сырая морковь» — в базе просто «морковь»
  }
  function search(q, ref, n = 8) { // ручной поиск: каждое слово запроса — начало слова в названии или та же основа
    const qs = words(q); if (!qs.length || !ref) return [];
    const out = [];
    ref.forEach((it, i) => {
      const ws = words(String(it.name).replace(/[(),]/g, ' ')); let sc = 0;
      for (const t of qs) { const st = stem(t), j = ws.findIndex((w) => w.startsWith(t) || stem(w) === st); if (j < 0) return; sc += j === 0 ? 2 : 1; }
      out.push({ it, i, sc });
    });
    return out.sort((x, y) => y.sc - x.sc || x.i - y.i).slice(0, n).map((x) => x.it);
  }
  /* справочник: всё на 100 г; core — строки, которые идут в промпт (вся база в промпт не лезет) */
  const prep = (items) => items.map((i) => ({ name: i.name, kcal: i.kcal, protein: i.protein, core: !!i.core, note: i.note || '' }));
  const refLines = (ref) => { const c = ref.filter((i) => i.core); return (c.length ? c : ref).map((i) => `${i.name.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim()} ${i.kcal}/${i.protein}`).join(' · '); };

  /* ккал по макросам: Б×4 + У×4 + Ж×9; null, если модель не дала жир и углеводы */
  function macroKcal(raw) {
    if (raw.fat == null || raw.carbs == null) return null;
    const k = (+raw.protein) * 4 + (+raw.carbs) * 4 + (+raw.fat) * 9;
    return isFinite(k) && k > 0 ? k : null;
  }
  /* позиция еды: продукт нашёлся в базе — ккал и белок из базы (ИИ даёт только название и граммы);
     не нашёлся — по ответу модели, а если её ккал расходятся с макросами >10 % — по макросам */
  function makeItem(raw, ref) {
    const grams = Math.max(0, +raw.grams || 0), m = matchRef(raw.name, ref);
    let k100, p100;
    if (m) { k100 = m.kcal; p100 = m.protein; }
    else {
      const prot = +raw.protein, mk = macroKcal(raw);
      let kcal = +raw.kcal;
      if (mk != null && (!isFinite(kcal) || Math.abs(kcal - mk) / mk > 0.10)) kcal = mk;
      k100 = grams > 0 && isFinite(kcal) ? (kcal / grams) * 100 : 0; p100 = grams > 0 && isFinite(prot) ? (prot / grams) * 100 : 0;
    }
    const it = recalc({ name: String(raw.name || '?'), grams, k100: Math.round(k100 * 100) / 100, p100: Math.round(p100 * 100) / 100, kcal: 0, protein: 0 }, grams);
    if (m) it.ref = m.name; // по какой строке базы посчитано — показываем под названием
    return it;
  }
  const fromRef = (r) => ({ name: r.name.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim(), grams: 0, k100: r.kcal, p100: r.protein, kcal: 0, protein: 0, ref: r.name }); // строка базы → позиция без граммов
  function recalc(it, grams) { // граммы поменял пользователь → ккал/белок заново
    const g = Math.max(0, +grams || 0);
    it.grams = g; it.kcal = Math.round((it.k100 * g) / 100); it.protein = r1((it.p100 * g) / 100);
    return it;
  }
  const totalOf = (items) => ({ kcal: Math.round(items.reduce((s, i) => s + i.kcal, 0)), protein: r1(items.reduce((s, i) => s + i.protein, 0)) });
  const plain = (it) => ({ name: it.name, grams: it.grams, kcal: it.kcal, protein: it.protein }); // формат в state.meals

  /* ---------- контекст для системного промпта ---------- */
  function workoutDay(S, Fit, now) {
    const today = Fit.dstr(now), last = S.sessions[S.sessions.length - 1];
    if (last && Fit.dstr(last.date) === today) return `отдых (${last.day} уже сделана)`;
    return Fit.nextDay(S.sessions);
  }
  function sessionLines(sessions, n = 3) {
    return sessions.slice(-n).reverse().map((s) => {
      const d = new Date(s.date), dd = String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
      const ex = s.exercises.map((e) => `${e.name} ${e.sets ? e.sets.map((x) => `${x.kg}×${x.reps}`).join(', ') : `${e.kg ?? '?'}×${e.reps.join(',')}`}`).join('; ');
      return `${dd} ${s.day}: ${ex.length > 170 ? ex.slice(0, 167) + '…' : ex}`;
    });
  }
  function dayTotals(S, Fit, now) {
    const today = Fit.dstr(now), t = { kcal: 0, protein: 0, pKcal: 0, pProtein: 0, meals: [] };
    for (const m of S.meals || []) {
      if (m.date !== today) continue;
      if (m.planned) { t.pKcal += m.total.kcal; t.pProtein += m.total.protein; } else { t.kcal += m.total.kcal; t.protein += m.total.protein; }
      t.meals.push(m);
    }
    t.protein = r1(t.protein); t.pProtein = r1(t.pProtein);
    return t;
  }
  /* v89 привычки (Денис 21.10: «на что-то должны влиять»). Белок отмечается сам, когда съеденное за день дотянуло до цели.
     Серия — дни подряд, как календарь с крестиками у Clear (jamesclear.com/habit-tracker); сегодня, пока не отмечено, серию не рвёт.
     «Никогда не пропускай дважды» оттуда же: вчера пропуск, позавчера было — подсказка. */
  function eatenOn(S, day) { let p = 0; for (const m of S.meals || []) if (m.date === day && !m.planned) p += m.total.protein; return r1(p); }
  function habitDone(S, k, day, goal) {
    if (((S.habits || {})[day] || {})[k]) return true;
    return k === 'protein' && goal > 0 && eatenOn(S, day) >= goal;
  }
  function habitStreak(S, Fit, k, now, goal) {
    const noon = new Date(now); noon.setHours(12, 0, 0, 0);
    const on = (i) => habitDone(S, k, Fit.dstr(noon.getTime() - i * 864e5), goal), today = on(0);
    let n = 0; for (let i = today ? 0 : 1; i < 1000 && on(i); i++) n++;
    return { n, today, week: [6, 5, 4, 3, 2, 1, 0].map(on), twice: !today && !on(1) && on(2) };
  }
  function context(S, Fit, now = Date.now(), tdee) { // tdee — измеренный расход, если есть
    const p = S.profile, t = Fit.targets(p, tdee), goalKcal = Math.round((t.kcalLo + t.kcalHi) / 2), tot = dayTotals(S, Fit, now);
    const d = new Date(now), time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return { p, t, goalKcal, goalProtein: t.protein, tot, time, day: workoutDay(S, Fit, now), lines: sessionLines(S.sessions), remKcal: Math.max(0, goalKcal - tot.kcal), remProtein: Math.max(0, Math.round(t.protein - tot.protein)) };
  }

  /* ---------- промпты (ПРОМПТЫ.md v1) ---------- */
  function systemPrompt(c, ref, mode) {
    const p = c.p;
    let s = `Ты — тренер и нутрициолог Дениса. Отвечай по-русски, коротко, цифрами. Не придумывай продукты, которых нет в списке.
ПРОФИЛЬ: ${p.weight} кг, ${p.height || '?'} см, ${p.age ? p.age + ' лет' : 'возраст ?'}. Цель: сила+мышцы, профицит. Нормы дня: ${c.goalKcal} ккал, белок ${c.goalProtein} г (1.8 г/кг).
СЕГОДНЯ: съедено ${c.tot.kcal} ккал / ${c.tot.protein} г белка; тренировка ${c.day}, время ${c.time}.
ПРОГРАММА: три тренировки A-B-C по кругу (3 раза в неделю), каждая — всё тело с акцентом дня: A грудь+руки, B ноги+плечи, C спина+плечи/руки; без приседа со штангой, становой и жима стоя (колени/поясница). В упражнении 3 подхода одним весом — база 5–8 повторов, изоляция 8–12, пресс и предплечья 10–20; предплечья в приоритете — 26 подходов в неделю; все подходы сделал до верха диапазона — вес выше. Креатин 5 г/день. Сон ≥7 ч.
СПРАВОЧНИК на 100 г (ккал/белок): ${refLines(ref)}`;
    if (mode === 'ask') {
      s += `\nЛОГ ТРЕНИРОВОК (последние):\n${c.lines.join('\n') || 'тренировок ещё не было'}\nЕДА ЗА СЕГОДНЯ:\n${c.tot.meals.filter((m) => !m.planned).map((m) => m.items.map((i) => `${i.name} ${i.grams} г`).join(', ')).join('\n') || 'ничего не записано'}
ПРАВИЛО ОТВЕТА: ≤5 строк, сначала действие, потом «почему» одной фразой. Если вопрос про боль/травму — «к врачу» + что не делать сегодня. Без markdown и заголовков.`;
    }
    return s;
  }
  /* правила разбора (компоненты, скрытые масла и соусы, ккал = 4/4/9, «не еда» → пусто) — из SYSTEM_PROMPT hanzpo/kcal, src/services/ai.ts (MIT, © 2026 Hanz Po) */
  const PHOTO_Q = `Перечисли, что на фото. Составное блюдо разбей на компоненты (плов → рис, мясо, морковь, масло). Называй продукт коротко и по-простому, как в справочнике: «рис варёный», «куриная грудка», «яичница». Добавь масло и соусы, которые почти наверняка есть, даже если их не видно.
Для КАЖДОГО продукта оцени массу в граммах (ориентир: стандартная тарелка 26 см, вилка 19 см, ладонь ≈ 100 г мяса).
Ответь ТОЛЬКО JSON без пояснений:
{"items":[{"name":"гречка варёная","grams":180,"kcal":166,"protein":6,"fat":1,"carbs":36}],"total":{"kcal":0,"protein":0},"confidence":"low|mid|high","note":"что мешает оценке (1 фраза)"}
ккал/белок/жир/углеводы — на указанную массу, не на 100 г, по справочнику; ккал должны сходиться с Б×4 + У×4 + Ж×9. Если на фото нет еды — items пустой, note объясняет почему.`;
  /* версия 58 (Денис 15.10: «голос первое»): что съел — словами или голосом (диктовка клавиатуры). Ошибка по тексту ~108 ккал / 6 г белка (PMID 42607839),
     по фото 35,8 % (PMID 41081011) — research/r45-food-no-weigh.md. Формат ответа тот же, что у фото: дальше makeItem/photoCard. */
  const eatQ = (text) => `Пользователь сказал, что съел: «${String(text).trim()}».
Готовое блюдо, названное одним словом (шаурма, плов, борщ, пельмени, бургер, пицца, роллы, сырники), — ОДНОЙ строкой с этим названием и массой обычной порции, на хлеб/мясо/масло НЕ разбивай. Отдельными строками — только то, что человек перечислил сам («рис и курица» → две строки). Называй коротко, как в справочнике: «рис варёный», «куриная грудка», «шаурма».
Граммы: если человек назвал вес — бери его; если штуки, ложки, тарелки, порции, «скуп протеина» — переведи в граммы по обычной порции. Не добавляй того, чего человек не называл.
Ответь ТОЛЬКО JSON без пояснений:
{"items":[{"name":"гречка варёная","grams":180,"kcal":166,"protein":6,"fat":1,"carbs":36}],"total":{"kcal":0,"protein":0},"confidence":"low|mid|high","note":"что неясно (1 фраза), например сколько штук"}
ккал/белок/жир/углеводы — на указанную массу, не на 100 г; ккал должны сходиться с Б×4 + У×4 + Ж×9. Если это не еда — items пустой, note объясняет почему.`;
  const planQ = (c, text) => `Пользователь перечислил продукты дома: ${text.replace(/^\s*дома\s+есть[:\s]*/i, '')}.
Составь еду до конца дня, чтобы добрать остаток: ${c.remKcal} ккал, ${c.remProtein} г белка, учитывая время ${c.time} и тренировку ${c.day}. Используй только эти продукты (плюс соль, вода, специи).
Ответь ТОЛЬКО JSON:
{"meals":[{"time":"14:00","title":"гречка с курицей","items":[{"name":"куриная грудка","grams":200},{"name":"гречка сухая","grams":80}],"kcal":0,"protein":0,"how":"как готовить в 1–2 фразы"}],"missing":"чего не хватает, что докупить (1 фраза)"}
Приоритет: белок в каждый приём ≥30 г, последний приём за 1–2 ч до сна, перед тренировкой углеводы за 1–2 ч. Не больше 4 приёмов.`;
  const isPlanText = (t) => /^\s*дома\s+есть/i.test(t);

  /* план → позиции с ккал/белком: по справочнику, остаток приёма (по ответу модели) делится на неопознанные по граммам */
  function planMeal(m, ref) {
    const items = (m.items || []).map((i) => ({ raw: i, ref: matchRef(i.name, ref) }));
    const known = items.map((x) => x.ref ? recalc({ name: x.raw.name, k100: x.ref.kcal, p100: x.ref.protein }, x.raw.grams) : null);
    const kSum = known.reduce((s, x) => s + (x ? x.kcal : 0), 0), pSum = known.reduce((s, x) => s + (x ? x.protein : 0), 0);
    const unk = items.filter((x, i) => !known[i]), ug = unk.reduce((s, x) => s + (+x.raw.grams || 0), 0);
    const outItems = items.map((x, i) => {
      if (known[i]) return plain(known[i]);
      const sh = ug ? (+x.raw.grams || 0) / ug : 0;
      return { name: String(x.raw.name), grams: +x.raw.grams || 0, kcal: Math.round(Math.max(0, (+m.kcal || 0) - kSum) * sh), protein: r1(Math.max(0, (+m.protein || 0) - pSum) * sh) };
    });
    return { time: m.time || '', title: m.title || '', how: m.how || '', items: outItems, total: totalOf(outItems), modelTotal: { kcal: +m.kcal || 0, protein: +m.protein || 0 } };
  }
  function shareText(plan) {
    const lines = plan.meals.map((m) => `${m.time || '—'} — ${m.title}: ${m.items.map((i) => `${i.name} ${i.grams} г`).join(', ')}`);
    const t = plan.meals.reduce((s, m) => ({ kcal: s.kcal + m.total.kcal, protein: s.protein + m.total.protein }), { kcal: 0, protein: 0 });
    lines.push(`Итого: ${Math.round(t.kcal)} ккал, белок ${Math.round(t.protein)} г`);
    if (plan.missing) lines.push('Докупить: ' + plan.missing);
    return lines.join('\n');
  }


  /* без ИИ (Денис 21.10: «у Грока лимит — а мне записать, что съел»): «гречка 200 г, курица 150, 2 яйца» → позиции по своей базе.
     Граммы — число с г/гр/кг/мл/л или голое число ≥ 20; штуки — «2 яйца» × «1 шт ≈ N г» из базы. Не нашли в базе — позиция с 0 ккал, граммы правятся руками. */
  const NUMW = { 'одно': 1, 'один': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6, 'пол': 0.5, 'половина': 0.5 };
  function localEat(text, ref) {
    const items = [];
    String(text || '').split(/[,;\n+]|\s+и\s+|\s+с\s+(?=\d)/i).map((s) => s.trim()).filter(Boolean).forEach((s) => {
      let grams = 0, cnt = 0, name = s;
      const g = /(\d+(?:[.,]\d+)?)\s*(кг|килограмм\S*|г|гр|грамм\S*|мл|л|литр\S*)(?![а-яё])/i.exec(s);
      if (g) { grams = parseFloat(g[1].replace(',', '.')) * (/^(кг|кил|л|литр)/i.test(g[2]) ? 1000 : 1); name = s.replace(g[0], ' '); }
      else {
        const n = /(\d+(?:[.,]\d+)?)\s*(шт\S*)?/i.exec(s), w = new RegExp('(^|\\s)(' + Object.keys(NUMW).join('|') + ')(?=\\s|$)', 'i').exec(s);
        if (n) { const v = parseFloat(n[1].replace(',', '.')); if (v >= 20 && !n[2]) grams = v; else cnt = v; name = s.replace(n[0], ' '); }
        else if (w) { cnt = NUMW[w[2].toLowerCase()]; name = s.replace(w[0], ' '); }
      }
      name = (' ' + name + ' ').replace(/\s(шт\S*|штук\S*|порци\S*|кус\S*|ломтик\S*|съел\S*|поел\S*|выпил\S*|ещё|еще|на|завтрак\S*|обед\S*|ужин\S*|перекус\S*|сегодня|утром|вечером)(?=\s)/gi, ' ').replace(/\s+/g, ' ').trim(); if (!name) return;
      const m = matchRef(name, ref), pc = m && /1 шт\D*(\d+)\s*г/.exec(m.note || '');
      if (!grams && pc) grams = (cnt || 1) * +pc[1];
      items.push(makeItem({ name: m ? name : name + ' (нет в базе)', grams }, ref));
    });
    return items;
  }

  /* «мои блюда» (v85, как MacroFactor «From History»: последняя порция, час суток, частота, свежесть — research/r57-my-foods): что уже записано с граммами — сразу с прошлой порцией и своими ккал/белком */
  const myKey = (s) => String(s || '').toLowerCase().replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  function myFoods(meals, now, off) {
    const by = new Map(), hr = new Date(now).getHours(), skip = new Set(off || []);
    (meals || []).forEach((m) => {
      if (m.planned) return; const t = m.t || Date.parse(m.date + 'T12:00') || 0;
      (m.items || []).forEach((i) => {
        const k = myKey(i.name); if (!k || !(i.grams > 0) || skip.has(k)) return;
        const r = by.get(k) || { key: k, n: 0, t: -1, hours: [] }; r.n++; if (m.t) r.hours.push(new Date(m.t).getHours());
        if (t >= r.t) Object.assign(r, { name: i.name, t, grams: i.grams, k100: (i.kcal * 100) / i.grams, p100: (i.protein * 100) / i.grams });
        by.set(k, r);
      });
    });
    const near = (r) => r.hours.some((h) => Math.min(Math.abs(h - hr), 24 - Math.abs(h - hr)) <= 2); // ел в это время суток ±2 ч
    return [...by.values()].map((r) => ({ ...r, sc: r.n + (near(r) ? 3 : 0) - (now - r.t) / 6048e5 })).sort((a, b) => b.sc - a.sc); // −1 за неделю давности
  }
  const fromMine = (r) => ({ name: r.name, grams: 0, k100: r.k100, p100: r.p100, kcal: 0, protein: 0, ref: `мои: ${r.grams} г в прошлый раз`, mine: 1 });
  function applyMine(items, mine, text) { // своё ккал/белок на 100 г — всегда; свои граммы — если во фразе нет количества
    if (!mine || !mine.length) return items;
    const amt = /\d/.test(text || '') || new RegExp('(^|\\s)(' + Object.keys(NUMW).join('|') + ')(?=\\s|$)', 'i').test(text || '');
    return items.map((it) => {
      const m = matchRef(it.name, mine); if (!m) return it;
      const g = amt && it.grams > 0 ? it.grams : m.grams;
      return recalc({ ...it, k100: m.k100, p100: m.p100, ref: amt ? 'мои ккал/белок' : `мои: ${m.grams} г в прошлый раз`, mine: 1 }, g);
    });
  }

  /* ---------- Groq ---------- */
  class GroqError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  async function httpCheck(r, pv) { // общие ошибки Groq/OpenRouter: 401, 403 (регион), 429 (лимит), прочее
    if (r.status === 401) throw new GroqError('401', `Ключ ${pv.name} не принят (401)`);
    if (r.status === 429 && pv.mac) { let m = ''; try { m = (await r.json()).error.message; } catch (e) { /* без тела */ } throw new GroqError('429', m || 'Лимит моста'); }
    if (r.status === 403) throw new GroqError('403', 'Groq не отвечает из этого региона (403) — в РФ нужен VPN');
    if (r.status === 429) { // retry-after браузеру не отдаётся (CORS) — читаем текст ошибки: «on tokens per day … try again in 3m8s»
      let m = ''; try { m = (await r.json()).error.message || ''; } catch (e) { /* без тела */ }
      const t = /try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/.exec(m), mins = t ? (+t[1] || 0) * 60 + (+t[2] || 0) + (t[3] ? 1 : 0) : 0;
      const day = /per day|TPD|RPD/i.test(m), used = /Used (\d+)/.exec(m), lim = /Limit (\d+)/.exec(m);
      throw new GroqError('429', (day ? 'Дневной лимит ключа Groq исчерпан' : 'Минутный лимит Groq') + (lim && used ? ` (${used[1]} из ${lim[1]} токенов)` : '') + (mins ? ` — ещё ${mins} мин` : ' — подожди минуту') + (day ? '. Этим ключом пользуется и Мак: для телефона нужен свой аккаунт Groq' : ''));
    }
    if (!r.ok) { let m = ''; try { m = (await r.json()).error.message; } catch (e) { /* без тела */ } throw new GroqError('http', `${pv.name} ${r.status}: ${m.slice(0, 120)}`); }
  }
  /* голос → текст: Groq Whisper (console.groq.com/docs/speech-to-text — flac/mp3/mp4/m4a/ogg/wav/webm, ≤25 МБ, language ISO-639-1, prompt ≤224 токена) */
  const STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions', STT_MODEL = 'whisper-large-v3-turbo';
  const STT_PROMPT = 'Съел гречку 200 грамм, две котлеты, творог 5 %, скуп протеина, куриную грудку.';
  const audioExt = (type) => /mp4|m4a|aac/.test(type || '') ? 'mp4' : /ogg/.test(type || '') ? 'ogg' : /wav/.test(type || '') ? 'wav' : 'webm';
  async function transcribe(key, blob, opts = {}) {
    if (!key) throw new GroqError('nokey', 'Нет ключа Groq — открой «Я»');
    const f = opts.fetch || fetch, pv = opts.pv;
    if (pv && pv.mac) { // v96: мост на Маке — запись как есть, Whisper там (tools/bridge.py stt)
      let r;
      const send = () => f(pv.url, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm', Authorization: 'Bearer ' + key }, body: blob });
      try { r = await send(); } // v99: сеть мигнула — второй раз через 1,5 с
      catch (e) { await new Promise((ok) => setTimeout(ok, opts.retryMs ?? 1500)); try { r = await send(); } catch (e2) { throw new GroqError('net', 'Мак не отвечает (' + (e2.message || e2.name || 'сеть') + ')'); } }
      await httpCheck(r, pv);
      return String((await r.json()).text || '').trim();
    }
    if (provider(key).name !== 'Groq') throw new GroqError('nostt', 'Голос через ИИ работает с ключом Groq');
    const fd = new FormData();
    fd.append('file', blob, 'voice.' + audioExt(blob.type)); fd.append('model', STT_MODEL); fd.append('language', 'ru');
    fd.append('response_format', 'json'); fd.append('temperature', '0'); fd.append('prompt', STT_PROMPT);
    let r;
    try { r = await f(STT_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd }); }
    catch (e) { throw new GroqError('net', 'Нет сети или Groq недоступен'); }
    await httpCheck(r, { name: 'Groq' });
    const j = await r.json();
    return String(j.text || '').trim();
  }
  async function groq(key, messages, opts = {}) {
    if (!key) throw new GroqError('nokey', 'Нет ключа Groq — открой «Я»');
    const pv = opts.pv || provider(key), f = opts.fetch || fetch, body = { model: pv.model, temperature: 0.2, max_tokens: 700, messages, ...(opts.extra || {}) };
    let r;
    try { r = await f(pv.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) }); }
    catch (e) { throw new GroqError('net', 'Нет сети или Groq недоступен'); }
    await httpCheck(r, pv);
    const j = await r.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  }
  const userImage = (text, dataUrl) => [{ role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: dataUrl } }] }];

  /* ---------- Open Food Facts (ODbL): товар по штрихкоду и по названию, всё на 100 г ----------
     поиск — только по кнопке: лимит OFF 10 поисков в минуту, «поиск на каждую букву» запрещён (docs/api) */
  const OFF_FIELDS = 'code,product_name,product_name_ru,brands,serving_quantity,nutriments';
  const isBarcode = (q) => /^\d{8,14}$/.test(String(q).trim());
  const offUrl = (code) => `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`;
  const offSearchUrl = (q, n = 8) => `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${n}&cc=ru&lc=ru&fields=${OFF_FIELDS}`;
  function offItem(p) { // товар OFF → позиция без граммов; нет названия или ккал на 100 г (или ккал > 900 — ошибка ввода) → null
    const n = (p && p.nutriments) || {}, r2 = (x) => Math.round(x * 100) / 100;
    let k = n['energy-kcal_100g'] == null ? NaN : +n['energy-kcal_100g'];
    if (!isFinite(k) && n.energy_100g != null && isFinite(+n.energy_100g)) k = +n.energy_100g / 4.184; // energy_100g — кДж
    const name = String((p && (p.product_name_ru || p.product_name)) || '').trim();
    if (!name || !isFinite(k) || k < 0 || k > 900) return null;
    const brand = String(Array.isArray(p.brands) ? p.brands[0] || '' : p.brands || '').split(',')[0].trim(), pr = +n.proteins_100g;
    return { name, grams: 0, k100: r2(k), p100: isFinite(pr) && pr >= 0 ? r2(pr) : 0, kcal: 0, protein: 0, ref: 'Open Food Facts' + (brand ? ', ' + brand : ''), serv: +p.serving_quantity > 0 ? Math.round(+p.serving_quantity) : 0, code: String(p.code || '') };
  }

  return { eatenOn, habitDone, habitStreak, myFoods, fromMine, applyMine, localEat, isBarcode, offUrl, offSearchUrl, offItem, MODEL, provider, parseJSON, repair, matchRef, search, fromRef, prep, refLines, macroKcal, makeItem, recalc, totalOf, plain, workoutDay, sessionLines, dayTotals, context, systemPrompt, PHOTO_Q, eatQ, planQ, isPlanText, planMeal, shareText, groq, transcribe, audioExt, userImage, GroqError };
})();
if (typeof module !== 'undefined') module.exports = Food;
