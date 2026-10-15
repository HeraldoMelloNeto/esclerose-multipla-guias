import React, { useState } from "react";

export const WM = "Dr. Heraldo Mello Neto";

// Paleta única (tema escuro) — compartilhada pelos módulos clínico e radiológico
export const T = {
  bg: "#0b1120", bgCard: "#111a2e", bgCardAlt: "#0f1628", bgHover: "#162040", bgInput: "#0d1424",
  border: "#1c2a4a", borderLight: "#253562",
  accent: "#4f8ff7", accentDim: "#1e3a6d",
  teal: "#2dd4bf", green: "#22c55e", amber: "#f59e0b", rose: "#f43f5e", purple: "#a78bfa", indigo: "#6366f1",
  text: "#e8edf5", textSec: "#94a3bf", textMut: "#5a6a8a", white: "#ffffff", watermark: "#2d3f5e",
};

export const Card = ({ children, title, icon, color = T.accent, collapsible, defaultOpen = true, noPad, id }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="card" style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 12, overflow: "hidden" }}>
      {title && (
        <div role={collapsible ? "button" : undefined} tabIndex={collapsible ? 0 : undefined}
          onClick={collapsible ? () => setOpen(!open) : undefined}
          onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } } : undefined}
          style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, cursor: collapsible ? "pointer" : "default", borderBottom: open ? `1px solid ${T.border}` : "none", background: `linear-gradient(135deg, ${color}12, transparent)`, userSelect: "none" }}>
          {icon && <span style={{ fontSize: 16 }} aria-hidden="true">{icon}</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{title}</span>
          {collapsible && <span style={{ fontSize: 10, color: T.textMut, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>}
        </div>
      )}
      {open && <div style={{ padding: noPad ? 0 : "12px 16px" }}>{children}</div>}
    </section>
  );
};

export const Badge = ({ children, color = T.accent, size = "sm" }) => (
  <span style={{ display: "inline-block", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: 10, fontSize: size === "sm" ? 10 : 12, fontWeight: 600, background: color + "22", color, border: `1px solid ${color}44`, marginRight: 4, marginBottom: 4 }}>{children}</span>
);

export const Toggle = ({ label, value, onChange, desc }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
    <button type="button" role="switch" aria-checked={!!value} aria-label={label} onClick={() => onChange(!value)}
      style={{ width: 40, height: 22, borderRadius: 11, background: value ? T.green : T.border, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0, border: "none", padding: 0 }}>
      <span style={{ width: 18, height: 18, borderRadius: 9, background: T.white, position: "absolute", top: 2, left: value ? 20 : 2, transition: "left .2s", boxShadow: "0 1px 3px #0003" }} />
    </button>
    <div>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: 10, color: T.textMut }}>{desc}</div>}
    </div>
  </div>
);

export const InfoRow = ({ label, value, color }) => (
  <div className="inforow" style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.border}55`, alignItems: "baseline" }}>
    <span style={{ fontSize: 12, color: T.textSec, minWidth: 150, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 12.5, color: color || T.text, fontWeight: 600 }}>{value}</span>
  </div>
);

export const SectionHead = ({ children, sub }) => (
  <div style={{ marginBottom: 14, marginTop: 8 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: -0.3, margin: 0 }}>{children}</h2>
    {sub && <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const SubTitle = ({ children }) => (
  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.accent, margin: "20px 0 10px", letterSpacing: 0.2 }}>{children}</h3>
);

export const Pill = ({ children, active, onClick, color = T.accent }) => (
  <button type="button" onClick={onClick} aria-pressed={!!active} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${active ? color : T.border}`, background: active ? color + "22" : "transparent", color: active ? T.white : T.textSec, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}>{children}</button>
);

export const CheckItem = ({ checked, onChange, label, sub, warn, color = T.green }) => (
  <div role="checkbox" aria-checked={!!checked} tabIndex={0} onClick={() => onChange(!checked)}
    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}
    style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: checked ? color + "14" : T.bgCardAlt, border: `1px solid ${checked ? color + "66" : T.border}`, marginBottom: 6, cursor: "pointer", transition: "all .15s" }}>
    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? color : T.textMut}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: checked ? color : "transparent", marginTop: 1 }}>
      {checked && <span style={{ color: T.white, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>{sub}</div>}
      {warn && <div style={{ fontSize: 10, color: T.amber, marginTop: 2 }}>⚠ {warn}</div>}
    </div>
  </div>
);

export const RadioItem = ({ checked, onChange, label, sub, name }) => (
  <label style={{ display: "flex", gap: 10, padding: "9px 12px", borderRadius: 8, background: checked ? T.accentDim + "55" : T.bgCardAlt, border: `1px solid ${checked ? T.accent : T.border}`, marginBottom: 6, cursor: "pointer", alignItems: "flex-start", transition: "all .15s" }}>
    <input type="radio" name={name} checked={checked} onChange={onChange} style={{ marginTop: 3, accentColor: T.accent }} />
    <div>
      <div style={{ fontSize: 12.5, color: T.text, fontWeight: checked ? 700 : 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>{sub}</div>}
    </div>
  </label>
);

export const AlertBox = ({ children, type = "info" }) => {
  const colors = { info: T.accent, warn: T.amber, danger: T.rose, success: T.green };
  const c = colors[type] || T.accent;
  return <div style={{ padding: "10px 14px", borderRadius: 8, background: c + "14", border: `1px solid ${c}44`, borderLeft: `4px solid ${c}`, marginBottom: 8, fontSize: 12, color: T.text, lineHeight: 1.7 }}>{children}</div>;
};

export const FlagList = ({ items, color, mark = "⚠" }) => (
  <div>
    {items.map((f, i) => (
      <div key={i} style={{ padding: "8px 12px", borderRadius: 6, background: color + "0d", marginBottom: 4, fontSize: 12, color: T.text, borderLeft: `3px solid ${color}`, lineHeight: 1.6 }}>
        <span style={{ color, fontWeight: 700, marginRight: 6 }}>{mark}</span>{f}
      </div>
    ))}
  </div>
);

export const DataTable = ({ head, rows, headColors = [], fontSize = 11 }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${T.border}` }}>
          {head.map((h, i) => <th key={i} scope="col" style={{ padding: 8, textAlign: "left", color: headColors[i] || T.textSec, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${T.border}66` }}>
            {r.map((c, j) => <td key={j} style={{ padding: 8, color: j === 0 ? T.text : T.textSec, fontWeight: j === 0 ? 600 : 400, verticalAlign: "top" }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const P = ({ children, color, mt = 6, size = 12 }) => (
  <div style={{ fontSize: size, color: color || T.text, lineHeight: 1.75, marginTop: mt }}>{children}</div>
);

export const NumInput = ({ label, value, onChange, step = "any", placeholder = "", width }) => (
  <label style={{ display: "block" }}>
    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 4 }}>{label}</div>
    <input type="number" inputMode="decimal" min="0" step={step} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: width || "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 13, boxSizing: "border-box" }} />
  </label>
);

export const PageMark = () => (
  <div style={{ textAlign: "right", fontSize: 8.5, color: T.watermark, marginTop: 20, letterSpacing: 0.4, opacity: 0.85, fontFamily: "monospace" }}>{WM}</div>
);
