import{readFileSync,writeFileSync}from'node:fs';
const service=process.argv[2];const sources=JSON.parse(readFileSync('../../pilot.config.json','utf8')).sources;
const keys=service==='request'?['middleware','driver']:['collector','verification'];
writeFileSync('service-metadata.json',JSON.stringify(Object.fromEntries(keys.map(k=>[k,{path:sources[k],first:1,last:readFileSync('../../'+sources[k],'utf8').trimEnd().split('\n').length}]))));
