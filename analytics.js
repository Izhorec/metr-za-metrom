/* Яндекс Метрика — включается, только если в config.js задан METRIKA_ID */
(function () {
  var id = Number((window.APP_CONFIG || {}).METRIKA_ID) || 0;
  var noop = function () {};
  window.Analytics = { id: id, goal: noop };
  if (!id) return;
  try {
    // Официальный сниппет tag.js
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; k.onerror = noop;
      a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=" + id, "ym");

    var tg = window.Telegram && window.Telegram.WebApp;
    var inTg = !!(tg && tg.initData);
    var params = { in_telegram: inTg ? "yes" : "no" };
    if (tg && tg.platform) params.tg_platform = tg.platform;
    if (tg && tg.version) params.tg_version = tg.version;

    window.ym(id, "init", { ssr: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, referrer: document.referrer, url: location.href, params: params });
    window.Analytics.goal = function (name, p) { try { window.ym(id, "reachGoal", name, p || {}); } catch (e) {} };
  } catch (e) {}
})();
