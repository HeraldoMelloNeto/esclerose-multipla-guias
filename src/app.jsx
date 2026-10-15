import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { T, WM, Card, Badge, PageMark } from "./ui.jsx";
import * as Cl from "./clinico.jsx";
import * as Ra from "./radiologico.jsx";

const VERSION = "1.0.0";

const MODULES = {
  clin: {
    label: "Guia Clínico", short: "Clínico", icon: "🩺", color: T.accent,
    desc: "Diagnóstico McDonald 2024, LCR, OCT/PEV e monitoramento",
    pages: [
      { id: "diagnostico", label: "Diagnóstico McDonald 2024", icon: "🧠", desc: "Simulador com todas as combinações de apresentação, DIS, DIT, LCR, CVS e PRL", C: Cl.DiagnosisPage },
      { id: "protocolo", label: "Protocolo RM", icon: "📡", desc: "Encéfalo, medula e nervo óptico; CVS, PRL e lesões típicas", C: Cl.MRIPage },
      { id: "lcr", label: "LCR · κ-FLC · OCB · NfL", icon: "🧪", desc: "Calculadora κ-FLC, tipos de OCB, papel do NfL, POMS", C: Cl.CSFPage },
      { id: "oct", label: "OCT & PEV", icon: "👁", desc: "Calculadora de IED (pRNFL/GCIPL), limiares, PEV e NO", C: Cl.OCTPage },
      { id: "monitoramento", label: "Monitoramento", icon: "📈", desc: "DIT, biomarcadores, prognóstico e populações especiais", C: Cl.FollowUpPage },
      { id: "glossario", label: "Glossário & red flags", icon: "📖", desc: "32 siglas com busca, red flags do LCR e da neurite óptica", C: Cl.GlossaryPage },
    ],
  },
  radio: {
    label: "Guia Radiológico", short: "Radiológico", icon: "🔬", color: T.teal,
    desc: "Checklist MAGNIMS, interpretação guiada, laudo estruturado e diferencial",
    pages: [
      { id: "checklist", label: "Checklist de protocolo", icon: "✅", desc: "Sequência a sequência por região, com parâmetros técnicos", C: Ra.ChecklistPage },
      { id: "interpret", label: "Interpretação guiada", icon: "🔍", desc: "Região por região, com resultado McDonald 2024 integrado", C: Ra.InterpretPage },
      { id: "laudo", label: "Laudo estruturado", icon: "📋", desc: "Gerador de texto padronizado com cópia em 1 clique", C: Ra.ReportPage },
      { id: "diff", label: "Diferencial", icon: "⚖️", desc: "EM × NMOSD × MOGAD na medula, nervo óptico e encéfalo", C: Ra.DiffPage },
      { id: "flags", label: "Red flags & armadilhas", icon: "🚩", desc: "Sinais de alerta, armadilhas de CVS e PRL, qualidade do laudo", C: Ra.FlagsPage },
    ],
  },
};
// aliases antigos usados nos links cruzados
const ALIAS = { interpret: "interpret", diff: "diff", checklist: "checklist" };

function parseHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  const [m, p] = h.split("/");
  if (MODULES[m] && MODULES[m].pages.some((x) => x.id === p)) return { mod: m, page: p };
  if (MODULES[m]) return { mod: m, page: MODULES[m].pages[0].id };
  return { mod: null, page: null };
}

const References = () => (
  <Card title="Fontes exclusivas" icon="📚" collapsible defaultOpen={false}>
    <div style={{ fontSize: 11.5, color: T.textSec, lineHeight: 1.8 }}>
      <div><strong style={{ color: T.accent }}>1.</strong> Barkhof F, Reich DS, Oh J, et al. 2024 MAGNIMS–CMSC–NAIMS consensus recommendations on the use of MRI for the diagnosis of multiple sclerosis. <em>Lancet Neurol</em> 2025;24:866–79.</div>
      <div style={{ marginTop: 4 }}><strong style={{ color: T.accent }}>2.</strong> Deisenhammer F, Hegen H, Arrambide G, et al. Positive cerebrospinal fluid in the 2024 McDonald criteria for multiple sclerosis. <em>eBioMedicine</em> 2025;120:105905.</div>
      <div style={{ marginTop: 4 }}><strong style={{ color: T.accent }}>3.</strong> Saidha S, Green AJ, Leocani L, et al. The use of optical coherence tomography and visual evoked potentials in the 2024 McDonald diagnostic criteria for multiple sclerosis. <em>Lancet Neurol</em> 2025;24:880–92.</div>
    </div>
  </Card>
);

const Home = ({ go }) => (
  <div>
    <div style={{ textAlign: "center", padding: "26px 0 18px" }}>
      <div style={{ fontSize: 11, letterSpacing: 3, color: T.accent, fontWeight: 700, textTransform: "uppercase" }}>Guias Clínico e Radiológico</div>
      <h1 style={{ fontSize: 30, fontWeight: 900, color: T.white, margin: "6px 0 0", letterSpacing: -0.8, lineHeight: 1.15 }}>Esclerose Múltipla</h1>
      <div style={{ fontSize: 13, color: T.textSec, marginTop: 8 }}>Critérios McDonald 2024 · MAGNIMS-CMSC-NAIMS 2024 · LCR · OCT/PEV</div>
      <div style={{ marginTop: 12 }}>
        <Badge color={T.green}>Lancet Neurol 2025</Badge><Badge color={T.indigo}>eBioMedicine 2025</Badge><Badge color={T.amber}>Consenso internacional</Badge>
      </div>
    </div>
    {Object.entries(MODULES).map(([mk, m]) => (
      <section key={mk} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: m.color, fontWeight: 800 }}>{m.icon} {m.label}</h2>
          <span style={{ fontSize: 11.5, color: T.textMut }}>{m.desc}</span>
        </div>
        <div className="tiles">
          {m.pages.map((p) => (
            <button type="button" key={p.id} className="tile" onClick={() => go(mk, p.id)} style={{ borderColor: m.color + "40", background: `linear-gradient(135deg, ${m.color}12, ${T.bgCard})` }}>
              <span style={{ fontSize: 20 }} aria-hidden="true">{p.icon}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.white }}>{p.label}</span>
              <span style={{ fontSize: 11, color: T.textSec, lineHeight: 1.5 }}>{p.desc}</span>
            </button>
          ))}
        </div>
      </section>
    ))}
    <References />
    <div style={{ fontSize: 10.5, color: T.textMut, lineHeight: 1.6, marginTop: 6 }}>Ferramenta de apoio à decisão para especialistas. Não substitui o julgamento clínico. Todo o processamento ocorre no navegador; nenhum dado é enviado a servidores.</div>
    <PageMark />
  </div>
);

function App() {
  const [route, setRoute] = useState(parseHash);
  const [expertMode, setExpertMode] = useState(() => { try { return localStorage.getItem("em-mode") !== "didatico"; } catch { return true; } });
  useEffect(() => { const on = () => setRoute(parseHash()); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  useEffect(() => { try { localStorage.setItem("em-mode", expertMode ? "especialista" : "didatico"); } catch {} }, [expertMode]);
  const go = useCallback((mod, page) => {
    if (!mod) { window.location.hash = "#/"; return; }
    const pg = ALIAS[page] || page;
    window.location.hash = `#/${mod}/${pg}`;
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const m = route.mod && MODULES[route.mod];
    const p = m && m.pages.find((x) => x.id === route.page);
    document.title = p ? `${p.label} · EM ${m.short}` : "Esclerose Múltipla — Guias Clínico e Radiológico";
  }, [route]);

  const mod = route.mod ? MODULES[route.mod] : null;
  const page = mod ? mod.pages.find((x) => x.id === route.page) : null;
  const Page = page ? page.C : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="topbar">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="brand" onClick={() => go(null)}>🧠 <span>EM · Guias</span></button>
            <nav aria-label="Módulos" style={{ display: "flex", gap: 4 }}>
              {Object.entries(MODULES).map(([mk, m]) => (
                <button key={mk} type="button" className="modbtn" aria-current={route.mod === mk ? "page" : undefined} onClick={() => go(mk, m.pages[0].id)}
                  style={{ borderColor: route.mod === mk ? m.color : T.border, background: route.mod === mk ? m.color + "26" : "transparent", color: route.mod === mk ? T.white : T.textSec }}>{m.icon} {m.short}</button>
              ))}
            </nav>
            <button type="button" className="modebtn" role="switch" aria-checked={expertMode} onClick={() => setExpertMode(!expertMode)} title="Alterna o nível de detalhe das dicas">
              <span className="knob" style={{ background: expertMode ? T.purple : T.teal }}><span style={{ left: expertMode ? 14 : 2 }} /></span>
              <span style={{ color: expertMode ? T.purple : T.teal }}>{expertMode ? "Especialista" : "Didático"}</span>
            </button>
          </div>
          {mod && (
            <nav aria-label={mod.label} className="subnav">
              {mod.pages.map((p) => (
                <button key={p.id} type="button" aria-current={route.page === p.id ? "page" : undefined} onClick={() => go(route.mod, p.id)}
                  style={{ background: route.page === p.id ? mod.color : "transparent", color: route.page === p.id ? "#06101f" : T.textSec, fontWeight: route.page === p.id ? 800 : 500 }}>{p.icon} {p.label}</button>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="wrap" style={{ padding: "16px 14px 64px" }}>
        {Page ? <Page key={route.mod + route.page} go={go} expertMode={expertMode} /> : <Home go={go} />}
      </main>
      <footer className="foot">{WM} · Esclerose Múltipla — Guias Clínico e Radiológico · v{VERSION}</footer>
    </div>
  );
}

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 24, color: T.text }}>
        <h2>Algo deu errado.</h2>
        <p style={{ color: T.textSec }}>Recarregue a página. Se persistir, volte ao início.</p>
        <button className="btn" onClick={() => { window.location.hash = "#/"; window.location.reload(); }}>Voltar ao início</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(<Boundary><App /></Boundary>);
