const fs=require('fs'),crypto=require('crypto'),vm=require('vm');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const html=fs.readFileSync('index.html','utf8'),pin=JSON.parse(fs.readFileSync('docs/gamekit.json'));
const urls=[...html.matchAll(/import\('data:text\/javascript;base64,([^']+)'\)/g)];
if(urls.length!==pin.modules.length)throw Error('SDK module count');
for(let i=0;i<urls.length;i++)if(hash(Buffer.from(urls[i][1],'base64'))!==pin.modules[i].sha256)throw Error('SDK hash mismatch');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
new vm.SourceTextModule(script);console.log('Official SDK hashes and ESM syntax verified');
