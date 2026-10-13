/** Particle Drift — Originkit. Canvas 2D adaptation of the supplied drifting
 * nodes, proximity links and pointer illumination for this non-React site.
 * Decorative only: this module never reads wallets or contract state. */
export function mountParticleDrift(): () => void {
 const backdrop=document.createElement('div');
 backdrop.className='research-background';backdrop.setAttribute('aria-hidden','true');
 backdrop.innerHTML='<div class="research-background-image"></div><canvas class="research-particles"></canvas>';
 document.body.prepend(backdrop);
 const canvas=backdrop.querySelector('canvas')!;
 const illustration=backdrop.querySelector<HTMLElement>('.research-background-image')!;
 const ctx=canvas.getContext('2d');
 if(!ctx)return ()=>backdrop.remove();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let w=0,h=0,raf=0,last=0,scroll=window.scrollY,smoothScroll=scroll;
 let pointer={x:-10000,y:-10000};
 let seed=20260824;
 const random=()=>{seed+=0x6d2b79f5;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 let nodes:{x:number;y:number;speed:number;phase:number}[]=[];
 const resize=()=>{
  w=window.innerWidth;h=window.innerHeight;
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const count=w<700?36:72;
  nodes=Array.from({length:count},()=>({x:random()*w,y:random()*h,speed:random()*5+2,phase:random()*Math.PI*2}));
  if(motion.matches)draw(0);
 };
 const draw=(dt:number)=>{
  ctx.clearRect(0,0,w,h);
  smoothScroll+=(scroll-smoothScroll)*.075;
  const parallax=motion.matches?0:Math.sin(smoothScroll/1900)*52;
  illustration.style.transform=`translate3d(0,${-parallax}px,0) scale(1.14)`;
  const shift=motion.matches?0:smoothScroll*.09;
  const points=nodes.map(n=>{
   n.x=(n.x+n.speed*dt*.24+w)%w;
   n.y=(n.y+n.speed*dt+h)%h;
   return {x:n.x,y:((n.y-shift)%h+h)%h};
  });
  const reach=w<700?120:185;
  for(let i=0;i<points.length;i++){
   const p=points[i];
   for(let j=i+1;j<points.length;j++){
    const q=points[j],dist=Math.hypot(p.x-q.x,p.y-q.y);
    if(dist>=reach)continue;
    ctx.strokeStyle=`rgba(38,91,65,${.19*(1-dist/reach)})`;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
   }
   const distance=Math.hypot(p.x-pointer.x,p.y-pointer.y);
   const lit=distance<160;
   ctx.fillStyle=lit?'rgba(45,116,85,.52)':'rgba(43,88,63,.29)';
   ctx.beginPath();ctx.arc(p.x,p.y,lit?2.8:1.8,0,Math.PI*2);ctx.fill();
   if(lit&&!motion.matches){
    ctx.strokeStyle=`rgba(45,116,85,${.14*(1-distance/160)})`;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();
   }
  }
 };
 const frame=(time:number)=>{
  raf=requestAnimationFrame(frame);
  if(time-last<1000/30)return;
  const dt=last?Math.min(.05,(time-last)/1000):0;last=time;draw(dt);
 };
 const restart=()=>{
  cancelAnimationFrame(raf);last=0;
  if(document.hidden)return;
  if(motion.matches){smoothScroll=scroll;draw(0);}else raf=requestAnimationFrame(frame);
 };
 const onScroll=()=>{scroll=window.scrollY;};
 const onPointer=(e:PointerEvent)=>{if(e.pointerType!=='touch')pointer={x:e.clientX,y:e.clientY};};
 const onLeave=()=>{pointer={x:-10000,y:-10000};};
 window.addEventListener('resize',resize,{passive:true});
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('pointermove',onPointer,{passive:true});
 document.documentElement.addEventListener('pointerleave',onLeave);
 document.addEventListener('visibilitychange',restart);motion.addEventListener('change',restart);
 resize();restart();
 return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);window.removeEventListener('pointermove',onPointer);document.documentElement.removeEventListener('pointerleave',onLeave);document.removeEventListener('visibilitychange',restart);motion.removeEventListener('change',restart);backdrop.remove();};
}
