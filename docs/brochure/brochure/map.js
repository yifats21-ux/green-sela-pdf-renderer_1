/* ===========================================================
   מפת המסלול — Leaflet עם נקודות ממוספרות
   =========================================================== */
(function () {
  // נקודות הטיול — ממוספרות לפי סדר הביקור (יום אחר יום)
  const POINTS = [
    { n: 1,  name: "קתדרלת סטפנוס הקדוש", lat: 48.2085, lng: 16.3735, scope: "city" },
    { n: 2,  name: "גראבן וקרנטנרשטראסה", lat: 48.2089, lng: 16.3702, scope: "city" },
    { n: 3,  name: "ארמון הופבורג",        lat: 48.2065, lng: 16.3657, scope: "city" },
    { n: 4,  name: "קפה סנטרל",            lat: 48.2103, lng: 16.3658, scope: "city" },
    { n: 5,  name: "ארמון שנברון",         lat: 48.1845, lng: 16.3120, scope: "city" },
    { n: 6,  name: "שוק נאשמרקט",          lat: 48.1985, lng: 16.3640, scope: "city" },
    { n: 7,  name: "מריההילפר שטראסה",     lat: 48.1972, lng: 16.3490, scope: "city" },
    { n: 8,  name: "פראטר — הגלגל הענק",   lat: 48.2166, lng: 16.3958, scope: "city" },
    { n: 9,  name: "שמורת הוהה ואנד",       lat: 47.8340, lng: 16.0470, scope: "region" },
    { n: 10, name: "מערת זגרות",            lat: 48.0556, lng: 16.2640, scope: "region" },
    { n: 11, name: "זמרינג — הירשקוגל",     lat: 47.6295, lng: 15.8260, scope: "region" },
  ];

  const TILES = {
    vienna: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    navy:   "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  };
  const ATTR = '&copy; OpenStreetMap &copy; CARTO';

  function numIcon(n) {
    return L.divIcon({
      className: "",
      html: `<div class="num-marker"><span>${n}</span></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 24],
    });
  }

  function viennaLabel() {
    return L.divIcon({
      className: "",
      html: `<div style="font-family:var(--serif);font-weight:800;font-size:14px;color:var(--ink);
             background:var(--card);border:1px solid var(--line-2);padding:2px 9px;border-radius:2px;
             white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">וינה</div>`,
      iconSize: [50, 22],
      iconAnchor: [25, 11],
    });
  }

  const maps = {};
  let tileLayers = {};

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "navy" ? "navy" : "vienna";
  }

  function build() {
    const theme = currentTheme();

    // ---- מפת מרכז וינה (נקודות 1–8) ----
    const cityEl = document.getElementById("map-city");
    if (cityEl && !maps.city) {
      const m = L.map(cityEl, {
        zoomControl: true, scrollWheelZoom: false, attributionControl: true,
      });
      maps.city = m;
      tileLayers.city = L.tileLayer(TILES[theme], { attribution: ATTR, maxZoom: 19 }).addTo(m);
      const group = [];
      POINTS.filter(p => p.scope === "city").forEach(p => {
        L.marker([p.lat, p.lng], { icon: numIcon(p.n) }).addTo(m).bindTooltip(`${p.n}. ${p.name}`);
        group.push([p.lat, p.lng]);
      });
      m.fitBounds(group, { padding: [38, 38] });
    }

    // ---- מפת האזור (וינה + נקודות 9–11 בדרום) ----
    const regEl = document.getElementById("map-region");
    if (regEl && !maps.region) {
      const m = L.map(regEl, {
        zoomControl: true, scrollWheelZoom: false, attributionControl: true,
      });
      maps.region = m;
      tileLayers.region = L.tileLayer(TILES[theme], { attribution: ATTR, maxZoom: 19 }).addTo(m);
      L.marker([48.2082, 16.3738], { icon: viennaLabel(), interactive: false }).addTo(m);
      const group = [[48.2082, 16.3738]];
      POINTS.filter(p => p.scope === "region").forEach(p => {
        L.marker([p.lat, p.lng], { icon: numIcon(p.n) }).addTo(m).bindTooltip(`${p.n}. ${p.name}`);
        group.push([p.lat, p.lng]);
      });
      m.fitBounds(group, { padding: [42, 42] });
    }

    // התאמת גודל לאחר רינדור
    setTimeout(() => { Object.values(maps).forEach(m => m.invalidateSize()); }, 200);
  }

  // החלפת אריחי המפה לפי ערכת הצבע
  window.applyMapTheme = function (theme) {
    const t = theme === "navy" ? "navy" : "vienna";
    Object.keys(tileLayers).forEach(k => {
      if (tileLayers[k]) tileLayers[k].setUrl(TILES[t]);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
