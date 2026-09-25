import{execFileSync}from'node:child_process';import{readFileSync,existsSync}from'node:fs';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();if(!root.endsWith('/cdn-workshop-pilot'))throw Error('Wrong repository root');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const secrets=existsSync('.private/secrets.json')?Object.values(JSON.parse(readFileSync('.private/secrets.json'))).flatMap(Object.values):[];
for(const p of files){if(/(^|\/)(\.env[^/]*|\.private|\.vercel)(\/|$)/.test(p))throw Error(`Private path: ${p}`);const text=p==='scripts/audit.mjs'?'':readFileSync(p,'utf8');if(secrets.some(s=>text.includes(s)))throw Error(`Secret in ${p}`);if(/argos|sainsbury|slack\.com|notion\.so|app\.notion/i.test(text))throw Error(`Account material in ${p}`);if(/-----BEGIN .*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|vercel_blob_rw_[A-Za-z0-9_]+/.test(text))throw Error(`Credential pattern in ${p}`);}
console.log(`PASS: ${files.length} staged/tracked clean-source files. No private paths, known pilot secrets, account material or credential patterns.`);
