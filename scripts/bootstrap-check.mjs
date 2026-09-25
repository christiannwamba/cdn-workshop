import{mkdtempSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{execFileSync}from'node:child_process';
const out=mkdtempSync(join(tmpdir(),'cdn-pilot-bootstrap-'));execFileSync('git',['clone','--quiet','--no-local','.',out]);
for(const args of [['ci'],['test'],['run','build']])execFileSync('npm',args,{cwd:out,stdio:'pipe'});
for(const [dir,name]of [['request-demo','request'],['collector','collector']])execFileSync('node',['../../scripts/service-metadata.mjs',name],{cwd:join(out,'apps',dir)});
console.log(JSON.stringify({status:'PASS',checkout:out,revision:execFileSync('git',['rev-parse','HEAD'],{cwd:out,encoding:'utf8'}).trim(),checks:['npm ci','npm test','npm run build','both service metadata builds'],verifiedAt:new Date().toISOString()}));
