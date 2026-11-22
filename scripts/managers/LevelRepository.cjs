const fs=require('node:fs'),path=require('node:path');
exports.load=function(){
 const root=path.resolve(__dirname,'../..');
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
 const LEVELS=Array.from({length:50},(_,i)=>read('data/levels/level_'+String(i+1).padStart(3,'0')+'.json'));
 return {LEVELS,CHAPTERS:read('data/config/chapters.json')};
};
