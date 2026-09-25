import sourceMappings from '../service-metadata.json' with {type:'json'};
import {randomUUID,randomBytes,createHash,createHmac} from 'node:crypto';
const environment=process.env.PILOT_ENV;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 // Browser session endpoints are same-origin. No credentialed cross-origin API is needed.
 if(req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`)return res.status(403).json({error:'Open this lab as a top-level page on its request host'});
 const input=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const collector=process.env.COLLECTOR_URL;
 const call=async(op,run,data,authorization)=>{const r=await fetch(`${collector}/api/service?op=${op}&run=${encodeURIComponent(run||'')}`,{method:'POST',headers:{'content-type':'application/json',authorization},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok){const e=Error(value.error||`HTTP ${r.status}`);e.status=r.status;throw e;}return value;};
 try{
  if(input.op==='prepare'){
   const v=await fetch(collector+'/api/service?op=version').then(r=>r.json());
   if(v.environment!==environment)throw Error('Collector environment mismatch');
   const run='run-'+randomUUID(),capability=randomBytes(32).toString('hex'),browserExpiresAt=Date.now()+600000;
   await call('register',run,{run,mode:'browser',browserExpiresAt,capabilityHash:createHash('sha256').update(capability).digest('hex'),deploymentId:process.env.VERCEL_DEPLOYMENT_ID,revision:process.env.VERCEL_GIT_COMMIT_SHA,environment,rateKey:createHmac('sha256',process.env.SERVICE_SECRET).update(`${Math.floor(Date.now()/15000)}|${req.headers['x-forwarded-for']||'unknown'}`).digest('hex')},`Bearer ${process.env.SERVICE_SECRET}`);
   return res.json({sourceMappings,run,capability,browserExpiresAt,collectorUrl:collector,environment,deploymentId:process.env.VERCEL_DEPLOYMENT_ID,revision:process.env.VERCEL_GIT_COMMIT_SHA,contentPath:`/demo/${run}`,maximumRequests:12});
  }
  if(!['ticket','join','close'].includes(input.op))return res.status(400).json({error:'Unknown operation'});
  return res.json({...await call('browser-'+input.op,input.run,{expected:input.expected,shortTicket:input.shortTicket===true,deploymentId:process.env.VERCEL_DEPLOYMENT_ID},req.headers.authorization||''),sourceMappings});
 }catch(e){return res.status(e.status||502).json({error:e.message});}
}
