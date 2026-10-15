"""Teste ponta a ponta no Chromium: todas as rotas, interações e console sem erros.
Uso: python3 tests/e2e.py [URL]   (padrão: servidor local em dist/)"""
import sys, threading, http.server, functools, os
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")
url = sys.argv[1] if len(sys.argv) > 1 else None
if not url:
    H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    H.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:8765/"

ROUTES = {
    "clin": ["diagnostico", "protocolo", "lcr", "oct", "monitoramento", "glossario"],
    "radio": ["checklist", "interpret", "laudo", "diff", "flags"],
}
problems, ok = [], 0

def check(cond, msg):
    global ok
    if cond: ok += 1
    else: problems.append(msg)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    for vw in [(1280, 900), (390, 844)]:
        ctx = br.new_context(viewport={"width": vw[0], "height": vw[1]})
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=url.split("#")[0].rstrip("/"))
        pg = ctx.new_page()
        errs, ext = [], []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("requestfailed", lambda r: errs.append("reqfail " + r.url))
        base = url.split("#")[0]
        pg.on("request", lambda r: ext.append(r.url) if not r.url.startswith(base) and not r.url.startswith("data:") else None)
        pg.goto(url, wait_until="networkidle")
        check(pg.get_by_role("heading", name="Esclerose Múltipla").is_visible(), "home heading")
        check(pg.locator(".tile").count() == 11, f"11 tiles (got {pg.locator('.tile').count()})")
        for mod, pages in ROUTES.items():
            for p in pages:
                pg.goto(f"{base}#/{mod}/{p}")
                pg.wait_for_timeout(120)
                h2 = pg.locator("main h2").first
                check(h2.is_visible(), f"{mod}/{p} sem título")
                sw = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(sw <= 1, f"{mod}/{p} scroll horizontal {sw}px @ {vw[0]}")
                # abrir todos os cards recolhíveis
                for b in pg.locator('section.card [role="button"]').all():
                    try: b.click(timeout=500)
                    except Exception: pass
                pg.wait_for_timeout(60)
                sw = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(sw <= 1, f"{mod}/{p} expandido scroll horizontal {sw}px @ {vw[0]}")
        if vw[0] == 1280:
            # Diagnóstico: 1 localização + DIT + CVS → positivo
            pg.goto(f"{base}#/clin/diagnostico"); pg.wait_for_timeout(100)
            pg.get_by_text("Surto (ataque)").click()
            pg.get_by_role("checkbox", name="Periventricular").click()
            pg.get_by_role("checkbox", name="DIT (Disseminação no Tempo)").click()
            t = pg.locator('[aria-live="polite"]').inner_text()
            check("requer combinação" in t, "1 loc + DIT sem CVS deveria pedir combinação: " + t[:80])
            pg.get_by_role("checkbox", name="CVS (Central Vein Sign)").click()
            t = pg.locator('[aria-live="polite"]').inner_text()
            check("PODE SER FEITO" in t, "1 loc + DIT + CVS deveria permitir: " + t[:80])
            # Medula no protocolo (bug histórico de página em branco)
            pg.goto(f"{base}#/clin/protocolo"); pg.wait_for_timeout(100)
            pg.get_by_role("button", name="🦴 Medula").click(); pg.wait_for_timeout(100)
            check(pg.get_by_text("Aspectos técnicos da RM medular").is_visible(), "aba Medula vazia")
            pg.get_by_role("button", name="👁 Nervo Óptico").click()
            check(pg.get_by_text("Quando solicitar RM do nervo óptico").is_visible(), "aba nervo óptico vazia")
            # Link cruzado
            pg.get_by_role("button", name="Abrir checklist de protocolo (sequência a sequência) →").click(); pg.wait_for_timeout(100)
            check("#/radio/checklist" in pg.url, "link cruzado para checklist")
            # κ-FLC
            pg.goto(f"{base}#/clin/lcr"); pg.wait_for_timeout(100)
            for lbl, v in [("κ-FLC LCR (mg/L)", "1.2"), ("κ-FLC soro (mg/L)", "12"), ("Albumina LCR (mg/L)", "250"), ("Albumina soro (mg/L)", "40000")]:
                pg.get_by_label(lbl).fill(v)
            t = pg.locator('[aria-live="polite"]').inner_text()
            check("16,00" in t and "POSITIVO" in t, "κ-FLC 16,00 positivo: " + t[:80])
            # IED
            pg.goto(f"{base}#/clin/oct"); pg.wait_for_timeout(100)
            pg.get_by_label("pRNFL OD (µm)").fill("95.3"); pg.get_by_label("pRNFL OE (µm)").fill("89.1")
            t = pg.locator('[aria-live="polite"]').inner_text()
            check("6,2" in t and "acima do limiar" in t, "IED 6,2: " + t[:80])
            # Interpretação guiada
            pg.goto(f"{base}#/radio/interpret"); pg.wait_for_timeout(100)
            for _ in range(4):
                pg.locator("main").get_by_role("switch").first.click()
                pg.get_by_role("button", name="Próximo →").click()
            pg.get_by_role("button", name="Próximo →").click()
            t = pg.locator("main").inner_text()
            check("DIS: 4/5" in t and "PODE SER FEITO" in t, "interpretação 4 localizações")
            # Laudo
            pg.goto(f"{base}#/radio/laudo"); pg.wait_for_timeout(100)
            pg.get_by_role("switch", name="Gadolínio administrado?").click()
            pg.get_by_label("Nº lesões periventriculares").fill("4")
            pg.get_by_role("switch", name="Lesões com realce pelo Gd?").click()
            pg.get_by_label("Nº lesões com realce").fill("1")
            r = pg.get_by_test_id("report").inner_text()
            check("Periventriculares: 4" in r and "DIT): demonstrada" in r, "laudo gerado")
            pg.get_by_role("button", name="📋 Copiar laudo").click(); pg.wait_for_timeout(150)
            clip = pg.evaluate("navigator.clipboard.readText()")
            check(clip.startswith("RM — PROTOCOLO"), "copiar laudo")
            # Modo didático persiste
            pg.get_by_role("switch", name="Especialista").click()
            pg.reload(); pg.wait_for_timeout(150)
            check(pg.get_by_role("switch", name="Didático").is_visible(), "modo didático persistido")
            # Rota inválida → início
            pg.goto(f"{base}#/xyz/abc"); pg.wait_for_timeout(100)
            check(pg.locator(".tile").count() == 11, "rota inválida volta ao início")
            pg.screenshot(path="/tmp/em_home.png", full_page=False)
        check(not errs, f"console @ {vw[0]}: {errs[:5]}")
        check(not ext, f"requisições externas @ {vw[0]}: {ext[:5]}")
        ctx.close()
    br.close()

print(f"{ok} verificações OK, {len(problems)} problemas")
for p in problems: print(" ✗", p)
sys.exit(1 if problems else 0)
