/* =========================================================
   Карта «Метр за метром»: Leaflet + MapLibre, векторные стили OpenFreeMap (без ключа)
   Интерфейс: init(el, opts) · setTheme(dark) · setProjects(list, onClick) · fit(points, fallback) · resize()
   ========================================================= */
window.MapProviders = (function () {
  "use strict";

  function pinEl(p) {
    const d = document.createElement("div");
    d.className = "mk mk--" + p.status;
    d.title = p.name;
    d.innerHTML = "<span></span>";
    return d;
  }
  function clusterEl(items) {
    const n = items.length, soon = items.filter((p) => p.status === "soon").length, sale = items.filter((p) => p.status === "sale").length;
    const d = document.createElement("div");
    d.className = "mkc";
    d.style.setProperty("--sale-end", Math.round((sale / n) * 100) + "%");
    d.style.setProperty("--soon-end", Math.round(((sale + soon) / n) * 100) + "%");
    d.innerHTML = `<b>${n}</b>`;
    return d;
  }

  // Более тёплые и насыщенные вода, парки и фон поверх стилей Positron / Dark
  const TWEAKS = {
    light: { background: "#F4F1EA", water: "#A9D1E7", park: "#D5E8C6", wood: "#CBE1BA", residential: "#EEEAE1", building: "#E4DDCF" },
    dark: { background: "#14171A", water: "#173241", park: "#1B2C22", wood: "#1A2A20", residential: "#181B1E", building: "#22262B" }
  };
  function tweakStyle(style, t) {
    style.layers.forEach((l) => {
      const id = l.id; l.paint = l.paint || {};
      if (l.type === "background") l.paint["background-color"] = t.background;
      else if (l.type === "fill") {
        if (/water/.test(id)) l.paint["fill-color"] = t.water;
        else if (/park/.test(id)) { l.paint["fill-color"] = t.park; l.paint["fill-opacity"] = 1; }
        else if (/wood|grass/.test(id)) { l.paint["fill-color"] = t.wood; l.paint["fill-opacity"] = 1; }
        else if (/residential/.test(id)) l.paint["fill-color"] = t.residential;
        else if (/^building/.test(id)) l.paint["fill-color"] = t.building;
      } else if (l.type === "line" && /water/.test(id)) l.paint["line-color"] = t.water;
    });
    return style;
  }

  function openfreemap(cfg) {
    const styles = {};
    let map, gl, cluster, dark;
    async function style(isDark) {
      const key = isDark ? "dark" : "light";
      if (!styles[key]) styles[key] = tweakStyle(await (await fetch(cfg[key])).json(), TWEAKS[key]);
      return styles[key];
    }
    return {
      name: "openfreemap",
      async init(el, o) {
        dark = o.dark;
        map = L.map(el, { zoomControl: false, minZoom: 3, maxZoom: 19 }).setView(o.center, o.zoom);
        L.control.zoom({ position: "bottomright" }).addTo(map);
        map.attributionControl.setPrefix(false);   // без «Leaflet» и флага
        gl = L.maplibreGL({ style: await style(dark), attribution: cfg.attribution }).addTo(map);
        // В тёмном стиле OpenFreeMap нет части иконок спрайта (например, circle-11) — подставляем пустую картинку без предупреждений
        const ml = gl.getMaplibreMap();
        ml.on("styleimagemissing", (e) => { if (!ml.hasImage(e.id)) ml.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) }); });
        cluster = L.markerClusterGroup({
          showCoverageOnHover: false, maxClusterRadius: 44,
          iconCreateFunction: (c) => L.divIcon({ className: "mk-wrap", html: clusterEl(c.getAllChildMarkers().map((m) => m.options.project)), iconSize: [44, 44] })
        });
        map.addLayer(cluster);
      },
      async setTheme(isDark) {
        if (isDark === dark || !gl) return; dark = isDark;
        gl.getMaplibreMap().setStyle(await style(dark));
      },
      setProjects(list, onClick) {
        cluster.clearLayers();
        list.forEach((p) => {
          const m = L.marker([p.lat, p.lng], { project: p, title: p.name, icon: L.divIcon({ className: "mk-wrap", html: pinEl(p), iconSize: [30, 38], iconAnchor: [15, 36] }) });
          m.on("click", () => onClick(p));
          cluster.addLayer(m);
        });
      },
      fit(points, fallback) {
        if (points.length) map.fitBounds(points, { padding: [44, 44], maxZoom: 13 });
        else map.setView(fallback.center, fallback.zoom);
      },
      resize() { setTimeout(() => map.invalidateSize(), 50); }
    };
  }

  async function create(el, cfg, opts) {
    const p = openfreemap(cfg);
    await p.init(el, opts);
    return p;
  }
  return { create };
})();
