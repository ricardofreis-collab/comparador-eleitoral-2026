#!/usr/bin/env python3
"""Build comparable exterior totals. Missing votes are never zero."""
import csv,json,pathlib,datetime
base={}
with open("dados/primeiro_turno_paises.csv",encoding="utf-8",newline="") as fh:
    for row in csv.DictReader(fh):
        try:
            f=int(row["flavio_primeiro_turno"]);l=int(row["lula_primeiro_turno"])
            if min(f,l)<0 or not row["fonte"].strip():continue
            base[row["codigo_iso"]]=(f,l)
        except (ValueError,TypeError):continue
source=pathlib.Path("preliminares.json")
raw=json.loads(source.read_text(encoding="utf-8")) if source.exists() else {}
matched=[]
for r in raw.get("countries",[]):
    iso=r.get("codigo_iso") or r.get("iso")
    second=r.get("second",{})
    if iso not in base:continue
    try:
        f2=int(second["flavio"]);l2=int(second["lula"])
        if min(f2,l2)<0:continue
    except (KeyError,TypeError,ValueError):continue
    f1,l1=base[iso]
    matched.append({"pais":r.get("country",iso),"codigo_iso":iso,"primeiro":{"flavio":f1,"lula":l1},"segundo":{"flavio":f2,"lula":l2},"ganho":{"flavio":f2-f1,"lula":l2-l1}})
totals={key:sum(r["ganho"][key] for r in matched) for key in ("flavio","lula")}
output={"status":"ok" if matched else "awaiting_matched_data","updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":raw.get("source"),"source_url":raw.get("source_url"),"countries":matched,"total_ganho":totals}
pathlib.Path("comparacao_exterior.json").write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
