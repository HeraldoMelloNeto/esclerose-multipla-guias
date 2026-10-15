# Esclerose Múltipla — Guias Clínico e Radiológico

Assistente interativo único que une os dois guias de Esclerose Múltipla (clínico e radiológico) do Dr. Heraldo Mello Neto. Baseado **exclusivamente** em:

1. Barkhof F, Reich DS, Oh J, et al. *2024 MAGNIMS–CMSC–NAIMS consensus recommendations on the use of MRI for the diagnosis of multiple sclerosis.* Lancet Neurol 2025;24:866–79.
2. Deisenhammer F, Hegen H, Arrambide G, et al. *Positive cerebrospinal fluid in the 2024 McDonald criteria for multiple sclerosis.* eBioMedicine 2025;120:105905.
3. Saidha S, Green AJ, Leocani L, et al. *The use of optical coherence tomography and visual evoked potentials in the 2024 McDonald diagnostic criteria for multiple sclerosis.* Lancet Neurol 2025;24:880–92.

## Módulos

| Guia Clínico | Guia Radiológico |
|---|---|
| Diagnóstico McDonald 2024 (simulador com todas as combinações) | Checklist de protocolo (encéfalo, medula, nervo óptico) |
| Protocolo RM (com abas Medula e Nervo Óptico completas) | Interpretação guiada por região, com resultado McDonald integrado |
| LCR — calculadora do índice κ-FLC, OCB, NfL, POMS | Laudo estruturado com cópia em 1 clique |
| OCT & PEV — calculadora de IED (Spectralis/Cirrus) | Diferencial EM × NMOSD × MOGAD |
| Monitoramento, biomarcadores, populações especiais | Red flags e armadilhas de CVS/PRL |
| Glossário com busca | Modo Especialista / Didático |

Links diretos por página (ex.: `#/clin/lcr`, `#/radio/laudo`).

## Técnica

- HTML único autocontido em `dist/index.html` (React embutido, **nenhum recurso externo**; nada é enviado a servidores).
- Fonte em `src/` (React + esbuild). Paleta escura única para os dois módulos.
- Netlify publica `dist/` diretamente (`netlify.toml`, com cabeçalhos de segurança e CSP restritiva).

```bash
npm ci
npm run build                                  # gera dist/index.html
npm test                                       # 209 testes de lógica (McDonald, κ-FLC, IED, laudo)
python3 tests/e2e.py                           # teste no Chromium: todas as rotas, desktop e celular
```

## Origem

União dos projetos “Assistente interativo para diagnóstico e tratamento de esclerose múltipla” (guia clínico) e “MS Neuroradiology Assistant” (guia radiológico), do projeto *2024 MAGNIMS–CMSC–NAIMS* no Claude.

Ferramenta de apoio à decisão para especialistas; não substitui o julgamento clínico.

© Dr. Heraldo Mello Neto
