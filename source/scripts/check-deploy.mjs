import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=['dist/index.html','dist/admin/index.html','dist/assets/site.js','dist/assets/admin.js','dist/assets/supabase-config.js','dist/CNAME','dist/404.html'];
const missing=required.filter(file=>!fs.existsSync(path.join(root,file)));
if(missing.length)throw new Error(`Missing deployment files: ${missing.join(', ')}`);

const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):files.push(file)}}
walk(path.join(root,'dist'));
for(const file of files.filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)){
    const target=path.join(root,'dist',match[1]);
    if(!fs.existsSync(target))throw new Error(`Broken local asset in ${file}: ${match[1]}`);
  }
}
const config=fs.readFileSync(path.join(root,'dist/assets/supabase-config.js'),'utf8');
if(/service_role|sb_secret_/i.test(config))throw new Error('Secret Supabase key detected in public output');
console.log(`Deployment check passed: ${files.length} files, ${files.filter(x=>x.endsWith('.html')).length} HTML pages.`);
