/* Карта 7.2: автокопия данных в закрытый репозиторий GitHub. Без DOM: запрос передаётся снаружи (fetch).
   Образец — TiddlyWiki5 core/modules/savers/github.js: GET содержимого за sha → PUT /repos/<репо>/contents/<файл> (research/r34).
   Каждая копия — коммит: прошлые версии файла остаются в истории репозитория.
   Наше: копия с меньшим числом тренировок, чем уже лежит, не пишется (после чистки телефона пустое приложение не затрёт историю). */
const Backup = (() => {
  const API = 'https://api.github.com', REPO = 'denisv711-a11y/fit-data', PATH = 'fit.json', DAY = 864e5;
  const enc = (text) => { const b = new TextEncoder().encode(text); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };
  const dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(String(b64 || '').replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const head = (c, raw) => ({ Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', Authorization: 'Bearer ' + c.token, 'X-GitHub-Api-Version': '2022-11-28' });
  const url = (c) => `${API}/repos/${c.repo || REPO}/contents/${c.path || PATH}`;
  const count = (s) => (s && Array.isArray(s.sessions) ? s.sessions.length : 0);
  // отпечаток состояния: изменилось ли что-то с прошлой копии
  const sig = (text) => { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0; return text.length + ':' + (h >>> 0); };
  const fail = (r) => ({ ok: false, err: r.status === 401 ? 'key' : r.status === 403 || r.status === 404 ? 'access' : 'http', code: r.status });

  async function remote(fetch, c) {
    const r = await fetch(url(c), { headers: head(c), cache: 'no-store' });
    if (r.status === 404) return { sha: '', n: 0 }; // файла ещё нет (или ключ не видит репозиторий — это покажет PUT)
    if (!r.ok) return fail(r);
    const j = await r.json(); let n = null;
    try { if (j.content) n = count(JSON.parse(dec(j.content))); } catch (e) { /* файл больше 1 МБ или не наш — счёт неизвестен */ }
    return { sha: j.sha, n };
  }
  // S → файл. force — писать, даже если в копии тренировок больше
  async function save(fetch, c, S, now = Date.now(), force = false) {
    if (!c || !c.token) return { ok: false, err: 'nokey' };
    const text = JSON.stringify(S, null, 1);
    try {
      for (let i = 0; i < 2; i++) {
        const rm = await remote(fetch, c); if (rm.err) return rm;
        if (!force && rm.n != null && rm.n > count(S)) return { ok: false, err: 'older', n: rm.n };
        const body = { message: 'копия ' + new Date(now).toISOString().slice(0, 16).replace('T', ' '), content: enc(text) }; if (rm.sha) body.sha = rm.sha;
        const r = await fetch(url(c), { method: 'PUT', headers: { ...head(c), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) return { ok: true, at: now, sig: sig(text), n: count(S) };
        if (r.status !== 409 || i) return fail(r); // 409 — файл поменяли между GET и PUT: один повтор
      }
    } catch (e) { return { ok: false, err: 'net' }; }
  }
  async function load(fetch, c) {
    if (!c || !c.token) return { ok: false, err: 'nokey' };
    try {
      const r = await fetch(url(c), { headers: head(c, true), cache: 'no-store' });
      if (r.status === 404) return { ok: false, err: 'empty' };
      if (!r.ok) return fail(r);
      const t = await r.text(); let S = null; try { S = JSON.parse(t); } catch (e) { /* не JSON */ }
      if (!S || !S.program || !Array.isArray(S.sessions)) return { ok: false, err: 'bad' };
      return { ok: true, S, n: count(S) };
    } catch (e) { return { ok: false, err: 'net' }; }
  }
  // пора ли копировать при открытии: есть ключ, данные менялись, прошлая удачная копия старше 20 часов
  const due = (meta, text, now = Date.now()) => !meta || !meta.at || (meta.sig !== sig(text) && now - meta.at > 20 * 36e5);
  const ERR = {
    key: 'ключ не подошёл или истёк — создай новый и вставь сюда', access: 'ключ не видит репозиторий fit-data — выдай ему доступ «Contents: Read and write»',
    http: 'GitHub ответил ошибкой', net: 'нет сети — повторю при следующем открытии', older: 'в копии тренировок больше, чем в телефоне — сначала «Восстановить»',
    empty: 'копии ещё нет', bad: 'файл копии не читается', nokey: 'нет ключа',
  };
  const when = (at, now) => { const d = new Date(at), days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / DAY), hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return (days <= 0 ? 'сегодня' : days === 1 ? 'вчера' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })) + ', ' + hm; };
  // строка для «Я», флаг и причина (why) плашки на «Сегодня»: тревога — копия не проходит (кроме сети) или её нет 7 дней при изменённых данных
  function status(hasKey, meta, text, now = Date.now()) {
    if (!hasKey) return { text: 'Выключена. Данные живут только в этом телефоне.', warn: false };
    const why = (e) => (ERR[e] || ERR.http).split(' — ')[0]; // коротко для плашки на «Сегодня»
    const m = meta || {}, last = m.at ? 'Последняя копия: ' + when(m.at, now) + (m.n != null ? ' · тренировок: ' + m.n : '') : 'Копии ещё не было';
    const stale = !!m.at && m.sig !== sig(text) && now - m.at > 7 * DAY;
    if (m.err) return { text: `Не скопировано: ${ERR[m.err] || ERR.http}${m.code ? ' (' + m.code + ')' : ''}. ${last}.`, warn: m.err !== 'net' || stale, why: m.err === 'net' ? 'копии нет больше недели' : why(m.err) };
    return { text: last + '.', warn: stale, why: 'копии нет больше недели' };
  }
  return { REPO, PATH, enc, dec, sig, save, load, due, status, ERR };
})();
if (typeof module !== 'undefined') module.exports = Backup;
