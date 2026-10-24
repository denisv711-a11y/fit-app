/* v17 (20.10, Денис про лист v16: «упёрся в один Fitbod — дай 10 РАЗНЫХ»): 10 видов «Сегодня» + строки подхода, флаг ?sv=1..10.
   Механика та же (поле кг, колонка «цель повторов», галочка) — меняется только вид. Образцы: research/r51-more-apps/r51.md,
   r49-ui-live/*_active_*.jpg, r46-top10-refs/*. 1 Strong · 2 Caliber · 3 Gymverse · 4 Alpha Progression · 5 Liftin' · 6 MacroFactor ·
   7 Fitbod · 8 StrongLifts · 9 Setgraph · 10 Gravl. Строка — всегда class="set": галочка ищет el.closest('.set'). */
const SV = UI16 ? +((location.search.match(/[?&]sv=(\d+)/) || [])[1] || 0) : 0;
const SV_NAME = ['', 'Strong', 'Caliber', 'Gymverse', 'Alpha Progression', "Liftin'", 'MacroFactor', 'Fitbod', 'StrongLifts', 'Setgraph', 'Gravl'];
const tick17 = (o, inner) => `<button class="chk" data-act="tick" data-k="${o.k}" data-j="${o.j}" aria-label="Готово">${inner == null ? `<i>${ico('check')}</i>` : inner}</button>`;
const type17 = (o, t) => `<button class="num t-${o.s.t || 'n'}" data-act="stype" data-k="${o.k}" data-j="${o.j}" aria-label="Тип подхода">${t == null ? o.no : t}</button>`;
const tg17 = (o) => (o.s.mx ? 'макс' : o.rg ? o.rg.join('–') : '—');
const pv17 = (o, x = ' × ') => (o.ps ? `${fmt(o.ps.kg)}${x}${o.ps.reps}` : '—');
const st17 = (o, f, d) => `<button class="st17" data-act="st17" data-f="${f}" data-d="${d}" data-k="${o.k}" data-j="${o.j}" aria-label="${d > 0 ? 'Больше' : 'Меньше'}">${d > 0 ? '+' : '−'}</button>`;
const cur17 = (o) => !o.s.done && o.it.sets.findIndex((x) => !x.done) === o.j;
const cls17 = (o, c) => `set ${c}${o.s.done ? ' done' : ''}${cur17(o) ? ' cur' : ''}${o.s.t === 'w' ? ' wu' : ''}`;
function R17(o) {
  const tg = tg17(o), up = o.plus ? o.plus.replace(/<\/?small>/g, '') : '';
  switch (SV) {
    case 1: // Strong: таблица, серые поля-таблетки, сделанная строка зелёная
      return `<div class="${cls17(o, 'r1')}">${type17(o)}<div class="prev">${pv17(o)}${o.badge}</div><div class="tg">${tg}</div>${o.ik}${o.ir}${tick17(o)}</div>`;
    case 2: // Caliber: подход — две крупные белые карточки, под каждой «было»
      return `<div class="${cls17(o, 'r2')}"><div class="l2">${type17(o, `Подход ${o.no}`)}<small>цель <b>${tg}</b></small>${up ? `<em>↑ ${up}</em>` : ''}</div>
        <div class="c2"><div class="b2">${o.ik}<span>кг</span></div><small>было ${o.ps ? fmt(o.ps.kg) : '—'}</small></div>
        <div class="c2"><div class="b2">${o.ir}<span>повт</span></div><small>было ${o.ps ? o.ps.reps : '—'}</small></div>${tick17(o)}</div>`;
    case 3: // Gymverse: текущий подход — большая жёлтая карточка с «Сделал», остальные — серые полосы
      return cur17(o)
        ? `<div class="${cls17(o, 'r3')}"><div class="m3">${type17(o, `Подход ${o.no}`)}<div class="v3">${o.ik}<span>кг ×</span>${o.ir}<span>повт</span></div><div class="a3">Цель — ${tg} повторов${o.ps ? ` · было ${pv17(o)}` : ''}${up ? ` · ↑ ${up}` : ''}</div></div>${tick17(o, 'Сделал')}</div>`
        : `<div class="${cls17(o, 'r3')}">${type17(o)}<div class="v3">${o.ik}<span>кг ×</span>${o.ir}</div><div class="g3">цель ${tg}</div>${tick17(o, o.s.done ? `<i>${ico('check')}</i>` : '<i>▶</i>')}</div>`;
    case 4: // Alpha Progression: каждый подход — своя карточка, цель чипом, «тяжелее на» стрелкой
      return `<div class="${cls17(o, 'r4')}"><div class="h4">${type17(o, `Подход ${o.no}`)}<span class="c4">цель ${tg}</span>${up ? `<span class="u4">↑ ${up}</span>` : ''}<span class="p4">было ${pv17(o)}</span></div>
        <div class="f4"><label>${o.ik}<span>кг</span></label><label>${o.ir}<span>повт</span></label>${tick17(o)}</div></div>`;
    case 5: // Liftin': светлая, номер в кружке = галочка, значения текстом
      return `<div class="${cls17(o, 'r5')}">${tick17(o, `<i>${o.s.done ? ico('check') : o.no}</i>`)}<div class="m5"><div class="v5">${o.ik}<span>кг ×</span>${o.ir}<span>повт</span></div>
        <div class="a5">${type17(o, o.s.t === 'w' ? 'разминка' : 'подход')} · цель ${tg}${o.ps ? ` · было ${pv17(o)}` : ''}${up ? ` · <b>↑ ${up}</b>` : ''}</div></div></div>`;
    case 6: // MacroFactor: чёрный, крупные скруглённые ячейки, степперы у веса, квадратная отметка
      return `<div class="${cls17(o, 'r6')}">${type17(o)}<div class="i6"><span>${pv17(o, '×')}</span><b>${tg}</b></div><div class="k6">${st17(o, 'sk', -1)}${o.ik}${st17(o, 'sk', 1)}</div>${o.ir}${tick17(o)}</div>`;
    case 7: // Fitbod: подходы таблетками под большой картинкой
      return `<div class="${cls17(o, 'r7')}">${type17(o)}<div class="v7">${o.ik}<span>кг ×</span>${o.ir}<span>повт</span></div><div class="g7">цель ${tg}</div>${tick17(o)}</div>`;
    case 8: // StrongLifts: подходы кружками с повторами, тап по кружку = сделал; кг и повт под кружком
      return `<div class="${cls17(o, 'r8')}">${type17(o)}${tick17(o, `<i>${o.s.done ? o.s.reps : tg}</i>`)}<div class="f8">${o.ik}${o.ir}</div></div>`;
    case 9: // Setgraph: текущий подход — огромные цифры со степперами и большая зелёная кнопка; сделанные — список
      return cur17(o)
        ? `<div class="${cls17(o, 'r9')}"><div class="t9">${type17(o, `Подход ${o.no}`)}<span>цель ${tg}${o.ps ? ` · было ${pv17(o)}` : ''}</span></div>
          <div class="p9"><div>${st17(o, 'sr', -1)}${o.ir}${st17(o, 'sr', 1)}<small>повт</small></div><div>${st17(o, 'sk', -1)}${o.ik}${st17(o, 'sk', 1)}<small>кг</small></div></div>${tick17(o, `<i>${ico('check')}</i>Записать подход`)}</div>`
        : `<div class="${cls17(o, 'r9')}">${type17(o)}<div class="v9x">${o.ir}<span>повт</span>${o.ik}<span>кг</span></div><div class="g9">цель ${tg}</div>${tick17(o)}</div>`;
    case 10: { // Gravl: рамочные поля, текущий — жёлтая рамка, справа блины штанги
      const kg = +o.kg || 0, pl = [20, 15, 10, 5, 2.5].reduce((a, p) => { let r = a.r; const n = Math.floor(r / 2 / p); for (let i = 0; i < Math.min(n, 3); i++) a.p.push(p); a.r = r - Math.min(n, 3) * 2 * p; return a; }, { r: kg, p: [] }).p.slice(0, 4);
      const bars = pl.map((p) => `<i class="pl p${String(p).replace('.', '')}"></i>`).join('') || '<i class="pl p0"></i>';
      return `<div class="${cls17(o, 'r10')}">${type17(o)}<div class="tg">${tg}${o.plus}</div>${o.ik}${o.ir}${tick17(o, `<span class="br10">${bars}</span><i>${ico('check')}</i>`)}</div>`;
    }
  }
  return '';
}
// шапка и обёртка подходов упражнения по виду
function SET17(it, k, rows) {
  const H = (a) => `<div class="shead h${SV}">${a.map((x) => `<span>${x}</span>`).join('')}</div>`;
  if (SV === 1) return H(['СЕТ', 'БЫЛО', 'ЦЕЛЬ', 'КГ', 'ПОВТ', '✓']) + rows;
  if (SV === 6) return H(['СЕТ', 'БЫЛО · ЦЕЛЬ', 'КГ', 'ПОВТ', '']) + rows;
  if (SV === 10) return H(['СЕТ', 'ЦЕЛЬ', 'КГ', 'ПОВТ', '']) + rows;
  if (SV === 8) { const p = it.perf, tg = Fit.rangeOf(it, 0).join('–'), n = it.sets.filter(Fit.counted).length, kg = it.sets.find((s) => Fit.counted(s) && s.kg != null);
    return `<div class="s8h"><span>${n}×${tg}</span><b>${kg ? fmt(kg.kg) + ' кг' : 'вес?'}</b>${p ? `<small>было ${fmt(p.sets[0].kg)}×${p.sets.map((s) => s.reps).join(',')}</small>` : ''}</div><div class="s8">${rows}</div>`; }
  if (SV === 9) { const L = Fit.exLog(S.sessions, it.name).slice(-10);
    const g = L.length > 1 ? (() => { const mx = Math.max(...L.map((x) => x.kg)), mn = Math.min(...L.map((x) => x.kg)) * .9;
      return `<div class="g9w"><span>вес по тренировкам</span><div class="g9b">${L.map((x, i) => `<i style="height:${Math.round(14 + (x.kg - mn) / (mx - mn || 1) * 34)}px"${i === L.length - 1 ? ' class="l"' : ''}><b>${fmt(x.kg)}</b></i>`).join('')}</div></div>`; })() : '';
    return g + `<div class="s9">${rows}</div>`; }
  return `<div class="s${SV}">${rows}</div>`;
}
// «Сегодня»: основа v16 + добавки вида
function T17(top, day, prog, nsets) {
  let h = today16(top, day, prog, nsets);
  if (SV === 3 && prog[0]) { const t = TECH[prog[0].id], ext = t && t.ext || 'png';
    h = `<div class="hero3">${t && t.img ? `<img src="tech/${prog[0].id}-0.${ext}" alt="">` : ''}<div><small>Сегодня</small><b>Тренировка ${day}</b><span>${prog.length} упр · ${nsets} подх.</span></div></div>` + h; }
  if (SV === 8) { const [a, b] = h.split('<div class="xl16">');
    if (b != null) h = a + '<div class="xl16">' + prog.reduce((x, e) => { const n = cycNow().deload ? Fit.deloadSets(e.ranges.length) : e.ranges.length, r = e.ranges[0];
      return x.replace(`<b>${esc(e.name)}</b>`, `<b>${esc(e.name)}</b><span class="o8">${`<i>${r[1]}</i>`.repeat(n)}</span>`); }, b); }
  return h;
}
// степперы −/+ (виды 6 и 9): меняем поле и шлём input/change — дальше обычная логика app.js
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act=st17]'); if (!b || !S.active) return;
  const i = b.closest('.set').querySelector(`[data-${b.dataset.f}]`), it = S.active.items[+b.dataset.k]; if (!i) return;
  const st = b.dataset.f === 'sk' ? stepOf(it) : 1, v = parseFloat((i.value || i.placeholder || '0').replace(',', '.')) || 0;
  i.value = fmt(Math.max(0, Math.round((v + st * +b.dataset.d) * 100) / 100)); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
});
if (SV) {
  document.documentElement.classList.add('sv', 'sv' + SV);
  const st = document.createElement('style'); st.id = 'sv17';
  st.textContent = `
/* общее для всех видов: цвета из переменных вида, а не из тёмной темы */
.sv .w16{background:var(--glass)}.sv .m16i{background:var(--glass-2)}.sv .m16{background:var(--glass)}
.sv .cta16{background:linear-gradient(to top,var(--bg) 62%,transparent)}.sv .cta16 .primary{background:var(--ac);color:var(--on-ac);box-shadow:none}
.sv .tabs{background:var(--bg);border-top:1px solid var(--line)}.sv .tabs button.on{color:var(--ac)}
.sv .wtop{background:var(--bg)}.sv .wline i{background:var(--ac)}.sv .exn{color:var(--ink)}.sv .exrest{color:var(--ink-2)}
.sv .link{color:var(--ac)}.sv .primary{background:var(--ac);color:var(--on-ac)}.sv .d16 summary{color:var(--ac)}
.sv input,.sv textarea{border-color:var(--line)}.sv .x16+.x16{border-top-color:var(--line)}
.sv .set,.sv .shead{margin:0;padding:0;min-height:0}.sv .set{transition:background 120ms,border-color 120ms}
.sv .set .chk,.sv .set .num{min-width:0;min-height:0}.sv .num:active,.sv .chk:active{transform:scale(.94)}
.sv input.cell{color:var(--ink);font-weight:600}.sv input.cell::placeholder{color:var(--ink-3)}
.sv .set.done input.cell{color:var(--ink);font-size:inherit}
.sv .t-w{color:var(--amber)}.sv .ex{padding:18px 0 12px}.sv .ex+.ex{border-top:1px solid var(--line)}

/* 1 Strong — почти чёрный, серые поля-таблетки, сделанная строка зелёная; «Начать» сверху, шаблон карточкой */
.sv1{--bg:#000;--ink:#fff;--ink-2:#8e8e93;--ink-3:#48484a;--glass:#1c1c1e;--glass-2:#2c2c2e;--line:#2c2c2e;--track:#2c2c2e;--ac:#0a84ff;--on-ac:#fff;--done:#1c3a24}
.sv1 #view:has(.cta16){display:flex;flex-direction:column}.sv1 .h16{order:-3}.sv1 .cta16{order:-2;position:static;padding:0 0 18px;background:none}
.sv1 .cta16 .primary{min-height:46px;border-radius:10px;font-size:17px}.sv1 #view:has(.cta16){padding-bottom:calc(var(--tab-h) + 24px)}
.sv1 .xl16{background:var(--glass);border-radius:12px;padding:4px 14px}.sv1 .x16 .t16{display:none}.sv1 .x16 b{font-size:16px}
.sv1 .s16 h3,.sv1 .s16 h4{font-style:normal}.sv1 .w16{border-radius:12px}
.sv1 .exn{color:var(--ac);font-size:18px}
.sv1 .set,.sv1 .shead{display:grid;grid-template-columns:34px minmax(0,1fr) 46px 62px 50px 38px;gap:6px;align-items:center;margin:0 -8px;padding:0 8px}
.sv1 .shead{min-height:26px;font-size:12px;font-weight:700;color:var(--ink-2);text-align:center}.sv1 .shead span:nth-child(2){text-align:left}
.sv1 .set{min-height:42px;border-radius:8px;margin-top:2px}.sv1 .set.done{background:var(--done)}
.sv1 .num{font-size:15px;font-weight:700;background:none}.sv1 .prev{font-size:14px;color:var(--ink-2)}.sv1 .tg{font-size:14px;color:var(--ink-2)}
.sv1 input.cell{background:var(--glass-2);min-height:30px;height:30px;border-radius:6px;font-size:16px}.sv1 .set.done input.cell{background:transparent}
.sv1 .chk i{width:30px;height:28px;border-radius:6px;background:var(--glass-2);color:var(--ink-2);display:flex;align-items:center;justify-content:center}.sv1 .set.done .chk i{background:#30d158;color:#fff}

/* 2 Caliber — тёмно-синий, красный акцент, подход = две белые карточки «кг / повт» с «было» под каждой */
.sv2{--bg:#0d1830;--ink:#fff;--ink-2:#8d9bb8;--ink-3:#45537a;--glass:#16244a;--glass-2:#20305a;--line:#22335c;--track:#22335c;--ac:#ff3b4f;--on-ac:#fff;--done:#16244a}
.sv2 body,.sv2 #view{font-family:"Avenir Next",-apple-system,system-ui,sans-serif}.sv2 .h16,.sv2 .s16 h3,.sv2 .s16 h4{font-family:"Avenir Next",system-ui;font-weight:800;font-style:normal}
.sv2 .w16,.sv2 .m16{border-radius:14px}.sv2 .t16{border-radius:10px}
.sv2 .s2{display:grid;gap:10px;margin-top:6px}
.sv2 .r2{display:grid;grid-template-columns:72px 1fr 1fr 40px;gap:8px;align-items:start}
.sv2 .l2{padding-top:6px}.sv2 .l2 .num{width:auto;font-size:15px;font-weight:700;color:var(--ink);text-align:left;padding:0}.sv2 .l2 small{display:block;color:var(--ink-2);font-size:12.5px;margin-top:2px}.sv2 .l2 small b{color:var(--ink)}.sv2 .l2 em{display:block;font-style:normal;color:#32d17c;font-size:12px;font-weight:700;margin-top:2px}
.sv2 .b2{display:flex;align-items:baseline;justify-content:center;gap:4px;background:#fff;border-radius:12px;height:50px;padding:0 8px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.sv2 .b2 input.cell{color:#0d1830;font-size:22px;font-weight:700;min-height:48px;width:100%;text-align:right}.sv2 .b2 span{color:#7a849a;font-size:13px;font-weight:600;flex:none}
.sv2 .c2>small{display:block;text-align:center;color:var(--ink-2);font-size:12px;margin-top:4px}
.sv2 .chk{height:50px;width:40px}.sv2 .chk i{width:34px;height:34px;border-radius:50%;border:2px solid var(--ink-3);display:flex;align-items:center;justify-content:center;color:transparent}
.sv2 .set.done .chk i{background:var(--ac);border-color:var(--ac);color:#fff}.sv2 .set.done .b2{background:#dfe5f2}.sv2 .set.done .b2 input.cell{color:#0d1830}

/* 3 Gymverse — синий + жёлтый, текущий подход — жёлтая карточка «Сделал», герой-картинка на «Сегодня» */
.sv3{--bg:#11141f;--ink:#fff;--ink-2:#8a90a6;--ink-3:#434a63;--glass:#1c2132;--glass-2:#272d42;--line:#242a3d;--track:#272d42;--ac:#f7d417;--on-ac:#14161f;--done:#1c2132}
.sv3 .hero3{position:relative;height:190px;border-radius:18px;overflow:hidden;background:#fff;margin:0 0 18px}.sv3 .hero3 img{position:absolute;right:-10px;top:0;height:100%;width:62%;object-fit:contain}
.sv3 .hero3 div{position:absolute;inset:0;background:linear-gradient(90deg,#f7d417 46%,rgba(247,212,23,0) 70%);padding:22px 18px;color:#14161f}
.sv3 .hero3 small{display:block;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.sv3 .hero3 b{display:block;font:900 30px/1.05 "Futura",-apple-system,system-ui;margin:6px 0 8px;max-width:58%}.sv3 .hero3 span{font-weight:600;font-size:14px}
.sv3 .h16{display:none}.sv3 .s16 h3,.sv3 .s16 h4{font-family:"Futura",system-ui;font-style:normal}.sv3 .m16 .ok16{color:#f7d417}.sv3 .b16 i.ok16{background:#f7d417}
.sv3 .s3{display:grid;gap:8px;margin-top:6px}
.sv3 .r3{display:grid;grid-template-columns:30px 1fr auto 52px;gap:8px;align-items:center;background:var(--glass);border-radius:12px;min-height:52px;padding:0 0 0 10px}
.sv3 .r3 .num{color:var(--ink-2);font-weight:700}.sv3 .v3{display:flex;align-items:center;gap:4px}.sv3 .v3 input.cell{width:48px;min-height:36px;font-size:18px;background:var(--glass-2);border-radius:8px}.sv3 .v3 span{color:var(--ink-2);font-size:13px}
.sv3 .g3{color:var(--ink-2);font-size:13px;white-space:nowrap}.sv3 .r3 .chk{height:52px;width:52px;border-left:1px solid var(--line);border-radius:0 12px 12px 0;color:var(--ink-2)}.sv3 .r3 .chk i{font-style:normal;font-size:14px;display:flex}
.sv3 .r3.done .chk{color:#33d17a}
.sv3 .r3.cur{grid-template-columns:1fr 92px;padding:0;background:#f7d417;color:#14161f;min-height:128px;overflow:hidden}
.sv3 .r3.cur .m3{padding:12px 14px}.sv3 .r3.cur .num{color:#14161f;font-size:13px;text-transform:uppercase;letter-spacing:.06em;width:auto;padding:0}
.sv3 .r3.cur .v3{margin:6px 0}.sv3 .r3.cur .v3 input.cell{width:70px;min-height:52px;font:800 32px/1 "Futura",system-ui;color:#14161f;background:rgba(0,0,0,.08)}.sv3 .r3.cur .v3 span{color:#14161f;font-weight:700;font-size:15px}
.sv3 .r3.cur .a3{font-size:13px;font-weight:600;opacity:.8}.sv3 .r3.cur .chk{height:100%;width:92px;background:#e0bf00;border:0;border-radius:0;color:#14161f;font-weight:800;font-size:16px}

/* 4 Alpha Progression — светлая iOS, каждый подход своей карточкой, цель чипом */
.sv4{--bg:#f2f2f7;--ink:#111;--ink-2:#6e6e78;--ink-3:#c4c4cc;--glass:#fff;--glass-2:#ececf1;--line:#e3e3ea;--track:#e3e3ea;--ac:#2f6bff;--on-ac:#fff;--done:#e8f7ee;--amber:#d98200}
.sv4,.sv4 body{color-scheme:light}.sv4 .h16 span,.sv4 .c16{color:var(--ink-2)}.sv4 .w16{box-shadow:0 1px 3px rgba(0,0,0,.06)}.sv4 .xl16{background:#fff;border-radius:14px;padding:2px 12px}
.sv4 .s16 h3,.sv4 .s16 h4{font-style:normal}.sv4 .m16 .ok16{color:var(--ac)}.sv4 .t16{background:#f2f2f7}
.sv4 .s4{display:grid;gap:8px;margin-top:6px}
.sv4 .r4{display:block;background:#fff;border-radius:14px;padding:10px 12px;border:2px solid transparent;box-shadow:0 1px 3px rgba(0,0,0,.06)}.sv4 .r4.cur{border-color:var(--ac)}.sv4 .r4.done{background:var(--done)}
.sv4 .h4{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.sv4 .h4 .num{width:auto;padding:0;font-size:15px;font-weight:700;color:var(--ink)}
.sv4 .c4{background:#e8efff;color:var(--ac);font-weight:700;font-size:12.5px;border-radius:999px;padding:3px 9px}.sv4 .u4{background:#e3f6ea;color:#1a9a4b;font-weight:700;font-size:12.5px;border-radius:999px;padding:3px 9px}
.sv4 .p4{margin-left:auto;color:var(--ink-2);font-size:13px}
.sv4 .f4{display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;margin-top:8px;align-items:center}
.sv4 .f4 label{display:flex;align-items:baseline;gap:4px;margin:0;background:#f2f2f7;border-radius:10px;padding:0 10px;color:var(--ink-2)}.sv4 .f4 input.cell{min-height:42px;font-size:20px;font-weight:700;text-align:left}
.sv4 .chk i{width:40px;height:40px;border-radius:50%;background:#ececf1;color:#b0b0ba;display:flex;align-items:center;justify-content:center}.sv4 .done .chk i{background:#22b357;color:#fff}

/* 5 Liftin' — светлая, розовый акцент, номер в кружке = отметка */
.sv5{--bg:#fff;--ink:#16161a;--ink-2:#8a8a96;--ink-3:#cfcfd6;--glass:#f6f4f7;--glass-2:#efeaf0;--line:#efeef2;--track:#efeaf0;--ac:#ff2d78;--on-ac:#fff;--done:#fff;--amber:#e08a00}
.sv5,.sv5 body{color-scheme:light}.sv5 #view:has(.cta16)::before{content:'';position:absolute;left:-40px;right:-40px;top:-60px;height:300px;background:radial-gradient(60% 70% at 70% 30%,#ffc1dd 0%,#E3F6F4 45%,rgba(255,255,255,0) 75%);z-index:-1}
.sv5 #view{isolation:isolate}.sv5 .h16{font-family:"Avenir Next",system-ui;font-weight:800}.sv5 .s16 h3,.sv5 .s16 h4{font-family:"Avenir Next",system-ui;font-weight:800;font-style:normal}
.sv5 .w16,.sv5 .m16{background:#fff;box-shadow:0 2px 12px rgba(7,18,22,.07)}.sv5 .cta16 .primary{border-radius:999px}.sv5 .m16 .ok16{color:var(--ac)}.sv5 .b16 i.ok16{background:var(--ac)}.sv5 .t16{background:#f6f4f7}
.sv5 .r5{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.sv5 .s5 .r5:first-child{border-top:0}
.sv5 .r5 .chk i{width:40px;height:40px;border-radius:50%;border:2px solid var(--ac);color:var(--ac);font-style:normal;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center}
.sv5 .r5.done .chk i{background:var(--ac);color:#fff}.sv5 .r5.cur .chk i{box-shadow:0 0 0 5px #DEF5F3}
.sv5 .v5{display:flex;align-items:baseline;gap:4px}.sv5 .v5 input.cell{width:56px;min-height:34px;font-size:20px;font-weight:700;text-align:left;padding:0}.sv5 .v5 span{color:var(--ink-2);font-size:15px;margin-right:4px}
.sv5 .a5{font-size:13px;color:var(--ink-2)}.sv5 .a5 .num{display:inline;width:auto;padding:0;font-size:13px;color:var(--ink-2);font-weight:600}.sv5 .a5 b{color:#14a05a}
.sv5 .m5{flex:1;min-width:0}.sv5 .r5.done .v5 input.cell{color:var(--ink-2)}

/* 6 MacroFactor — чёрный, крупные скруглённые ячейки, степперы у веса, квадратная отметка */
.sv6{--bg:#000;--ink:#fff;--ink-2:#8b8b93;--ink-3:#45454c;--glass:#121214;--glass-2:#1d1d21;--line:#1d1d21;--track:#1d1d21;--ac:#fff;--on-ac:#000;--done:#000}
.sv6 #view{font-family:"DIN Alternate",-apple-system,system-ui}.sv6 .h16,.sv6 .s16 h3,.sv6 .s16 h4{font-family:-apple-system,"SF Pro Display",system-ui;font-weight:900;font-style:normal;text-transform:uppercase;letter-spacing:.01em}
.sv6 .h16{font-size:30px}.sv6 .m16 .ok16{color:#4f8cff}.sv6 .b16 i.ok16{background:#4f8cff}.sv6 .w16{border:1px solid #1d1d21}
.sv6 .set,.sv6 .shead{display:grid;grid-template-columns:24px minmax(0,1fr) 128px 52px 40px;gap:6px;align-items:center}
.sv6 .shead{font-size:11px;font-weight:700;color:var(--ink-2);min-height:24px;text-align:center}.sv6 .shead span:nth-child(2){text-align:left}
.sv6 .set{min-height:58px}.sv6 .num{font-size:15px;color:var(--ink-2)}.sv6 .i6 span{display:block;font-size:13px;color:var(--ink-2)}.sv6 .i6 b{font-size:16px;color:#4f8cff}
.sv6 .k6{display:flex;align-items:center;background:var(--glass-2);border-radius:14px;height:48px}.sv6 .st17{min-width:0;min-height:0;width:34px;height:48px;background:none;color:var(--ink-2);font-size:22px;padding:0}
.sv6 .k6 input.cell{min-height:46px;font-size:20px;flex:1;min-width:0}.sv6 .r6>input.cell{background:var(--glass-2);border-radius:14px;min-height:48px;font-size:20px}
.sv6 .chk i{width:30px;height:30px;border-radius:6px;border:2px solid #55555c;display:flex;align-items:center;justify-content:center;color:transparent}.sv6 .done .chk i{background:#fff;border-color:#fff;color:#000}
.sv6 .done .k6,.sv6 .done>input.cell{background:#16233f}

/* 7 Fitbod — большая картинка сверху упражнения, подходы таблетками */
.sv7{--bg:#101010;--ink:#fff;--ink-2:#9a9a9a;--ink-3:#4a4a4a;--glass:#1c1c1c;--glass-2:#2a2a2a;--line:#232323;--track:#2a2a2a;--ac:#ff3d5e;--on-ac:#fff;--done:#2a1218}
.sv7 .cta16 .primary{border-radius:999px}.sv7 .x16 .t16{width:72px!important;height:72px!important;border-radius:8px}.sv7 .m16 .ok16{color:var(--ac)}.sv7 .b16 i.ok16{background:var(--ac)}
.sv7 .exh{flex-wrap:wrap}.sv7 .exh .t16{order:-1;width:100%!important;height:170px!important;border-radius:16px;margin:0 0 12px}.sv7 .exh .exn{flex:1}
.sv7 .s7{display:grid;gap:8px;margin-top:8px}
.sv7 .r7{display:grid;grid-template-columns:34px 1fr auto 44px;align-items:center;gap:6px;background:var(--glass);border-radius:999px;min-height:52px;padding:0 4px 0 6px}
.sv7 .r7 .num{color:var(--ink-2);font-weight:700}.sv7 .v7{display:flex;align-items:baseline;gap:3px}.sv7 .v7 input.cell{width:50px;min-height:40px;font-size:19px;font-weight:700}.sv7 .v7 span{color:var(--ink-2);font-size:13px}
.sv7 .g7{font-size:12.5px;color:var(--ink-2);white-space:nowrap}.sv7 .chk i{width:38px;height:38px;border-radius:50%;background:var(--glass-2);color:var(--ink-3);display:flex;align-items:center;justify-content:center}
.sv7 .r7.done{background:var(--done)}.sv7 .r7.done .chk i{background:var(--ac);color:#fff}.sv7 .r7.cur{box-shadow:inset 0 0 0 2px var(--ac)}

/* 8 StrongLifts — белая, красный, подходы кружками с повторами */
.sv8{--bg:#fff;--ink:#111;--ink-2:#7a7a7a;--ink-3:#d0d0d0;--glass:#f5f5f5;--glass-2:#ebebeb;--line:#eeeeee;--track:#ebebeb;--ac:#e5232b;--on-ac:#fff;--done:#fff;--amber:#d98200}
.sv8,.sv8 body{color-scheme:light}.sv8 .h16,.sv8 .s16 h3,.sv8 .s16 h4{font-family:"Helvetica Neue",system-ui;font-weight:800;font-style:normal}.sv8 .m16 .ok16{color:var(--ac)}.sv8 .b16 i.ok16{background:var(--ac)}.sv8 .t16{background:#f5f5f5}
.sv8 .x16 .t16{display:none}.sv8 .o8{display:flex;gap:5px;margin-top:6px}.sv8 .o8 i{width:28px;height:28px;border-radius:50%;background:#efefef;color:#9a9a9a;font:700 12px/28px -apple-system,system-ui;text-align:center;font-style:normal}
.sv8 .s8h{display:flex;align-items:baseline;gap:10px;margin:4px 0 6px;font-size:14px;color:var(--ink-2)}.sv8 .s8h b{margin-left:auto;color:var(--ink);font-size:16px}.sv8 .s8h small{font-size:12.5px}
.sv8 .s8{display:flex;gap:8px;overflow-x:auto;padding:4px 0 2px;scrollbar-width:none}
.sv8 .r8{flex:none;width:76px;display:flex;flex-direction:column;align-items:center;gap:4px}.sv8 .r8 .num{font-size:12px;color:var(--ink-2);font-weight:700;height:18px}
.sv8 .r8 .chk i{width:62px;height:62px;border-radius:50%;background:#efefef;color:#8a8a8a;font:800 17px/62px -apple-system,system-ui;text-align:center;font-style:normal;display:block}
.sv8 .r8.done .chk i{background:var(--ac);color:#fff;font-size:24px}.sv8 .r8.cur .chk i{box-shadow:inset 0 0 0 3px var(--ac);color:var(--ac)}.sv8 .r8.wu .chk i{width:50px;height:50px;line-height:50px;margin:6px}
.sv8 .f8{display:grid;grid-template-columns:1fr 1fr;gap:3px;width:100%}.sv8 .f8 input.cell{min-height:30px;font-size:14px;background:#f5f5f5;border-radius:6px;padding:0}

/* 9 Setgraph — тёмный, огромные цифры, оранжевый вес, зелёная кнопка; мини-график прошлых тренировок */
.sv9{--bg:#0b0b0d;--ink:#fff;--ink-2:#86868e;--ink-3:#3c3c42;--glass:#161618;--glass-2:#232327;--line:#1e1e22;--track:#232327;--ac:#30d158;--on-ac:#04210d;--done:#0b0b0d}
.sv9 .n16{color:#ff9f0a;font-size:54px}.sv9 .h16{font-size:40px}.sv9 .m16 .ok16{color:var(--ac)}.sv9 .b16 i.ok16{background:var(--ac)}.sv9 .x16 small{color:#ff9f0a}
.sv9 .g9w{margin:6px 0 8px}.sv9 .g9w>span{font-size:12px;color:var(--ink-2);text-transform:uppercase;letter-spacing:.06em}
.sv9 .g9b{display:flex;align-items:flex-end;gap:6px;height:66px;margin-top:4px}.sv9 .g9b i{flex:1;background:#2a2a2f;border-radius:4px 4px 2px 2px;position:relative}.sv9 .g9b i.l{background:#ff9f0a}
.sv9 .g9b b{position:absolute;top:-15px;left:0;right:0;text-align:center;font-size:10px;color:var(--ink-2);font-weight:600}
.sv9 .s9{display:grid;gap:2px}
.sv9 .r9{display:grid;grid-template-columns:30px 1fr auto 40px;align-items:center;gap:6px;min-height:44px;border-bottom:1px solid var(--line)}
.sv9 .r9 .num{color:var(--ink-2)}.sv9 .v9x{display:flex;align-items:baseline;gap:3px}.sv9 .v9x input.cell{width:44px;min-height:34px;font-size:18px;font-weight:700}.sv9 .v9x input[data-sk]{color:#ff9f0a}.sv9 .v9x span{font-size:12px;color:var(--ink-2);margin-right:6px}
.sv9 .g9{font-size:12.5px;color:var(--ink-2)}.sv9 .chk i{width:28px;height:28px;border-radius:50%;border:2px solid var(--ink-3);display:flex;align-items:center;justify-content:center;color:transparent}.sv9 .done .chk i{background:var(--ac);border-color:var(--ac);color:#04210d}
.sv9 .r9:not(.done):not(.cur){opacity:.55}
.sv9 .r9.cur{display:block!important;background:var(--glass);border:0;border-radius:18px;padding:12px 12px 12px;margin:6px 0}
.sv9 .t9{display:flex;align-items:baseline;gap:8px}.sv9 .t9 .num{width:auto;padding:0;font-size:15px;font-weight:700;color:var(--ink)}.sv9 .t9 span{font-size:13px;color:var(--ink-2)}
.sv9 .p9{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.sv9 .p9>div{position:relative;display:flex;align-items:center;background:var(--glass-2);border-radius:14px;height:76px}
.sv9 .p9 input.cell{flex:1;min-width:0;font:800 40px/1 -apple-system,"SF Pro Display",system-ui;letter-spacing:-.03em;min-height:70px}.sv9 .p9 input[data-sk]{color:#ff9f0a}
.sv9 .p9 small{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:11px;color:var(--ink-2)}.sv9 .st17{min-width:0;min-height:0;width:34px;height:76px;background:none;color:var(--ink-2);font-size:24px;padding:0}
.sv9 .r9.cur .chk{width:100%;height:52px;border-radius:14px;background:var(--ac);color:#04210d;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;gap:8px}.sv9 .r9.cur .chk i{border:0;background:none;color:#04210d;width:auto;height:auto}

/* 10 Gravl — чёрный, лайм, поля в рамках, текущий подход в жёлтой рамке, блины штанги */
.sv10{--bg:#070707;--ink:#fff;--ink-2:#8c8c8c;--ink-3:#3a3a3a;--glass:#141414;--glass-2:#1f1f1f;--line:#1c1c1c;--track:#1f1f1f;--ac:#d5ff3f;--on-ac:#0b0b0b;--done:#0f1405}
.sv10 .h16,.sv10 .s16 h3,.sv10 .s16 h4,.sv10 .exn{font-family:"Avenir Next Condensed","Arial Narrow",system-ui;font-weight:800;font-style:normal;text-transform:uppercase;letter-spacing:.01em}
.sv10 .cta16 .primary{border-radius:999px}.sv10 .m16 .ok16{color:var(--ac)}.sv10 .b16 i.ok16{background:var(--ac)}.sv10 .exn{font-size:22px}
.sv10 .set,.sv10 .shead{display:grid;grid-template-columns:34px minmax(0,1fr) 72px 62px 56px;gap:8px;align-items:center}
.sv10 .shead{font-size:11px;font-weight:800;color:var(--ink-2);letter-spacing:.08em;min-height:24px;text-align:center}.sv10 .shead span:nth-child(2){text-align:left}
.sv10 .set{min-height:54px}.sv10 .num{width:34px;height:42px;border:1.5px solid var(--ink-3);border-radius:10px;font-weight:800;color:var(--ink)}
.sv10 .tg{font-size:15px;color:var(--ink-2);text-align:left}.sv10 .tg small{display:block;font-size:11px;color:var(--ac);font-weight:700}
.sv10 input.cell{border:1.5px solid var(--ink-3);border-radius:10px;min-height:42px;font-size:19px;font-weight:700}
.sv10 .set.cur input.cell,.sv10 .set.cur .num{border-color:#ffd60a}.sv10 .set.done input.cell{border-color:transparent;background:var(--glass)}
.sv10 .chk{display:flex;align-items:center;justify-content:center;height:42px}.sv10 .chk>i{display:none}
.sv10 .br10{display:flex;align-items:center;gap:2px;height:42px;padding-left:6px;border-left:2px solid #6b6b6b}
.sv10 .pl{display:block;width:5px;border-radius:2px}.sv10 .p20{height:34px;background:#3b82f6}.sv10 .p15{height:30px;background:#f5c518}.sv10 .p10{height:26px;background:#22c55e}.sv10 .p5{height:20px;background:#e5e7eb}.sv10 .p25{height:16px;background:#ef4444}.sv10 .p0{height:8px;background:#444}
.sv10 .set.done .br10{display:none}.sv10 .set.done .chk>i{display:flex;width:34px;height:34px;border-radius:50%;background:var(--ac);color:#0b0b0b;align-items:center;justify-content:center}
`;
  document.head.appendChild(st);
}
