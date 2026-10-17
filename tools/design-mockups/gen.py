import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

T = [
 dict(slug="aspensearch-com", name="Aspen Search", char="High-contrast editorial monochrome, mint accent",
  bg="#ffffff", surf="#ffffff", ink="#232323", mut="#6b6b6b", line="#232323", bw=1, acc="#a1ffcb", acc2="#232323", accink="#232323",
  r=0, rb=0, sh="none", hf="Inter Tight", bf="Inter Tight", mf="JetBrains Mono", hc="none", hw=500, ht="-0.03em", hs="1", bww=500,
  ok=("#a1ffcb","#232323"), warn=("#d9d9d9","#232323"), bad=("#232323","#ffffff"), gf="Inter+Tight:wght@400;500;600|JetBrains+Mono:wght@400"),
 dict(slug="austinwerner-io", name="Austin Werner", char="Dark editorial, signal yellow, pill CTAs",
  bg="#010101", surf="#171717", ink="#ffffff", mut="#aaaaaa", line="#292929", bw=1, acc="#ffd100", acc2="#ff6d36", accink="#000000",
  r=16, rb=999, sh="none", hf="Space Grotesk", bf="DM Sans", mf="JetBrains Mono", hc="none", hw=700, ht="-0.02em", hs="1", bww=500,
  ok=("#0f3b36","#40e0d0"), warn=("#3b2e00","#ffd100"), bad=("#3b1a0c","#ff6d36"), gf="Space+Grotesk:wght@500;700|DM+Sans:wght@400;500;700|JetBrains+Mono:wght@400"),
 dict(slug="dontboardme-com", name="DontBoardMe", char="Playful candy-pastel, pill radii, soft pink shadows",
  bg="#f4ced3", surf="#f6f6ed", ink="#000000", mut="#6b4b50", line="#000000", bw=2, acc="#e33529", acc2="#2b6786", accink="#ffffff",
  r=24, rb=999, sh="0 8px 0 rgba(240,181,190,.9)", hf="Bayon", bf="Inter", mf="JetBrains Mono", hc="uppercase", hw=400, ht="0.02em", hs="1.15", bww=600,
  ok=("#afd8fb","#2b6786"), warn=("#f0b5be","#000000"), bad=("#e33529","#ffffff"), gf="Bayon|Inter:wght@400;500;700|JetBrains+Mono:wght@400"),
 dict(slug="industrycity-com", name="Industry City", char="Neo-brutalist editorial: paper, 2px black rules, zero radius",
  bg="#FBF9F5", surf="#ffffff", ink="#000000", mut="#6a6b6b", line="#000000", bw=2, acc="#fab36a", acc2="#e05829", accink="#000000",
  r=0, rb=0, sh="none", hf="Bebas Neue", bf="Nunito Sans", mf="Space Mono", hc="uppercase", hw=400, ht="0.01em", hs="1.15", bww=700,
  ok=("#DCEBD7","#000000"), warn=("#fbe6c1","#000000"), bad=("#e05829","#ffffff"), gf="Bebas+Neue|Nunito+Sans:wght@400;600;800|Space+Mono:wght@400;700"),
 dict(slug="ishikawa-co", name="Ishikawa Atlas", char="Material-You mint/teal with magenta accent, soft pills",
  bg="#f3fbf9", surf="#ffffff", ink="#1f1f1f", mut="#44695f", line="#bfe6df", bw=1, acc="#4ee8dd", acc2="#d45199", accink="#0b2e2a",
  r=20, rb=999, sh="0 2px 10px rgba(72,108,98,.12)", hf="Klee One", bf="Nunito", mf="JetBrains Mono", hc="none", hw=600, ht="0", hs="1", bww=700,
  ok=("#dcf6f2","#1d5a52"), warn=("#fde8f2","#a02d6c"), bad=("#d45199","#ffffff"), gf="Klee+One:wght@400;600|Nunito:wght@400;600;800|JetBrains+Mono:wght@400"),
 dict(slug="legora-com", name="Legora", char="Quiet legal-tech: warm off-white, deep green, small radii",
  bg="#fafaf9", surf="#ffffff", ink="#0d1016", mut="#68655e", line="#e1dfda", bw=1, acc="#005032", acc2="#003d26", accink="#ffffff",
  r=8, rb=6, sh="0 1px 2px rgba(0,0,0,.05)", hf="Inter", bf="Inter", mf="JetBrains Mono", hc="none", hw=400, ht="-0.03em", hs="1", bww=500,
  ok=("#e3efe9","#005032"), warn=("#e1dfda","#343434"), bad=("#0d1016","#ffffff"), gf="Inter:wght@300;400;500;600|JetBrains+Mono:wght@400"),
 dict(slug="manhattan-institute", name="Manhattan Institute", char="Think-tank editorial: lavender page, ink navy, signal orange, square and flat",
  bg="#F0F3FF", surf="#ffffff", ink="#20222E", mut="#6a6c72", line="#d7d9de", bw=1, acc="#FF8000", acc2="#2C48DC", accink="#20222E",
  r=0, rb=0, sh="none", hf="Libre Caslon Text", bf="Inter", mf="JetBrains Mono", hc="none", hw=700, ht="-0.01em", hs="1", bww=600,
  ok=("#cef2ff","#00647e"), warn=("#ffe1af","#972f00"), bad=("#2C48DC","#ffffff"), gf="Libre+Caslon+Text:wght@400;700|Inter:wght@400;500;600|JetBrains+Mono:wght@400"),
 dict(slug="memphispolice-org", name="Memphis Police Dept.", char="Civic-institutional: gold and navy, light Lato, flat squared",
  bg="#ffffff", surf="#f0f0f0", ink="#3a3a3a", mut="#666666", line="#e0e0e0", bw=1, acc="#fcac00", acc2="#0d2279", accink="#000000",
  r=2, rb=2, sh="none", hf="Merriweather Sans", bf="Lato", mf="JetBrains Mono", hc="none", hw=700, ht="0", hs="1", bww=700,
  ok=("#dbe7f7","#0d2279"), warn=("#fff0cc","#7a5200"), bad=("#ff0000","#ffffff"), gf="Merriweather+Sans:wght@400;700|Lato:wght@300;400;700|JetBrains+Mono:wght@400"),
 dict(slug="poolside-ai", name="Poolside", char="Warm paper, black text, coral accent, mono details",
  bg="#fbfaf6", surf="#ffffff", ink="#000000", mut="#6f6d69", line="#dad9d2", bw=1, acc="#ff5f57", acc2="#3b2c00", accink="#ffffff",
  r=10, rb=4, sh="none", hf="Inter", bf="Inter", mf="JetBrains Mono", hc="none", hw=500, ht="-0.03em", hs="1", bww=500,
  ok=("#eeede6","#3b2c00"), warn=("#f7f6ef","#6f6d69"), bad=("#ff5f57","#ffffff"), gf="Inter:wght@400;500;600|JetBrains+Mono:wght@400;500"),
 dict(slug="roberttran-com-au", name="Robert Tran", char="Broadsheet: ink on warm paper, Caslon serif, brick-red accent",
  bg="#f4f1e9", surf="#fbfaf5", ink="#16140f", mut="#45413a", line="#16140f", bw=1, acc="#a6382c", acc2="#ccbe9f", accink="#f4f1e9",
  r=7, rb=50, sh="0 10px 26px rgba(22,20,15,.18)", hf="Libre Caslon Display", bf="Libre Caslon Text", mf="JetBrains Mono", hc="none", hw=400, ht="-0.01em", hs="1", bww=400,
  ok=("#efeadd","#16140f"), warn=("#ccbe9f","#16140f"), bad=("#a6382c","#f4f1e9"), gf="Libre+Caslon+Display|Libre+Caslon+Text:wght@400;700|JetBrains+Mono:wght@400"),
 dict(slug="saifullah-dev", name="Saifullah", char="Sci-fi HUD: true black, grayscale outlines, mono telemetry labels",
  bg="#000000", surf="#050505", ink="#e8e8e8", mut="#8a8a8a", line="#4a4a4a", bw=1, acc="#ffffff", acc2="#8a8a8a", accink="#000000",
  r=0, rb=0, sh="none", hf="Chakra Petch", bf="Share Tech Mono", mf="Share Tech Mono", hc="uppercase", hw=600, ht="0.14em", hs=".8", bww=500,
  ok=("#111111","#e8e8e8"), warn=("#1d1d1d","#bdbdbd"), bad=("#ffffff","#000000"), gf="Chakra+Petch:wght@400;600|Share+Tech+Mono"),
 dict(slug="santionispirits-com", name="Santioni Spirits", char="Bold spirits label: ink, brand red, gold, flavor accents",
  bg="#fbf6ea", surf="#ffffff", ink="#121212", mut="#6e6256", line="#121212", bw=2, acc="#c82924", acc2="#dfaf49", accink="#ffffff",
  r=14, rb=999, sh="4px 4px 0 #121212", hf="Bowlby One", bf="Figtree", mf="JetBrains Mono", hc="none", hw=400, ht="0", hs=".85", bww=800,
  ok=("#97f3ad","#121212"), warn=("#fbeb7f","#121212"), bad=("#c82924","#ffffff"), gf="Bowlby+One|Figtree:wght@400;600;800|JetBrains+Mono:wght@400"),
 dict(slug="stripe-com", name="Stripe", char="Fintech polish: violet #533afd, navy #0d1738, light weights, blue-tinted shadows",
  bg="#f8fafd", surf="#ffffff", ink="#061b31", mut="#64748d", line="#e5edf5", bw=1, acc="#533afd", acc2="#0d1738", accink="#ffffff",
  r=6, rb=4, sh="0 15px 35px -5px rgba(50,50,93,.15), 0 5px 15px rgba(0,0,0,.07)", hf="Inter", bf="Inter", mf="JetBrains Mono", hc="none", hw=300, ht="-0.025em", hs="1", bww=400,
  ok=("#e5f8ee","#0a7a43"), warn=("#ffe0d1","#9a3c10"), bad=("#fde7ec","#c0123c"), gf="Inter:wght@300;400;500;600|JetBrains+Mono:wght@400"),
]
DARK = {"austinwerner-io", "saifullah-dev"}

HTML = open(os.path.join(os.path.dirname(__file__), "template.html"), encoding="utf-8").read()

for t in T:
    rep = {"NAME": t["name"], "CHAR": t["char"], "SLUG": t["slug"], "GF": t["gf"].replace("|", "&family="),
           "okb": t["ok"][0], "okf": t["ok"][1], "wb": t["warn"][0], "wf": t["warn"][1],
           "bb": t["bad"][0], "bfg": t["bad"][1],
           "hover": "rgba(255,255,255,.07)" if t["slug"] in DARK else "rgba(0,0,0,.05)"}
    for k in ["bg","surf","ink","mut","line","bw","acc","acc2","accink","r","rb","sh","hf","bf","mf","hc","hw","ht","hs","bww"]:
        rep[k] = str(t[k])
    h = HTML
    for k, v in rep.items():
        h = h.replace("{{%s}}" % k, v)
    open(os.path.join(OUT, "receipts-mockup-%s.html" % t["slug"]), "w", encoding="utf-8").write(h)
print(len(T), "files")
