import assert from 'node:assert/strict';
import fs from 'node:fs';
class Element {
    constructor(){this.children=[];this.textContent='';this.attributes={};this.disabled=false;}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(key,value){this.attributes[key]=value;}
    scrollIntoView(){}
    focus(){}
}
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
globalThis.document={getElementById:id=>{assert(elements.has(id),'Missing HTML element '+id);return elements.get(id);},createElement:()=>new Element(),querySelectorAll:()=>[]};
globalThis.window={};
const {initialiseDashboard,renderDashboard,resetDashboard,setBusy}=await import('./dashboard.mjs');
const history=JSON.parse(fs.readFileSync(new URL('./history_summary.json',import.meta.url),'utf8'));
initialiseDashboard(history);
assert.equal(elements.get('town-list').children.length,8);
assert.equal(elements.get('fit-map').disabled,true);
const results=history.map((town,index)=>({...town,level:index===0?'Barriers':'Normal',peak:30,crew:index===0?'Clonmel':null,notes:'Normal service',pumps:2,sandbags:1000,staff_on_call:3}));
renderDashboard(results,'2026-11-24T12:00:00Z');
assert.equal(elements.get('count-normal').textContent,7);
assert.equal(elements.get('count-barriers').textContent,1);
assert.equal(elements.get('crew-list').children.length,3);
assert.equal(elements.get('selected-level').textContent,'Barriers');
resetDashboard();
assert.equal(elements.get('count-barriers').textContent,'—');
assert.equal(elements.get('selected-level').textContent,'Awaiting live data');
setBusy(true);assert.equal(elements.get('refresh').disabled,true);
setBusy(false);assert.equal(elements.get('refresh').disabled,false);
console.log('PASS dashboard DOM contract, map fallback, town details, counts, crews and stale-data reset. Browser visual verification remains pending.');
