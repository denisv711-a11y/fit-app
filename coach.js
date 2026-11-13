/* Тренд веса и адаптивный расход энергии. Без DOM.
   computeWeightTrend / computeExpenditure — порт src/services/coaching.ts из hanzpo/kcal
   (MIT, © 2026 Hanz Po, текст лицензии — THIRD_PARTY_NOTICES.md). Константы и порядок шагов те же;
   убраны типы, date-fns заменён арифметикой по UTC. fromState — наша обвязка под state приложения. */
const Coach = (() => {
  'use strict';
  const KCAL_PER_KG = 7700;
  const TREND_ALPHA = 0.1; // EMA по взвешиваниям; полураспад ≈ 6,6 дня
  const OUTLIER_PCT = 0.025; // взвешивание дальше ±2,5 % от тренда обрезается
  const TDEE_WINDOW = 14; // дней в одном наблюдении расхода
  const TDEE_BLEND_ALPHA = 0.2; // EMA по ежедневным наблюдениям
  const MAX_DAILY_STEP = 100; // ккал/день — предел сдвига оценки
  const SEED_BAND = 0.4; // оценка держится в ±40 % от стартовой
  const MIN_DAYS_TO_TRUST = 14;
  const MIN_VALID_DAYS = 7; // меньше дней с едой в окне — оценка «держится»
  const MIN_WEIGHINS_IN_WINDOW = 2;

  const DAY = 864e5;
  const ms = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const addDaysStr = (s, n) => new Date(ms(s) + n * DAY).toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((ms(b) - ms(a)) / DAY);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function median(xs) {
    if (xs.length === 0) return undefined;
    const s = [...xs].sort((a, b) => a - b), mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // weighIns: [{date:'YYYY-MM-DD', weightKg}] → [{date, scaleKg|null, trendKg}] по дням до последнего взвешивания
  function computeWeightTrend(weighIns) {
    if (weighIns.length === 0) return [];
    const sorted = [...weighIns].sort((a, b) => (a.date < b.date ? -1 : 1));
    const anchors = [];
    let trend = sorted[0].weightKg, prevDate = sorted[0].date;
    anchors.push({ date: prevDate, scaleKg: sorted[0].weightKg, trendKg: trend });
    for (let i = 1; i < sorted.length; i++) {
      const { date, weightKg } = sorted[i];
      const gap = Math.max(1, daysBetween(prevDate, date));
      const w = clamp(weightKg, trend * (1 - OUTLIER_PCT), trend * (1 + OUTLIER_PCT));
      const alphaEff = 1 - Math.pow(1 - TREND_ALPHA, gap);
      trend = trend + alphaEff * (w - trend);
      anchors.push({ date, scaleKg: weightKg, trendKg: trend });
      prevDate = date;
    }
    const out = [];
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i], b = anchors[i + 1];
      out.push({ date: a.date, scaleKg: a.scaleKg, trendKg: a.trendKg });
      if (!b) continue;
      const span = daysBetween(a.date, b.date);
      for (let d = 1; d < span; d++) out.push({ date: addDaysStr(a.date, d), scaleKg: null, trendKg: a.trendKg + ((b.trendKg - a.trendKg) * d) / span });
    }
    return out;
  }

  // intakes: [{date, kcal}] — только дни с записанной едой. Возвращает { history:[{date,tdee,holding}], current, dataDays, calibrating }
  function computeExpenditure({ weighIns, intakes, seedTdee, startDate, endDate }) {
    const trend = computeWeightTrend(weighIns);
    const trendByDate = new Map(trend.map((t) => [t.date, t.trendKg]));
    const intakeByDate = new Map(intakes.map((i) => [i.date, i]));
    const weighInDates = new Set(weighIns.map((w) => w.date));
    const totalDays = Math.max(0, daysBetween(startDate, endDate) + 1);
    const history = [];
    let tdee = seedTdee, loggedDays = 0;

    for (let d = 0; d < totalDays; d++) {
      const date = addDaysStr(startDate, d);
      if (intakeByDate.has(date)) loggedDays++;
      const winStart = addDaysStr(date, -(TDEE_WINDOW - 1));

      // еда за окно; пропуски и дни ниже половины медианы заменяются
      const windowIntakes = [], rawWindow = [];
      let validDays = 0, weighInsInWindow = 0;
      for (let i = 0; i < TDEE_WINDOW; i++) {
        const day = addDaysStr(winStart, i);
        if (day < startDate || day > endDate) { rawWindow.push(undefined); continue; }
        if (weighInDates.has(day)) weighInsInWindow++;
        const intake = intakeByDate.get(day);
        rawWindow.push(intake ? intake.kcal : undefined);
        if (intake) validDays++;
      }
      const windowMedian = median(rawWindow.filter((x) => x != null));
      const lowCutoff = windowMedian != null ? windowMedian * 0.5 : 0;
      for (let i = 0; i < TDEE_WINDOW; i++) {
        const day = addDaysStr(winStart, i);
        if (day < startDate || day > endDate) continue;
        let kcal = rawWindow[i];
        if (kcal == null || kcal < lowCutoff) {
          // медиана того же дня недели за 4 прошлые недели, иначе медиана окна
          const sameWeekday = [];
          for (let w = 1; w <= 4; w++) {
            const prev = intakeByDate.get(addDaysStr(day, -7 * w));
            if (prev) sameWeekday.push(prev.kcal);
          }
          kcal = median(sameWeekday) ?? windowMedian ?? tdee;
        }
        windowIntakes.push(kcal);
      }

      const trendStart = trendByDate.get(winStart), trendEnd = trendByDate.get(date);
      const holding = validDays < MIN_VALID_DAYS || weighInsInWindow < MIN_WEIGHINS_IN_WINDOW || trendStart == null || trendEnd == null || windowIntakes.length === 0;
      if (!holding) {
        const slopeKgPerDay = (trendEnd - trendStart) / TDEE_WINDOW;
        const meanIntake = windowIntakes.reduce((a, b) => a + b, 0) / windowIntakes.length;
        const observed = meanIntake - slopeKgPerDay * KCAL_PER_KG;
        let next = tdee + TDEE_BLEND_ALPHA * (observed - tdee);
        next = clamp(next, tdee - MAX_DAILY_STEP, tdee + MAX_DAILY_STEP);
        next = clamp(next, seedTdee * (1 - SEED_BAND), seedTdee * (1 + SEED_BAND));
        tdee = next;
      }
      history.push({ date, tdee, holding });
    }

    // мало данных — оценка подмешивается к стартовой
    const dataDays = Math.min(loggedDays, totalDays);
    const w = clamp(dataDays / MIN_DAYS_TO_TRUST, 0, 1);
    const current = history.length ? w * history[history.length - 1].tdee + (1 - w) * seedTdee : seedTdee;
    return { history, current, dataDays, calibrating: dataDays < MIN_DAYS_TO_TRUST };
  }

  /* Обвязка: S.weights [{date,kg}], S.meals [{date,planned,total:{kcal}}]. Считаем по вчера включительно —
     сегодняшний день ещё не доеден, а неполный день занижает расход. measured — оценка хоть раз сдвигалась от стартовой. */
  function fromState(S, seedTdee, today) {
    const weighIns = (S.weights || []).map((w) => ({ date: w.date, weightKg: w.kg }));
    const byDay = {};
    for (const m of S.meals || []) if (!m.planned) byDay[m.date] = (byDay[m.date] || 0) + m.total.kcal;
    const intakes = Object.keys(byDay).map((date) => ({ date, kcal: byDay[date] }));
    const dates = weighIns.map((w) => w.date).concat(intakes.map((i) => i.date)).sort();
    const res = computeExpenditure({ weighIns, intakes, seedTdee, startDate: dates[0] || today, endDate: addDaysStr(today, -1) });
    const trend = computeWeightTrend(weighIns);
    return { ...res, measured: res.history.some((h) => !h.holding), trendKg: trend.length ? trend[trend.length - 1].trendKg : null };
  }

  return { KCAL_PER_KG, TDEE_WINDOW, MIN_DAYS_TO_TRUST, addDaysStr, daysBetween, computeWeightTrend, computeExpenditure, fromState };
})();
if (typeof module !== 'undefined') module.exports = Coach;
