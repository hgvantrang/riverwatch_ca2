import {initialiseDashboard, renderDashboard, resetDashboard, setBusy} from './dashboard.mjs?v=20261124f';
import {studyAnswer} from './answers.mjs';
import {defaultSheetUrl, sheetCsvUrl, groqWorkerUrl} from './settings.mjs?v=20261124f';
import {csv,plan,normaliseWarnings} from './engine.mjs';
const $=id=>document.getElementById(id);
let history;
try {
 const response=await fetch('history_summary.json', {cache:'no-store', signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw Error('History HTTP '+response.status);
 history=await response.json();
 initialiseDashboard(history);
} catch(error) {
 $('status').textContent='Unable to load history: '+error.message;
 $('ask').disabled=true;
 $('refresh').disabled=true;
 throw error;
}
$('sheet').value=localStorage.getItem('riverwatch-sheet')||defaultSheetUrl;
$('save').onclick=()=>{localStorage.setItem('riverwatch-sheet',$('sheet').value.trim());$('status').textContent='Data source saved.';};
async function json(url){let r;try{r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});}catch{throw Error('Cannot reach the Cloudflare data service. Deploy groq-worker.mjs and check groqWorkerUrl in settings.mjs.');}if(!r.ok)throw Error('HTTP '+r.status+' from '+new URL(url,location).hostname);return r.json();}
$('ask').onclick=async(event)=>{
 $('ask').disabled=true;setBusy(true);resetDashboard();$('answer').textContent='';$('evidence').textContent='';
 try{
  const question=$('question').value.trim();if(!question)throw Error('Enter a question.');
  if(/\b(house|home|insurance|coastal|tidal|road closure)\b/i.test(question)){$('answer').textContent='This tool cannot assess individual homes, coastal or tidal flooding, road closures or insurance. Contact the council area office.';return;}
  const sheet=sheetCsvUrl($('sheet').value.trim());if(!/^https:\/\/docs.google.com\/spreadsheets\//.test(sheet))throw Error('Set a published Google Sheet CSV URL.');
  $('status').textContent='Reading Sheet, river forecasts and official warnings…';
  const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-IE',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));const today=`${dateParts.year}-${dateParts.month}-${dateParts.day}`;const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+2);
  const sheetResponse=await fetch(sheet,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!sheetResponse.ok)throw Error('Sheet HTTP '+sheetResponse.status);const rows=csv(await sheetResponse.text());if(rows.length!==8||new Set(rows.map(r=>r.town)).size!==8)throw Error('Sheet must contain all eight distinct towns.');
  const warnings=normaliseWarnings(await json(`${groqWorkerUrl}/api/warnings`));
  const peaks={},sources=[];await Promise.all(history.map(async h=>{const url=new URL('https://flood-api.open-meteo.com/v1/flood');url.search=new URLSearchParams({latitude:h.latitude,longitude:h.longitude,daily:'river_discharge',start_date:today,end_date:end.toISOString().slice(0,10)});const proxy=new URL('/api/flood'+url.search,groqWorkerUrl);const data=await json(proxy);const values=data.daily.river_discharge;if(values.length!==3||values.some(v=>!Number.isFinite(v)))throw Error('Incomplete forecast '+h.town);peaks[h.town]=Math.max(...values);sources.push({town:h.town,url:String(url),dates:data.daily.time,values,grid:[data.latitude,data.longitude]});}));
  const scenario=/clonmel/i.test(question)&&/\b150\b/.test(question)&&/what if|reaches|scenario/i.test(question);if(scenario)rows.find(r=>r.town==='Clonmel').flow_override_m3s='150';
  const result=plan(rows,history,peaks,warnings);const ranked=[...history].sort((a,b)=>b.total_events-a.total_events);const evidence={retrieved:new Date().toISOString(),sheet,warningSource:'https://www.met.ie/Open_Data/json/warning_IRELAND.json',riverValidation:'PENDING. All recommendations are provisional.',plan:result,studyCandidates:ranked.map(h=>({town:h.town,events:h.total_events,firstFour:h.first_four,lastFour:h.last_four})),forecastSources:sources};
  $('evidence').textContent=JSON.stringify(evidence,null,2);
  renderDashboard(result,evidence.retrieved,sources);
  $('answer').textContent='PROVISIONAL — named river verification pending.\n\n'+result.map(r=>`${r.town}: ${r.level}. Peak ${r.peak} m³/s; P95 ${r.p95.toFixed(3)}, P99 ${r.p99.toFixed(3)}. ${r.raised?'Rain raises level. ':''}${r.rehearsal?'REHEARSAL. ':''}${r.crew?'Crew '+r.crew+' erects barriers before 18:00.':r.level==='Normal'?'Routine monitoring.':'Confirm staff, check pumps, stage sandbags.'}${r.escalate?' Escalate to Area Manager: barriers unavailable or no crew.':''}`).join('\n\n');
  if (/study|defence|manager|priority|first in line/i.test(question)) $('answer').textContent=studyAnswer(history);
  const endpoint=groqWorkerUrl;
  if(endpoint && event?.type!=='initial'){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,evidence})});if(!response.ok)throw Error('Groq assistant HTTP '+response.status+'; computed response remains displayed.');const data=await response.json();$('answer').textContent+='\n\nRiver Watch AI\n'+data.answer;}
  $('status').textContent='Live retrieval complete. River validation is pending.'+(endpoint?' Groq explanation added.':' Configure the Groq Worker endpoint to enable AI explanations.');
 }catch(e){$('status').textContent='Unable to complete question: '+e.message;}finally{$('ask').disabled=false;setBusy(false);}
};



await $('ask').onclick({type:'initial'});
