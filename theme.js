/* v106 (23.10, Денис: «чтоб я цвета мог менять — заливку и зелёные, по 3 варианта, поиграть»): перекраска всего приложения одним проходом.
   Цвета в коде — палитра морской волны (#14B8A6 = Tailwind teal-500). Тема меняет у цветных оттенков тон (hue), светлота та же — поэтому
   все переходы, свечения и дуги остаются как были. Тёмные подложки (почти серые, «хрома» < 0,1) красит фон: Глубина — в тон акцента,
   Чёрный и Графит — в чистый серый. Варианты — системные цвета Apple, тёмная тема (HIG): systemBlue #0A84FF, systemIndigo #5E5CE6,
   systemOrange #FF9F0A; фон systemBackground #000000 и secondarySystemBackground #1C1C1E.
   CSS: app.css перекрашивается текстом в <style>, копия в localStorage — без вспышки зелёного при открытии.
   Разметка: MutationObserver перекрашивает fill/stroke/stop-color/style у всего, что вставил render. */
const Theme = (() => {
  const ACC = [['sea', 'Волна', null], ['blue', 'Синий', 210], ['indigo', 'Индиго', 241], ['orange', 'Оранжевый', 36]];
  const BG = [['deep', 'Глубина'], ['black', 'Чёрный'], ['graphite', 'Графит']];
  const KEY = 'fit.theme', CSSKEY = 'fit.themecss';
  let cur = { acc: 'sea', bg: 'deep' }, memo = new Map(), obs = null;
  try { Object.assign(cur, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const plain = () => cur.acc === 'sea' && cur.bg === 'deep';
  const hue = () => (ACC.find((a) => a[0] === cur.acc) || ACC[0])[2];

  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l, 0];
    const s = d / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l, d];
  }
  function rgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255));
  }
  function tone(r, g, b) { // один цвет палитры → цвет темы
    const [h, s, l, ch] = hsl(r, g, b);
    if (h < 150 || h > 200 || s < 0.06) return [r, g, b]; // белое, серое, красное, золото — не наше
    if (ch < 0.1) { // тёмная подложка
      if (cur.bg === 'black') return rgb(0, 0, l * 0.45);
      if (cur.bg === 'graphite') return rgb(240, 0.04, Math.min(0.32, l + 0.055));
      return hue() == null ? [r, g, b] : rgb(hue(), s, l);
    }
    return hue() == null ? [r, g, b] : rgb(hue(), s, l);
  }
  const hex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  function paint(str) {
    if (plain() || !str) return str;
    return str.replace(/#([0-9a-f]{6})([0-9a-f]{2})?\b/gi, (m, h6, al) => {
      const k = h6.toLowerCase(); if (!memo.has(k)) memo.set(k, hex(tone(parseInt(k.slice(0, 2), 16), parseInt(k.slice(2, 4), 16), parseInt(k.slice(4), 16))));
      return memo.get(k) + (al || '');
    }).replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g, (m, r, g, b) => m.slice(0, m.indexOf('(') + 1) + tone(+r, +g, +b).join(','));
  }
  const ATTR = ['fill', 'stroke', 'stop-color', 'style', 'flood-color', 'color'];
  function walk(root) {
    if (plain() || root.nodeType !== 1) return;
    const one = (el) => { if (el.hasAttribute("data-raw")) return; for (const a of ATTR) { const v = el.getAttribute(a); if (v && (v.includes('#') || v.includes('rgb'))) { const p = paint(v); if (p !== v) el.setAttribute(a, p); } } };
    one(root); root.querySelectorAll('[fill],[stroke],[stop-color],[style],[flood-color],[color]').forEach(one);
  }
  function css(text) { // перекрашенный app.css вместо исходного
    const link = document.querySelector('link[href="app.css"]'); let st = document.getElementById('theme-css');
    if (plain()) { if (st) st.remove(); if (link) link.disabled = false; return; }
    if (!st) { st = document.createElement('style'); st.id = 'theme-css'; document.head.appendChild(st); }
    st.textContent = text; if (link) link.disabled = true;
  }
  function apply() {
    memo = new Map();
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = paint('#071216');
    if (plain()) { css(); try { localStorage.removeItem(CSSKEY); } catch (e) {} } else {
      try { const c = JSON.parse(localStorage.getItem(CSSKEY) || 'null'); if (c && c.k === JSON.stringify(cur)) css(c.t); } catch (e) {}
      fetch('app.css').then((r) => r.text()).then((t) => { const p = paint(t); css(p); try { localStorage.setItem(CSSKEY, JSON.stringify({ k: JSON.stringify(cur), t: p })); } catch (e) {} });
    }
    if (!obs && !plain()) { obs = new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(walk); }); obs.observe(document.documentElement, { childList: true, subtree: true }); }
    if (document.body) walk(document.body);
  }
  function set(k, v) {
    cur[k] = v; try { localStorage.setItem(KEY, JSON.stringify(cur)); localStorage.removeItem(CSSKEY); } catch (e) {}
    location.reload(); // разметка уже перекрашена прошлой темой — заново от исходных цветов
  }
  apply();
  return { ACC, BG, get: () => ({ ...cur }), set, paint };
})();
