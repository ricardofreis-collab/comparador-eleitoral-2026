// Tests rendering with a minimal DOM and real TSE fixtures, not device layout.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();
class Element{constructor(){this.textContent='';this.children=[];this.style={};}append(x){this.children.push(x);}replaceChildren(){this.children=[];}addEventListener(k,fn){this[k]=fn;}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();}};
const intervals=[],calls=[];
const base=process.env.LIVE_DIR||'.';
const read=p=>JSON.parse(fs.readFileSync('tests/fixtures/'+p));
const first=read('tse-primeiro.json'),second=read('tse-segundo.json');
const stateFirst=read('tse-sp-primeiro.json'),stateSecond=read('tse-sp-segundo.json');
// Non-SP UFs use copies with adapted scope only to exercise all 27 routes.
let failUF=null,emptyUF=null;
const context={document,console,Date,Set,Map,AbortSignal,localStorage:{getItem(){return null;},setItem(){}},setInterval(fn,ms){intervals.push({fn,ms});},fetch:async url=>{
 calls.push(url);const uf=url.match(/\/dados\/([a-z]{2})\//)?.[1],round=url.includes('/6257/')?1:2;
 if(uf===failUF&&round===2)throw Error('offline');
 const d=structuredClone(uf==='br'?(round===1?first:second):(round===1?stateFirst:stateSecond));
 if(uf!=='br'){d.cdabr=uf;if(uf===emptyUF&&round===2){d.s.st='0';d.v.vv='0';for(const a of d.carg[0].agr)for(const p of a.par)for(const c of p.cand)c.vap='0';}}
 return {ok:true,json:async()=>d};
}};
vm.createContext(context);vm.runInContext(fs.readFileSync(base+'/app.js','utf8'),context);
setImmediate(async()=>{
 const rows=elements.get('states-rows').children;
 assert.equal(rows.length,27);assert.equal(rows[0].children[0].textContent,'Acre');
 assert.deepEqual(intervals.map(x=>x.ms),[30000,30000]);
 assert.equal(calls.length,56);assert.equal(calls.filter(u=>u.includes('/6257/')&&!u.includes('/br/')).length,27);
 const sp=rows.find(r=>r.children[0].textContent==='São Paulo');
 const share=(d,k)=>{const c=d.carg[0].agr.flatMap(a=>a.par.flatMap(p=>p.cand)).find(c=>c.n===k);return (100*Number(c.vap)/Number(d.v.vv)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';};
 assert.equal(sp.children[1].textContent,share(stateFirst,'13'));assert.equal(sp.children[2].textContent,share(stateSecond,'13'));
 assert.equal(sp.children[4].textContent,share(stateFirst,'22'));assert.equal(sp.children[5].textContent,share(stateSecond,'22'));
 assert.match(sp.children[3].textContent,/p\.p\./);assert.match(elements.get('states-status').textContent,/27\/27/);
 const old=rows[0].children[2].textContent;failUF='ac';await intervals[1].fn();
 assert.equal(rows[0].children[2].textContent,old);assert.match(rows[0].children[8].textContent,/Falha/);
 assert.match(elements.get('states-status').textContent,/26\/27/);
 assert.equal(calls.filter(u=>u.includes('/6257/')&&!u.includes('/br/')).length,27);
 assert.equal(elements.get('br-lula-share2').textContent,'—');
 Object.assign(second,read('tse-segundo-parcial.json'));await intervals[0].fn();
 assert.equal(elements.get('br-lula-share2').textContent,'52,14%');assert.equal(elements.get('br-flavio-share2').textContent,'47,86%');
 assert.equal(elements.get('br-lula-share1').textContent,'—');
 failUF=null;emptyUF='sp';await intervals[1].fn();assert.equal(sp.children[2].textContent,'—');assert.match(sp.children[8].textContent,/Aguardando/);
 assert.ok(calls.every(u=>u.startsWith('https://resultados.tse.jus.br/')));
 console.log('Integração aprovada: Brasil, 27 UFs, percentuais por turno, variação, cache do primeiro turno, falha isolada e ausência de votos');
});
