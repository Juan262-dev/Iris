import { writeFile } from 'node:fs/promises';
import text2wav from 'text2wav';
const text=Buffer.from(process.argv[2]||'','base64').toString('utf8');
if(!text.trim()||[...text].length>200||!process.argv[3])process.exit(1);
try{
 const wav=Buffer.from(await text2wav(text,{voice:'pt-br',speed:155}));
 if(wav.toString('ascii',0,4)!=='RIFF'||wav.length>4000000)throw Error('speech');
 await writeFile(process.argv[3],wav,{mode:0o600});
}catch{process.exit(1);}
