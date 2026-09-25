import{readFileSync,writeFileSync}from'node:fs';
const service=process.argv[2];const sources=JSON.parse(readFileSync('../../pilot.config.json','utf8')).sources;
const keys=service==='request'?['middleware','driver','browserSession']:['collector','verification'];
writeFileSync('service-metadata.json',JSON.stringify(Object.fromEntries(keys.map(k=>[k,{path:sources[k],first:1,last:readFileSync('../../'+sources[k],'utf8').trimEnd().split('\n').length}]))));

if(service==='request'){
 const cfg=JSON.parse(readFileSync('../../pilot.config.json','utf8')),environment=process.env.VERCEL_ENV==='preview'?'preview':'production';
 const profile={...cfg,...cfg.environments[environment],environment,revision:process.env.VERCEL_GIT_COMMIT_SHA||'local',sources:Object.fromEntries(Object.entries(cfg.sources).map(([key,path])=>[key,{path,first:1,last:readFileSync('../../'+path,'utf8').trimEnd().split('\n').length}]))};delete profile.environments;
 writeFileSync('public/lab-profile.json',JSON.stringify(profile,null,2));
}
