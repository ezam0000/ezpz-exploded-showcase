'use client';
import { useState } from 'react';
import { ExplodedShowcase, showcaseProducts } from './ezpz-exploded-showcase';
export default function Demo(){
 const [active,setActive]=useState(0);
 return <main style={{position:'relative',width:'100%'}}>
  <style>{".ezpz-example-navigation{position:absolute;z-index:5;bottom:28px;left:5.4vw;display:flex;gap:5px;align-items:center}.ezpz-example-navigation button{font:14px Arial,Helvetica,sans-serif;background:transparent;color:#252822aa;border:0;border-radius:30px;padding:12px 18px;cursor:pointer}.ezpz-example-navigation button[aria-pressed=true]{background:#ffffff88;color:#232520}.ezpz-example-navigation button:focus-visible{outline:2px solid #da582e;outline-offset:3px}@media(max-width:900px){.ezpz-example-navigation{bottom:26px;left:23px}.ezpz-example-navigation button{padding:11px 15px}}\n"}</style>
  <ExplodedShowcase key={showcaseProducts[active].id} product={showcaseProducts[active]} />
  <nav className="ezpz-example-navigation" aria-label="Examples">{showcaseProducts.map((p,i)=><button key={p.id} aria-pressed={active===i} onClick={()=>setActive(i)}>{p.name}</button>)}</nav>
 </main>;
}
