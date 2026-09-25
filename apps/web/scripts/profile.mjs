import{writeFileSync,readFileSync,mkdirSync}from'node:fs';import{execFileSync}from'node:child_process';
const env=process.env.VERCEL_ENV==='preview'?'preview':'production';
let revision=process.env.VERCEL_GIT_COMMIT_SHA;try{revision ||= execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{revision='local';}
const base=JSON.parse(readFileSync('../../pilot.config.json','utf8'));
const profile={...base,...base.environments[env],environment:env,revision};delete profile.environments;
profile.sources=Object.fromEntries(Object.entries(base.sources).map(([key,path])=>[key,{path,first:1,last:readFileSync('../../'+path,'utf8').trimEnd().split('\n').length}]));
mkdirSync('public',{recursive:true});
writeFileSync('public/profile.json',JSON.stringify(profile,null,2));
