import assert from 'node:assert/strict';
import worker from './groq-worker.mjs';
const env = {ALLOWED_ORIGIN:'https://hgvantrang.github.io', GROQ_API_KEY:'test-only'};
const request = (origin=env.ALLOWED_ORIGIN) => new Request('https://example.test/api/ask', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({question:'Explain the plan',evidence:{plan:[{town:'Clonmel',level:'Normal'}]}})});
const originalFetch=globalThis.fetch;
try {
 assert.equal((await worker.fetch(request('https://other.test'),env)).status,403);
 assert.equal((await worker.fetch(request(),{ALLOWED_ORIGIN:env.ALLOWED_ORIGIN})).status,503);
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
  const body=JSON.parse(options.body);
  assert.equal(body.model,'openai/gpt-oss-120b');
  assert.equal(body.reasoning_effort,'low');
  assert.match(body.messages[1].content,/Clonmel/);
  return Response.json({choices:[{message:{content:'Clonmel is Normal.'}}]});
 };
 const response=await worker.fetch(request(),env);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
 assert.deepEqual(await response.json(),{answer:'Clonmel is Normal.'});
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:''}}]});
 assert.equal((await worker.fetch(request(),env)).status,502);
 globalThis.fetch=async()=>Response.json({error:{message:'private upstream detail'}},{status:401});
 const failure=await worker.fetch(request(),env);
 assert.equal(failure.status,502);
 assert.deepEqual(await failure.json(),{error:'Groq request failed.'});
 console.log('PASS Worker: origin, secret, evidence, supported model, answer and provider failures.');
} finally {globalThis.fetch=originalFetch;}
