import{load,save}from'./platform.mjs';const p=load('pilot.config.json').environments.preview,base=p.requestUrl;
const post=async(body,capability)=>{const r=await fetch(base+'/api/browser',{method:'POST',headers:{'content-type':'application/json',...(capability?{authorization:'Bearer '+capability}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
let prepared=await post({op:'prepare'});if(prepared.status===429){await new Promise(r=>setTimeout(r,16000));prepared=await post({op:'prepare'});}if(prepared.status!==200)throw Error(JSON.stringify(prepared));const s=prepared.data;save('.private/browser-boundary-session.json',s);
const result={verifiedAt:new Date().toISOString(),mode:'HTTP negative controls, not browser-transport proof',run:s.run,revision:s.revision};
result.unauthorizedTicket=(await post({op:'ticket',run:s.run,expected:'A'})).status;
result.wrongCapability=(await post({op:'ticket',run:s.run,expected:'A'},'wrong')).status;
const first=await post({op:'ticket',run:s.run,expected:'A'},s.capability);if(first.status!==200)throw Error('Ticket creation failed');const ticket=first.data.ticket;
result.directOriginBeforeConsume=(await fetch(p.collectorUrl+`/origin/${s.run}`,{headers:{'x-fixture-ticket':ticket}})).status;
const response=await fetch(base+s.contentPath,{headers:{'x-fixture-ticket':ticket,cookie:'workshop_choice=fixture-A; workshop_unrelated=NEVER_CAPTURE'}});result.validFixture=response.status;result.privateOriginHeaderExposed=[...response.headers.keys()].some(k=>/origin-ticket|middleware-request|authorization/i.test(k));await response.text();
result.directOriginAfterConsume=(await fetch(p.collectorUrl+`/origin/${s.run}`,{headers:{'x-fixture-ticket':ticket}})).status;
result.ticketReplay=(await fetch(base+s.contentPath,{headers:{'x-fixture-ticket':ticket}})).status;
for(let n=2;n<=12;n++){const t=await post({op:'ticket',run:s.run,expected:'A'},s.capability);if(t.status!==200)throw Error('Budget allocation failed '+n);}
result.thirteenthTicket=(await post({op:'ticket',run:s.run,expected:'A'},s.capability)).status;
result.closed=(await post({op:'close',run:s.run},s.capability)).status;
result.afterResetTicket=(await post({op:'ticket',run:s.run,expected:'A'},s.capability)).status;
result.afterResetContent=(await fetch(base+s.contentPath,{headers:{'x-fixture-ticket':ticket}})).status;
result.crossEnvironmentRead=(await fetch(load('pilot.config.json').environments.production.collectorUrl+`/api/service?op=evidence&run=${s.run}`,{headers:{authorization:'Bearer '+s.capability}})).status;
save('evidence/browser/boundaries.json',result);console.log(result);
if(result.directOriginBeforeConsume!==403||result.directOriginAfterConsume!==403||result.ticketReplay!==409||result.thirteenthTicket!==429||result.afterResetTicket!==410||result.afterResetContent!==410||result.privateOriginHeaderExposed)process.exitCode=1;
