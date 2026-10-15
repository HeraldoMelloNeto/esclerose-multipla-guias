import React, { useState, useMemo } from "react";
import { T, WM, Card, Badge, Toggle, InfoRow, SectionHead, Pill, CheckItem, AlertBox, FlagList, DataTable, P, PageMark } from "./ui.jsx";
import { evaluateMcDonald } from "./clinico.jsx";

// ═══════════════════════════════════════════════════════════════════
// MÓDULO RADIOLÓGICO — MAGNIMS-CMSC-NAIMS 2024
// Barkhof et al. Lancet Neurol 2025;24:866–79 (Tabela 2)
// ═══════════════════════════════════════════════════════════════════

const PROTO = {
  brain: {
    label: "Encéfalo", icon: "🧠",
    params: { field: "≥ 1.5T", acq: "3D preferível", slice: "3D: 1 mm isotrópico; 2D: ≤ 3 mm sem gap", res: "≤ 1×1 mm", coverage: "Cérebro todo (incluir máximo da cervical)", orient: "Subcalosal ou CA-CP" },
    core: [
      { seq: "3D T2-FLAIR", purpose: "Identificação de lesões da substância branca e cortical", notes: "Preferir 3D; FLAIR* (FLAIR × T2*) melhora detecção de CVS" },
      { seq: "Axial T2 (eco simples ou duplo)", purpose: "Confirmação de lesões infratentoriais", notes: "Essencial para fossa posterior" },
      { seq: "3D T2* GRE (EPI segmentado ou SWI)", purpose: "Detecção de CVS; reconstrução de fase para PRL", notes: "Resolução isotrópica ≤1,0 mm; salvar imagens de fase" },
      { seq: "T1 pós-gadolínio (axial, levemente ponderado)", purpose: "Detecção de lesões ativas (realçantes)", notes: "0,1 mmol/kg; delay mínimo 5 min; Gd macrocíclico preferido" },
    ],
    additional: [
      { seq: "3D T2* GRE (EPI 3D ou SWI) para PRL", purpose: "Detecção de paramagnetic rim lesions", notes: "Fase filtrada ou QSM; melhor em ≥3T; Gd NÃO necessário" },
      { seq: "DWI", purpose: "Excluir isquemia aguda como diferencial", notes: "Espessura ≥5 mm; EM aguda pode mostrar restrição à difusão" },
      { seq: "DIR ou PSIR", purpose: "Detecção de lesões corticais", notes: "Maior sensibilidade que FLAIR para córtex" },
      { seq: "3D T1 fortemente ponderado (MPRAGE)", purpose: "Volumetria cerebral; lesões T1 hipointensas (black holes)", notes: "Importante para referência de follow-up" },
    ],
    avoid: [],
  },
  spine: {
    label: "Medula Espinal", icon: "🦴",
    params: { field: "≥ 1.5T (sem ganho adicional de 3T)", acq: "2D ou 3D", slice: "Sagital ≤ 3 mm sem gap; Axial ≤ 5 mm sem gap", res: "≤ 1×1 mm", coverage: "Cervical ao cone medular (cobertura completa)", orient: "Axial ⊥ ao eixo sagital da medula" },
    core: [
      { seq: "2 sequências sagitais complementares", purpose: "Distinguir lesões pequenas de artefatos", notes: "Qualquer combinação de: T2 FSE, PD, STIR, PSIR ou MP[2]RAGE" },
      { seq: "Axial 2D T2 SE ou T2* GRE (pelo menos cervical)", purpose: "Localização axial das lesões (periférica vs central)", notes: "Ou reconstrução multiplanar de MPRAGE 3D" },
      { seq: "T1 sagital pós-Gd moderadamente ponderado", purpose: "Detecção de lesões ativas (realçantes)", notes: "Gd adicional NÃO necessário se feita logo após encéfalo com Gd" },
    ],
    additional: [
      { seq: "T1 axial pós-Gd moderadamente ponderado (através das lesões)", purpose: "Caracterização do padrão de realce", notes: "Nodular, anelar ou anel alongado" },
    ],
    avoid: [
      { seq: "FLAIR", reason: "Baixa sensibilidade para lesões medulares desmielinizantes" },
      { seq: "Sequências mielográficas (CISS, T2 muito pesado)", reason: "Inadequadas para detecção de lesões de EM" },
    ],
  },
  optic: {
    label: "Nervo Óptico", icon: "👁",
    params: { field: "≥ 1.5T", acq: "2D ou 3D", slice: "≤ 2–3 mm sem gap", res: "≤ 1×1 mm", coverage: "Nervos ópticos e quiasma óptico", orient: "Coronal ⊥ ao nervo óptico; axial alinhado ao nervo e quiasma" },
    core: [
      { seq: "Coronal T2 fat-sat ou STIR", purpose: "Detecção de lesões do nervo óptico", notes: "Core mínimo se apresentação de neurite óptica" },
      { seq: "T1 coronal pós-Gd fat-sat", purpose: "Avaliação de neurite óptica aguda; diferencial", notes: "Padrão e extensão do realce ajudam no diferencial (EM vs NMOSD vs MOGAD)" },
    ],
    additional: [
      { seq: "Axial FS T2 ou STIR", purpose: "Complementar avaliação coronal", notes: "Alinhar ao nervo óptico e quiasma" },
      { seq: "T1 pós-Gd (axial e coronal)", purpose: "Avaliação completa do realce", notes: "" },
      { seq: "3D-DIR (cobertura cérebro + nervo óptico)", purpose: "Detecção de lesões assintomáticas", notes: "Detecta anomalias em ~40% sem história de NO; NÃO universalmente disponível" },
    ],
    avoid: [],
  },
};
const PARAM_LABEL = { field: "Campo", acq: "Aquisição", slice: "Espessura", res: "Resolução", coverage: "Cobertura", orient: "Orientação" };

const LESION_CHARS = {
  periventricular: {
    label: "Periventricular", criteria: "Contato direto com ventrículos laterais, sem SB normal interposta",
    typical: ["Ovoides ('Dawson fingers') com eixo perpendicular aos ventrículos", "Incluem lesões do corpo caloso-septais", "Lesões talâmicas adjacentes ao ventrículo NÃO são periventriculares"],
    tips_expert: "Em ≥45 anos com CIS, ≥3 lesões periventriculares melhoram a especificidade (vs 1 lesão).",
    tips_basic: "As lesões devem tocar diretamente o ventrículo. Lesões no tálamo, mesmo perto do ventrículo, não contam.",
    minSize: "≥ 3 mm (exceções: assoalho do IV ventrículo, margem pontina, corpo caloso)",
  },
  juxtacortical: {
    label: "Justacortical / Cortical", criteria: "Lesões afetando fibras em U ou córtex",
    typical: ["Afetam fibras em U (tipicamente poupadas na isquemia)", "Lesões corticais puras são difíceis em RM convencional (mesmo 3T)", "DIR, PSIR ou MPRAGE 3D melhoram visualização"],
    tips_expert: "Lesões corticais são marcador característico de EM e não são vistas na migrânea. Considerar DIR/PSIR com forte suspeita clínica e poucas lesões na FLAIR convencional.",
    tips_basic: "Lesões que tocam o córtex cerebral ou estão logo abaixo dele. São muito específicas para EM.",
    minSize: "≥ 3 mm",
  },
  infratentorial: {
    label: "Infratentorial", criteria: "Tronco encefálico, pedúnculos cerebelares, cerebelo",
    typical: ["Assoalho do IV ventrículo", "Superfície da ponte e tratos trigeminais intrapontinos", "Pedúnculos cerebelares médio e superior", "Substância cinzenta periaquedutal", "SB cerebelar e pirâmides bulbares"],
    tips_expert: "Lesões pontinas periféricas favorecem EM; centrais favorecem doença vascular. Em idosos com fatores de risco vascular, localização pontina periférica aumenta a especificidade.",
    tips_basic: "Confirme lesões nesta região com a sequência axial T2 (mais sensível que FLAIR para fossa posterior).",
    minSize: "Lesões <3 mm no assoalho do IV ventrículo ou margem pontina podem ser consideradas",
  },
  spinalcord: {
    label: "Medula Espinal", criteria: "Lesões curtas (<1 segmento vertebral), tipicamente periféricas",
    typical: ["Hiperintensas em T2/PD/STIR, hipointensas em T1 pesado", "Bem delimitadas com possível perda volumétrica local", "Arredondadas ou em cunha no axial, envolvendo SB periférica", "Podem ocorrer em qualquer nível"],
    tips_expert: "Lesões medulares T2 incidentais são extremamente raras no envelhecimento normal — alta especificidade para EM. ≥2 lesões medulares são necessárias para DIS com apenas 1 localização + progressão desde o início.",
    tips_basic: "Lesões medulares curtas são muito específicas para EM. Compare sempre 2 sequências sagitais diferentes para excluir artefatos.",
    minSize: "Visível em pelo menos 2 sequências sagitais complementares",
  },
  opticnerve: {
    label: "Nervo Óptico (5ª localização 2024)", criteria: "Lesão unilateral, segmento curto (<50% do nervo)",
    typical: ["Predominantemente intracanalicular e intraorbital", "Raramente intracraniana ou quiasmática (→ NMOSD se quiasma)", "Unilateral com edema papilar leve (se aguda)"],
    tips_expert: "Lesões assintomáticas do nervo óptico em RM com 3D-DIR em ~40% dos pacientes com EM. Raramente vistas em NMOSD ou MOGAD — alta especificidade para EM.",
    tips_basic: "Se houver neurite óptica, a RM com supressão de gordura pode confirmar e localizar a lesão. Compare com OCT e PEV.",
    minSize: "Visível em sequência com supressão de gordura",
  },
};
const LOC_KEYS = Object.keys(LESION_CHARS);

// ─── Checklist ──────────────────────────────────────────────────────
export const ChecklistPage = ({ expertMode }) => {
  const [region, setRegion] = useState("brain");
  const [checks, setChecks] = useState({});
  const toggle = (id) => setChecks((p) => ({ ...p, [id]: !p[id] }));
  const proto = PROTO[region];
  const coreIds = proto.core.map((_, i) => `${region}_core_${i}`);
  const done = coreIds.filter((id) => checks[id]).length;
  const complete = done === coreIds.length;
  return (
    <div>
      <SectionHead sub="Verifique se todas as sequências obrigatórias foram adquiridas">Checklist de protocolo de RM</SectionHead>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(PROTO).map(([k, v]) => <Pill key={k} active={region === k} onClick={() => setRegion(k)} color={T.teal}>{v.icon} {v.label}</Pill>)}
      </div>
      <Card key={"p" + region} title="Parâmetros técnicos" icon="⚙️" color={T.teal} collapsible defaultOpen={!expertMode}>
        {Object.entries(proto.params).map(([k, v]) => <InfoRow key={k} label={PARAM_LABEL[k]} value={v} />)}
      </Card>
      <Card title={`Sequências core (${complete ? "✅ completo" : `${done}/${coreIds.length}`})`} icon="⚡" color={complete ? T.green : T.accent}>
        {proto.core.map((s, i) => <CheckItem key={i} checked={!!checks[`${region}_core_${i}`]} onChange={() => toggle(`${region}_core_${i}`)} label={s.seq} sub={expertMode ? s.notes : s.purpose} />)}
      </Card>
      {proto.additional.length > 0 && (
        <Card key={"a" + region} title="Sequências adicionais (opcionais)" icon="➕" color={T.purple} collapsible defaultOpen={false}>
          {proto.additional.map((s, i) => <CheckItem key={i} color={T.purple} checked={!!checks[`${region}_add_${i}`]} onChange={() => toggle(`${region}_add_${i}`)} label={s.seq} sub={expertMode ? (s.notes || s.purpose) : s.purpose} />)}
        </Card>
      )}
      {proto.avoid.length > 0 && (
        <Card title="NÃO UTILIZAR" icon="🚫" color={T.rose}>
          {proto.avoid.map((s, i) => <div key={i} style={{ padding: "8px 12px", borderRadius: 6, background: T.rose + "14", marginBottom: 4, fontSize: 12, color: T.rose, borderLeft: `3px solid ${T.rose}` }}><strong>{s.seq}:</strong> {s.reason}</div>)}
        </Card>
      )}
      {complete
        ? <AlertBox type="success"><strong>Protocolo core completo</strong> para {proto.label.toLowerCase()}.</AlertBox>
        : <AlertBox type="warn"><strong>Protocolo incompleto.</strong> Faltam {coreIds.length - done} sequência(s) core obrigatória(s) para {proto.label.toLowerCase()}.</AlertBox>}
      {expertMode && region === "brain" && (
        <Card title="Notas técnicas CVS/PRL" icon="🔬" collapsible defaultOpen={false} color={T.purple}>
          <P mt={0} size={11.5} color={T.textSec}><strong style={{ color: T.text }}>CVS:</strong> resolução isotrópica ≤1,0 mm com ponderação T2*/susceptibilidade. FLAIR* (FLAIR × EPI 3D) simplifica a leitura. Gadolínio pré-aquisição melhora a detecção, especialmente em 1.5T.</P>
          <P size={11.5} color={T.textSec}><strong style={{ color: T.text }}>PRL:</strong> fase filtrada ou QSM das mesmas sequências GRE. Não requer Gd. Melhor detecção em ≥3T, mas visível em 1.5T. Ângulo de flip baixo não é obrigatório, mas ajuda na detecção em imagens de magnitude.</P>
          <P size={11.5} color={T.textSec}><strong style={{ color: T.text }}>Pós-processamento FLAIR*:</strong> pode anular sinal alto no LCR para melhor visualização de lesões. Fase filtrada ou QSM do mesmo dado permite avaliar PRL sem nova aquisição.</P>
        </Card>
      )}
      <PageMark />
    </div>
  );
};

// ─── Interpretação guiada ───────────────────────────────────────────
export const InterpretPage = ({ expertMode }) => {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ presentation: "attack" });
  const up = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const total = LOC_KEYS.length;
  const loc = LESION_CHARS[LOC_KEYS[step]];
  const disCount = LOC_KEYS.filter((l) => f[`${l}_present`]).length;
  const hasDIT = !!(f.enh_nonenh || f.new_followup);
  const res = evaluateMcDonald({ presentation: f.presentation, locCount: disCount, dit: hasDIT, csf: !!f.csf, cvs: !!f.cvs, prl: !!f.prl, spinalLesions: !!f.spinal2 });

  return (
    <div>
      <SectionHead sub="Passo a passo por região anatômica, com integração automática aos critérios McDonald 2024">Interpretação guiada</SectionHead>
      <div style={{ display: "flex", gap: 3, marginBottom: 16 }} role="tablist" aria-label="Etapas">
        {LOC_KEYS.map((l, i) => (
          <button key={l} type="button" role="tab" aria-selected={i === step} aria-label={LESION_CHARS[l].label} title={LESION_CHARS[l].label} onClick={() => setStep(i)}
            style={{ flex: 1, height: 8, borderRadius: 4, border: "none", background: i === step ? T.accent : f[`${l}_present`] ? T.green + "99" : T.border, cursor: "pointer", padding: 0 }} />
        ))}
        <button type="button" role="tab" aria-selected={step === total} aria-label="Evidências e resultado" title="Evidências e resultado" onClick={() => setStep(total)}
          style={{ flex: 1, height: 8, borderRadius: 4, border: "none", background: step === total ? T.purple : T.border, cursor: "pointer", padding: 0 }} />
      </div>

      {step < total ? (
        <>
          <Card key={step} title={`${step + 1}/${total} — ${loc.label}`} icon="📍">
            <div style={{ fontSize: 12, color: T.teal, fontWeight: 600, marginBottom: 8 }}>{loc.criteria}</div>
            {loc.typical.map((t, i) => <div key={i} style={{ padding: "4px 0", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}44` }}><span style={{ color: T.accent, marginRight: 6 }}>•</span>{t}</div>)}
            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: T.accent + "12", fontSize: 11.5, color: T.textSec, lineHeight: 1.7 }}>💡 {expertMode ? loc.tips_expert : loc.tips_basic}</div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: T.textMut }}>Tamanho mínimo: {loc.minSize}</div>
          </Card>
          <Card title="Achados nesta região" icon="✏️">
            <Toggle label={`Lesões típicas de EM presentes — ${loc.label}?`} value={!!f[`${LOC_KEYS[step]}_present`]} onChange={(v) => up(`${LOC_KEYS[step]}_present`, v)} />
            {f[`${LOC_KEYS[step]}_present`] && (
              <label style={{ display: "block", marginTop: 8 }}>
                <div style={{ fontSize: 11, color: T.textSec, marginBottom: 4 }}>Nº de lesões nesta região</div>
                <input type="number" min="0" value={f[`${LOC_KEYS[step]}_count`] || ""} onChange={(e) => up(`${LOC_KEYS[step]}_count`, e.target.value)} style={{ width: 90, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 13 }} />
              </label>
            )}
          </Card>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>← Anterior</button>}
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setStep(step + 1)}>Próximo →</button>
          </div>
        </>
      ) : (
        <>
          <Card title="Apresentação e evidências adicionais" icon="🔗" color={T.purple}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[["attack", "Surto"], ["progressive", "Progressão desde o início"], ["ris", "RIS"], ["nonspecific", "Sintomas não específicos"]].map(([k, l]) => <Pill key={k} active={f.presentation === k} onClick={() => up("presentation", k)} color={T.purple}>{l}</Pill>)}
            </div>
            <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
            <Toggle label="DIT: lesões realçantes E não realçantes simultâneas" value={!!f.enh_nonenh} onChange={(v) => up("enh_nonenh", v)} />
            <Toggle label="DIT: nova lesão T2 ou realçante no follow-up" value={!!f.new_followup} onChange={(v) => up("new_followup", v)} />
            <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
            <Toggle label="CVS Select 6 positivo" value={!!f.cvs} onChange={(v) => up("cvs", v)} desc="≥6 lesões CVS+ (ou maioria se <10 lesões)" />
            <Toggle label="≥1 PRL (paramagnetic rim lesion)" value={!!f.prl} onChange={(v) => up("prl", v)} />
            <Toggle label="LCR positivo (OCB tipo 2/3 ou κ-FLC ≥6,1)" value={!!f.csf} onChange={(v) => up("csf", v)} />
            {f.presentation === "progressive" && <Toggle label="≥2 lesões medulares" value={!!f.spinal2} onChange={(v) => up("spinal2", v)} desc="Necessário para progressão desde o início com 1 localização" />}
          </Card>
          <Card title="Resultado da avaliação" icon="📊" color={res ? res.color : T.accent}>
            <div style={{ marginBottom: 8 }}>{LOC_KEYS.map((l) => <Badge key={l} color={f[`${l}_present`] ? T.green : T.textMut}>{LESION_CHARS[l].label}: {f[`${l}_present`] ? `✓${f[`${l}_count`] ? ` (${f[`${l}_count`]})` : ""}` : "—"}</Badge>)}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: res ? res.color : T.text, marginBottom: 6 }}>DIS: {disCount}/5 localizações</div>
            <div style={{ marginBottom: 10 }}>
              <Badge color={hasDIT ? T.green : T.textMut}>DIT: {hasDIT ? "✓" : "—"}</Badge>
              <Badge color={f.cvs ? T.green : T.textMut}>CVS: {f.cvs ? "✓" : "—"}</Badge>
              <Badge color={f.prl ? T.green : T.textMut}>PRL: {f.prl ? "✓" : "—"}</Badge>
              <Badge color={f.csf ? T.green : T.textMut}>LCR: {f.csf ? "✓" : "—"}</Badge>
            </div>
            {res && <AlertBox type={res.met ? "success" : res.color === T.amber ? "warn" : "danger"}><strong>{res.msg}</strong></AlertBox>}
            <div style={{ fontSize: 11, color: T.rose, fontWeight: 600 }}>Pré-requisito: "nenhuma explicação melhor" — exclusão de NMOSD, MOGAD, infecções, vasculites, sarcoidose.</div>
          </Card>
          <button type="button" className="btn ghost" style={{ width: "100%" }} onClick={() => { setStep(0); setF({ presentation: "attack" }); }}>← Reiniciar avaliação</button>
        </>
      )}
      <PageMark />
    </div>
  );
};

// ─── Laudo estruturado ──────────────────────────────────────────────
const REPORT_SECTIONS = [
  { id: "clinical", label: "Informação clínica", fields: [
    { id: "indication", label: "Indicação", type: "select", options: ["Primeira investigação para suspeita de EM", "Follow-up diagnóstico (demonstrar DIT)", "Follow-up terapêutico (monitoramento)", "Neurite óptica aguda", "Síndrome clínica isolada (CIS)", "Síndrome radiológica isolada (RIS)", "Progressão desde o início", "Outro"] },
    { id: "age", label: "Idade (anos)", type: "number" },
    { id: "gd_used", label: "Gadolínio administrado?", type: "toggle" },
  ] },
  { id: "brain_findings", label: "Achados encefálicos", fields: [
    { id: "pv_count", label: "Nº lesões periventriculares", type: "number" },
    { id: "jc_count", label: "Nº lesões justacorticais/corticais", type: "number" },
    { id: "infra_count", label: "Nº lesões infratentoriais", type: "number" },
    { id: "dwm_count", label: "Nº lesões SB profunda", type: "number" },
    { id: "enhancing", label: "Lesões com realce pelo Gd?", type: "toggle" },
    { id: "enhancing_count", label: "Nº lesões com realce", type: "number" },
    { id: "t1_black_holes", label: "Lesões hipointensas em T1 (black holes)?", type: "toggle" },
    { id: "brain_atrophy", label: "Redução volumétrica encefálica", type: "select", options: ["Não", "Leve", "Moderada", "Acentuada"] },
    { id: "atrophy_regions", label: "Regiões com redução volumétrica", type: "text", placeholder: "ex.: corpo caloso, tálamos, fossa posterior" },
  ] },
  { id: "cvs_prl", label: "CVS e PRL", fields: [
    { id: "cvs_assessed", label: "CVS avaliado?", type: "toggle" },
    { id: "cvs_positive_count", label: "Nº lesões CVS+", type: "number" },
    { id: "cvs_total_assessed", label: "Total de lesões avaliadas para CVS", type: "number" },
    { id: "prl_assessed", label: "PRL avaliado?", type: "toggle" },
    { id: "prl_count", label: "Nº lesões com anel paramagnético", type: "number" },
  ] },
  { id: "spine_findings", label: "Achados medulares", fields: [
    { id: "spine_lesions", label: "Lesões medulares presentes?", type: "toggle" },
    { id: "spine_count", label: "Nº de lesões medulares", type: "number" },
    { id: "spine_levels", label: "Níveis acometidos", type: "text", placeholder: "ex.: C2, C5-C6, T8" },
    { id: "spine_extent", label: "Extensão", type: "select", options: ["<1 segmento vertebral (típico de EM)", "1–2 segmentos vertebrais", "≥3 segmentos vertebrais (LETM — considerar NMOSD/MOGAD)"] },
    { id: "spine_axial", label: "Localização axial", type: "select", options: ["Periférica (SB) — típico de EM", "Central (SC) — considerar NMOSD/MOGAD", "Mista"] },
    { id: "spine_enhance", label: "Lesões medulares com realce?", type: "toggle" },
    { id: "spine_atrophy", label: "Redução volumétrica medular focal?", type: "toggle" },
  ] },
  { id: "optic_findings", label: "Achados do nervo óptico", fields: [
    { id: "optic_assessed", label: "Nervo óptico avaliado por RM?", type: "toggle" },
    { id: "optic_lesion", label: "Lesão do nervo óptico?", type: "toggle" },
    { id: "optic_side", label: "Lateralidade", type: "select", options: ["Direito", "Esquerdo", "Bilateral"] },
    { id: "optic_extent", label: "Extensão", type: "select", options: ["Segmento curto (<50%) — típico de EM", "Longitudinalmente extensa (>50%) — considerar NMOSD/MOGAD"] },
    { id: "optic_segment", label: "Segmento", type: "select", options: ["Intraorbital", "Intracanalicular", "Intracraniano", "Quiasma — considerar NMOSD"] },
    { id: "optic_enhance", label: "Realce pós-Gd?", type: "toggle" },
  ] },
  { id: "new_lesions", label: "Comparativo (follow-up)", fields: [
    { id: "is_followup", label: "Exame com comparativo?", type: "toggle" },
    { id: "new_t2", label: "Novas lesões T2?", type: "toggle" },
    { id: "new_t2_count", label: "Nº novas lesões T2", type: "number" },
    { id: "new_t2_locations", label: "Localização das novas lesões", type: "text", placeholder: "ex.: periventricular, justacortical" },
    { id: "new_enhance", label: "Novas lesões com realce?", type: "toggle" },
  ] },
];

const num = (v) => { const n = parseInt(v, 10); return isFinite(n) && n > 0 ? n : 0; };

export function buildReport(d) {
  const L = [];
  L.push("RM — PROTOCOLO PARA ESCLEROSE MÚLTIPLA");
  L.push("Recomendações MAGNIMS-CMSC-NAIMS 2024 / critérios McDonald 2024");
  L.push("");
  L.push(`INDICAÇÃO: ${d.indication || "Não informada"}.`);
  if (num(d.age)) L.push(`Idade: ${num(d.age)} anos.`);
  L.push(`Gadolínio: ${d.gd_used ? "administrado (0,1 mmol/kg, agente macrocíclico)" : "não administrado"}.`);
  L.push("");
  L.push("ENCÉFALO");
  const pv = num(d.pv_count), jc = num(d.jc_count), inf = num(d.infra_count), dw = num(d.dwm_count), tot = pv + jc + inf + dw;
  if (tot > 0) {
    L.push(`Lesões hiperintensas em T2/FLAIR: ${tot}.`);
    if (pv) L.push(`- Periventriculares: ${pv}.`);
    if (jc) L.push(`- Justacorticais/corticais: ${jc}.`);
    if (inf) L.push(`- Infratentoriais: ${inf}.`);
    if (dw) L.push(`- Substância branca profunda: ${dw}.`);
  } else L.push("Sem lesões focais em T2/FLAIR.");
  const enhN = num(d.enhancing_count);
  if (d.gd_used) L.push(d.enhancing ? `Lesões com realce pelo gadolínio: ${enhN || "presentes"}.` : "Sem lesões com realce pelo gadolínio.");
  if (d.t1_black_holes) L.push("Lesões hipointensas em T1 (black holes): presentes.");
  if (d.brain_atrophy && d.brain_atrophy !== "Não") L.push(`Redução volumétrica encefálica ${d.brain_atrophy.toLowerCase()}${d.atrophy_regions ? ` (${d.atrophy_regions})` : ""}.`);
  L.push("");
  let s6 = null;
  if (d.cvs_assessed || d.prl_assessed) {
    L.push("CVS E PRL");
    if (d.cvs_assessed) {
      const pos = num(d.cvs_positive_count), all = num(d.cvs_total_assessed);
      s6 = pos >= 6 || (all > 0 && all < 10 && pos > all / 2);
      L.push(`Sinal da veia central: ${pos}/${all} lesões avaliadas CVS-positivas${all ? ` (${Math.round((pos / all) * 100)}%)` : ""}. Select 6: ${s6 ? "positivo" : "não atingido"}.`);
    }
    if (d.prl_assessed) L.push(num(d.prl_count) ? `Lesões com anel paramagnético (PRL): ${num(d.prl_count)}.` : "Sem lesões com anel paramagnético (PRL).");
    L.push("");
  }
  L.push("MEDULA ESPINAL");
  if (d.spine_lesions) {
    L.push(`Lesões medulares: ${num(d.spine_count) || "presentes"}${d.spine_levels ? `, nos níveis ${d.spine_levels}` : ""}.`);
    if (d.spine_extent) L.push(`Extensão: ${d.spine_extent}.`);
    if (d.spine_axial) L.push(`Localização axial: ${d.spine_axial}.`);
    if (d.spine_enhance) L.push("Realce pelo gadolínio presente.");
    if (d.spine_atrophy) L.push("Redução volumétrica medular focal.");
  } else L.push("Sem lesões medulares focais.");
  L.push("");
  if (d.optic_assessed) {
    L.push("NERVOS ÓPTICOS");
    if (d.optic_lesion) {
      L.push(`Lesão do nervo óptico${d.optic_side ? ` ${d.optic_side.toLowerCase()}` : ""}${d.optic_segment ? `, segmento ${d.optic_segment.toLowerCase()}` : ""}.`);
      if (d.optic_extent) L.push(`Extensão: ${d.optic_extent}.`);
      if (d.optic_enhance) L.push("Realce pós-gadolínio presente.");
    } else L.push("Sem lesões dos nervos ópticos.");
    L.push("");
  }
  if (d.is_followup) {
    L.push("COMPARATIVO");
    L.push(d.new_t2 ? `Novas lesões T2: ${num(d.new_t2_count) || "presentes"}${d.new_t2_locations ? ` (${d.new_t2_locations})` : ""}.` : "Sem novas lesões T2 em relação ao exame prévio.");
    if (d.new_enhance) L.push("Novas lesões com realce: presentes.");
    L.push("");
  }
  L.push("IMPRESSÃO (aspectos radiológicos dos critérios McDonald 2024)");
  const locs = [];
  if (pv) locs.push("periventricular"); if (jc) locs.push("justacortical/cortical"); if (inf) locs.push("infratentorial");
  if (d.spine_lesions) locs.push("medula espinal"); if (d.optic_lesion) locs.push("nervo óptico");
  L.push(`1. Disseminação no espaço (DIS): ${locs.length}/5 localizações típicas${locs.length ? ` (${locs.join(", ")})` : ""}.`);
  const dit = (d.gd_used && d.enhancing && tot > enhN && enhN > 0) || (d.is_followup && d.new_t2) || (d.is_followup && d.new_enhance);
  const ditTxt = dit ? "demonstrada" : (d.gd_used && d.enhancing && !enhN) ? "a definir (informar o nº de lesões com realce)" : "não demonstrada neste exame";
  L.push(`2. Disseminação no tempo (DIT): ${ditTxt}.`);
  let n = 3;
  if (s6 !== null) L.push(`${n++}. CVS (Select 6): ${s6 ? "positivo" : "não atingido"}.`);
  if (d.prl_assessed) L.push(`${n++}. PRL: ${num(d.prl_count) ? "presente(s)" : "não identificadas"}.`);
  L.push(`${n}. Integrar com dados clínicos, LCR (OCB/κ-FLC) e OCT/PEV para aplicação dos critérios McDonald 2024. Pré-requisito: nenhuma explicação melhor.`);
  return L.join("\n");
}

export const ReportPage = () => {
  const [d, setD] = useState({});
  const [copied, setCopied] = useState(false);
  const up = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const text = useMemo(() => buildReport(d), [d]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div>
      <SectionHead sub="Preencha os achados; o texto padronizado é gerado em tempo real">Laudo estruturado</SectionHead>
      <div className="split">
        <div>
          {REPORT_SECTIONS.map((s) => (
            <Card key={s.id} title={s.label} icon="📝" collapsible defaultOpen={s.id === "clinical" || s.id === "brain_findings"}>
              {s.fields.map((fl) => {
                if (fl.type === "toggle") return <Toggle key={fl.id} label={fl.label} value={!!d[fl.id]} onChange={(v) => up(fl.id, v)} />;
                if (fl.type === "select") return (
                  <label key={fl.id} style={{ display: "block", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 4 }}>{fl.label}</div>
                    <select value={d[fl.id] || ""} onChange={(e) => up(fl.id, e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 12 }}>
                      <option value="">— Selecionar —</option>
                      {fl.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                );
                if (fl.type === "number") return (
                  <label key={fl.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: T.textSec, flex: 1 }}>{fl.label}</span>
                    <input type="number" min="0" value={d[fl.id] || ""} onChange={(e) => up(fl.id, e.target.value)} style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 12 }} />
                  </label>
                );
                return (
                  <label key={fl.id} style={{ display: "block", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 4 }}>{fl.label}</div>
                    <input type="text" value={d[fl.id] || ""} onChange={(e) => up(fl.id, e.target.value)} placeholder={fl.placeholder || ""} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 12, boxSizing: "border-box" }} />
                  </label>
                );
              })}
            </Card>
          ))}
        </div>
        <div className="sticky">
          <Card title="Prévia do laudo" icon="📄" color={T.purple}>
            <pre data-testid="report" style={{ fontSize: 11.5, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", background: T.bg, padding: 14, borderRadius: 8, border: `1px solid ${T.border}`, maxHeight: 560, overflow: "auto", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{text}</pre>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" className="btn" style={{ flex: 1, background: copied ? T.green : T.accent }} onClick={copy}>{copied ? "✅ Copiado" : "📋 Copiar laudo"}</button>
              <button type="button" className="btn ghost" onClick={() => setD({})}>Limpar</button>
            </div>
          </Card>
        </div>
      </div>
      <PageMark />
    </div>
  );
};

// ─── Diferencial ────────────────────────────────────────────────────
const DIFF_SPINE = [
  ["Extensão sagital", "<1 segmento vertebral", "≥3 segmentos (LETM)", "≥3 segmentos (LETM)"],
  ["Localização axial", "Periférica (SB) ± SC central", "Central, poupa SB periférica", "Central, sinal em H (SC)"],
  ["Bordas", "Bem delimitadas", "Mal definidas + efeito de massa", "Mal definidas + efeito de massa"],
  ["Componente cístico", "Raro", "Bright spotty lesions", "Raro"],
  ["Cone medular", "Possível, não preferencial", "Não preferencial", "Sugestivo"],
  ["Realce Gd", "Nodular ou anelar", "Anel alongado sagital", "Anelar/placas (menos frequente)"],
  ["Perda volumétrica", "Localizada, crônica", "Possível, difusa", "Possível"],
  ["Lesões incidentais no envelhecimento", "Não ocorrem", "—", "—"],
];
const DIFF_OPTIC = [
  ["Lateralidade", "Geralmente unilateral", "Bi ou unilateral, perda visual severa", "Bi ou unilateral, edema de disco proeminente"],
  ["Extensão", "Curta (<50% do nervo)", "Longitudinalmente extensa", "Longitudinalmente extensa"],
  ["Segmentos", "Intracanalicular e intraorbital", "Pode envolver quiasma", "Intraorbital predominante"],
  ["Quiasma / intracraniano", "Raro", "Frequente", "Incomum"],
  ["Perineurite", "Rara", "Possível", "Possível"],
  ["Lesão assintomática", "~40% (3D-DIR)", "Rara", "Rara"],
  ["OCB", "Frequentemente positivo", "≤25% (pode ser transitório)", "~10%"],
];
const DIFF_BRAIN = [
  { feat: "Realce persistente >3 meses", alert: "Considerar telangiectasia capilar ou outro diagnóstico", level: "high" },
  { feat: "Lesões <3 mm arredondadas, SB profunda frontal basal, sem CVS", alert: "NÃO ESPECÍFICAS para EM", level: "high" },
  { feat: "Paciente >50 anos sem lesões medulares", alert: "Considerar doença cerebrovascular", level: "high" },
  { feat: "Lesões talâmicas contíguas ao ventrículo", alert: "NÃO são periventriculares", level: "medium" },
  { feat: "Dipolo magnético na imagem de fase", alert: "Artefato de susceptibilidade — NÃO é PRL", level: "medium" },
  { feat: "Múltiplas veias em lesão confluente", alert: "NÃO avaliar CVS em lesões confluentes", level: "medium" },
  { feat: "Lesão <3 mm", alert: "NÃO avaliar CVS em lesões <3 mm", level: "medium" },
];

export const DiffPage = ({ expertMode }) => {
  const [tab, setTab] = useState("spine");
  const head = ["Característica", "EM", "NMOSD (AQP4+)", "MOGAD"];
  const hc = [T.textMut, T.accent, T.amber, T.rose];
  return (
    <div>
      <SectionHead sub="EM × NMOSD × MOGAD e principais mimetizadores, por região">Diagnóstico diferencial por RM</SectionHead>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["spine", "🦴 Medula"], ["optic", "👁 Nervo óptico"], ["brain", "🧠 Encéfalo"]].map(([k, l]) => <Pill key={k} active={tab === k} onClick={() => setTab(k)} color={T.amber}>{l}</Pill>)}
      </div>
      {tab === "spine" && (
        <>
          <Card title="Lesões medulares — EM × NMOSD × MOGAD" icon="⚖️" color={T.amber}><DataTable head={head} headColors={hc} rows={DIFF_SPINE} /></Card>
          <Card title="Outros diferenciais medulares" icon="🔍" color={T.purple} collapsible defaultOpen={expertMode}>
            <P mt={0}><strong style={{ color: T.amber }}>Mielopatia espondilótica:</strong> realce persistente em faixa horizontal ("pancake sign") ou na periferia de um lado ("croissant sign").</P>
            <P><strong style={{ color: T.amber }}>Neurossarcoidose:</strong> realce longitudinal envolvendo pia-máter e tecido medular adjacente; invasão do sulco posterior → "trident sign" (axial). Realce pode persistir por meses.</P>
            <P><strong style={{ color: T.amber }}>Sinal em H (MOGAD):</strong> lesão limitada à substância cinzenta central no axial, na fase aguda.</P>
            <P><strong style={{ color: T.amber }}>Bright spotty lesions (NMOSD):</strong> focos císticos muito hiperintensos em T2 dentro da lesão medular.</P>
          </Card>
        </>
      )}
      {tab === "optic" && (
        <>
          <Card title="Neurite óptica — EM × NMOSD × MOGAD" icon="⚖️" color={T.amber}><DataTable head={head} headColors={hc} rows={DIFF_OPTIC} /></Card>
          <AlertBox type="info"><strong>Ponto-chave:</strong> lesões assintomáticas do nervo óptico detectadas por RM são raramente vistas em NMOSD ou MOGAD — quando presentes, aumentam a especificidade para EM.</AlertBox>
        </>
      )}
      {tab === "brain" && (
        <>
          <Card title="Armadilhas na interpretação de lesões encefálicas" icon="⚠️" color={T.rose}>
            {DIFF_BRAIN.map((m, i) => {
              const c = m.level === "high" ? T.rose : T.amber;
              return <div key={i} style={{ padding: "8px 12px", borderRadius: 6, background: c + "12", marginBottom: 4, borderLeft: `3px solid ${c}` }}><div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{m.feat}</div><div style={{ fontSize: 11, color: c }}>{m.alert}</div></div>;
            })}
          </Card>
          <Card title="Especificidade por idade e topografia" icon="📊" collapsible defaultOpen={false}>
            <P mt={0}>Em CIS com ≥45 anos, <strong>≥3 lesões periventriculares</strong> melhoram a especificidade para EM, preservando a acurácia e reduzindo discretamente a sensibilidade, em comparação com 1 lesão periventricular.</P>
            <P><strong>Lesões corticais</strong> são comuns na EM e não foram observadas na migrânea.</P>
            <P>Em idosos com fatores de risco vascular, <strong>lesões pontinas periféricas</strong> favorecem EM; <strong>pontinas centrais</strong> favorecem doença vascular.</P>
          </Card>
          <Card title="CVS e PRL na diferenciação" icon="🔬" color={T.purple} collapsible defaultOpen={expertMode}>
            <P mt={0}><strong>CVS:</strong> a proporção CVS+ diminui com a idade e comorbidades vasculares (especialmente HAS). Ainda assim, &gt;40% CVS+ identifica quase todos os pacientes com EM, e o Select 6 permanece válido em idosos.</P>
            <P><strong>PRL:</strong> não relatadas no envelhecimento saudável; altamente específicas para EM. ≥4 PRL associam-se a maior incapacidade. Meia-vida estimada de 7–10 anos.</P>
            <P><strong>POMS:</strong> CVS e PRL relatados em coortes pequenas com resultados variáveis. Limiar conservador de ≥50% CVS+ recomendado (vs 40% em adultos). A maioria dos POMS tem ≥1 PRL, com 100% de especificidade frente a outras doenças desmielinizantes adquiridas.</P>
          </Card>
        </>
      )}
      <PageMark />
    </div>
  );
};

// ─── Red flags & armadilhas ─────────────────────────────────────────
export const FlagsPage = ({ expertMode }) => (
  <div>
    <SectionHead sub="Sinais de alerta para evitar erro diagnóstico">Red flags & armadilhas de imagem</SectionHead>
    <AlertBox type="danger"><strong>A causa mais frequente de erro diagnóstico em EM é a interpretação incorreta da RM.</strong> O pré-requisito de TODOS os critérios McDonald é "nenhuma explicação melhor".</AlertBox>
    <Card title="Red flags radiológicas" icon="🚩" color={T.rose}>
      <FlagList color={T.rose} items={[
        "Realce por gadolínio persistente >3 meses → considerar telangiectasia capilar, neoplasia ou outro",
        "Lesões <3 mm arredondadas, SB profunda frontal/basal, sem CVS → NÃO ESPECÍFICAS para EM",
        "Lesões talâmicas adjacentes ao ventrículo → NÃO são periventriculares",
        "Paciente >50 anos sem lesões medulares e com múltiplas lesões cerebrais → considerar fortemente doença cerebrovascular",
        "Restrição à difusão isolada → pode ser isquemia aguda (lesões agudas de EM também podem restringir)",
        "Lesões medulares longitudinalmente extensas (≥3 segmentos) → considerar NMOSD ou MOGAD",
        "Envolvimento quiasmático → fortemente sugestivo de NMOSD",
        "Envolvimento do cone medular → sugestivo de MOGAD",
        "Lesão medular com sinal em H (SC central) → sugestivo de MOGAD",
        "Bright spotty lesions na medula → sugestivo de NMOSD",
      ]} />
    </Card>
    <Card title="Armadilhas na avaliação do CVS" icon="🔬" color={T.purple}>
      <FlagList color={T.purple} mark="•" items={[
        "NÃO avaliar CVS em lesões <3 mm",
        "NÃO avaliar CVS em lesões confluentes com múltiplas veias",
        "NÃO avaliar CVS onde as veias são mal visíveis",
        "CVS deve ser visível em 2 planos perpendiculares (linha ou ponto <2 mm de diâmetro)",
        ">50 anos e/ou HAS: a proporção CVS+ diminui → cautela, mas o Select 6 permanece válido",
        "Com SWI e lesões iso/hipointensas em T2: combinar aritmeticamente com FLAIR para detecção adequada",
      ]} />
    </Card>
    <Card title="Armadilhas na avaliação de PRL" icon="🔵" color={T.teal}>
      <FlagList color={T.teal} mark="•" items={[
        "Considerar apenas PRL INEQUÍVOCAS para fins diagnósticos",
        "Pequenas estruturas para/diamagnéticas (ferro, hemossiderina, veias, debris de mielina) → NÃO são PRL",
        "Lesões com artefato de dipolo magnético (melhor visto em reformatação coronal/sagital) → NÃO são PRL",
        "Regiões com artefato de susceptibilidade (temporal anterior, orbitofrontal, infratentorial) → cautela",
        "Sem pós-Gd: definir PRL apenas se a lesão já existia em T2 ≥3 meses antes",
        "Sem exame prévio: classificar como 'PRL possível' e confirmar cronicidade em exame ≥3 meses depois",
      ]} />
    </Card>
    <Card title="Qualidade do laudo — recomendações MAGNIMS 2024" icon="📋" collapsible defaultOpen={!expertMode}>
      <P mt={0}><strong>Descrever:</strong> número, localização, tamanho e morfologia das lesões.</P>
      <P><strong>Nomenclatura:</strong> usar "periventricular" ou "SB profunda" — NÃO "subcortical".</P>
      <P><strong>Conclusão:</strong> definir se os achados preenchem os aspectos radiológicos dos critérios diagnósticos.</P>
      <P><strong>Recomendação:</strong> indicar follow-up quando pertinente (para DIT ou avaliação de achados adicionais não avaliados inicialmente).</P>
      <P><strong>Interpretação geral:</strong> achados típicos ou atípicos para EM.</P>
    </Card>
    <Card title="Ferramentas quantitativas automatizadas" icon="🤖" collapsible defaultOpen={false}>
      <P mt={0}>Ferramentas comerciais que fornecem localização, volume e número de lesões (novas), e volumetria encefálica global e regional comparada a populações normativas, podem melhorar a acurácia e a objetividade da avaliação por RM. Sua utilidade e benefício ainda requerem validação clínica mais extensa no mundo real.</P>
    </Card>
    <PageMark />
  </div>
);
