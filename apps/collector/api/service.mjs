import sourceMappings from '../service-metadata.json' with {type:'json'};
import {put,list,get} from '@vercel/blob';
import {randomUUID,createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {analyze} from '../lib/evidence.mjs';
export const config={api:{bodyParser:false}};
const env=process.env.PILOT_ENV || 'unset';
const prefix=`${env}/`;
const runOK=r=>/^run-[a-f0-9-]{36}$/.test(r||'');
const hash=s=>createHash('sha256').update(s).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
async function body(req){let size=0;const parts=[];for await(const c of req){size+=c.length;if(size>4e6)throw Error('body too large');parts.push(Buffer.from(c));}return Buffer.concat(parts);}
async function read(path){const b=await get(prefix+path,{access:'private',useCache:false});return b?JSON.parse(await new Response(b.stream).text()):null;}
async function save(path,value,overwrite=false){return put(prefix+path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:overwrite,contentType:'application/json'});}
async function rows(path){const result=await list({prefix:prefix+path,limit:250});return Promise.all(result.blobs.map(b=>read(b.pathname.slice(prefix.length))));}
// Retain only fields needed for this synthetic experiment. IP, headers, and unrelated messages are never stored.
function sanitize(e){let message;try{const m=JSON.parse(e.message);if(m.kind==='workshop-cookie-v1')message=JSON.stringify({kind:m.kind,run:m.run,eventId:m.eventId,cookieState:m.cookieState,cookie:['fixture-A','fixture-B'].includes(m.cookie)?m.cookie:null});}catch{}
 const rawText=JSON.stringify(e);const nativeCookieFieldPresent=e.source==='external'?(/cookie/i.test(rawText)||rawText.includes('fixture-')):null;
 const p=e.proxy;return {nativeCookieFieldPresent,excludedValuePresent:rawText.includes('NEVER_CAPTURE'),id:e.id,projectId:e.projectId,deploymentId:e.deploymentId,source:e.source,requestId:e.requestId,timestamp:e.timestamp,...(message?{message}:{}),...(p?{proxy:{path:p.path,referer:p.referer,userAgent:p.userAgent,vercelCache:p.vercelCache,statusCode:p.statusCode,cacheId:p.cacheId}}:{})};}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 const u=new URL(req.url,'https://collector.invalid'),op=u.searchParams.get('op'),run=u.searchParams.get('run');
 const admin=Boolean(process.env.SERVICE_SECRET)&&equal(req.headers.authorization,`Bearer ${process.env.SERVICE_SECRET}`);
 try{
  if(op==='version')return res.json({sourceMappings,service:'collector',environment:env,revision:process.env.VERCEL_GIT_COMMIT_SHA||'local',deploymentId:process.env.VERCEL_DEPLOYMENT_ID||null});
  if(op==='drain'){
   if(req.method!=='POST')return res.status(405).end();
   const raw=await body(req),expected=createHmac('sha1',process.env.DRAIN_SECRET).update(raw).digest('hex');
   if(!equal(req.headers['x-vercel-signature'],expected))return res.status(403).json({error:'invalid signature'});
   const parsed=JSON.parse(raw),groups=new Map(),audit=[];
   for(const e of Array.isArray(parsed)?parsed:[parsed]){
    if(e.projectId!==process.env.SOURCE_PROJECT_ID)continue;
    const match=(e.proxy?.path||e.path||'').match(/\/demo\/(run-[a-f0-9-]{36})(?:\?|$)/)||e.message?.match(/"run":"(run-[a-f0-9-]{36})"/);
    if(!match)continue;const r=match[1],cfg=await read(`runs/${r}/config.json`);
    audit.push({run:r,eventDeployment:e.deploymentId,registeredDeployment:cfg?.deploymentId||null});
    if(!cfg||cfg.deploymentId!==e.deploymentId||Date.now()>cfg.expires)continue;
    if(!groups.has(r))groups.set(r,[]);groups.get(r).push(sanitize(e));
   }
   for(const[r,records]of groups)await save(`runs/${r}/batches/${Date.now()}-${randomUUID()}.json`,{signatureVerified:true,receivedAt:Date.now(),records});
   console.log(JSON.stringify({kind:'drain-audit',environment:env,signatureVerified:true,count:Array.isArray(parsed)?parsed.length:1,matchedRuns:[...groups.keys()],audit:audit.slice(0,12)}));
   return res.json({accepted:true});
  }
  if(op==='register'&&req.method==='POST'){
   if(!admin)return res.status(401).json({error:'unauthorized'});
   const cfg=JSON.parse(await body(req));
   if(!runOK(cfg.run)||!/^dpl_/.test(cfg.deploymentId)||cfg.environment!==env)return res.status(400).json({error:'environment or run mismatch'});
   if(!/^[a-f0-9]{64}$/.test(cfg.rateKey||''))return res.status(400).end();
   try{await save(`limits/${cfg.rateKey}.json`,{at:Date.now()});}catch(e){if(e.name==='BlobPathnameConflictError')return res.status(429).json({error:'Wait 15 seconds before another run'});throw e;}
   const {rateKey,...registered}=cfg;
   await save(`runs/${cfg.run}/config.json`,{...registered,expires:Date.now()+3600000});return res.json({registered:true});
  }
  if(!runOK(run))return res.status(400).json({error:'valid run required'});
  const cfg=await read(`runs/${run}/config.json`);if(!cfg)return res.status(404).json({error:'unknown run'});
  if(Date.now()>cfg.expires)return res.status(410).json({error:'run expired; create a fresh run'});
  if(op==='origin'){
   const [expires,sig]=(req.headers['x-fixture-ticket']||'').split('.');
   if(Number(expires)<Date.now()||!equal(sig,createHmac('sha256',process.env.FIXTURE_SECRET).update(`${run}|${expires}`).digest('hex')))return res.status(403).json({error:'invalid origin ticket'});
   const fillId=randomUUID();await save(`runs/${run}/origins/${fillId}.json`,{fillId,at:Date.now()});
   res.setHeader('Cache-Control','public,max-age=0,s-maxage=3600');res.setHeader('Vercel-CDN-Cache-Control','no-store');res.setHeader('x-workshop-fill-id',fillId);return res.json({fixture:'owned synthetic shared content',fillId});
  }
  if(op==='observations'&&req.method==='POST'){
   if(!admin)return res.status(401).json({error:'unauthorized'});
   const data=JSON.parse(await body(req));if(!Array.isArray(data)||data.length!==4)return res.status(400).end();
   await save(`runs/${run}/observations.json`,data);return res.json({saved:true});
  }
  const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!equal(hash(bearer),cfg.capabilityHash))return res.status(401).json({error:'run capability required'});
  if(op==='evidence'){
   const data={run,environment:env,deploymentId:cfg.deploymentId,revision:cfg.revision,origins:await rows(`runs/${run}/origins/`),batches:await rows(`runs/${run}/batches/`),observations:await read(`runs/${run}/observations.json`)||[]};
   return res.json({...analyze(data),...data,collectorRevision:process.env.VERCEL_GIT_COMMIT_SHA,collectorSourceMappings:sourceMappings});
  }
  return res.status(404).end();
 }catch(error){return res.status(500).json({error:'Collector operation failed; retry evidence without generating requests.',code:error.name});}
}
