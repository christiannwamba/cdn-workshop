import{api,load,save}from'./platform.mjs';import{existsSync}from'node:fs';

const ps=load('.private/projects.json'),secrets=load('.private/secrets.json'),config=load('pilot.config.json'),out=existsSync('.private/drains.json')?load('.private/drains.json'):[];
for(const env of ['production','preview']){if(out.some(d=>d.environment===env))continue;const d=api('POST','/v1/drains',{name:`CDN pilot ${env}`,projects:'some',projectIds:[ps.request.id],schemas:{log:{version:'v1'}},delivery:{type:'http',endpoint:config.environments[env].collectorUrl+'/api/service?op=drain',encoding:'json',compression:'none',headers:{},secret:secrets[env].DRAIN_SECRET}});out.push({environment:env,id:d.id});save('.private/drains.json',out);console.log(env,d.id,d.status);}
