import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
export const scope='cn-demos-vtest314';
export const load=p=>JSON.parse(readFileSync(p,'utf8'));
export const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
export function api(method,path,data){
 const args=['--yes','vercel','api',path,'--scope',scope,'--method',method,'--raw'];
 if(data)args.push('--input','-');
 const r=spawnSync('npx',args,{input:data?JSON.stringify(data):undefined,encoding:'utf8',maxBuffer:20e6});
 if(r.status)throw Error(r.stderr.replace(/token[^\s]*/gi,'[redacted]'));
 return JSON.parse(r.stdout);
}
