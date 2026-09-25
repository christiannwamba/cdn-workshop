export function analyze(data) {
 const all=data.batches.flatMap(b=>b.records.map(record=>({record,receivedAt:b.receivedAt})));
 const unique=[...new Map(all.map(x=>[x.record.id,x])).values()];
 const native=unique.filter(x=>x.record.source==='external'&&x.record.proxy);
 const emissions=unique.flatMap(x=>{try{const event=JSON.parse(x.record.message);return event.kind==='workshop-cookie-v1'?[{...x,event}]:[];}catch{return[];}});
 const rows=(data.observations||[]).map(req=>{
  const e=emissions.filter(x=>x.event.eventId===req.eventId);
  const n=native.filter(x=>x.record.proxy.referer===req.referer);
  return {...req,nativeCount:n.length,emissionCount:e.length,nativeRequestId:n[0]?.record.requestId||null,envelopeRequestId:e[0]?.record.requestId||null,joined:e.length===1&&n.length===1&&!!n[0].record.requestId&&e[0].record.requestId===n[0].record.requestId,nativeCache:n[0]?.record.proxy.vercelCache||null,nativeUserAgent:n[0]?.record.proxy.userAgent||null,cookieState:e[0]?.event.cookieState||null,cookie:e[0]?.event.cookie??null,nativeCookieAbsent:n.length===1&&n[0].record.nativeCookieFieldPresent===false,delayMs:n[0]?n[0].receivedAt-n[0].record.timestamp:null};
 });
 const complete=rows.length===4&&rows.every(r=>r.joined);
 const checks={cache:rows.length===4&&rows.every((r,i)=>r.cache===(i===0?'MISS':'HIT')&&r.nativeCache===r.cache),origin:data.origins.length===1&&rows.every(r=>r.fillId===data.origins[0].fillId),cookies:rows.length===4&&rows.every((r,i)=>r.cookieState===(i<2?'valid':i===2?'missing':'invalid')&&r.cookie===(i<2?`fixture-${i===0?'A':'B'}`:null)),join:complete,nativeCookieAbsent:rows.length===4&&rows.every(r=>r.nativeCookieAbsent),currentMetadata:rows.length===4&&new Set(rows.map(r=>r.nativeRequestId)).size===4&&rows.every(r=>(Array.isArray(r.nativeUserAgent)?r.nativeUserAgent:[r.nativeUserAgent]).includes(`Workshop/${r.name}`)),noUnrelatedCookie:all.length>0&&all.every(x=>x.record.excludedValuePresent===false)};
 return {status:complete?(Object.values(checks).every(Boolean)?'PASS':'FAIL'):'PENDING',checks,rows,originCount:data.origins.length,nativeCount:native.length,emissionCount:emissions.length,duplicateRecords:all.length-unique.length,unmatchedEmissions:emissions.filter(e=>!native.some(n=>n.record.requestId===e.record.requestId)).length,receivedBatches:data.batches.length,verifiedAt:new Date().toISOString()};
}
