'use strict';
const fs=require('node:fs');const S=require('../scripts/board/LevelSchema.js');
try{const input=JSON.parse(fs.readFileSync(0,'utf8').replace(/^\uFEFF/,''));const levels=S.pack(input);process.stdout.write(JSON.stringify({ok:true,count:levels.length}));}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
