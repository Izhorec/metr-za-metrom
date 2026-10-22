/* =========================================================
   «Хочу следить»: мягкая подписка на проект
   - В Telegram с бэкендом: requestWriteAccess → POST /api/follow (initData проверяет Worker)
   - В Telegram без бэкенда (сейчас): готовое сообщение Максиму, отметка локально
   - В браузере: «Открыть в Telegram» по ссылке ?startapp=p-<id>
   ========================================================= */
window.Follow = (function () {
  "use strict";
  const CFG = window.APP_CONFIG;
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTelegram = !!(tg && tg.initData);
  const KEY = "mzm-follow";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mode = () => (!inTelegram ? "browser" : CFG.followEndpoint ? "live" : "fallback");
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const track = (g, p) => { try { window.Analytics && window.Analytics.goal(g, p); } catch (e) {} };
  const haptic = (t) => { try { inTelegram && tg.HapticFeedback.notificationOccurred(t); } catch (e) {} };
  const toast = (m) => window.__toast && window.__toast(m);
  function openTg(url) { if (inTelegram) tg.openTelegramLink(url); else window.open(url, "_blank", "noopener"); }

  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function api(path, body) {
    return fetch(CFG.followEndpoint.replace(/\/$/, "") + path, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ initData: tg.initData }, body || {}))
    }).then((r) => r.json().then((j) => { if (!r.ok || !j.ok) throw new Error(j.error || r.status); return j; }));
  }

  function html(p) {
    const on = !!store[p.id], m = mode();
    if (!on) {
      const btn = "Хочу отслеживать";
      const hint = m === "browser"
        ? "Подписка работает в Telegram: откроем карту в боте @" + esc(CFG.botUsername) + ", там один тап."
        : "Напишем в Telegram, когда появится разрешение на строительство, старт продаж, цены или новые рендеры. Без звонков и спама.";
      return `<section class="follow" data-id="${esc(p.id)}"><button class="follow__btn" data-act="follow">${BELL}<span>${btn}</span></button><p class="follow__hint">${hint}</p></section>`;
    }
    const sub = m === "fallback"
      ? "Сообщение Максиму открыто в чате — отправьте его, и он напишет, когда будут новости."
      : "Напишем в @" + esc(CFG.botUsername) + ", как только появятся новости.";
    const phone = m === "live" && !store[p.id].phone && tg.requestContact ? `<button class="link" data-act="phone">Оставить номер для звонка — по желанию</button>` : "";
    return `<section class="follow on" data-id="${esc(p.id)}">
      <div class="follow__ok">${CHECK}<div><b>Вы следите за проектом</b><span>${sub}</span></div></div>
      <div class="follow__row">${phone}<button class="link muted" data-act="unfollow">Не следить</button></div>
      <p class="follow__privacy">Мы видим только ваше имя и @username в Telegram. Номер телефона не нужен. Отписаться можно здесь в один тап или командой /stop в боте.</p>
    </section>`;
  }

  function rerender(p) {
    const el = document.querySelector(`.follow[data-id="${CSS.escape(p.id)}"]`);
    if (!el) return;
    el.outerHTML = html(p);
    bind(p);
  }
  function mark(p, extra) { store[p.id] = Object.assign({ since: new Date().toISOString().slice(0, 10) }, extra || {}); save(); rerender(p); }

  function follow(p) {
    const m = mode();
    track("follow_click", { id: p.id, mode: m });
    if (m === "browser") return openTg(CFG.startAppLink + "p-" + encodeURIComponent(p.id));
    if (m === "fallback") {
      const text = (CFG.followFallbackText || "").replace("{name}", p.name);
      openTg(`https://t.me/${CFG.managerTelegram}?text=${encodeURIComponent(text)}`);
      haptic("success"); return mark(p, { mode: "fallback" });
    }
    const go = () => api("/api/follow", { projectId: p.id, projectName: p.name, action: "follow" })
      .then(() => { haptic("success"); mark(p); track("follow_ok", { id: p.id }); toast("Готово, будем держать в курсе"); })
      .catch(() => toast("Не получилось, попробуйте ещё раз чуть позже"));
    const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.allows_write_to_pm) return go();
    if (tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) {
      tg.requestWriteAccess((granted) => {
        if (granted) return go();
        track("follow_declined", { id: p.id });
        toast("Без разрешения бот не сможет написать. Можно включить позже");
      });
    } else go();
  }
  function unfollow(p) {
    track("unfollow", { id: p.id });
    const done = () => { delete store[p.id]; save(); rerender(p); toast("Больше не следите за проектом"); };
    if (mode() === "live") api("/api/follow", { projectId: p.id, action: "unfollow" }).then(done).catch(() => toast("Не получилось, попробуйте позже"));
    else done();
  }
  function phone(p) {
    tg.requestContact((shared) => {
      track("phone_" + (shared ? "shared" : "declined"), { id: p.id });
      if (shared) { store[p.id].phone = 1; save(); rerender(p); toast("Спасибо! Максим позвонит только по делу"); }
    });
  }
  function bind(p) {
    const el = document.querySelector(`.follow[data-id="${CSS.escape(p.id)}"]`);
    if (!el) return;
    el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      ({ follow, unfollow, phone })[b.dataset.act](p);
    }));
  }
  // Восстановить подписки с сервера (если бэкенд подключён)
  function sync() {
    if (mode() !== "live") return Promise.resolve();
    return api("/api/follows").then((j) => {
      store = {}; (j.projects || []).forEach((id) => { store[id] = { since: "" }; }); save();
    }).catch(() => {});
  }
  return { html, bind, sync, mode, isOn: (id) => !!store[id], _store: () => store };
})();
