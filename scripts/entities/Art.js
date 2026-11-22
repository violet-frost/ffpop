(function(root){
'use strict';
const assets=root.BloomAssets;
// One decoded URL per image for the document lifetime, reused across pages and clones.
// Avoid parsing megabytes of base64 in every innerHTML/DOMParser operation.
const imageURLs=new Map();
function assetURL(name){
 if(imageURLs.has(name))return imageURLs.get(name);
 const data=assets[name];if(!data?.startsWith('data:'))return data;
 const comma=data.indexOf(','),mime=data.slice(5,data.indexOf(';')),raw=atob(data.slice(comma+1)),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:mime}));imageURLs.set(name,url);return url;
}
const wrap=(body,cls='',view='0 0 64 64')=>`<svg class="${cls}" viewBox="${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const flower=(x,y,s,color,center='#ffdb72',rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${s})"><path d="M0 4 Q-10 35 0 59" fill="none" stroke="#397d50" stroke-width="5" stroke-linecap="round"/><path d="M-1 35Q-31 13-23 33Q-15 44-1 38M0 46Q28 20 25 42Q15 53 0 49" fill="#76b96d"/>${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-12" rx="10" ry="16" fill="${color}" transform="rotate(${a})"/>`).join('')}<circle r="10" fill="${center}"/><circle cx="-3" cy="-3" r="3" fill="#fff" opacity=".5"/></g>`;

// Keep the atlas AND clip outside cells: animation hides originals while clones use them.
// Per-cell duplicate clip IDs inherit hidden visibility and make moving sprites disappear.
const pieceNames=['strawberry','lemon','grapes','flower_pink','sunflower','flower_blue','rocket','bomb','rainbow','box','hammer','book'];
const spriteDefs=()=>`<svg class="piece-library" xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none"><defs><clipPath id="garden-piece-clip"><rect width="64" height="64"/></clipPath><image id="garden-piece-atlas" width="1448" height="1086" href="${assetURL('garden_pieces')}"/></defs></svg>`;
function sprite(name,cls='fruit',angle=0){
 const index=pieceNames.indexOf(name),x=(index%4)*362,y=Math.floor(index/4)*362;
 return wrap(`<g transform="rotate(${angle} 32 32)"><g clip-path="url(#garden-piece-clip)"><g transform="scale(${64/362}) translate(${-x} ${-y})"><use href="#garden-piece-atlas"/></g></g></g>`,cls);
}
const token=color=>sprite(pieceNames[color]||'strawberry');
const icon=(name,cls='')=>(assets['icon_'+name]||assets.icon_leaf).replace('class="icon "',`class="icon ${cls}"`);
const special=(kind,axis='h')=>sprite(kind,'fruit',kind==='rocket'&&axis==='h'?90:0);
const ice=()=>wrap(`<defs><linearGradient id="garden-frost" x2=".8" y2="1"><stop stop-color="#fff6ce" stop-opacity=".55"/><stop offset=".4" stop-color="#c7eff6" stop-opacity=".12"/><stop offset="1" stop-color="#80cce1" stop-opacity=".55"/></linearGradient></defs><path d="M11 5 49 3 60 13 59 49 48 60 12 58 3 46 4 16Z" fill="url(#garden-frost)" stroke="#bce9ed" stroke-width="1.6"/><path d="m11 5 5 10 33-1L49 3M4 16l12-1-3 31L3 46m10 0 35 4 11-1M13 46l-1 12m36-8v10m1-46 11-1M13 46l5-8m-2-23 6 7m27-8-6 7" fill="none" stroke="#e4fbf3" stroke-opacity=".8" stroke-width="1.2" stroke-linejoin="round"/><path d="m11 23 1-7 8-1M49 46l-1 5-7-1" fill="none" stroke="#fffce5" stroke-width="2.5" stroke-linecap="round"/>`,'ice-art');
const booster=kind=>{const crops={hammer:[40,220,400,440],glove:[445,240,400,405],watering:[850,240,505,410],dice:[1370,260,365,380]},[x,y,w,h]=crops[kind]||crops.hammer;return `<svg class="booster-art" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><image href="${assetURL('garden_boosters')}" width="1774" height="887"/></svg>`;};
root.Art={assetURL,booster,icon,token,special,sprite,spriteDefs,ice,box:()=>sprite('box'),garden:()=>assets.garden,homeScene:()=>assets.home_scene,flower,wrap};
})(globalThis);
