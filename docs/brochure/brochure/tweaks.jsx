/* ===========================================================
   Tweaks — שני כיווני עיצוב + גוון מוביל
   =========================================================== */
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "וינאי קלאסי",
  "accent": "#7a1f2b",
  "titleScale": 74
}/*EDITMODE-END*/;

function applyDirection(dir) {
  const navy = dir === "כחול קיסרי";
  document.documentElement.setAttribute("data-theme", navy ? "navy" : "vienna");
  if (window.applyMapTheme) window.applyMapTheme(navy ? "navy" : "vienna");
}

function BrochureTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => { applyDirection(t.direction); }, [t.direction]);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--primary", t.accent);
    r.style.setProperty("--marker", t.accent);
  }, [t.accent]);

  useEffect(() => {
    document.querySelectorAll(".cover__title").forEach(el => {
      el.style.fontSize = t.titleScale + "px";
    });
  }, [t.titleScale]);

  const accentOpts = t.direction === "כחול קיסרי"
    ? ["#cda353", "#7fa8d8", "#c98a3a", "#d8c08a"]
    : ["#7a1f2b", "#1f5d3a", "#9a4a1d", "#2a2320"];

  return (
    <TweaksPanel>
      <TweakSection label="כיוון עיצוב" />
      <TweakRadio
        label="ערכת מראה"
        value={t.direction}
        options={["וינאי קלאסי", "כחול קיסרי"]}
        onChange={(v) => setTweak({ direction: v, accent: v === "כחול קיסרי" ? "#cda353" : "#7a1f2b" })}
      />
      <TweakColor
        label="גוון מוביל"
        value={t.accent}
        options={accentOpts}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakSection label="כריכה" />
      <TweakSlider
        label="גודל כותרת"
        value={t.titleScale}
        min={56} max={92} unit="px"
        onChange={(v) => setTweak("titleScale", v)}
      />
    </TweaksPanel>
  );
}

const __host = document.querySelector(".tweak-host");
ReactDOM.createRoot(__host).render(<BrochureTweaks />);
