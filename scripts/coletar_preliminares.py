#!/usr/bin/env python3
"""Conservative preliminary news collector. Never invent missing values."""
import json,re,urllib.request,datetime,pathlib,html
URL="https://www.cnnbrasil.com.br/internacional/eleicoes-2026-exterior-boletins-urna-flavio-lula/"
req=urllib.request.Request(URL,headers={"User-Agent":"ComparadorEleitoral2026/1.0 (public election news verification)"})
raw=urllib.request.urlopen(req,timeout=20).read().decode("utf-8","replace")
text=html.unescape(re.sub(r"<[^>]+>"," ",re.sub(r"<(script|style)\\b[^>]*>.*?</\\1>"," ",raw,flags=re.S|re.I)))
text=re.sub(r"\\s+"," ",text)
# Only a clearly matched sentence, and only when both candidates are explicitly named.
out=[]
for country in ["Japão","Austrália","Nova Zelândia","Coreia do Sul","China","Singapura","Taiwan","Filipinas"]:
    for m in re.finditer(re.escape(country),text,re.I):
        fragment=text[m.start():m.start()+260]
        nums=re.findall(r"([0-9][0-9.]*) votos",fragment)
        if len(nums)>=2 and ("Lula" in fragment or "Flávio" in fragment):
            # Ambiguous ordering or duplicated snippets must not be treated as confirmed.
            break
# Keep source status but no guessed counts; source extraction requires explicit verification.
data={"status":"needs_validation","source":URL,"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"records":out,
      "message":"Notícias consultadas; extração automática ainda não validada. Nenhum voto atribuído."}
pathlib.Path("preliminares.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
