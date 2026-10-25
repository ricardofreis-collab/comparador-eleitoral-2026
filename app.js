(function (root) {
'use strict';
const candidates = ['lula','flavio'];
function integer(v) {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return v;
  if (typeof v === 'string' && /^\d+$/.test(v) && Number.isSafeInteger(Number(v))) return Number(v);
  throw Error('Votos ou seções ausentes/inválidos');
}
function parseTSE(d, round, scope = 'br') {
  if (d.ele !== (round === 1 ? '6257' : '6258') || d.t !== String(round) || d.tpabr !== (scope === 'br' ? 'br' : 'uf') || d.cdabr !== scope || d.f !== 'o') throw Error('Eleição/abrangência não confirmada');
  const office = d.carg?.find(c => c.cd === '1');
  const rows = office?.agr?.flatMap(a => a.par?.flatMap(p => p.cand || []) || []);
  if (!rows) throw Error('Estrutura presidencial não reconhecida');
  const get = n => { const found = rows.filter(c => c.n === n); if(found.length !== 1) throw Error('Candidato ausente/duplicado'); return integer(found[0].vap); };
  const sections = integer(d.s?.st), totalSections = integer(d.s?.ts);
  if (!totalSections || sections > totalSections || !d.dg || !d.hg) throw Error('Totalização/horário inválido');
  const lula=get('13'), flavio=get('22');
  const validVotes=integer(d.v?.vv);
  if (lula+flavio>validVotes) throw Error('Votos dos candidatos excedem o total válido');
  if (!sections && (lula || flavio || validVotes)) throw Error('Votos sem seções totalizadas');
  return {round, sections, totalSections, lula, flavio, validVotes, sourceTime: d.dg+' '+d.hg, checkedAt: new Date().toISOString()};
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
function voteShare(lula, flavio) {
  if (lula == null || flavio == null) return null;
  integer(lula); integer(flavio);
  const total = lula + flavio;
  if (!Number.isSafeInteger(total) || total === 0) return null;
  return {lula: 100 * lula / total, flavio: 100 * flavio / total};
}
function firstRoundShares(d) {
  const total=integer(d.validVotes),l=integer(d.lula),f=integer(d.flavio);
  if(!total || l+f>total) throw Error('Base de votos válidos inválida');
  return {lula:100*l/total,flavio:100*f/total,others:100*(total-l-f)/total};
}
const STATES=[['ac','Acre'],['al','Alagoas'],['ap','Amapá'],['am','Amazonas'],['ba','Bahia'],['ce','Ceará'],['df','Distrito Federal'],['es','Espírito Santo'],['go','Goiás'],['ma','Maranhão'],['mt','Mato Grosso'],['ms','Mato Grosso do Sul'],['mg','Minas Gerais'],['pa','Pará'],['pb','Paraíba'],['pr','Paraná'],['pe','Pernambuco'],['pi','Piauí'],['rj','Rio de Janeiro'],['rn','Rio Grande do Norte'],['rs','Rio Grande do Sul'],['ro','Rondônia'],['rr','Roraima'],['sc','Santa Catarina'],['sp','São Paulo'],['se','Sergipe'],['to','Tocantins']];
function stateParticipation(first,second){
  const before=first?.validVotes&&first.sections===first.totalSections?firstRoundShares(first):null;
  const current=second?.sections&&second.validVotes?firstRoundShares(second):null;
  return {before,current,delta:before&&current?{lula:current.lula-before.lula,flavio:current.flavio-before.flavio}:null};
}
const api={integer,parseTSE,match,validateExterior,voteShare,firstRoundShares,STATES,stateParticipation};
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
const percent=n=>n==null?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const points=n=>(n>0?'+':'')+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' p.p.';
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
  const currentShare=second.sections&&second.validVotes?firstRoundShares(second):null;
  const previousShare=paired?.validVotes?firstRoundShares(paired):null;
  for(const k of candidates){
    $('br-'+k+'-share1').textContent=percent(previousShare?.[k]);
    $('br-'+k+'-share2').textContent=percent(currentShare?.[k]);
  }
  $('br-note').textContent=paired?'Comparação no mesmo percentual exato de seções totalizadas.':'Sem amostra do 1º turno no percentual atual. O arquivo disponível do 1º turno está em '+(100*first.sections/first.totalSections).toLocaleString('pt-BR')+'%. Não interpolamos nem escalamos votos. A comparação será possível a 100% ou com histórico equivalente validado.';
  chart('br-chart',paired?second.lula-paired.lula:null,paired?second.flavio-paired.flavio:null);
 }catch(e){$('br-status').textContent='Consulta ao TSE indisponível: '+e.message+'. Últimos dados exibidos foram mantidos.';}finally{nationalBusy=false;}
}
const stateData=new Map(),stateCells=new Map();
for(const [uf,name] of STATES){
  const row=document.createElement('tr'),cells=[];
  for(let i=0;i<9;i++){const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=i===0?name:'—';row.append(cell);cells.push(cell);}
  $('states-rows').append(row);stateCells.set(uf,cells);stateData.set(uf,{first:null,second:null,error:null});
}
function drawState(uf){
  const item=stateData.get(uf),cells=stateCells.get(uf),shares=stateParticipation(item.first,item.second);
  cells[1].textContent=percent(shares.before?.lula);cells[2].textContent=percent(shares.current?.lula);
  cells[4].textContent=percent(shares.before?.flavio);cells[5].textContent=percent(shares.current?.flavio);
  for(const [index,k] of [[3,'lula'],[6,'flavio']]){
    const delta=shares.delta?.[k];cells[index].textContent=delta==null?'—':(Math.abs(delta)<0.005?'Estável · 0,00 p.p.':(delta>0?'↑ ':'↓ ')+points(delta));
    cells[index].className=delta==null||Math.abs(delta)<0.005?'state-neutral':delta>0?'state-up':'state-down';
  }
  cells[7].textContent=item.second?percent(100*item.second.sections/item.second.totalSections):'—';
  cells[8].textContent=item.error?'Falha na consulta · dados anteriores mantidos':item.second?(shares.current?'TSE: '+item.second.sourceTime:'Aguardando votos válidos'):'Aguardando TSE';
}
async function fetchState(uf,round){
  const id=round===1?'6257':'6258';const r=await fetch(`https://resultados.tse.jus.br/oficial/ele2026/${id}/dados/${uf}/${uf}-c0001-e00${id}-u.json?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('HTTP '+r.status);return parseTSE(await r.json(),round,uf);
}
let statesBusy=false;
async function states(){
  if(statesBusy)return;statesBusy=true;let next=0,errors=0;
  $('states-status').textContent='Consultando os 26 estados e o Distrito Federal…';
  try{
    await Promise.all(Array.from({length:4},async()=>{
      while(next<STATES.length){
        const [uf]=STATES[next++],item=stateData.get(uf);
        const results=await Promise.allSettled([item.first&&item.first.sections===item.first.totalSections?Promise.resolve(item.first):fetchState(uf,1),fetchState(uf,2)]);
        item.error=null;
        for(const [i,result] of results.entries()){
          if(result.status==='fulfilled')item[i===0?'first':'second']=result.value;
          else item.error=String(result.reason);
        }
        if(item.error)errors++;
        drawState(uf);
      }
    }));
    $('states-status').textContent=(errors?`${27-errors}/27 UFs consultadas sem falha; ${errors} com atualização pendente.`:'27/27 UFs consultadas com sucesso.')+' Última consulta: '+time(new Date().toISOString());
  }finally{statesBusy=false;}
}
$('refresh').addEventListener('click',()=>{national();states();});national();states();setInterval(national,30000);setInterval(states,30000);
})(typeof globalThis!=='undefined'?globalThis:this);
