import fs from 'node:fs/promises';
import sharp from 'sharp';
const folder='.impeccable/review/';
const names=['desktop','desktop-gallery','desktop-detail-top','mobile','mobile-gallery','mobile-detail','mobile-reading','mobile-film','tablet-gallery','user-676','desktop-wide','desktop-wide-gallery','fallback','fallback-mobile','orbit'];
const layers=[];
for(let i=0;i<names.length;i++){
  const name=names[i], source=folder+name+'.png', meta=await sharp(source).metadata();
  console.log(`${name}: ${meta.width}x${meta.height}`);
  const thumb=await sharp(source).resize(352,230,{fit:'contain',background:'#faf6e8'}).png().toBuffer();
  const x=(i%4)*360,y=Math.floor(i/4)*258;
  layers.push({input:thumb,left:x+4,top:y+24});
  layers.push({input:Buffer.from(`<svg width="360" height="22"><text x="8" y="16" font-size="12" fill="#222">${name} · ${meta.width}×${meta.height}</text></svg>`),left:x,top:y});
}
await sharp({create:{width:1440,height:Math.ceil(names.length/4)*258,channels:3,background:'#eee9d8'}}).composite(layers).webp({quality:90}).toFile(folder+'contact-sheet.webp');
