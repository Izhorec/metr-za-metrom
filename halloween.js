/* Хеллоуин: тема только 31 октября по Москве; превью — ?halloween=1 */
(function () {
  "use strict";
  var on = false;
  try {
    var q = new URLSearchParams(location.search).get("halloween");
    if (q === "1") on = true;
    else if (q !== "0") {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      var m = "", d = "";
      parts.forEach(function (p) { if (p.type === "month") m = p.value; if (p.type === "day") d = p.value; });
      on = m === "10" && d === "31";
    }
  } catch (e) { on = false; }
  if (!on) return;
  document.documentElement.classList.add("halloween");
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "halloween.css?v=20261028h";
  document.head.appendChild(css);
  function swap() {
    var brand = document.querySelector(".top .brand");
    if (!brand || brand.querySelector(".hw-logo")) return;
    var img = document.createElement("img");
    img.className = "hw-logo"; img.alt = "Метр за метром";
    img.src = "logo/halloween/metr-za-metrom-halloween-B-neon-horizontal.svg";
    brand.appendChild(img);
    var top = document.querySelector(".top");
    if (top && !top.querySelector(".hw-sky")) {
      var sky = document.createElement("div");
      sky.className = "hw-sky"; sky.setAttribute("aria-hidden", "true");
      var bat = '<svg viewBox="0 0 40 16"><path d="M20 5c1-2 2-2 2-2l.6 2c3-3 8-3 12-1-2 0-4 2-4 4-2-1-4 0-5 2-1-1-3-1-5 0-2-1-4-1-5 0-1-2-3-3-5-2 0-2-2-4-4-4 4-2 9-2 12 1l.6-2s1 0 2 2z" fill="currentColor"/></svg>';
      sky.innerHTML = '<i class="hw-moon"></i><i class="hw-bat b1">' + bat + '</i><i class="hw-bat b2">' + bat + '</i><i class="hw-bat b3">' + bat + '</i>';
      top.insertBefore(sky, top.firstChild);
    }
    var ic = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (ic) ic.href = "logo/halloween/metr-za-metrom-halloween-B-neon-icon-512.svg";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", swap); else swap();
})();
