import {test} from 'node:test';import assert from 'node:assert/strict';import {analyze} from '../apps/collector/lib/evidence.mjs';
test('missing delivery remains pending and never passes',()=>{assert.equal(analyze({batches:[],observations:[],origins:[]}).status,'PENDING');});
test('duplicate deliveries are counted but deduplicated',()=>{const r={id:'record-1',source:'external',proxy:{},requestId:'real'};const a=analyze({batches:[{records:[r,r]}],origins:[],observations:[]});assert.equal(a.duplicateRecords,1);assert.equal(a.nativeCount,1);});
test('forged event IDs cannot establish an exact request join',()=>{const a=analyze({batches:[{records:[{id:'n',source:'external',requestId:'native',proxy:{referer:'A'}},{id:'e',requestId:'different',message:JSON.stringify({kind:'workshop-cookie-v1',eventId:'uuid'})}]}],observations:[{eventId:'uuid',referer:'A'}],origins:[]});assert.equal(a.rows[0].joined,false);});
import {readFileSync} from 'node:fs';
const delivered=JSON.parse(readFileSync(new URL('../evidence/production-live.json',import.meta.url)));
test('genuine recorded evidence passes and duplicated batches do not inflate requests',()=>{const original=analyze(delivered);const replay=analyze({...delivered,batches:[...delivered.batches,...delivered.batches]});assert.equal(original.status,'PASS');assert.equal(replay.status,'PASS');assert.equal(replay.nativeCount,4);assert.equal(replay.emissionCount,4);assert.ok(replay.duplicateRecords>0);});
test('missing genuine records stay pending and late delivery recovers',()=>{assert.equal(analyze({...delivered,batches:[]}).status,'PENDING');assert.equal(analyze(delivered).status,'PASS');});
test('tampered envelope correlation never passes',()=>{const altered=structuredClone(delivered);for(const b of altered.batches)for(const r of b.records)if(r.message)r.requestId='forged';assert.notEqual(analyze(altered).status,'PASS');});
import {analyzeBrowser} from '../apps/collector/lib/evidence.mjs';
const browserFixture=structuredClone(delivered);
browserFixture.consumed=delivered.observations.map((r,i)=>({slot:i+1,expected:r.name,eventId:r.eventId,at:i}));
for(const batch of browserFixture.batches)for(const r of batch.records)if(r.message){const m=JSON.parse(r.message);m.slot=browserFixture.consumed.find(x=>x.eventId===m.eventId)?.slot;r.message=JSON.stringify(m);}
test('browser incomplete manual steps are partial, not a failed suite',()=>{assert.equal(analyzeBrowser({...browserFixture,consumed:browserFixture.consumed.slice(0,1)}).status,'PARTIAL');});
test('browser analyzer uses actual envelope IDs, not client receipts or artificial UA',()=>{const d=structuredClone(browserFixture);d.observations=[{eventId:'forged-client-value',cache:'HIT'}];for(const b of d.batches)for(const r of b.records)if(r.proxy)r.proxy.userAgent=['Browser UA'];assert.equal(analyzeBrowser(d).status,'PASS');});
test('browser events need an authenticated consumed-event record',()=>{assert.equal(analyzeBrowser({...browserFixture,consumed:[]}).status,'EMPTY');const d=structuredClone(browserFixture);d.consumed[0].eventId='forged';assert.equal(analyzeBrowser(d).status,'PENDING');});
