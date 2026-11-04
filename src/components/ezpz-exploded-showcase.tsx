/* MIT License · Copyright (c) 2026 EZPZ. See LICENSE in the distribution. */
'use client';
import { useEffect, useRef, useState, useId, useImperativeHandle, type Ref, type CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './ezpz-exploded-showcase.css';
import { createContactShadow } from './contact-shadow';

export interface ShowcasePart { id:string; name:string; description:string; offset:[number,number,number] }
export interface ShowcaseProduct {
  id:string; name:string; title:[string,string];
  model:string; poster?:string; camera:[number,number,number]; target:[number,number,number]; ground:number; size:number; assembledSize?:number; explodeTarget?:[number,number,number];
  background:string; ink:string; accent:string;
  finishes:{name:string;color:string}[]; parts:ShowcasePart[];
}
export interface ShowcaseControls { separation:(value:number)=>void; finish:(index:number)=>void; rotate:(radians:number)=>void; reset:()=>void }
export interface ExplodedShowcaseProps {
  controlsRef?:Ref<ShowcaseControls>; reducedMotion?:boolean;
  product:ShowcaseProduct; className?:string; style?:CSSProperties;
  initialSeparation?:number; onPartChange?:(id:string|null)=>void; onReady?:()=>void;
}
type ViewerApi = { reset:()=>void; select:(id:string|null)=>void; rotate:(angle:number)=>void };
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Named GLB groups and part offsets are the only model-specific inputs. */
export function ExplodedShowcase({product,className='',style,initialSeparation=0,onPartChange,onReady,controlsRef,reducedMotion=false}:ExplodedShowcaseProps){
  const mount=useRef<HTMLDivElement>(null), api=useRef<ViewerApi|null>(null);
  const [separation,setSeparation]=useState(clamp(initialSeparation,0,1));
  const [isExploring,setIsExploring]=useState(initialSeparation>0);
  const [finish,setFinish]=useState(0), [selected,setSelected]=useState<string|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [retry,setRetry]=useState(0);
  const desired=useRef({separation,finish,selected}); desired.current={separation,finish,selected};
  const callbacks=useRef({onPartChange,onReady}); callbacks.current={onPartChange,onReady};
  const uid=useId();
  useImperativeHandle(controlsRef,()=>({
    separation:(value)=>{setSeparation(clamp(value,0,1));setIsExploring(value>0);},
    finish:(index)=>setFinish(clamp(Math.round(index),0,product.finishes.length-1)),
    rotate:(angle)=>api.current?.rotate(angle),reset:()=>api.current?.reset(),
  }),[product]);
  const currentPart=product.parts.find(p=>p.id===selected);
  const select=(id:string|null)=>{setSelected(id);callbacks.current.onPartChange?.(id);};

  useEffect(()=>{
    const element=mount.current;if(!element)return;const host:HTMLDivElement=element;
    let disposed=false,announced=false,frame=0,visible=true,dragStart={x:0,y:0};
    let renderer:THREE.WebGLRenderer|undefined,controls:OrbitControls|undefined;
    let model:THREE.Group|undefined,env:THREE.WebGLRenderTarget|undefined;
    let shadow:ReturnType<typeof createContactShadow>|undefined;let shadowAt=-1;let shadowSelection:string|null=null;
    let observer:ResizeObserver|undefined,intersection:IntersectionObserver|undefined;
    let current=clamp(initialSeparation,0,1),last=0,frames=0;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced=()=>reducedMotion||motion.matches;
    const tracked:{object:THREE.Object3D;base:THREE.Vector3;offset:THREE.Vector3;id:string}[]=[];
    const materials=new Set<THREE.Material>(); const geometries=new Set<THREE.BufferGeometry>();
    const tinted:THREE.MeshStandardMaterial[]=[];
    const scene=new THREE.Scene();scene.background=new THREE.Color(product.background);
    const camera=new THREE.PerspectiveCamera(32,1,.1,100);
    const origin=new THREE.Vector3(...product.target);
    const camDirection=new THREE.Vector3(...product.camera).sub(origin).normalize();
    let zoomDistance=product.size/(2*Math.tan(THREE.MathUtils.degToRad(16)));
    const ray=new THREE.Raycaster();const pointer=new THREE.Vector2();
    setState('loading');
    const invalidate=()=>{if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(render);};
    const reset=()=>{camera.position.copy(origin).addScaledVector(camDirection,zoomDistance);controls?.target.copy(origin);controls?.update();invalidate();};
    const fail=()=>{if(!disposed)setState('error');};
    const onLost=(event:Event)=>{event.preventDefault();fail();};
    const resize=()=>{
      if(!renderer||!controls)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
      // Fit both portrait and landscape canvases without cropping the exploded assembly.
      zoomDistance=(product.size / Math.min(1,camera.aspect))/(2*Math.tan(THREE.MathUtils.degToRad(16)));
      controls.minDistance=zoomDistance*.72;controls.maxDistance=zoomDistance*1.55;reset();
    };
    function render(t:number){
      frame=0;if(disposed||!renderer||!visible||document.hidden)return;
      const dt=Math.min((t-last)/1000||1/60,.05);last=t;
      const goal=desired.current.separation;
      const diff=goal-current;
      current=reduced()?goal:current+diff*(1-Math.exp(-dt*7));
      if(Math.abs(diff)<.0002)current=goal;
      for(const p of tracked){
        p.object.position.copy(p.base).addScaledVector(p.offset,current);
        const chosen=desired.current.selected===p.id;
        if(chosen&&current>.05)p.object.position.addScaledVector(camDirection,.08*current);
        p.object.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(chosen?product.accent:0x000000);m.emissiveIntensity=chosen?.12:0;}});
      }
      const color=new THREE.Color(product.finishes[desired.current.finish]?.color??product.finishes[0].color);
      for(const m of tinted){m.color.copy(color);}
      if(controls){
        const focus=origin.clone().addScaledVector(new THREE.Vector3(...(product.explodeTarget??[0,0,0])),current);
        const view=camera.position.clone().sub(controls.target).normalize();
        const ratio=(product.assembledSize??product.size)/product.size;
        camera.position.copy(focus).addScaledVector(view,zoomDistance*(ratio+(1-ratio)*current));controls.target.copy(focus);
        controls.update();
      }
      if(model&&(Math.abs(shadowAt-current)>.002||shadowSelection!==desired.current.selected)){shadow?.update();shadowAt=current;shadowSelection=desired.current.selected;}
      renderer.render(scene,camera);frames++;
      if(model&&!announced){announced=true;setState('ready');callbacks.current.onReady?.();}
      host.dataset.separation=current.toFixed(3);host.dataset.frames=String(frames);
      host.dataset.selected=desired.current.selected??'';
      if(Math.abs(goal-current)>.0001)invalidate();
    }
    const onPointerDown=(e:PointerEvent)=>{dragStart={x:e.clientX,y:e.clientY};};
    const onPointerUp=(e:PointerEvent)=>{
      if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>5||!model||desired.current.separation<.1)return;
      const r=host.getBoundingClientRect();pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
      ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(model,true)[0];
      let o:THREE.Object3D|null=hit?.object??null;
      while(o&&!product.parts.some(p=>p.id===o!.name))o=o.parent;
      if(o){select(o.name);invalidate();}
    };
    const onKey=(e:KeyboardEvent)=>{
      if(!controls)return;
      if(e.key==='Home'){e.preventDefault();reset();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;
      if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;
      s.phi=clamp(s.phi,.2,Math.PI*.76);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();invalidate();
    };
    const onVisibility=()=>{if(!document.hidden)invalidate();};
    try{
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
      renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost',onLost);
      const studio=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
      env=pmrem.fromScene(studio,.04);scene.environment=env.texture;scene.environmentIntensity=1.05;studio.dispose();pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff,0x7f7565,1.4));
      const key=new THREE.DirectionalLight(0xfff5e6,2.5);key.position.set(3,7,5);key.castShadow=false;
      key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
      key.shadow.normalBias=.03;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
      const rim=new THREE.DirectionalLight(0xdde9ff,1.8);rim.position.set(-4,3,-5);scene.add(rim);
      const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-3,0,3);scene.add(fill);
      shadow=createContactShadow(renderer,scene,product.ground,product.size*1.9);
      controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;
      controls.rotateSpeed=.65;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.76;controls.addEventListener('change',invalidate);
      observer=new ResizeObserver(resize);observer.observe(host);resize();
      intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)invalidate();});intersection.observe(host);
      host.addEventListener('pointerdown',onPointerDown);host.addEventListener('pointerup',onPointerUp);host.addEventListener('keydown',onKey);
      document.addEventListener('visibilitychange',onVisibility);motion.addEventListener('change',invalidate);
      new GLTFLoader().load(product.model,gltf=>{
        if(disposed){disposeTree(gltf.scene);return;}
        model=gltf.scene;const originals=new Set<THREE.Material>();
        model.traverse(o=>{
          if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])originals.add(m);o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;geometries.add(o.geometry);
            for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m instanceof THREE.MeshStandardMaterial&&m.name.startsWith('Finish'))tinted.push(m);}
          }
        });
        for(const m of originals)m.dispose();
        for(const part of product.parts){const o=model.getObjectByName(part.id);if(!o){console.warn('Missing model part:',part.id);continue;}tracked.push({object:o,base:o.position.clone(),offset:new THREE.Vector3(...part.offset),id:part.id});}
        scene.add(model);shadowAt=-1;host.dataset.parts=tracked.map(p=>p.id).join(',');invalidate();
      },undefined,fail);
      api.current={reset,select:()=>invalidate(),rotate:(angle)=>{
        const focus=controls!.target.clone();const direction=camDirection.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle);
        camera.position.copy(focus).addScaledVector(direction,zoomDistance);controls!.update();invalidate();
      }};
      // Observe state changes without a permanent animation loop.
      const event=()=>invalidate();host.addEventListener('showcase-update',event);
      return()=>{
        disposed=true;cancelAnimationFrame(frame);host.removeEventListener('showcase-update',event);
        observer?.disconnect();intersection?.disconnect();controls?.dispose();motion.removeEventListener('change',invalidate);
        host.removeEventListener('pointerdown',onPointerDown);host.removeEventListener('pointerup',onPointerUp);host.removeEventListener('keydown',onKey);
        document.removeEventListener('visibilitychange',onVisibility);renderer?.domElement.removeEventListener('webglcontextlost',onLost);
        for(const g of geometries)g.dispose();for(const m of materials)m.dispose();shadow?.dispose();env?.dispose();key.shadow.dispose();
        if(model)disposeTextures(model);renderer?.dispose();renderer?.domElement.remove();api.current=null;
      };
    }catch(error){console.warn('3D preview unavailable',error);fail();renderer?.dispose();renderer?.domElement.remove();}
  },[product,retry,reducedMotion]);

  useEffect(()=>{mount.current?.dispatchEvent(new Event('showcase-update'));},[separation,finish,selected]);
  const toggle=()=>{setSelected(null);callbacks.current.onPartChange?.(null);setSeparation(isExploring?0:1);setIsExploring(!isExploring);};
  return <section className={`ezpz-showcase ${className}`} style={{'--ezpz-bg':product.background,'--ezpz-ink':product.ink,'--ezpz-accent':product.accent,...style} as CSSProperties} aria-label={`${product.name} exploded showcase`}>
    <div className="ezpz-stage-wrap">
      {product.poster&&state!=='ready'&&<img className="ezpz-poster" src={product.poster} alt={product.name} />}
      <div ref={mount} className="ezpz-stage" role="img" tabIndex={state==='ready'?0:-1} aria-label={`Interactive ${product.name}. Drag or use arrow keys to rotate. Home resets the view. Use the part buttons to inspect the assembly.`} data-state={state}/>
      {state==='error'&&<div className="ezpz-error" role="status"><p>The 3D view couldn’t load.</p><button onClick={()=>setRetry(n=>n+1)}>Try again</button></div>}
    </div>
    <div className="ezpz-story">
      <h1>{product.title.map(line=><span key={line}>{line}</span>)}</h1>
      <p className="ezpz-sr-only" aria-live="polite">{currentPart?.description??''}</p>
      <div className="ezpz-primary-actions">
        <button className="ezpz-explore" onClick={toggle} disabled={state!=='ready'} aria-expanded={isExploring} aria-controls={`${uid}-parts`}>{state==='loading'?'Loading':isExploring?'Reassemble':'Explore'}</button>
        <button className="ezpz-reset" onClick={()=>api.current?.reset()} disabled={state!=='ready'}>Reset view</button>
      </div>
      <div className="ezpz-finishes" role="group" aria-label="Finish">
        {product.finishes.map((f,i)=><button key={f.name} className="ezpz-finish" disabled={state!=='ready'} aria-label={f.name} title={f.name} aria-pressed={finish===i} onClick={()=>setFinish(i)}><span style={{backgroundColor:f.color}} aria-hidden="true"/></button>)}
      </div>
      <div id={`${uid}-parts`} className="ezpz-details" hidden={!isExploring}>
        <label className="ezpz-range" htmlFor={`${uid}-range`}>Separation<input id={`${uid}-range`} type="range" min="0" max="100" step="1" value={Math.round(separation*100)} onChange={e=>setSeparation(Number(e.target.value)/100)}/></label>
        <div className="ezpz-parts" role="group" aria-label="Inspect a part">{product.parts.map(p=><button key={p.id} onClick={()=>select(selected===p.id?null:p.id)} aria-pressed={selected===p.id}>{p.name}</button>)}</div>
      </div>
    </div>
  </section>;
}
function disposeTextures(root:THREE.Object3D){const textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);});for(const t of textures)t.dispose();}
function disposeTree(root:THREE.Object3D){disposeTextures(root);root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
