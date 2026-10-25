#!/usr/bin/env python3
"""Extract matched 2026 election rounds from one Poder360 article.
Fail closed: if a country is ambiguous, omit it. Never sum unmatched countries.
"""
import datetime,json,pathlib,re,urllib.request
from bs4 import BeautifulSoup
SOURCE="https://www.poder360.com.br/poder-eleicoes-2026/compare-as-votacoes-de-lula-e-flavio-no-1o-e-no-2o-turno-no-exterior/"
def votes(block,candidate):
    m=re.search(r"(?:Lula(?: \(PT\))?|Flávio(?: \(PL\))?)\s*[–-]\s*([\d.]+)\s*votos",block,re.I)
    return int(m.group(1).replace(".","")) if m else None
def parse(text):
    # Country sections are separated by headings in article's textual extraction.
    chunks=re.split(r"(?m)^([A-ZÁÉÍÓÚÂÊÔÃÕÇ* ]{3,45})\s*$",text)
    result=[]
    for i in range(1,len(chunks)-1,2):
        country=chunks[i].strip(" *")
        if country in {"COREIA DO SUL","CHINA","TAIWAN","FILIPINAS","JAPÃO","MALÁSIA","AUSTRÁLIA","NOVA ZELÂNDIA","SINGAPURA","INDONÉSIA","TAILÂNDIA","EMIRADOS ÁRABES UNIDOS","HONG KONG"}:
            s=chunks[i+1];parts=re.split(r"[12]º turno",s,flags=re.I)
            if len(parts)<3:continue
            def get(part,name):
                pattern=(r"Lula(?: \(PT\))?" if name=="lula" else r"Flávio(?: \(PL\))?")
                m=re.search(pattern+r"\s*[–-]\s*([\d.]+)\s*votos",part,re.I)
                return int(m.group(1).replace(".","")) if m else None
            a={x:get(parts[1],x) for x in ("lula","flavio")}
            b={x:get(parts[2],x) for x in ("lula","flavio")}
            if all(isinstance(v,int) for v in list(a.values())+list(b.values())):
                result.append({"country":country,"first":a,"second":b})
    return result
result={"source":"Poder360","source_url":SOURCE,"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"status":"unavailable","countries":[]}
try:
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0"})
    page=urllib.request.urlopen(req,timeout=25).read()
    soup=BeautifulSoup(page,"html.parser")
    article=soup.find("article") or soup
    for tag in article(["script","style","nav","footer"]):tag.decompose()
    # Preserve headings and separate each bullet for robust line matching.
    lines=[]
    for node in article.find_all(["h2","h3","h4","li"]):
        t=node.get_text(" ",strip=True)
        if t:lines.append(t)
    # The article may use h2 headings followed by p/li; include paragraphs.
    lines=[]
    for node in article.find_all(["h2","h3","h4","p","li"]):
        if node.find_parent(["li","p"]):continue
        t=node.get_text(" ",strip=True)
        if t:lines.append(t)
    # Normalize country headings to standalone uppercase lines.
    text="\n".join(lines)
    result["countries"]=parse(text)
    result["status"]="ok" if result["countries"] else "needs_validation"
except Exception:
    result["status"]="source_unavailable"
# Never overwrite previously validated country counts with empty data.
path=pathlib.Path("preliminares.json")
if path.exists() and not result["countries"]:
    try:
        old=json.loads(path.read_text())
        if old.get("countries"):
            result["countries"]=old["countries"]
            result["status"]="stale"
    except (ValueError,OSError):pass
path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
