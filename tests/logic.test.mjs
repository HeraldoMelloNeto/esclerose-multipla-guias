// Testes da lógica (McDonald 2024, κ-FLC, IED, laudo). Executar: npm test
import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const out = await build({
  stdin: { contents: 'export * from "./src/clinico.jsx"; export { buildReport } from "./src/radiologico.jsx";', resolveDir: process.cwd(), loader: "js" },
  bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic", logLevel: "silent",
});
const dir = mkdtempSync(join(tmpdir(), "emtest-"));
const file = join(dir, "m.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { evaluateMcDonald: ev, kflcIndex, ied, buildReport } = await import(pathToFileURL(file).href);

let n = 0;
const t = (name, fn) => { fn(); n++; };
const base = { dit: false, csf: false, cvs: false, prl: false, spinalLesions: false };

t("sem apresentação → null", () => assert.equal(ev({ ...base, presentation: null, locCount: 3 }), null));
for (const p of ["attack", "progressive", "ris", "nonspecific"]) t(`0 loc ${p}`, () => assert.equal(ev({ ...base, presentation: p, locCount: 0 }).met, false));
for (const p of ["attack", "progressive"]) for (const k of [4, 5]) t(`${k} loc ${p} sem evidência`, () => assert.equal(ev({ ...base, presentation: p, locCount: k }).met, true));
for (const p of ["ris", "nonspecific"]) for (const k of [4, 5]) {
  t(`${k} loc ${p} sem evidência`, () => assert.equal(ev({ ...base, presentation: p, locCount: k }).met, false));
  for (const e of ["dit", "csf", "cvs"]) t(`${k} loc ${p} + ${e}`, () => assert.equal(ev({ ...base, presentation: p, locCount: k, [e]: true }).met, true));
  t(`${k} loc ${p} só PRL`, () => assert.equal(ev({ ...base, presentation: p, locCount: k, prl: true }).met, false));
}
for (const p of ["attack", "progressive", "ris", "nonspecific"]) for (const k of [2, 3]) {
  t(`${k} loc ${p} sem evidência`, () => assert.equal(ev({ ...base, presentation: p, locCount: k }).met, false));
  for (const e of ["dit", "csf", "cvs"]) t(`${k} loc ${p} + ${e}`, () => assert.equal(ev({ ...base, presentation: p, locCount: k, [e]: true }).met, true));
  t(`${k} loc ${p} só PRL`, () => assert.equal(ev({ ...base, presentation: p, locCount: k, prl: true }).met, false));
}
// 1 localização — combinações exaustivas
const bools = [false, true];
for (const p of ["attack", "progressive", "ris", "nonspecific"]) for (const dit of bools) for (const csf of bools) for (const cvs of bools) for (const prl of bools) for (const sp of bools) {
  const r = ev({ presentation: p, locCount: 1, dit, csf, cvs, prl, spinalLesions: sp });
  let exp;
  if (p === "ris" || p === "nonspecific") exp = false;
  else if (p === "progressive") exp = (sp && (dit || csf || cvs)) || ((dit || csf) && (cvs || prl));
  else exp = (dit || csf) && (cvs || prl);
  t(`1 loc ${p} d${+dit}c${+csf}v${+cvs}p${+prl}s${+sp}`, () => assert.equal(r.met, exp));
}

t("κ-FLC positivo", () => { const v = kflcIndex(20, 15, 250, 40000); assert.ok(Math.abs(v - 213.33) < 0.01); });
t("κ-FLC limiar 6,1", () => assert.ok(kflcIndex(6.1, 1, 1, 1) >= 6.1));
t("κ-FLC vírgula decimal", () => assert.ok(Math.abs(kflcIndex("0,5", "10", "200", "40000") - 10) < 1e-9));
t("κ-FLC divisão por zero → null", () => assert.equal(kflcIndex(1, 0, 1, 1), null));
t("κ-FLC campo vazio → null", () => assert.equal(kflcIndex("", 1, 1, 1), null));
t("IED arredonda 0,1", () => assert.equal(ied(95.3, 89.1), 6.2));
t("IED vazio → null", () => assert.equal(ied("", 80), null));

t("laudo vazio", () => { const r = buildReport({}); assert.match(r, /Sem lesões focais/); assert.match(r, /DIS\): 0\/5/); assert.match(r, /não demonstrada/); });
t("laudo DIT por realce", () => { const r = buildReport({ gd_used: true, pv_count: "3", enhancing: true, enhancing_count: "1" }); assert.match(r, /DIT\): demonstrada/); assert.match(r, /DIS\): 1\/5/); });
t("laudo Select 6", () => { assert.match(buildReport({ cvs_assessed: true, cvs_positive_count: "6", cvs_total_assessed: "15" }), /Select 6: positivo/); assert.match(buildReport({ cvs_assessed: true, cvs_positive_count: "5", cvs_total_assessed: "9" }), /Select 6: positivo/); assert.match(buildReport({ cvs_assessed: true, cvs_positive_count: "4", cvs_total_assessed: "12" }), /Select 6: não atingido/); });
t("laudo 5 localizações", () => assert.match(buildReport({ pv_count: 1, jc_count: 1, infra_count: 1, spine_lesions: true, optic_assessed: true, optic_lesion: true }), /DIS\): 5\/5/));
t("laudo follow-up", () => assert.match(buildReport({ is_followup: true, new_t2: true, new_t2_count: "2" }), /DIT\): demonstrada/));

console.log(`OK — ${n} testes de lógica aprovados`);
