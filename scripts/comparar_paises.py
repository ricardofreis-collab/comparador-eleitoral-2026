#!/usr/bin/env python3
"""Only matched country pairs contribute to any of the four counters."""
import json
import pathlib
try:
    from .coletar_preliminares import valid_round, now, ROOT
except ImportError:
    from coletar_preliminares import valid_round, now, ROOT

def compare(raw):
    matched = []
    seen = set()
    for row in raw.get('countries', []):
        country = row.get('country')
        if not country or country in seen:
            continue
        seen.add(country)
        if not all(valid_round(row.get(t)) for t in ('first', 'second')):
            continue
        matched.append({'pais': country, 'primeiro': row['first'], 'segundo': row['second'],
                        'primeiro_updated_at': row.get('first_updated_at'), 'segundo_updated_at': row.get('second_updated_at'),
                        'ganho': {k: row['second'][k] - row['first'][k] for k in ('lula', 'flavio')}})
    return {'status': ('stale' if raw.get('status') != 'ok' else 'ok') if matched else 'awaiting_matched_data',
            'updated_at': raw.get('updated_at'), 'checked_at': raw.get('checked_at'), 'generated_at': now(),
            'source': raw.get('source'), 'source_url': raw.get('source_url'), 'error': raw.get('error'),
            'countries': matched, 'pending_countries': len(seen) - len(matched),
            'totals': {t: {k: sum(r[t][k] for r in matched) if matched else None for k in ('lula', 'flavio')} for t in ('primeiro', 'segundo')},
            'total_ganho': {k: sum(r['ganho'][k] for r in matched) if matched else None for k in ('lula', 'flavio')}}

if __name__ == '__main__':
    path = ROOT / 'preliminares.json'
    result = compare(json.loads(path.read_text()) if path.exists() else {})
    (ROOT / 'comparacao_exterior.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(result['status'], len(result['countries']), result['total_ganho'])
