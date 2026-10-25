import copy
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
from scripts.coletar_preliminares import extract_html, parse, collect
from scripts.comparar_paises import compare
FIXTURES=pathlib.Path(__file__).parent/'fixtures'
class ResultsTests(unittest.TestCase):
 def test_real_article_round_order(self):
  rows=extract_html((FIXTURES/'poder360-2026-10-25.html').read_text())
  self.assertEqual(len(rows),37)
  japan=next(r for r in rows if r['country']=='JAPÃO')
  self.assertEqual(japan['first'],{'lula':5234,'flavio':24601})
  self.assertEqual(japan['second'],{'lula':7098,'flavio':28538})
  d=compare({'status':'ok','countries':rows})
  self.assertEqual(d['total_ganho'],{'lula':4397,'flavio':5850})
 def test_missing_is_not_zero_and_new_country(self):
  rows=parse('NOVO PAÍS\n2º turno\nLula (PT) – 0 votos\nFlávio (PL) – 2 votos\n1º turno\nLula (PT) – 4 votos')
  self.assertEqual(len(rows),1)
  d=compare({'status':'ok','countries':rows})
  self.assertIsNone(d['total_ganho']['lula'])
  rows[0]['first']['flavio']=0
  d=compare({'status':'ok','countries':rows})
  self.assertEqual(d['total_ganho'],{'lula':-4,'flavio':2})
 def test_reject_malformed_and_duplicates(self):
  row={'country':'X','first':{'lula':True,'flavio':4},'second':{'lula':10,'flavio':5}}
  self.assertEqual(compare({'countries':[row]})['countries'],[])
  row['first']['lula']=1
  self.assertEqual(len(compare({'countries':[row,row]})['countries']),1)
 def test_failure_preserves_votes_and_original_time(self):
  old={'countries':[{'country':'JAPÃO','first':{'lula':1,'flavio':2},'second':{'lula':3,'flavio':4}}],'updated_at':'2026-10-25T12:00:00Z'}
  with tempfile.TemporaryDirectory() as folder:
   path=pathlib.Path(folder)/'data.json';path.write_text(json.dumps(old))
   with patch('urllib.request.urlopen',side_effect=OSError('offline')): actual=collect(path)
  self.assertEqual(actual['countries'],old['countries'])
  self.assertEqual(actual['updated_at'],old['updated_at'])
  self.assertEqual(actual['status'],'stale')
if __name__=='__main__':unittest.main()
