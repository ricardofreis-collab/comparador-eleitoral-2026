#!/usr/bin/env python3
"""Poder360 preliminary results. Explicit round labels; missing values stay missing."""
import datetime
import json
import pathlib
import re
import urllib.request
from bs4 import BeautifulSoup
SOURCE = 'https://www.poder360.com.br/poder-eleicoes-2026/compare-as-votacoes-de-lula-e-flavio-no-1o-e-no-2o-turno-no-exterior/'
ROOT = pathlib.Path(__file__).resolve().parents[1]

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def valid_round(value):
    return isinstance(value, dict) and all(type(value.get(k)) is int and value[k] >= 0 for k in ('lula', 'flavio'))

def parse(text):
    countries = {}
    country = None
    turn = None
    for line in text.splitlines():
        line = re.sub(r'\s+', ' ', line).strip(' *:')
        if re.fullmatch(r'[A-ZÀ-Ý][A-ZÀ-Ý \-]{1,65}', line):
            country = line
            countries.setdefault(country, {'country': country, 'first': {}, 'second': {}})
            turn = None
            continue
        m = re.fullmatch(r'([12])\s*[º°o]\s*turno', line, re.I)
        if m:
            turn = 'first' if m[1] == '1' else 'second'
            continue
        if not country or not turn:
            continue
        m = re.match(r'(Lula|Flávio(?: Bolsonaro)?)\s*(?:\((?:PT|PL)\))?\s*[–—-]\s*(\d{1,3}(?:\.\d{3})+|\d+)\s+votos\b', line, re.I)
        if m:
            key = 'lula' if m[1].lower() == 'lula' else 'flavio'
            value = int(m[2].replace('.', ''))
            existing = countries[country][turn].get(key)
            countries[country][turn][key] = value if existing is None or existing == value else -1
    return [v for v in countries.values() if valid_round(v['first']) or valid_round(v['second'])]

def extract_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    article = soup.find('article')
    if article is None:
        raise ValueError('Artigo não encontrado')
    lines = []
    for node in article.find_all(['h2', 'h3', 'h4', 'li', 'p']):
        # Parent list items contain the round label, children contain the votes.
        clone = BeautifulSoup(str(node), 'html.parser').find()
        for child in clone.find_all(['ul', 'ol']):
            child.decompose()
        lines.append(clone.get_text(' ', strip=True))
    return parse('\n'.join(lines))

def collect(path=ROOT / 'preliminares.json'):
    old = json.loads(path.read_text()) if path.exists() else {}
    checked = now()
    result = dict(old, source='Poder360', source_url=SOURCE, checked_at=checked)
    try:
        req = urllib.request.Request(SOURCE, headers={'User-Agent': 'ComparadorEleitoral2026/1.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            rows = extract_html(response.read())
        if not rows:
            raise ValueError('Nenhum resultado de país reconhecido')
        merged = {r['country']: r for r in old.get('countries', [])}
        for row in rows:
            previous = merged.get(row['country'], {})
            for turn in ('first', 'second'):
                if valid_round(row[turn]):
                    row[turn + '_updated_at'] = checked
                elif valid_round(previous.get(turn)):
                    row[turn] = previous[turn]
                    row[turn + '_updated_at'] = previous.get(turn + '_updated_at')
            merged[row['country']] = row
        result.update(status='ok', updated_at=checked, countries=list(merged.values()), error=None)
    except Exception as exc:
        result.update(status='stale' if old.get('countries') else 'source_unavailable', error=str(exc))
        result.setdefault('countries', [])
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)
    return result

if __name__ == '__main__':
    result = collect()
    print(json.dumps({'status': result['status'], 'countries': len(result['countries']), 'error': result.get('error')}, ensure_ascii=False))
    if result['status'] != 'ok':
        raise SystemExit(1)
