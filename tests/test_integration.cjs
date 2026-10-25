// Execute the deployed frontend with real downloaded JSON and a minimal DOM.
// This checks rendering/update behavior, not Safari layout or device compatibility.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();
class Element{constructor(){this.textContent='';this.children=[];this.style={};}append(x){this.children.push(x);}replaceChildren(){this.children=[];}addEventListener(k,fn){this[k]=fn;}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();}};
const intervals=[],calls=[];let fail=false;
const base=process.env.LIVE_DIR||'.';
const exterior=JSON.parse(fs.readFileSync((process.env.LIVE_DIR?base:'tests/fixtures')+'/exterior.json'));
const first=JSON.parse(fs.readFileSync('tests/fixtures/tse-primeiro.json'));
const second=JSON.parse(fs.readFileSync('tests/fixtures/tse-segundo.json'));
const context={document,console,Date,Set,AbortSignal,localStorage:{getItem(){return null;},setItem(){}},setInterval(fn,ms){intervals.push({fn,ms});},fetch:async url=>{calls.push(url);if(fail)throw Error('offline');return {ok:true,json:async()=>url.includes('comparacao_exterior')?exterior:url.includes('/6257/')?first:second};}};
vm.createContext(context);vm.runInContext(fs.readFileSync(base+'/app.js','utf8'),context);
setImmediate(async()=>{
 assert.equal(elements.get('ex-lula1').textContent,'22.389');
 assert.equal(elements.get('ex-lula2').textContent,'26.786');
 assert.equal(elements.get('ex-flavio1').textContent,'32.682');
 assert.equal(elements.get('ex-flavio2').textContent,'38.532');
 assert.equal(elements.get('countries').children.length,37);
 const share=(l,f)=>(100*l/(l+f)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 assert.equal(elements.get('ex-lula-share1').textContent,share(157387,330882-157387));
 assert.equal(elements.get('ex-lula-share2').textContent,share(26786,38532));
 assert.equal(elements.get('ex-flavio-share2').textContent,share(38532,26786));
 assert.match(elements.get('ex-share-summary').textContent,/exterior completo no 1º turno/);
 assert.equal(elements.get('ex-share-bar1').children.length,3);
 assert.equal(elements.get('ex-flavio-share1').textContent,share(143900,330882-143900));
 assert.match(elements.get('ex-lula-pp').textContent,/-6,56 p\.p\./);
 const originalShare=elements.get('ex-lula-share2').textContent;
 exterior.countries.push({pais:'PAÍS DE TESTE',primeiro:{lula:1000,flavio:0},segundo:{lula:0,flavio:1000}});
 await intervals[0].fn();
 assert.equal(elements.get('ex-lula-share1').textContent,share(157387,330882-157387));
 assert.equal(elements.get('ex-lula-share2').textContent,share(26786,39532));
 assert.match(elements.get('ex-share-summary').textContent,/cobertura geográfica é diferente/);
 exterior.countries.pop();await intervals[0].fn();
 assert.equal(elements.get('ex-lula-share2').textContent,originalShare);

 assert.match(elements.get('br-status').textContent,/aguardando início/);
 assert.equal(elements.get('br-lula2').textContent,'—');
 assert.deepEqual(intervals.map(x=>x.ms),[300000,30000]);
 await intervals[1].fn();assert.equal(elements.get('ex-lula2').textContent,'26.786');
 fail=true;await intervals[0].fn();assert.equal(elements.get('ex-lula2').textContent,'26.786');assert.match(elements.get('ex-status').textContent,/Falha/);
 assert.ok(calls.filter(u=>u.includes('/6258/')).length===2);
 console.log('Integração aprovada: quatro contadores, 37 países, TSE separado, intervalos, atualização e preservação na falha');
});
