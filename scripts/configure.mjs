import{api,load,save}from'./platform.mjs';import{randomBytes}from'node:crypto';import{existsSync}from'node:fs';
const ps=load('.private/projects.json');
for(const p of Object.values(ps)){const x=api('PATCH',`/v9/projects/${p.id}`,{ssoProtection:null});console.log(p.name,'public project setting',x.ssoProtection);}
const secrets=existsSync('.private/secrets.json')?load('.private/secrets.json'):Object.fromEntries(['production','preview'].map(env=>[env,Object.fromEntries(['SERVICE_SECRET','FIXTURE_SECRET','DRAIN_SECRET'].map(k=>[k,randomBytes(32).toString('hex')]))]));save('.private/secrets.json',secrets);
for(const target of ['production','preview']){
 const collector=load('pilot.config.json').environments[target].collectorUrl;
 for(const key of ['request','collector']){
  const vars={PILOT_ENV:target,SERVICE_SECRET:secrets[target].SERVICE_SECRET,...(key==='request'?{FIXTURE_SECRET:secrets[target].FIXTURE_SECRET,COLLECTOR_URL:collector}:{FIXTURE_SECRET:secrets[target].FIXTURE_SECRET,DRAIN_SECRET:secrets[target].DRAIN_SECRET,SOURCE_PROJECT_ID:ps.request.id})};
  for(const [name,value] of Object.entries(vars)) api('POST',`/v10/projects/${ps[key].id}/env?upsert=true`,{key:name,value,type:'encrypted',target:[target]});
 }
}
console.log('Environment variables configured without printing values.');
