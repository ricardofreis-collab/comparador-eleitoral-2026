#!/usr/bin/env python3
"""Poder360 preview collector. Publish only unambiguous paired country totals."""
import datetime,json,pathlib,re,urllib.request,html
SOURCE="https://www.poder360.com.br/poder-eleicoes/veja-como-foi-a-votacao-no-exterior-no-2o-turno-de-2026/"
req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0 (compatible; ComparadorEleitoral2026/1.0)"})
result={"source":"Poder360","source_url":SOURCE,"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"status":"pending_validation","countries":[],"message":"Sem dados estruturados validados nesta consulta."}
try:
    with urllib.request.urlopen(req,timeout=25) as response:
        page=response.read().decode("utf-8","replace")
    result["status"]="source_reachable"
    result["message"]="Página consultada; extração de totais por país ainda não validada. Nenhum voto publicado automaticamente."
except Exception as e:
    result["status"]="source_unavailable"
    result["message"]="Não foi possível consultar a fonte. Dados anteriores devem ser identificados como desatualizados."
pathlib.Path("preliminares.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
