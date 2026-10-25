(function (root) {
'use strict';
const candidates = ['lula','flavio'];
function integer(v) {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return v;
  if (typeof v === 'string' && /^\d+$/.test(v) && Number.isSafeInteger(Number(v))) return Number(v);
  throw Error('Votos ou seções ausentes/inválidos');
}
function parseTSE(d, round) {
  if (d.ele !== (round === 1 ? '6257' : '6258') || d.t !== String(round) || d.tpabr !== 'br' || d.cdabr !== 'br' || d.f !== 'o') throw Error('Eleição/abrangência não confirmada');
  const office = d.carg?.find(c => c.cd === '1');
  const rows = office?.agr?.flatMap(a => a.par?.flatMap(p => p.cand || []) || []);
  if (!rows) throw Error('Estrutura presidencial não reconhecida');
  const get = n => { const found = rows.filter(c => c.n === n); if(found.length !== 1) throw Error('Candidato ausente/duplicado'); return integer(found[0].vap); };
  const sections = integer(d.s?.st), totalSections = integer(d.s?.ts);
  if (!totalSections || sections > totalSections || !d.dg || !d.hg) throw Error('Totalização/horário inválido');
  const lula=get('13'), flavio=get('22');
  if (!sections && (lula || flavio)) throw Error('Votos sem seções totalizadas');
  return {round, sections, totalSections, lula, flavio, sourceTime: d.dg+' '+d.hg, checkedAt: new Date().toISOString()};
}
function match(first, second) {
  if (!second?.sections) return null;
  return first.find(x => x.sections > 0 && x.sections*second.totalSections === second.sections*x.totalSections) || null;
}
function validateExterior(d) {
  if (!Array.isArray(d.countries)) throw Error('Tabela do exterior inválida');
  const seen = new Set();
  for (const c of d.countries) {
    if (typeof c.pais !== 'string' || !c.pais || seen.has(c.pais)) throw Error('País ausente/duplicado');
    seen.add(c.pais);
    for(const t of ['primeiro','segundo']) for(const k of candidates) integer(c[t]?.[k]);
  }
  return d.countries;
}
const api={integer,parseTSE,match,validateExterior};
if(typeof module !== 'undefined') module.exports=api;
root.Election=api;
if(typeof document==='undefined') return;
const $=id=>document.getElementById(id), fmt=n=>n==null?'—':n.toLocaleString('pt-BR'), signed=n=>(n>0?'+':'')+fmt(n);
function time(v){return v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (Brasília)':'indisponível';}
function chart(id,a,b){
 const host=$(id);host.replaceChildren();
 if(a==null||b==null){host.textContent='Aguardando resultados comparáveis';return;}
 const max=Math.max(Math.abs(a),Math.abs(b),1);
 [a,b].forEach((v,i)=>{const row=document.createElement('div');row.className='bar-row';const label=document.createElement('span');label.textContent=(i?'Flávio Bolsonaro: ':'Lula: ')+signed(v)+' votos';row.append(label);const track=document.createElement('div');track.className='track';const bar=document.createElement('div');bar.className='bar '+(v<0?'loss':'gain');bar.style.width=Math.abs(v)/max*50+'%';bar.style.marginLeft=(v<0?50-Math.abs(v)/max*50:50)+'%';track.append(bar);row.append(track);host.append(row);});
}
let exteriorBusy=false;
async function exterior(){
 if(exteriorBusy)return;exteriorBusy=true;
 try{
  const r=await fetch('https://raw.githubusercontent.com/ricardofreis-collab/comparador-eleitoral-2026/main/comparacao_exterior.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json(),rows=validateExterior(d);
  const stale=d.status!=='ok'||!d.updated_at||Date.now()-Date.parse(d.updated_at)>15*60000;
  $('ex-status').textContent=(stale?'Dados anteriores • atualização pendente':'Dados preliminares • Poder360')+' • '+rows.length+' países comparáveis';
  $('ex-time').textContent='Dados coletados: '+time(d.updated_at)+'. Última tentativa do coletor: '+time(d.checked_at)+'. Consulta do site: '+time(new Date().toISOString());
  $('ex-note').textContent='Somente países com os dois turnos entram nas somas. '+(d.pending_countries||0)+' países aguardando par completo. Valores reproduzem a reportagem preliminar e podem ser corrigidos pela fonte.';
  const sums={};for(const t of ['primeiro','segundo']) for(const k of candidates)sums[t+k]=rows.length?rows.reduce((s,c)=>s+c[t][k],0):null;
  for(const [i,t] of ['primeiro','segundo'].entries()) for(const k of candidates)$('ex-'+k+(i+1)).textContent=fmt(sums[t+k]);
  const dl=rows.length?sums.segundolula-sums.primeirolula:null,df=rows.length?sums.segundoflavio-sums.primeiroflavio:null;
  $('ex-lula-delta').textContent=dl==null?'Aguardando dados':signed(dl)+' votos';$('ex-flavio-delta').textContent=df==null?'Aguardando dados':signed(df)+' votos';chart('ex-chart',dl,df);
  const body=$('countries');body.replaceChildren();for(const c of rows){const tr=document.createElement('tr');for(const v of [c.pais,c.primeiro.lula,c.segundo.lula,c.segundo.lula-c.primeiro.lula,c.primeiro.flavio,c.segundo.flavio,c.segundo.flavio-c.primeiro.flavio]){const td=document.createElement('td');td.textContent=typeof v==='number'?fmt(v):v;tr.append(td);}body.append(tr);}
 }catch(e){$('ex-status').textContent='Falha na atualização do exterior: '+e.message+'. Últimos dados exibidos foram mantidos.';}finally{exteriorBusy=false;}
}
let history=[];try{history=JSON.parse(localStorage.getItem('tse2026-first')||'[]').filter(x=>x.round===1&&['sections','totalSections','lula','flavio'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0));}catch{}
let nationalBusy=false;
async function national(){
 if(nationalBusy)return;nationalBusy=true;
 try{
  const responses=await Promise.all([1,2].map(async round=>{const id=round===1?'6257':'6258';const r=await fetch(`https://resultados.tse.jus.br/oficial/ele2026/${id}/dados/br/br-c0001-e00${id}-u.json?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('TSE HTTP '+r.status);return parseTSE(await r.json(),round);}));
  const [first,second]=responses;
  history=history.filter(x=>x.sections!==first.sections||x.totalSections!==first.totalSections);history.push(first);try{localStorage.setItem('tse2026-first',JSON.stringify(history));}catch{}
  const paired=match(history,second),percentage=(100*second.sections/second.totalSections).toLocaleString('pt-BR',{maximumFractionDigits:4});
  $('br-status').textContent=second.sections?'TSE oficial • '+percentage+'% das seções totalizadas':'TSE oficial • aguardando início da totalização';
  $('br-time').textContent='Arquivo do TSE: '+second.sourceTime+'. Consulta: '+time(second.checkedAt);
  for(const k of candidates){$('br-'+k+'2').textContent=second.sections?fmt(second[k]):'—';$('br-'+k+'1').textContent=paired?fmt(paired[k]):'—';$('br-'+k+'-delta').textContent=paired?signed(second[k]-paired[k])+' votos':'Aguardando histórico no mesmo percentual';}
  $('br-note').textContent=paired?'Comparação no mesmo percentual exato de seções totalizadas.':'Sem amostra do 1º turno no percentual atual. O arquivo disponível do 1º turno está em '+(100*first.sections/first.totalSections).toLocaleString('pt-BR')+'%. Não interpolamos nem escalamos votos. A comparação será possível a 100% ou com histórico equivalente validado.';
  chart('br-chart',paired?second.lula-paired.lula:null,paired?second.flavio-paired.flavio:null);
 }catch(e){$('br-status').textContent='Consulta ao TSE indisponível: '+e.message+'. Últimos dados exibidos foram mantidos.';}finally{nationalBusy=false;}
}
$('refresh').addEventListener('click',()=>{exterior();national();});exterior();national();setInterval(exterior,300000);setInterval(national,30000);
})(typeof globalThis!=='undefined'?globalThis:this);
