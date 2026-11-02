// 方針の違うボットで難易度を測る: node tools/bots.mjs [回数]
import { Game } from '../js/game.js';
import { WORLD, SOCIALS, SCIENCE_BUN, SCIENCE_RI, KINDS } from '../js/data.js';
const G = WORLD.gravity * WORLD.ppm;
function gauss(r){return Math.sqrt(-2*Math.log(1-r()))*Math.cos(6.283*r());}
function aim(g, noise, r, T){
  const l=g.launchPoint(); const def=g.offers[g.selected]; const k=KINDS[def.kind];
  const tx=(g.pile0??0)+gauss(r)*noise*60, ty=g.top()+k.h/2+6;
  const vx=(tx-l.x)/T, vy=(ty-l.y+.5*G*T*T)/T;
  return [vx*(1+gauss(r)*noise*.1), vy*(1+gauss(r)*noise*.1)];
}
const pol={
  名人:{noise:.15,pick:g=>best(g,(b,i)=>g.need(b.subject==='all'?g.subjects[0]:b.subject)*(b.subject==='all'?1.5:1)*KINDS[b.kind].v+KINDS[b.kind].h/300)},
  普通:{noise:.6,pick:g=>best(g,(b)=>g.need(b.subject==='all'?g.subjects[0]:b.subject))},
  雑:{noise:1.3,pick:g=>0},
};
function best(g,f){let bi=0,bv=-1;g.offers.forEach((b,i)=>{const v=f(b,i);if(v>bv){bv=v;bi=i}});return bi}
function run(p,seed){
  const ri=seed%2; const sel={track:ri?'ri':'bun',socials:SOCIALS.slice(0,2),sciences:(ri?SCIENCE_RI:SCIENCE_BUN).slice(0,2)};
  const g=new Game(sel,seed); let r=()=>g.rng(); let guard=0; const hist=[];
  while(g.phase!=='done'){
    if(++guard>200000) return {stuck:true,phase:g.phase,turn:g.turn};
    if(g.phase==='aim'){g.selected=p.pick(g);const [vx,vy]=aim(g,p.noise,Math.random,.82);g.throwBook(vx,vy);}
    g.tick();
    for(const e of g.drain()){ if(e.type==='settled')hist.push(e.landed);}
    if(g.phase==='wait')g.next();
    if(g.phase==='examReady')g.startExam();
  }
  const R=g.result(); return {rate:R.rate,pile:R.pile,h:R.heightCm,title:R.title.name,land:hist.filter(Boolean).length/hist.length};
}
const N=+process.argv[2]||30;
for(const [n,p] of Object.entries(pol)){
  const t0=Date.now(); const rs=[];for(let i=0;i<N;i++)rs.push(run(p,i*7+1));
  const stuck=rs.filter(r=>r.stuck); const ok=rs.filter(r=>!r.stuck);
  const q=a=>{a=[...a].sort((x,y)=>x-y);return [a[0],a[a.length>>1],a[a.length-1]].map(v=>+v.toFixed(2)).join(' / ')};
  const tally={};ok.forEach(r=>tally[r.title]=(tally[r.title]||0)+1);
  console.log(n,'得点率',q(ok.map(r=>r.rate)),'| 残存',q(ok.map(r=>r.pile)),'| cm',q(ok.map(r=>r.h)),'| 着地率',q(ok.map(r=>r.land)),'| stuck',stuck.length,JSON.stringify(tally),((Date.now()-t0)/N|0)+'ms/run');
  if(stuck[0])console.log(stuck[0]);
}
