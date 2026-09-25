import{api,save}from'./platform.mjs';
const projects={};
for(const [key,name,root]of[['web','cdn-workshop-pilot','apps/web'],['request','cdn-workshop-pilot-request','apps/request-demo'],['collector','cdn-workshop-pilot-collector','apps/collector']]){
 const p=api('POST','/v10/projects',{name,framework:key==='web'?'vite':null,rootDirectory:root, ...(key==='web'?{buildCommand:'npm run build',outputDirectory:'dist'}:{outputDirectory:'public'})});
 projects[key]={id:p.id,name:p.name,rootDirectory:p.rootDirectory,teamId:p.accountId};save('.private/projects.json',projects);console.log(key,p.id,p.ssoProtection);
}
