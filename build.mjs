// Gera dist/index.html autocontido (React embutido, sem nenhum recurso externo)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const res = await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: ["es2018"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  charset: "utf8",
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const tpl = readFileSync("src/template.html", "utf8");
const html = tpl.replace("/*__APP__*/", () => js);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
console.log(`dist/index.html — ${(html.length / 1024).toFixed(1)} KB`);
