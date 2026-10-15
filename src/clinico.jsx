import React, { useState, useMemo } from "react";
import { T, Card, Badge, InfoRow, SectionHead, SubTitle, Pill, CheckItem, RadioItem, AlertBox, FlagList, DataTable, P, NumInput, PageMark } from "./ui.jsx";

// ═══════════════════════════════════════════════════════════════════
// MÓDULO CLÍNICO — Diagnóstico, LCR, OCT/PEV, monitoramento
// Fontes: Barkhof et al. Lancet Neurol 2025;24:866–79 ·
//         Deisenhammer et al. eBioMedicine 2025;120:105905 ·
//         Saidha et al. Lancet Neurol 2025;24:880–92
// ═══════════════════════════════════════════════════════════════════

export const ANATOMICAL_LOCATIONS = [
  { id: "periventricular", label: "Periventricular", desc: "Lesões em contato direto com ventrículos laterais, incluindo corpo caloso. Lesões em substância cinzenta profunda (tálamo) NÃO são periventriculares." },
  { id: "juxtacortical", label: "Justacortical / Cortical", desc: "Lesões afetando fibras em U (justacortical) ou córtex. DIR, PSIR ou MPRAGE 3D melhoram a visualização cortical." },
  { id: "infratentorial", label: "Infratentorial", desc: "Tronco encefálico, pedúnculos cerebelares, cerebelo. Preferência por: assoalho do IV ventrículo, superfície pontina, tratos trigeminais, pedúnculos cerebelares médio/superior, substância cinzenta periaquedutal." },
  { id: "spinalcord", label: "Medula Espinal", desc: "Lesões medulares têm importante valor prognóstico. Cobertura completa (cervical ao cone) recomendada. Essencial em pacientes >50 anos e com comorbidade vascular." },
  { id: "opticnerve", label: "Nervo Óptico (NOVO 2024)", desc: "5ª localização anatômica nos critérios 2024. Demonstrável por RM com supressão de gordura, OCT (diferença inter-ocular) ou PEV (latência P100)." },
];

const DIS_REQ = {
  attack: {
    "4-5": { label: "4–5 localizações", req: "Nenhuma evidência adicional necessária", color: T.green },
    "2-3": { label: "2–3 localizações", req: "Qualquer UM de: DIT, LCR+, ou CVS (Select 6)", color: T.amber },
    "1": { label: "1 localização", req: "Combinação de: (DIT ou LCR+) E (CVS ou PRL). Para progressão desde início (≥12 meses): ≥2 lesões medulares + qualquer um de DIT, LCR+ ou CVS.", color: T.rose },
    "0": { label: "0 localizações", req: "Diagnóstico NÃO pode ser feito", color: T.rose },
  },
  ris: {
    "4-5": { label: "4–5 localizações", req: "Qualquer UM de: DIT, LCR+, ou CVS", color: T.amber },
    "2-3": { label: "2–3 localizações", req: "Qualquer UM de: DIT, LCR+, ou CVS", color: T.amber },
    "1": { label: "1 localização", req: "Diagnóstico NÃO pode ser feito", color: T.rose },
    "0": { label: "0 localizações", req: "Diagnóstico NÃO pode ser feito", color: T.rose },
  },
};

const CSF_DATA = {
  kflc: { cutoff: "≥ 6,1", formula: "(κ-FLC LCR / κ-FLC soro) / (Albumina LCR / Albumina soro)", sensitivity: "88% (52–100%)", specificity: "89% (69–100%)", concordanceOCB: "~90%" },
  ocb: { method: "Focalização isoelétrica + imunoblot IgG", positive: "Padrão tipo 2 ou 3 (≥2 bandas no LCR ausentes no soro)", sensitivity: "85% (37–100%)", specificity: "92% (74–100%)" },
};

const CVS_CRITERIA = { rule: "Select 6", positive: "≥ 6 lesões de substância branca CVS-positivas", fewLesions: "Se < 10 lesões de substância branca na RM, a maioria deve ser CVS-positiva", fieldStrength: "Melhor detecção em ≥ 3T; possível em 1.5T especialmente pós-gadolínio" };

const MRI_PROTOCOL = {
  brain: {
    field: "≥ 1.5T (melhor detecção de CVS em ≥ 3T)",
    core: ["3D T2-FLAIR (preferencial) — identificação de lesões", "Axial T2 (eco simples ou duplo) — confirmação de lesões em fossa posterior", "Sequência sensível a susceptibilidade 3D (EPI 3D segmentado ou SWI otimizado) para CVS — resolução isotrópica ≤1.0 mm com ponderação T2* adequada", "T1 pós-gadolínio axial (mínimo 5 min delay após injeção de 0,1 mmol/kg) — agentes macrocíclicos fortemente preferidos"],
    additional: ["DWI para exclusão de isquemia aguda (espessura ≥ 5 mm, gap ≤10–30%)", "DIR ou PSIR para detecção de lesões corticais", "3D T1 fortemente ponderado (MPRAGE) para volumetria e lesões corticais", "Imagens de fase filtrada ou QSM (reconstruídas da mesma sequência de susceptibilidade) para detecção de PRL"],
    resolution: "≤ 1×1 mm in-plane; 3D: 1 mm isotrópico (preferencial); 2D: ≤ 3 mm sem gap",
    coverage: "Cérebro todo (incluir o máximo possível da região cervical)",
    notes: "Orientação axial padronizada na linha subcalosal (ou CA-CP) é essencial para comparação com exames de seguimento e detecção de novas lesões T2. Aquisições 3D com voxels isotrópicos permitem melhor realinhamento. T1 pré-contraste de rotina NÃO é necessário (lesões de EM raramente são espontaneamente hiperintensas em T1). FLAIR* (multiplicação voxel-a-voxel de FLAIR × T2*) simplifica a leitura de CVS ao mostrar veia e lesão em uma única imagem. Gadolínio antes ou durante a aquisição de susceptibilidade melhora detecção do CVS, especialmente em 1.5T.",
  },
  spine: {
    field: "≥ 1.5T (sem valor adicional de 3T vs 1.5T para medula)",
    core: ["2 sequências sagitais complementares (qualquer combinação de: T2 FSE, Densidade de Prótons, STIR, PSIR ou MP[2]RAGE)", "Axial 2D T2 spin-echo ou T2* gradiente-eco — pelo menos cobrindo segmento cervical (ou reconstrução multiplanar de MPRAGE)", "T1 sagital pós-Gd moderadamente ponderado (sem necessidade de dose adicional se feita imediatamente após RM cerebral com Gd)"],
    additional: ["Axial T1 pós-Gd moderadamente ponderado através das lesões identificadas"],
    avoid: ["FLAIR (insuficiente para detecção de lesões medulares)", "Sequências mielográficas / muito pesadas em T2 (ex.: CISS — geram artefatos e dificultam a detecção de lesões)"],
    resolution: "Sagital ≤ 3 mm sem gap; Axial ≤ 5 mm sem gap; In-plane ≤ 1×1 mm",
    coverage: "Cervical ao cone medular (cobertura completa)",
    notes: "A RM medular é especialmente importante: (1) para confirmar lesão desmielinizante em pacientes com sintomas medulares; (2) em adultos >50 anos e com patologia cerebrovascular (alterações vasculares raramente afetam a medula); (3) para prognóstico — lesões medulares predizem pior evolução e podem influenciar decisão terapêutica; (4) como referência para comparação em exames de seguimento. A probabilidade de encontrar lesões medulares novas isoladas (sem lesões cerebrais novas) é baixa → repetição rotineira de RM medular para DIT NÃO é recomendada.",
  },
  opticNerve: {
    field: "≥ 1.5T",
    core: ["Coronal T2 com supressão de gordura (fat-sat) ou STIR — perpendicular ao nervo óptico", "T1 coronal pós-Gd com supressão de gordura (em neurite óptica aguda)"],
    additional: ["3D-DIR (cobertura completa cérebro + nervos ópticos — aumenta sensibilidade para lesões assintomáticas)", "Axial fat-sat T2 ou STIR alinhado ao nervo óptico e quiasma", "T1 pós-Gd fat-sat (axial e coronal)"],
    resolution: "≤ 1×1 mm; espessura ≤ 2–3 mm sem gap",
    coverage: "Nervos ópticos e quiasma óptico; planos coronais perpendiculares ao nervo óptico",
    notes: "RM do nervo óptico é RECOMENDADA se apresentação inicial com neurite óptica, especialmente se OCT e PEV não estiverem disponíveis ou forem equívocos. Demonstrar lesão desmielinizante típica no nervo óptico confirma a suspeita clínica de neurite óptica e pode servir como uma das 5 localizações anatômicas para DIS — mesmo em pacientes SEM história clínica de neurite óptica. Lesão nova ou realçante no nervo óptico também pode preencher critérios de DIT. Em casos sem neurite óptica, a RM do nervo óptico é OPCIONAL (baixo rendimento para lesões assintomáticas na RM convencional). Lesões assintomáticas do nervo óptico são raramente vistas em NMOSD ou MOGAD.",
  },
};

// ─── Diagnóstico McDonald 2024 ──────────────────────────────────────
export function evaluateMcDonald({ presentation, locCount: n, dit, csf, cvs, prl, spinalLesions }) {
  if (!presentation) return null;
  const pres = presentation === "ris" || presentation === "nonspecific" ? "ris" : "attack";
  if (n === 0) return { met: false, msg: "Diagnóstico NÃO pode ser feito: nenhuma localização anatômica típica identificada.", color: T.rose };
  if (pres === "attack" && n >= 4) return { met: true, msg: "Critérios de DIS cumpridos com ≥4 localizações. Nenhuma evidência adicional necessária para surto/progressão. Diagnóstico de EM PODE SER FEITO (após exclusão de diagnósticos diferenciais).", color: T.green };
  if (pres === "ris" && n >= 4) {
    if (dit || csf || cvs) return { met: true, msg: "RIS/apresentação não específica com ≥4 localizações + evidência adicional presente (DIT, LCR+ ou CVS). Diagnóstico de EM PODE SER FEITO.", color: T.green };
    return { met: false, msg: "RIS com ≥4 localizações, mas necessita de pelo menos UM de: DIT, LCR+ ou CVS.", color: T.amber };
  }
  if (n >= 2 && n <= 3) {
    if (dit || csf || cvs) return { met: true, msg: `${n} localizações com evidência adicional (${[dit && "DIT", csf && "LCR+", cvs && "CVS"].filter(Boolean).join(", ")}). Diagnóstico de EM PODE SER FEITO.`, color: T.green };
    return { met: false, msg: `${n} localizações, mas necessita de pelo menos UM de: DIT, LCR+ ou CVS.`, color: T.amber };
  }
  // n === 1
  if (pres === "ris") return { met: false, msg: "Apenas 1 localização em RIS/apresentação não específica: diagnóstico NÃO pode ser feito.", color: T.rose };
  const ditOrCsf = dit || csf, cvsOrPrl = cvs || prl;
  if (presentation === "progressive") {
    if (spinalLesions && (dit || csf || cvs)) return { met: true, msg: "Progressão desde o início com 1 localização, ≥2 lesões medulares e evidência adicional. Diagnóstico de EM PODE SER FEITO.", color: T.green };
    if (ditOrCsf && cvsOrPrl) return { met: true, msg: "1 localização com (DIT ou LCR+) E (CVS ou PRL). Diagnóstico de EM PODE SER FEITO.", color: T.green };
    return { met: false, msg: "1 localização requer: (DIT ou LCR+) E (CVS ou PRL). Para progressão: ≥2 lesões medulares + (DIT, LCR+ ou CVS).", color: T.amber };
  }
  if (ditOrCsf && cvsOrPrl) return { met: true, msg: "1 localização com combinação de (DIT ou LCR+) E (CVS ou PRL). Diagnóstico de EM PODE SER FEITO.", color: T.green };
  return { met: false, msg: "1 localização requer combinação de: (DIT ou LCR+) E (CVS ou PRL).", color: T.amber };
}

export const DiagnosisPage = ({ go }) => {
  const [presentation, setPresentation] = useState(null);
  const [locations, setLocations] = useState({});
  const [dit, setDit] = useState(false);
  const [csf, setCsf] = useState(false);
  const [cvs, setCvs] = useState(false);
  const [prl, setPrl] = useState(false);
  const [spinalLesions, setSpinalLesions] = useState(false);
  const locCount = Object.values(locations).filter(Boolean).length;
  const result = evaluateMcDonald({ presentation, locCount, dit, csf, cvs, prl, spinalLesions });
  const reset = () => { setPresentation(null); setLocations({}); setDit(false); setCsf(false); setCvs(false); setPrl(false); setSpinalLesions(false); };

  return (
    <div>
      <SectionHead sub="Simulador passo a passo com todas as combinações de apresentação, localizações e evidências adicionais">Diagnóstico — Critérios McDonald 2024</SectionHead>
      <SubTitle>1. Tipo de apresentação clínica</SubTitle>
      <div className="grid2">
        {[
          { v: "attack", l: "Surto (ataque)", s: "Primeiro evento clínico típico de desmielinização (CIS) ou recorrência" },
          { v: "progressive", l: "Progressão desde o início", s: "Progressão contínua ≥12 meses sem surtos claros iniciais (PPMS)" },
          { v: "ris", l: "RIS (Síndrome Radiológica Isolada)", s: "Lesões sugestivas de EM descobertas incidentalmente em RM" },
          { v: "nonspecific", l: "Sintomas não específicos", s: "Sintomas que não são típicos de desmielinização (fadiga, cefaleia, etc.)" },
        ].map(({ v, l, s }) => <RadioItem key={v} name="presentation" checked={presentation === v} onChange={() => setPresentation(v)} label={l} sub={s} />)}
      </div>

      <SubTitle>2. Localizações anatômicas com lesões típicas (DIS)</SubTitle>
      <P color={T.textSec} size={11} mt={0}>Marque todas as localizações com lesões típicas de EM. O nervo óptico pode ser confirmado por RM, OCT ou PEV.</P>
      <div style={{ marginTop: 8 }}>
        {ANATOMICAL_LOCATIONS.map((loc) => (
          <CheckItem key={loc.id} color={T.accent} checked={!!locations[loc.id]} onChange={() => setLocations((p) => ({ ...p, [loc.id]: !p[loc.id] }))} label={loc.label} sub={loc.desc} />
        ))}
      </div>
      <div style={{ marginTop: 8, padding: "8px 14px", borderRadius: 8, background: T.accentDim + "44", fontSize: 12 }}>
        <strong style={{ color: T.accent }}>Localizações selecionadas: {locCount}/5</strong>
        <span style={{ color: T.textSec, marginLeft: 8 }}>{locCount >= 4 ? "(suficiente para DIS isoladamente em surto/progressão)" : locCount >= 2 ? "(DIS cumprida; evidência adicional necessária)" : locCount === 1 ? "(DIS NÃO cumprida; necessita combinação)" : "(nenhuma localização selecionada)"}</span>
      </div>

      <SubTitle>3. Evidências adicionais</SubTitle>
      <div className="grid2">
        <CheckItem color={T.accent} checked={dit} onChange={setDit} label="DIT (Disseminação no Tempo)" sub="Lesões realçantes + não-realçantes simultâneas; ou nova lesão T2/Gd+ no follow-up; ou segundo surto clínico" />
        <CheckItem color={T.accent} checked={csf} onChange={setCsf} label="LCR positivo" sub="OCB tipo 2/3 positivo OU índice κ-FLC ≥ 6,1" />
        <CheckItem color={T.accent} checked={cvs} onChange={setCvs} label="CVS (Central Vein Sign)" sub="Select 6: ≥6 lesões CVS+; se <10 lesões, a maioria deve ser CVS+" />
        <CheckItem color={T.accent} checked={prl} onChange={setPrl} label="PRL (Paramagnetic Rim Lesion)" sub="≥1 lesão com anel paramagnético (requer imagem de fase/QSM)" />
      </div>
      {presentation === "progressive" && <CheckItem color={T.accent} checked={spinalLesions} onChange={setSpinalLesions} label="≥ 2 lesões medulares" sub="Necessário para progressão desde o início com apenas 1 localização" />}

      <SubTitle>4. Resultado da avaliação diagnóstica</SubTitle>
      {result ? (
        <div aria-live="polite" style={{ padding: 16, borderRadius: 12, border: `2px solid ${result.color}`, background: result.color + "14" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: result.color, lineHeight: 1.6 }}>{result.met ? "✅ " : "⚠️ "}{result.msg}</div>
          <div style={{ fontSize: 11, color: T.textSec, marginTop: 8 }}>Pré-requisito fundamental: "nenhuma explicação melhor" — exclusão rigorosa de diagnósticos diferenciais (NMOSD, MOGAD, neuroinfecções, encefalite autoimune, doenças vasculares).</div>
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, border: `1px dashed ${T.border}`, color: T.textMut, fontSize: 13, textAlign: "center" }}>Selecione o tipo de apresentação e as localizações para obter a avaliação diagnóstica.</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn ghost" onClick={reset}>Limpar</button>
        <button type="button" className="btn" onClick={() => go("radio", "interpret")}>Classificar lesões na RM (interpretação guiada) →</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Tabela de requisitos McDonald 2024 (referência rápida)" icon="📋" collapsible defaultOpen={false}>
          <DataTable head={["Localizações", "Surto / Progressão", "RIS / Não específico"]}
            rows={["4-5", "2-3", "1", "0"].map((k) => [DIS_REQ.attack[k].label, <span style={{ color: DIS_REQ.attack[k].color }}>{DIS_REQ.attack[k].req}</span>, <span style={{ color: DIS_REQ.ris[k].color }}>{DIS_REQ.ris[k].req}</span>])} />
        </Card>
      </div>
      <PageMark />
    </div>
  );
};

// ─── Protocolo de RM (visão clínica) ────────────────────────────────
export const MRIPage = ({ go }) => {
  const [region, setRegion] = useState("brain");
  const p = MRI_PROTOCOL[region];
  return (
    <div>
      <SectionHead sub="MAGNIMS-CMSC-NAIMS 2024 — sequências, parâmetros, CVS, PRL e interpretação">Protocolo de RM</SectionHead>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["brain", "🧠 Encéfalo"], ["spine", "🦴 Medula"], ["opticNerve", "👁 Nervo Óptico"]].map(([k, l]) => <Pill key={k} active={region === k} onClick={() => setRegion(k)}>{l}</Pill>)}
      </div>
      <Card title="Sequências core (obrigatórias)" icon="⚡">
        <InfoRow label="Campo magnético" value={p.field} />
        <InfoRow label="Resolução" value={p.resolution} />
        <InfoRow label="Cobertura" value={p.coverage} color={T.accent} />
        <div style={{ marginTop: 10 }}>
          {p.core.map((s, i) => <div key={i} style={{ padding: "6px 12px", borderRadius: 6, background: T.accentDim + "33", marginBottom: 4, fontSize: 12, color: T.text }}><span style={{ color: T.accent, fontWeight: 700, marginRight: 6 }}>•</span>{s}</div>)}
        </div>
        {p.avoid && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: T.rose, fontWeight: 700, marginBottom: 4 }}>⛔ NÃO UTILIZAR:</div>
            {p.avoid.map((s, i) => <div key={i} style={{ padding: "4px 12px", fontSize: 12, color: T.rose }}>✗ {s}</div>)}
          </div>
        )}
      </Card>
      <Card title="Sequências adicionais" icon="➕" color={T.indigo} collapsible defaultOpen={false}>
        {p.additional.map((s, i) => <div key={i} style={{ padding: "6px 12px", borderRadius: 6, background: T.indigo + "14", marginBottom: 4, fontSize: 12, color: T.text }}><span style={{ color: T.indigo, fontWeight: 700, marginRight: 6 }}>+</span>{s}</div>)}
      </Card>
      <Card title="Notas clínicas importantes" icon="📌" color={T.amber}><P mt={0}>{p.notes}</P></Card>

      {region === "spine" && (
        <>
          <Card title="Aspectos técnicos da RM medular" icon="🔧" color={T.indigo}>
            <P mt={0}><strong>Cobertura completa (cervical ao cone):</strong> essencial para avaliação diagnóstica completa e referência para follow-up.</P>
            <P><strong>Bobinas multi-array:</strong> obrigatórias para qualidade de imagem adequada.</P>
            <P><strong>Bandas de saturação pré-vertebrais:</strong> necessárias para redução de artefatos de movimentação/fluxo.</P>
            <P><strong>2 sequências sagitais complementares:</strong> qualquer combinação de T2 FSE, densidade de prótons (PD), STIR, PSIR ou MP[2]RAGE. São ESSENCIAIS para distinguir lesões pequenas de EM de artefatos.</P>
            <P><strong>Axiais:</strong> obrigatórios pelo menos no segmento cervical com T2 SE ou T2* GRE moderadamente ponderado (ou reconstrução multiplanar a partir de MPRAGE 3D).</P>
            <P><strong>Gadolínio:</strong> não é necessária administração adicional se a RM medular for realizada imediatamente após a RM cerebral com gadolínio. T1 sagital moderadamente ponderado pós-Gd é recomendado para detecção de lesões realçantes.</P>
            <AlertBox type="danger"><strong>⛔ EVITAR:</strong> FLAIR e sequências mielográficas (CISS, T2 muito pesado) são inadequadas para detecção de lesões desmielinizantes medulares.</AlertBox>
          </Card>
          <Card title="Características das lesões medulares na EM" icon="🎯">
            <P mt={0}><strong>Sinal:</strong> hiperintensas em PD, T2, T2*, STIR; hipointensas em T1 fortemente ponderado (MPRAGE, PSIR).</P>
            <P><strong>Extensão:</strong> geralmente &lt;1 segmento vertebral em imagens sagitais. Múltiplas lesões curtas são típicas de EM.</P>
            <P><strong>Bordas:</strong> tipicamente bem delimitadas, com possível perda volumétrica local associada. Lesões inflamatórias agudas podem ter bordas mal definidas e leve efeito de massa localizado.</P>
            <P><strong>Localização axial:</strong> frequentemente arredondadas ou em cunha; envolvem substância branca periférica e podem estender-se à substância cinzenta central.</P>
            <P><strong>Nível:</strong> podem ocorrer em qualquer nível medular.</P>
            <P><strong>Realce por Gd:</strong> lesões ativas podem apresentar realce nodular ou anelar.</P>
            <P><strong>Valor para DIS 2024:</strong> 1 lesão medular típica curta contribui como localização anatômica de DIS. Para progressão desde o início: ≥2 lesões medulares são necessárias quando apenas 1 localização anatômica está presente.</P>
          </Card>
          <Card title="Valor prognóstico e follow-up da RM medular" icon="📊" color={T.green} collapsible defaultOpen={false}>
            <P mt={0}><strong>A presença de lesões medulares é um forte preditor de pior prognóstico a longo prazo.</strong> Perda tecidual medular é um dos mais fortes preditores de acúmulo de incapacidade, podendo ocorrer mesmo sem manifestação clínica.</P>
            <P>Novas lesões medulares (e de tronco encefálico) no seguimento de curto prazo predizem pior evolução em 15 anos após CIS.</P>
            <P>Lesões T2 medulares incidentais são extremamente raras no envelhecimento (diferem das lesões cerebrais inespecíficas da idade).</P>
            <P><strong>Follow-up:</strong> repetição de RM medular de rotina NÃO é recomendada para DIT. A RM medular inicial é a referência caso surjam novos sintomas medulares, quando a RM medular passa a ser indicada.</P>
          </Card>
          <div style={{ marginBottom: 12 }}><button type="button" className="btn" onClick={() => go("radio", "diff")}>Diferencial medular EM × NMOSD × MOGAD →</button></div>
        </>
      )}

      {region === "opticNerve" && (
        <>
          <Card title="Quando solicitar RM do nervo óptico" icon="👁">
            <P mt={0}><strong>Recomendada:</strong> apresentação inicial de neurite óptica, especialmente se OCT e PEV não estiverem disponíveis ou forem equívocos.</P>
            <P><strong>Opcional:</strong> em casos sem neurite óptica — rendimento baixo para lesões assintomáticas.</P>
            <P><strong>3D-DIR:</strong> quando disponível, detecta anomalias de sinal no nervo óptico em ~40% dos pacientes com EM sem história de NO. NÃO é sequência core (não universalmente disponível).</P>
          </Card>
          <div style={{ marginBottom: 12 }}><button type="button" className="btn" onClick={() => go("radio", "diff")}>Diferencial da neurite óptica →</button></div>
        </>
      )}

      {region === "brain" && (
        <>
          <Card title="Central Vein Sign (CVS) — detalhamento técnico" icon="🔬" collapsible defaultOpen={false}>
            <InfoRow label="Critério" value={CVS_CRITERIA.rule} />
            <InfoRow label="Positivo" value={CVS_CRITERIA.positive} color={T.green} />
            <InfoRow label="Poucas lesões" value={CVS_CRITERIA.fewLesions} />
            <InfoRow label="Campo" value={CVS_CRITERIA.fieldStrength} />
            <P color={T.textSec} size={11}><strong style={{ color: T.text }}>Técnica recomendada:</strong> 3D segmented EPI com resolução isotrópica ≤1,0 mm e ponderação T2*/susceptibilidade adequada. Multiplicação voxel a voxel com FLAIR (FLAIR*) permite identificação simultânea de veia e lesão. Gadolínio imediatamente antes ou durante a aquisição melhora a detecção, especialmente em 1.5T.</P>
          </Card>
          <Card title="Paramagnetic Rim Lesions (PRL)" icon="🔵" collapsible defaultOpen={false}>
            <P mt={0}><strong>Definição:</strong> lesão com anel paramagnético visível em fase filtrada ou QSM, indicando atividade inflamatória crônica com macrófagos/micróglia na borda.</P>
            <P><strong>Critério McDonald 2024:</strong> ≥1 PRL contribui para o diagnóstico quando combinada com outras evidências (especialmente com apenas 1 localização).</P>
            <P><strong>Detecção:</strong> melhor em ≥3T; imagens de fase podem ser reconstruídas das mesmas sequências usadas para CVS. Gadolínio NÃO é necessário para PRL.</P>
            <P color={T.amber}><strong>Valor prognóstico:</strong> PRL têm relevância prognóstica além do diagnóstico, associadas a maior atividade inflamatória crônica.</P>
          </Card>
          <Card title="Características típicas de lesões de EM" icon="🎯" collapsible defaultOpen={false}>
            <P mt={0}><strong>Tamanho:</strong> geralmente ≥3 mm no maior diâmetro. Lesões &lt;3 mm no assoalho do IV ventrículo, margem externa da ponte ou corpo caloso PODEM ser consideradas desmielinizantes.</P>
            <P><strong>Periventriculares:</strong> contato direto com ventrículos laterais sem substância branca normal interposta. "Dawson fingers" com eixo longo perpendicular aos ventrículos laterais.</P>
            <P><strong>Realce Gd:</strong> transitório (mediana &lt;4 semanas), raramente &gt;2–3 meses. Padrão nodular ou em anel (aberto). Realce &gt;3 meses → considerar diagnóstico alternativo (ex.: telangiectasia capilar).</P>
            <P><strong>Lesões &lt;3 mm arredondadas, profundas na SB:</strong> especialmente frontais basais e sem CVS → NÃO ESPECÍFICAS.</P>
            <P><strong>Substância cinzenta profunda:</strong> lesões talâmicas NÃO são periventriculares mesmo se adjacentes ao ventrículo.</P>
          </Card>
        </>
      )}

      <Card title="Tabela completa de protocolo RM (referência)" icon="📊" collapsible defaultOpen={false}>
        <DataTable fontSize={10.5} head={["Parâmetro", "Encéfalo", "Medula", "N. óptico"]} rows={[
          ["Campo", "≥1.5T", "≥1.5T", "≥1.5T"],
          ["Aquisição", "3D preferível", "2D ou 3D", "2D ou 3D"],
          ["Espessura", "3D: 1 mm iso; 2D: ≤3 mm", "Sag ≤3 mm; Ax ≤5 mm", "≤2–3 mm, sem gap"],
          ["Resolução in-plane", "≤1×1 mm", "≤1×1 mm", "≤1×1 mm"],
          ["Cobertura", "Cérebro todo + cervical", "Cervical ao cone", "Nervos ópticos + quiasma"],
          ["Orientação axial", "Subcalosal ou CA-CP", "⊥ eixo sagital", "Alinhado ao nervo óptico"],
        ]} />
      </Card>
      <div style={{ marginBottom: 12 }}><button type="button" className="btn" onClick={() => go("radio", "checklist")}>Abrir checklist de protocolo (sequência a sequência) →</button></div>
      <PageMark />
    </div>
  );
};

// ─── LCR ────────────────────────────────────────────────────────────
export function kflcIndex(a, b, c, d) {
  const v = [a, b, c, d].map((x) => parseFloat(String(x).replace(",", ".")));
  if (v.some((x) => !isFinite(x)) || v[1] <= 0 || v[2] <= 0 || v[3] <= 0 || v[0] < 0) return null;
  return (v[0] / v[1]) / (v[2] / v[3]);
}

export const CSFPage = () => {
  const [kc, setKc] = useState(""), [ks, setKs] = useState(""), [ac, setAc] = useState(""), [as, setAs] = useState("");
  const idx = useMemo(() => kflcIndex(kc, ks, ac, as), [kc, ks, ac, as]);
  const pos = idx !== null && idx >= 6.1;
  return (
    <div>
      <SectionHead sub="Índice κ-FLC, OCB, NfL — Deisenhammer et al. eBioMedicine 2025">LCR: κ-FLC / OCB / NfL</SectionHead>
      <Card title="Calculadora do índice κ-FLC" icon="🧮">
        <P mt={0} color={T.textSec} size={11}>Fórmula: (κ-FLC LCR / κ-FLC soro) / (Albumina LCR / Albumina soro). Usar a mesma unidade (mg/L) para cada par.</P>
        <div className="grid2" style={{ marginTop: 8 }}>
          <NumInput label="κ-FLC LCR (mg/L)" value={kc} onChange={setKc} placeholder="0,00" />
          <NumInput label="κ-FLC soro (mg/L)" value={ks} onChange={setKs} placeholder="0,00" />
          <NumInput label="Albumina LCR (mg/L)" value={ac} onChange={setAc} placeholder="0,00" />
          <NumInput label="Albumina soro (mg/L)" value={as} onChange={setAs} placeholder="0,00" />
        </div>
        {idx !== null && (
          <div aria-live="polite" style={{ marginTop: 14, padding: 12, borderRadius: 8, background: (pos ? T.green : T.rose) + "14", border: `1px solid ${pos ? T.green : T.rose}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: pos ? T.green : T.rose }}>Índice κ-FLC = {idx.toFixed(2).replace(".", ",")}</div>
            <div style={{ fontSize: 13, color: pos ? T.green : T.rose, fontWeight: 600 }}>{pos ? "✅ POSITIVO para síntese intratecal (≥ 6,1)" : "❌ NEGATIVO (< 6,1) — considerar OCB se alta suspeita clínica"}</div>
          </div>
        )}
      </Card>
      <Card title="κ-FLC: detalhamento" icon="📊">
        <InfoRow label="Cut-off recomendado" value={CSF_DATA.kflc.cutoff} color={T.accent} />
        <InfoRow label="Sensibilidade" value={CSF_DATA.kflc.sensitivity} />
        <InfoRow label="Especificidade" value={CSF_DATA.kflc.specificity} />
        <InfoRow label="Concordância com OCB" value={CSF_DATA.kflc.concordanceOCB} />
        <InfoRow label="Fórmula" value={CSF_DATA.kflc.formula} />
        <P color={T.textSec} size={11}><strong style={{ color: T.amber }}>Nota:</strong> a discordância κ-FLC/OCB é de ~10%. Com forte suspeita de EM e κ-FLC negativo, solicitar OCB, e vice-versa. Usar assays turbidimétricos ou nefelométricos certificados. O cut-off de 6,1 pode ser aplicado a todos os assays certificados para LCR após validação local.</P>
      </Card>
      <Card title="OCB (bandas oligoclonais)" icon="🔬">
        <InfoRow label="Método" value={CSF_DATA.ocb.method} />
        <InfoRow label="Positivo" value={CSF_DATA.ocb.positive} color={T.green} />
        <InfoRow label="Sensibilidade" value={CSF_DATA.ocb.sensitivity} />
        <InfoRow label="Especificidade" value={CSF_DATA.ocb.specificity} />
        <div style={{ marginTop: 10 }}>
          <DataTable head={["Tipo", "Descrição", "Interpretação"]} rows={[
            ["1", "Sem bandas", "Normal"],
            ["2", "Bandas no LCR, ausentes no soro", "Intratecal — positivo"],
            ["3", "Bandas no LCR + bandas idênticas LCR/soro", "Intratecal — positivo"],
            ["4", "Bandas idênticas no LCR e soro", "Sistêmico — não diagnóstico"],
            ["5", "Bandas monoclonais", "Paraproteína — não diagnóstico"],
          ]} />
        </div>
        <P color={T.textSec} size={11}><strong style={{ color: T.amber }}>Diferencial:</strong> OCB em NMOSD: ≤25% (pode ser transitório). OCB em MOGAD: ~10%.</P>
      </Card>
      <Card title="NfL (neurofilamento de cadeia leve)" icon="⚡" collapsible defaultOpen={false}>
        <AlertBox type="warn"><strong>NfL NÃO deve ser utilizado para diagnóstico de EM.</strong> A sensibilidade diagnóstica é insuficiente (3,7–30,9% usando o percentil 95).</AlertBox>
        <P><strong>Utilidades:</strong> monitoramento de atividade de doença; resposta ao tratamento; prognóstico (níveis elevados → maior atividade radiológica e clínica); níveis diminuem com tratamento eficaz.</P>
        <P color={T.textSec} size={11}><strong>Confundidores:</strong> idade (↑), disfunção renal (↑), IMC (↓). NfL aumenta com dano axonal de QUALQUER causa. Valores muito elevados podem sugerir diagnóstico alternativo ("no better explanation").</P>
        <P color={T.textSec} size={11}><strong>Valor prognóstico combinado:</strong> κ-FLC alto + sNfL z-score alto → maior probabilidade de segundo surto. κ-FLC isolado ou combinado com sNfL prediz falha terapêutica (PIRA, surto, novas lesões T2); sNfL isolado NÃO.</P>
      </Card>
      <Card title="LCR em EM pediátrica (POMS)" icon="👶" collapsible defaultOpen={false}>
        <P mt={0}>OCB em POMS: 60–96% (proporção mais alta em estudos recentes após exclusão de MOGAD). Em estudo com 16 casos POMS, índice κ-FLC &gt;6,83: sensibilidade 100%, especificidade 92%. Todas as recomendações de LCR se aplicam a EM pediátrica e adulta, recorrente ou progressiva desde o início.</P>
        <P color={T.amber}>sNfL em crianças: diminui ~7%/ano do nascimento até 10 anos; valores estáveis comparáveis a adultos na adolescência precoce. Elevado em POMS e MOGAD (mais alto em MOGAD).</P>
      </Card>
      <PageMark />
    </div>
  );
};

// ─── OCT & PEV ──────────────────────────────────────────────────────
export function ied(a, b) {
  const x = parseFloat(String(a).replace(",", ".")), y = parseFloat(String(b).replace(",", "."));
  if (!isFinite(x) || !isFinite(y)) return null;
  return Math.round(Math.abs(x - y) * 10) / 10;
}

export const OCTPage = () => {
  const [pOD, setPOD] = useState(""), [pOS, setPOS] = useState(""), [gOD, setGOD] = useState(""), [gOS, setGOS] = useState("");
  const [device, setDevice] = useState("spectralis");
  const pI = useMemo(() => ied(pOD, pOS), [pOD, pOS]);
  const gI = useMemo(() => ied(gOD, gOS), [gOD, gOS]);
  const pTh = device === "spectralis" ? 5 : 6, gTh = 4;
  const fmt = (n) => n.toFixed(1).replace(".", ",");
  const Res = ({ label, v, th, extra }) => {
    const ok = v >= th;
    return (
      <div style={{ padding: 10, borderRadius: 8, background: (ok ? T.green : T.border) + (ok ? "14" : "44"), border: `1px solid ${ok ? T.green : T.border}` }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: ok ? T.green : T.textSec }}>IED {label} = {fmt(v)} µm</div>
        <div style={{ fontSize: 11, color: ok ? T.green : T.textSec }}>Limiar: ≥{th} µm {extra} → {ok ? "✅ acima do limiar" : "abaixo do limiar"}</div>
      </div>
    );
  };
  return (
    <div>
      <SectionHead sub="Nervo óptico como 5ª localização anatômica — Saidha et al. Lancet Neurol 2025">OCT & PEV</SectionHead>
      <Card title="Calculadora de diferença inter-ocular (IED)" icon="👁">
        <div style={{ fontSize: 11, color: T.textSec, marginBottom: 8 }}>Dispositivo OCT:</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[["spectralis", "Spectralis (Heidelberg)"], ["cirrus", "Cirrus HD-OCT (Zeiss)"]].map(([k, l]) => <Pill key={k} active={device === k} onClick={() => setDevice(k)}>{l}</Pill>)}
        </div>
        <div className="grid2">
          <NumInput label="pRNFL OD (µm)" value={pOD} onChange={setPOD} />
          <NumInput label="pRNFL OE (µm)" value={pOS} onChange={setPOS} />
          <NumInput label="GCIPL OD (µm)" value={gOD} onChange={setGOD} />
          <NumInput label="GCIPL OE (µm)" value={gOS} onChange={setGOS} />
        </div>
        {(pI !== null || gI !== null) && (
          <div className="grid2" style={{ marginTop: 14 }} aria-live="polite">
            {pI !== null && <Res label="pRNFL" v={pI} th={pTh} extra={`(${device === "spectralis" ? "Spectralis" : "Cirrus"})`} />}
            {gI !== null && <Res label="GCIPL" v={gI} th={gTh} extra="(ambos dispositivos)" />}
          </div>
        )}
      </Card>
      <Card title="Limiares de OCT recomendados" icon="📏">
        <DataTable fontSize={12} head={["Parâmetro", "Spectralis", "Cirrus", "Recomendação geral"]} rows={[["IED pRNFL", "≥ 5 µm", "≥ 6 µm", "≥ 6 µm"], ["IED GCIPL", "≥ 4 µm", "≥ 4 µm", "≥ 4 µm"]]} />
        <P color={T.textSec} size={11}><strong style={{ color: T.text }}>Valores de referência:</strong> pRNFL médio em controles saudáveis ~104,4 µm; GCIPL médio ~70,03 µm. ICC inter-visita GCIPL ~0,98–0,99. Coeficiente de variação do GCIPL geralmente superior ao do pRNFL.</P>
      </Card>
      <Card title="Potenciais evocados visuais (PEV)" icon="⚡">
        <P mt={0}><strong>Técnica padrão:</strong> PEV de reversão de padrão (checkerboard) de campo total. P100 (~100 ms) é o componente mais reprodutível (ICC ~0,90).</P>
        <P><strong>Latência P100 prolongada:</strong> indica lesão desmielinizante da via visual; correlaciona-se com o comprimento da lesão no nervo óptico e a extensão do dano à mielina.</P>
        <DataTable head={["Cenário", "PEV anormal"]} rows={[["Neurite óptica aguda (olhos sintomáticos)", "77–100%"], ["Após 12–24 meses de NO", "62–80% mantêm atraso"], ["CIS com NO", "66,7–87%"], ["CIS sem NO", "13,6–22,5%"], ["CIS geral (sem NO)", "15–49%"]]} />
        <AlertBox type="warn"><strong>Limitações:</strong> o atraso do P100 NÃO é específico de nervo óptico — ocorre em doenças retinianas (especialmente maculares) e erros refrativos graves (miopia severa). Interpretar no contexto clínico, combinado com OCT e RM.</AlertBox>
      </Card>
      <Card title="Diagnóstico diferencial: neurite óptica" icon="🔍" collapsible defaultOpen={false}>
        <P mt={0}><strong style={{ color: T.accent }}>EM:</strong> geralmente unilateral, edema papilar leve; resposta habitual à corticoterapia; recuperação parcial a completa.</P>
        <P><strong style={{ color: T.amber }}>MOGAD:</strong> pode ser bilateral, edema de disco mais proeminente; lesões longitudinalmente extensas no nervo óptico; OCB positivo em ~10%.</P>
        <P><strong style={{ color: T.rose }}>NMOSD (AQP4+):</strong> perda visual mais severa, pode afetar o quiasma; OCB positivo em ≤25% (pode ser transitório). Lesões assintomáticas do nervo óptico raramente vistas em NMOSD ou MOGAD.</P>
      </Card>
      <PageMark />
    </div>
  );
};

// ─── Monitoramento ──────────────────────────────────────────────────
export const FollowUpPage = () => (
  <div>
    <SectionHead sub="Estratégia de seguimento, DIT, biomarcadores e populações especiais">Monitoramento evolutivo</SectionHead>
    <Card title="DIT (disseminação no tempo)" icon="⏱">
      <P mt={0}><strong>Definição McDonald 2024:</strong> presença simultânea de lesões realçantes e não realçantes por gadolínio em qualquer momento; OU nova lesão T2-hiperintensa ou realçante em RM de seguimento; OU segundo surto clínico.</P>
      <P><strong>Quando repetir RM:</strong> se não houver lesões realçantes na RM inicial e não houver evidência de LCR ou CVS, repetir RM cerebral para demonstrar DIT. Nova lesão T2-FLAIR é suficiente → gadolínio pode ser omitido no follow-up.</P>
      <P color={T.textSec} size={11}>A probabilidade de lesões medulares novas isoladas (sem lesões cerebrais novas) é baixa → repetição de RM medular de rotina NÃO é recomendada para DIT.</P>
    </Card>
    <Card title="Valor dos biomarcadores" icon="📈">
      <DataTable head={["Biomarcador", "Diagnóstico", "Prognóstico", "Monitoramento"]} rows={[
        ["κ-FLC index", "✅ Alto (= OCB)", "✅ Preditor de atividade", "⚠️ Limitado"],
        ["OCB (tipo 2/3)", "✅ Alto", "✅ Preditor de segundo surto", "❌ Não indicado"],
        ["NfL (soro)", "❌ Insuficiente", "✅ Atividade e prognóstico", "✅ Resposta terapêutica"],
        ["CVS (RM)", "✅ Altamente específico", "⚠️ Dados limitados", "❌ Não rotineiro"],
        ["PRL (RM)", "✅ Específico", "✅ Inflamação crônica", "⚠️ Emergente"],
        ["OCT (IED)", "✅ Específico (NO)", "✅ Perda axonal", "✅ Seguimento da CFNR"],
        ["PEV (P100)", "✅ Sensível (NO aguda)", "⚠️ Melhora com remielinização", "✅ Recuperação funcional"],
      ]} />
    </Card>
    <Card title="κ-FLC + NfL: valor prognóstico combinado" icon="🔗" collapsible defaultOpen={false}>
      <P mt={0}><strong>κ-FLC index alto + sNfL z-score alto:</strong> maior probabilidade de segundo surto no primeiro ano de follow-up, seguida em ordem decrescente por sNfL alto isolado → κ-FLC alto isolado → ambos baixos.</P>
      <P><strong>Predição de falha terapêutica (surto, ≥2 novas lesões T2, PIRA):</strong> κ-FLC index isolado OU combinado com sNfL é preditivo; sNfL isolado NÃO.</P>
    </Card>
    <Card title="Lesões medulares — importância prognóstica" icon="🦴" collapsible defaultOpen={false}>
      <P mt={0}>Lesões medulares ao diagnóstico predizem pior prognóstico e podem influenciar decisões terapêuticas. A RM medular ao diagnóstico é a referência para novas lesões no seguimento. Particularmente importante em adultos &gt;50 anos (alterações vasculares cerebrais podem mimetizar EM) e em progressão primária.</P>
    </Card>
    <Card title="Populações especiais" icon="👥" collapsible defaultOpen={false}>
      <P mt={0}><strong style={{ color: T.accent }}>Idosos (&gt;50 anos):</strong> lesões vasculares podem mimetizar EM. RM medular é especialmente valiosa (lesões vasculares raramente afetam a medula). CVS auxilia na diferenciação.</P>
      <P><strong style={{ color: T.accent }}>Crianças:</strong> todas as recomendações de LCR (κ-FLC e OCB) se aplicam. OCB é um dos preditores mais fortes de EM em crianças. κ-FLC index &gt;6,83: sensibilidade 100%, especificidade 92% em POMS.</P>
      <P><strong style={{ color: T.accent }}>Comorbidade vascular / enxaqueca:</strong> lesões inespecíficas de substância branca são comuns. CVS e imagem medular auxiliam. Lesões &lt;3 mm arredondadas e profundas sem CVS são inespecíficas.</P>
    </Card>
    <PageMark />
  </div>
);

// ─── Glossário ──────────────────────────────────────────────────────
const GLOSSARY = [
  ["DIS", "Dissemination in Space — disseminação no espaço"], ["DIT", "Dissemination in Time — disseminação no tempo"],
  ["CVS", "Central Vein Sign — sinal da veia central"], ["PRL", "Paramagnetic Rim Lesion — lesão com anel paramagnético"],
  ["κ-FLC", "Kappa Free Light Chains — cadeias leves livres kappa"], ["OCB", "Oligoclonal Bands — bandas oligoclonais"],
  ["NfL", "Neurofilament Light — neurofilamento de cadeia leve"], ["CIS", "Clinically Isolated Syndrome — síndrome clínica isolada"],
  ["RIS", "Radiologically Isolated Syndrome — síndrome radiológica isolada"], ["RRMS", "Relapsing-Remitting MS — EM recorrente-remitente"],
  ["PPMS", "Primary Progressive MS — EM progressiva primária"], ["POMS", "Pediatric-Onset MS — EM de início pediátrico"],
  ["NMOSD", "Neuromyelitis Optica Spectrum Disorder"], ["MOGAD", "MOG Antibody-Associated Disease"],
  ["pRNFL", "Peripapillary Retinal Nerve Fibre Layer"], ["GCIPL", "Ganglion Cell + Inner Plexiform Layer"],
  ["IED", "Inter-Eye Difference — diferença inter-ocular"], ["PEV/VEP", "Potenciais evocados visuais"],
  ["OCT", "Optical Coherence Tomography"], ["FLAIR", "Fluid-Attenuated Inversion Recovery"],
  ["DIR", "Double Inversion Recovery"], ["PSIR", "Phase-Sensitive Inversion Recovery"],
  ["SWI", "Susceptibility-Weighted Imaging"], ["QSM", "Quantitative Susceptibility Mapping"],
  ["FLAIR*", "FLAIR × T2* (fusão para CVS)"], ["Qalb", "Quociente albumina LCR/soro"],
  ["PIRA", "Progression Independent of Relapse Activity"], ["EDSS", "Expanded Disability Status Scale"],
  ["EPI", "Echo-Planar Imaging"], ["MPRAGE", "Magnetisation-Prepared Rapid Gradient Echo"],
  ["LETM", "Longitudinally Extensive Transverse Myelitis — mielite ≥3 segmentos"], ["SB / SC", "Substância branca / substância cinzenta"],
];

export const GlossaryPage = () => {
  const [q, setQ] = useState("");
  const list = GLOSSARY.filter(([t, d]) => (t + " " + d).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <SectionHead sub="Terminologia padronizada e sinais de alerta clínicos">Glossário & red flags clínicas</SectionHead>
      <Card title="Siglas e definições" icon="📖">
        <input type="search" aria-label="Filtrar glossário" placeholder="Filtrar sigla ou termo…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgInput, color: T.text, fontSize: 12, marginBottom: 10, boxSizing: "border-box" }} />
        <div className="grid2" style={{ gap: 4, fontSize: 11.5, lineHeight: 1.7 }}>
          {list.map(([t, d]) => <div key={t}><strong style={{ color: T.accent }}>{t}:</strong> <span style={{ color: T.textSec }}>{d}</span></div>)}
          {list.length === 0 && <div style={{ color: T.textMut }}>Nenhum termo encontrado.</div>}
        </div>
      </Card>
      <Card title="Red flags do LCR" icon="🧪" color={T.amber}>
        <FlagList color={T.amber} items={[
          "LCR normal (sem OCB e sem κ-FLC elevado) → red flag importante; considerar diagnósticos psiquiátricos, vasculares ou outros",
          "Celularidade muito alta, glicose muito baixa ou proteína muito alta → sugerem condição diferente de EM",
          "NfL muito elevado → pode indicar condição neurológica alternativa com dano axonal extenso",
          "OCB sem EM: neuroinfecções, NMOSD (≤25%), vasculites do SNC, neurossífilis",
        ]} />
      </Card>
      <Card title="Red flags clínicas na neurite óptica" icon="🚩" color={T.rose}>
        <FlagList color={T.rose} items={[
          "NO bilateral simultânea com perda visual severa → considerar NMOSD (AQP4+)",
          "Edema de disco proeminente + lesões longitudinalmente extensas do nervo óptico → considerar MOGAD",
          "Atraso de PEV leve sem contexto clínico → pode ser retiniano ou refrativo (NÃO específico de nervo óptico)",
          "IED de OCT abaixo dos limiares com lesão visível na RM → nem toda lesão causa atrofia detectável",
          "IED de OCT acima dos limiares sem lesão visível na RM → a RM nem sempre detecta lesões; papel complementar dos testes",
        ]} />
      </Card>
      <AlertBox type="danger"><strong>Erro diagnóstico mais comum:</strong> interpretação incorreta dos achados de RM. Pré-requisito de TODOS os critérios McDonald: "nenhuma explicação melhor" — exclusão de NMOSD, MOGAD, neuroinfecções, encefalite autoimune, doenças vasculares, sarcoidose, linfoma do SNC, entre outros.</AlertBox>
      <PageMark />
    </div>
  );
};
