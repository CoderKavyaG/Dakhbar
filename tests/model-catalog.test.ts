import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateModelCatalog} from '../src/lib/llm/catalog';
test('catalog validates every configured ID and names missing models before generation',async()=>{let calls=0;const configs=['live','retired'].map(model=>({name:'groq',baseUrl:'https://catalog.test/v1',apiKey:'mock',model}));const rows=await validateModelCatalog(configs,(async()=>{calls++;return Response.json({data:[{id:'live'}]});}) as typeof fetch);assert.equal(calls,1);assert.equal(rows[0].available,true);assert.equal(rows[1].error,'configured_model_missing');assert.equal(rows[1].model,'retired');});
test('catalog outage is not confused with a missing model',async()=>{const rows=await validateModelCatalog([{name:'groq',baseUrl:'https://catalog.test',apiKey:'mock',model:'live'}],(async()=>new Response('{}',{status:503})) as typeof fetch);assert.equal(rows[0].error,'catalog_http_503');});
