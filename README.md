# Comparador Eleitoral 2026

Site: https://comparador-eleitoral-2026.onrender.com

Somente este repositório pertence a este trabalho. Não modificar projetos da Rinisa.

## Dados

- Exterior: Poder360, artigo identificado no painel. Coleta agendada a cada cinco minutos no GitHub Actions (o agendador pode atrasar); o navegador consulta o JSON público a cada cinco minutos. Dados do GitHub atualizam independentemente de novos deploys no Render.
- Países são descobertos nos títulos da reportagem; turnos são associados pelos rótulos explícitos. Países sem os quatro valores não entram em nenhum contador. Zero publicado é válido; ausência não é zero. Resultados anteriores são preservados e identificados como antigos quando uma coleta falha.
- Valores da reportagem são preliminares, não boletins oficiais auditados. Divergências da fonte podem permanecer até sua correção.
- Brasil: consulta direta dos JSON nacionais oficiais 6257/6258 do TSE a cada 30 segundos enquanto a página estiver aberta. Valida eleição, cargo, abrangência, candidatos e seções. O total nacional inclui exterior e nunca recebe acréscimo dos dados preliminares.
- Comparação nacional somente com percentuais exatos equivalentes de seções totalizadas. O arquivo público do primeiro turno consultado está em 100%. Sem arquivo histórico intermediário, não há comparação parcial legítima. Amostras observadas são preservadas no navegador quando possível; não interpolamos nem reconstruímos votos. A 100%, os dois arquivos finais permitem a comparação.
- Navegadores podem suspender temporizadores quando ficam em segundo plano, especialmente no iPhone. Não há garantia de atualização de uma página suspensa.

## Verificação

```sh
pip install -r requirements.txt
python -m unittest discover -s tests -v
node tests/test_app.cjs
node tests/test_integration.cjs
python scripts/coletar_preliminares.py
python scripts/comparar_paises.py
```

Fixtures são trechos reais da reportagem e JSON do TSE obtidos em 25/10/2026. Os testes cobrem ordem dos turnos, descoberta de países, dados ausentes, zeros publicados, perdas, duplicação, preservação na falha e equivalência exata de seções.

Hospedagem: site estático existente no Render; deploy manual, automático desligado. Nenhum novo serviço, banco ou plano pago é necessário. GitHub Actions com agenda de cinco minutos não oferece SLA de pontualidade. Não foram configurados gastos adicionais.

Validação nesta sessão: coleta real e workflow concluídos com sucesso; arquivos publicados e execução do JavaScript publicado verificados por HTTP e DOM de teste. Testes visuais no Safari, iPhone e Mac reais permanecem pendentes por falta de acesso a esses dispositivos.

## Transmissão incorporada

CNN Brasil: vídeo `o6Z6Ax_XVsY`, identificado na página oficial https://www.cnnbrasil.com.br/ em 25/10/2026. Player oficial do YouTube em domínio nocookie, com áudio inicialmente desativado, controles e tela cheia. Em telas largas aparece ao lado dos resultados; em telas menores, acima deles. A atualização dos votos não recarrega o iframe. Caso a emissora encerre ou restrinja a live, o painel oferece links para o vídeo, a página ao vivo e o canal oficial. Não há retransmissão nem cópia do sinal.
