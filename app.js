(function () {
  "use strict";
  const CFG = window.APP_CONFIG;
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTelegram = !!(tg && tg.initData);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STATUS_LABEL = { announce: "Анонс", soon: "Скоро старт", sale: "Старт продаж" };
  const fmtDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${m[3]}.${m[2]}.${m[1]}` : (s || ""); };
  function priceBlock(p) {
    if (p.status !== "sale") return "";
    const pr = p.prices;
    const has = pr && (pr.from || pr.perM2 || (pr.items || []).some((i) => i && i.value));
    const asOf = pr && /^\d{4}-\d{2}-\d{2}/.test(pr.asOf || "") ? new Date(pr.asOf.slice(0, 10) + "T00:00:00") : null;
    const stale = !asOf || (Date.now() - asOf.getTime()) > 30 * 864e5;
    if (!has || stale) return `<section class="price"><div class="price__head"><span class="price__from">Цена под запрос</span></div></section>`;
    const rows = (pr.items || []).filter((i) => i && i.value).map((i) => `<dt>${esc(i.label)}</dt><dd>${esc(i.value)}</dd>`).join("");
    return `<section class="price"><div class="price__head">${pr.from ? `<span class="price__from">${esc(pr.from)}</span>` : ""}${pr.perM2 ? `<span class="price__m2">${esc(pr.perM2)}</span>` : ""}</div>${rows ? `<dl class="price__rows">${rows}</dl>` : ""}${pr.note ? `<div class="price__date">${esc(pr.note)}</div>` : ""}</section>`;
  }
  /* ---------- «Старт продаж»: месяц на карте с даты saleSince ---------- */
  const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  // saleSince + 1 календарный месяц (31.01 → 28/29.02); null, если даты нет
  function saleUntil(p) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.saleSince || "");
    if (p.status !== "sale" || !m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const last = new Date(y, mo + 1, 0).getDate();
    return new Date(y, mo, Math.min(d, last));
  }
  // Объект виден по дату saleUntil включительно, со следующего дня скрывается
  function saleExpired(p) {
    const u = saleUntil(p); if (!u) return false;
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today > u;
  }
  function saleNotice(p) {
    const u = saleUntil(p); if (!u) return "";
    return `<div class="sale-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div><b>На карте до ${u.getDate()} ${MONTHS_GEN[u.getMonth()]}.</b> Потом этот объект можно будет найти только в личных сообщениях</div></div>`;
  }
  const SALE_FOOTNOTE = "Объекты в статусе «Старт продаж» держатся на карте месяц, дальше — только в личных сообщениях";
  const state = { city: CFG.defaultCity, cls: "all", status: "all", q: "", view: "map", projects: [], current: null };

  /* ---------- Тема: Авто / Светлая / Тёмная ---------- */
  const THEME_KEY = "mzm-theme";
  const THEME_LABEL = { auto: "Авто", light: "Светлая", dark: "Тёмная" };
  const ICONS = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
  };
  let themePref = "auto";
  try { themePref = localStorage.getItem(THEME_KEY) || "auto"; } catch (e) {}
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function systemDark() {
    if (inTelegram && tg.colorScheme) return tg.colorScheme === "dark";
    return !!(mq && mq.matches);
  }
  function isDark() { return themePref === "dark" || (themePref === "auto" && systemDark()); }
  let provider = null;
  function applyTheme() {
    const dark = isDark();
    document.documentElement.classList.toggle("dark", dark);
    $("#themeBtn").innerHTML = ICONS[themePref] + `<span>${THEME_LABEL[themePref]}</span>`;
    if (provider) provider.setTheme(dark);
    if (inTelegram) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch (e) {}
    }
  }
  $("#themeBtn").addEventListener("click", () => {
    themePref = { auto: "light", light: "dark", dark: "auto" }[themePref];
    try { localStorage.setItem(THEME_KEY, themePref); } catch (e) {}
    haptic("light"); applyTheme(); toast(`Тема: ${THEME_LABEL[themePref]}`);
  });
  if (mq) (mq.addEventListener ? mq.addEventListener("change", applyTheme) : mq.addListener(applyTheme));

  /* ---------- Аналитика (analytics.js) ---------- */
  function track(goal, params) { try { window.Analytics && window.Analytics.goal(goal, params); } catch (e) {} }

  /* ---------- Telegram ---------- */
  function haptic(t) { try { if (inTelegram) tg.HapticFeedback.impactOccurred(t || "light"); } catch (e) {} }
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (e) {}
    if (inTelegram) {
      tg.onEvent("themeChanged", applyTheme);
      tg.BackButton.onClick(closeSheet);
      tg.MainButton.onClick(() => state.current && handleLead(state.current));
    }
  }

  /* ---------- Карта (OpenFreeMap, см. map-providers.js) ---------- */
  applyTheme();
  const mapReady = window.MapProviders.create(document.getElementById("map"), CFG.map,
    { center: CFG.cities[state.city].center, zoom: CFG.cities[state.city].zoom, dark: isDark() })
    .then((p) => { provider = p; document.documentElement.dataset.map = p.name; return p; });

  /* ---------- Фильтры ---------- */
  const inCity = (p) => p.city === state.city || (CFG.cities[state.city].regions || []).includes(p.region);
  function filtered() {
    const q = state.q.trim().toLowerCase();
    return state.projects.filter((p) =>
      inCity(p) &&
      (state.cls === "all" || p.class === state.cls) &&
      (state.status === "all" || p.status === state.status) &&
      (!q || [p.name, p.developer, districtText(p), p.address].join(" ").toLowerCase().includes(q)));
  }
  function plural(n, f) { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2]; }

  const PH_SVG = '<svg viewBox="0 0 512 512"><path d="M150 404V196l60-40v-36h44v36l108 0v248z" fill="none" stroke="currentColor" stroke-width="26" stroke-linejoin="round"/></svg>';
  const placeholder = () => `<div class="ph">${PH_SVG}<span>Визуализации появятся позже</span></div>`;
  // Для области к району добавляется регион: «Одинцовский г.о., Подмосковье»
  const REGION_SUFFIX = { lo: "Ленобласть", mo: "Подмосковье" };
  const districtText = (p) => {
    const r = REGION_SUFFIX[p.region];
    return r ? (p.district ? `${p.district}, ${r}` : r) : p.district;
  };
  const classText = (p) => p.classLabel ? (p.class && p.classLabel.toLowerCase().indexOf(p.class) === -1 ? `${p.class} · ${p.classLabel}` : p.classLabel) : p.class;

  function tagsHtml(p) {
    return `<div class="tags"><span class="tag st st-${esc(p.status)}">${esc(STATUS_LABEL[p.status] || "")}</span>${classText(p) ? `<span class="tag">${esc(classText(p))}</span>` : ""}${districtText(p) ? `<span class="tag">${esc(districtText(p))}</span>` : ""}</div>`;
  }

  function render() {
    const items = filtered();
    if (provider) provider.setProjects(items.filter((p) => typeof p.lat === "number"), openSheet);
    $("#counter").textContent = `${CFG.cities[state.city].short} · ${items.length} ${plural(items.length, ["проект", "проекта", "проектов"])}`;
    const el = $("#list");
    el.innerHTML = items.length ? items.map((p) => `
      <div class="item" data-id="${esc(p.id)}">
        <div class="thumb">${p.images && p.images.length ? `<img src="${esc(p.images[0])}" alt="" loading="lazy">` : placeholder()}</div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <div class="dev">${esc(p.developer || "Застройщик не объявлен")}</div>
          ${tagsHtml(p)}
          ${p.salesStart ? `<div class="meta">Старт: ${esc(p.salesStart)}</div>` : ""}
        </div>
      </div>`).join("") + (state.status !== "sale" && items.some((p) => p.status === "sale") ? `<div class="list-note"><i class="dot dot--sale"></i>${SALE_FOOTNOTE}</div>` : "") : `<div class="empty">Ничего не найдено.<br>Измените фильтры.</div>`;
    el.querySelectorAll(".item").forEach((c) => c.addEventListener("click", () => openSheet(state.projects.find((x) => x.id === c.dataset.id))));
  }
  function fitCity() {
    if (!provider) return;
    const pts = state.projects.filter((p) => inCity(p) && typeof p.lat === "number").map((p) => [p.lat, p.lng]);
    provider.fit(pts, CFG.cities[state.city]);
  }

  /* ---------- Карточка ---------- */
  const fact = (k, v, wide) => `<div class="fact${wide ? " wide" : ""}"><div class="k">${k}</div><div class="v">${esc(v || "—")}</div></div>`;
  function openSheet(p) {
    if (!p) return;
    state.current = p; haptic("light");
    track("card_open", { id: p.id, name: p.name, city: p.city || state.city, status: p.status });
    let swiped = false;
    const imgs = p.images || [];
    const gallery = imgs.length
      ? `<div class="gallery"><div class="slides">${imgs.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.name)} — визуализация ${i + 1}" ${i ? 'loading="lazy"' : ""}>`).join("")}</div>${imgs.length > 1 ? `<div class="dots">${imgs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}</div>`
      : `<div class="gallery">${placeholder()}</div>`;
    $("#sheetContent").innerHTML = `${gallery}
      <div class="inner">
        <h2>${esc(p.name)}</h2>
        <div class="dev">${esc(p.developer || "Застройщик не объявлен")}</div>
        ${tagsHtml(p)}
        ${saleNotice(p)}
        <div class="facts">
          ${fact("Район", districtText(p))}${fact("Класс", classText(p))}
          ${fact("Старт продаж", p.salesStart)}${fact("Сдача", p.completion)}
          ${fact("Адрес", p.address, true)}
        </div>
        ${priceBlock(p)}
        <p class="desc">${esc(p.description || "")}</p>
        ${inTelegram ? "" : `<button class="cta" id="ctaBtn">Хочу расчёт</button>`}
        <button class="ghost" id="closeBtn">Закрыть</button>
      </div>`;
    const slides = $("#sheetContent .slides");
    if (slides && imgs.length > 1) slides.addEventListener("scroll", () => {
      const i = Math.round(slides.scrollLeft / slides.clientWidth);
      if (!swiped && i > 0) { swiped = true; track("render_swipe", { id: p.id }); }
      $("#sheetContent .dots").querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i));
    }, { passive: true });
    const cta = $("#ctaBtn"); if (cta) cta.addEventListener("click", () => handleLead(p));
    $("#closeBtn").addEventListener("click", closeSheet);
    $("#sheet").scrollTop = 0;
    $("#sheet").classList.add("open"); $("#sheet").setAttribute("aria-hidden", "false");
    $("#sheetBackdrop").classList.remove("hidden");
    if (inTelegram) {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      tg.BackButton.show();
      tg.MainButton.setParams({ text: "Хочу расчёт", is_visible: true, is_active: true, color: accent });
    }
  }
  function closeSheet() {
    state.current = null;
    $("#sheet").classList.remove("open"); $("#sheet").setAttribute("aria-hidden", "true");
    $("#sheetBackdrop").classList.add("hidden");
    if (inTelegram) { tg.BackButton.hide(); tg.MainButton.hide(); }
  }
  $("#sheetBackdrop").addEventListener("click", closeSheet);

  /* ---------- «Хочу расчёт» ---------- */
  function openTg(url) { if (inTelegram) tg.openTelegramLink(url); else window.open(url, "_blank", "noopener"); }
  function handleLead(p) {
    haptic("medium");
    track("lead_click", { id: p.id, name: p.name });
    const text = (CFG.leadTextTemplate || "Здравствуйте! Хочу расчёт по ЖК {name}").replace("{name}", p.name);
    if (CFG.leadMode === "manager" && CFG.managerTelegram) {
      openTg(`https://t.me/${CFG.managerTelegram}?text=${encodeURIComponent(text)}`);
      return toast("Открываю чат с менеджером");
    }
    if (CFG.leadMode === "bot" && CFG.botUsername) {
      openTg(`https://t.me/${CFG.botUsername}?start=calc_${encodeURIComponent(p.id)}`);
      return toast("Открываю бота");
    }
    toast("Заявка принята (демо-режим)");
  }
  let tt;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); }

  /* ---------- Управление ---------- */
  function bind(sel, attr, cb) {
    const btns = document.querySelectorAll(`${sel} [data-${attr}]`);
    btns.forEach((b) => b.addEventListener("click", () => { btns.forEach((x) => x.classList.toggle("active", x === b)); haptic("light"); cb(b.dataset[attr]); }));
  }
  bind("#citySeg", "city", (c) => { track("city_switch", { city: c }); state.city = c; closeSheet(); render(); fitCity(); });
  bind("#statusChips", "status", (v) => { track("filter_status", { status: v }); state.status = v; $("#saleHint").classList.toggle("hidden", v !== "sale"); render(); });
  bind("#statusChips", "class", (v) => { state.cls = v; render(); });
  bind("#viewSeg", "view", (v) => { if (v === "list") track("list_view"); state.view = v; $("#list").classList.toggle("hidden", v !== "list"); if (v === "map" && provider) provider.resize(); });
  $("#search").addEventListener("input", (e) => {
    state.q = e.target.value; render();
    clearTimeout(searchT); const q = state.q.trim();
    if (q) searchT = setTimeout(() => track("search", { q: q.slice(0, 50) }), 1200);
  });
  let searchT;

  fetch("data/projects.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { state.projects = (d.projects || []).filter((p) => STATUS_LABEL[p.status] && !saleExpired(p)); return mapReady; })
    .then(() => { render(); fitCity(); })
    .catch((e) => { console.error("Не удалось загрузить projects.json", e); toast("Не удалось загрузить данные"); });

  window.__app = { state, openSheet, closeSheet, handleLead, saleUntil, saleExpired, get provider() { return provider; } };
})();
