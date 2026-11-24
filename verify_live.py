import json,urllib.request,urllib.parse,csv,io
from pathlib import Path
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from flood_plan import recommend
root=Path(__file__).parent
history=json.loads((root/'history_summary.json').read_text())
now=datetime.now(ZoneInfo('Europe/Dublin')); today=now.date(); end=today+timedelta(days=2)
def fetch(url):
 with urllib.request.urlopen(url,timeout=60) as response: return response.read().decode('utf-8-sig')
sheet='https://docs.google.com/spreadsheets/d/1ho0Vvv0qW75qonW0lAdTS8cbU-vRTdEDUZXTOKbmABQ/export?format=csv&gid=0'
rows=list(csv.DictReader(io.StringIO(fetch(sheet))))
warnings_url='https://www.met.ie/Open_Data/json/warning_IRELAND.json'
raw=json.loads(fetch(warnings_url)); mapping={'EI03':'Clare','EI04':'Cork','EI14':'Leitrim','EI24':'Roscommon','EI26':'Tipperary','EI29':'Westmeath','EI30':'Wexford'}
warnings=[dict(type=w['type'].lower(),level=w['level'].lower(),counties=[mapping.get(c,c) for c in w['regions']],start=w['onset'],end=w['expiry']) for w in raw]
peaks={}; forecasts=[]
for h in history:
 url='https://flood-api.open-meteo.com/v1/flood?'+urllib.parse.urlencode(dict(latitude=h['latitude'],longitude=h['longitude'],daily='river_discharge',start_date=today.isoformat(),end_date=end.isoformat()))
 data=json.loads(fetch(url)); v=data['daily']['river_discharge']; assert len(v)==3 and all(x is not None for x in v)
 peaks[h['town']]=max(v); forecasts.append(dict(town=h['town'],url=url,response=data))
baseline=recommend(rows,{h['town']:h for h in history},peaks,warnings,now)
rehearsal=json.loads(json.dumps(rows)); rehearsal[0]['flow_override_m3s']='150'; rehearsal[1]['warning_override']='orange'
after=recommend(rehearsal,{h['town']:h for h in history},peaks,warnings,now)
result=dict(retrieved=now.isoformat(),sheet=sheet,rows=rows,warning_source=warnings_url,warning_response=raw,forecasts=forecasts,baseline=baseline,rehearsal_rows=rehearsal,rehearsal=after,limitations='Rehearsal changed an in-memory copy. Actual Sheet edits and browser screenshots have not been performed. No LLM calls were made.')
(root/'live_verification.json').write_text(json.dumps(result,indent=2))
print('Live baseline',[(r['town'],r['peak'],r['level']) for r in baseline]); print('Local rehearsal',[(r['town'],r['level']) for r in after]); print('Sheet rows',len(rows),'warnings',len(raw))
