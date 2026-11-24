import assert from 'node:assert/strict';
import fs from 'node:fs';
class Element {
 constructor(){this.children=[];this.textContent='';this.attributes={};this.disabled=false;this.style={};this.value='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(k,v){this.attributes[k]=v;}
 scrollIntoView(){} focus(){}
 click(){return this.onclick?.({type:'click'});}
}
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
elements.get('question').value="What is tonight's plan?";
globalThis.document={getElementById:id=>{assert(elements.has(id),'Missing '+id);return elements.get(id);},createElement:()=>new Element(),querySelectorAll:()=>[]};
globalThis.window={};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const networkFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(url==='history_summary.json') return new Response(fs.readFileSync(new URL('./history_summary.json',import.meta.url),'utf8'));
 console.log('Fetching',String(url).split('?')[0]);
 return networkFetch(url,options);
};
await import('./app.mjs');
console.log('STATUS',elements.get('status').textContent);
assert.equal(elements.get('town-list').children.length,8);
assert.match(elements.get('status').textContent,/Live retrieval complete/);
assert.equal(['normal','standby','barriers'].reduce((sum,k)=>sum+Number(elements.get('count-'+k).textContent),0),8);
assert.equal(elements.get('ask').disabled,false);
assert(JSON.parse(elements.get('evidence').textContent).forecastSources.length===8);
console.log('PASS full application startup with live Sheet, warnings and eight forecasts; map fallback and counts.');
