# Comparador Eleitoral 2026

Site: https://comparador-eleitoral-2026.onrender.com

Trabalhar somente neste repositório; não modificar projetos da Rinisa.

## Versão atual

O topo mostra o agregado nacional do TSE. Abaixo, uma tabela dos 26 estados e Distrito Federal compara os percentuais de Lula e Flávio Bolsonaro em cada turno. Exterior e transmissão foram retirados da página a pedido do usuário. Não há soma dos estados ao total nacional: são painéis independentes da mesma fonte oficial.

A tabela usa votos do candidato divididos por todos os votos válidos daquele estado e turno, excluindo brancos e nulos. A diferença em pontos percentuais compara o primeiro turno final com a parcial atual do segundo turno; enquanto a totalização estiver incompleta, ela é provisória. As setas indicam variação em relação ao primeiro turno, não à consulta anterior. O primeiro turno inclui demais candidatos.

Os JSON oficiais são consultados a cada 30 segundos enquanto a página está ativa. O primeiro turno estadual, depois de completo e validado, fica em memória para evitar consultas repetidas; o segundo turno é atualizado em cada ciclo. Quatro estados são processados por vez. Falhas isoladas preservam o último resultado e são sinalizadas na linha; ausência de votos válidos aparece como “—”. Nunca são estimados votos ou percentuais ausentes.

A comparação nacional de votos acumulados ainda exige amostras no mesmo percentual exato de seções. Sem histórico equivalente, o campo fica indisponível. O percentual atual de cada candidato aparece independentemente desse histórico.

A hospedagem usa o site estático existente no Render, com deploy automático desligado. Nenhum novo serviço ou plano pago é necessário. O workflow do GitHub apenas valida o código; a coleta preliminar antiga deixou de ser agendada. Os scripts e arquivos antigos permanecem no repositório como histórico e não alimentam a página atual.

## Verificação

```sh
pip install -r requirements.txt
python -m unittest discover -s tests -v
node tests/test_app.cjs
node tests/test_integration.cjs
```

Fixtures do TSE contêm respostas reais. Os testes cobrem percentuais, escopo por UF, totais válidos, ausência de dados, variação em p.p., falhas isoladas, primeira consulta das 27 UFs e cache do primeiro turno. O teste de integração usa DOM mínimo, não testa Safari ou aparelhos reais.
