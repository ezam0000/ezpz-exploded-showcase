/* MIT License · Copyright (c) 2026 EZPZ. See LICENSE in the distribution. */
'use client';
import { useEffect, useRef, useState, useId, useImperativeHandle, type Ref, type CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    <style>{showcaseStyles}</style>
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

const showcaseStyles=".ezpz-showcase{--ezpz-bg:#ece9e2;--ezpz-ink:#232520;--ezpz-accent:#da582e;position:relative;isolation:isolate;min-height:740px;height:100svh;max-height:1200px;overflow:hidden;background:var(--ezpz-bg);color:var(--ezpz-ink);font-family:Arial,Helvetica,sans-serif}\n.ezpz-showcase *{box-sizing:border-box}.ezpz-showcase button,.ezpz-showcase input{font:inherit}.ezpz-showcase button{cursor:pointer}.ezpz-showcase button:disabled{cursor:wait;opacity:.55}.ezpz-showcase button:focus-visible,.ezpz-stage:focus-visible{outline:3px solid var(--ezpz-accent);outline-offset:5px}\n.ezpz-stage-wrap{position:absolute;inset:0 0 0 32%}.ezpz-stage{position:absolute;inset:0;touch-action:pan-y;outline:none;cursor:grab}.ezpz-stage:active{cursor:grabbing}.ezpz-stage canvas{display:block;width:100%;height:100%;touch-action:pan-y!important}.ezpz-stage[data-state=loading],.ezpz-stage[data-state=error]{visibility:hidden}.ezpz-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.ezpz-error{position:absolute;inset:auto 15% 20%;text-align:center}.ezpz-error button{background:var(--ezpz-ink);color:var(--ezpz-bg);border:0;border-radius:32px;padding:12px 22px}\n.ezpz-story{position:relative;z-index:2;pointer-events:none;width:41%;padding:clamp(90px,19vh,190px) 0 90px clamp(28px,5.4vw,100px)}.ezpz-story>*{pointer-events:auto}.ezpz-story h1{margin:0;font-size:clamp(64px,7.5vw,144px);font-weight:500;letter-spacing:-.075em;line-height:.96}.ezpz-story h1 span{display:block;white-space:nowrap}\n.ezpz-primary-actions{margin-top:38px;display:flex;gap:20px;align-items:center}.ezpz-explore{border:0;border-radius:60px;padding:17px 29px;background:var(--ezpz-ink);color:var(--ezpz-bg);font-size:16px!important;transition:transform .2s,background .2s;min-width:126px}.ezpz-explore:hover{transform:translateY(-2px);background:var(--ezpz-accent)}.ezpz-reset{border:0;padding:14px 0;background:transparent;color:inherit;font-size:14px!important}.ezpz-reset:hover{text-decoration:underline}\n.ezpz-finishes{display:flex;gap:7px;margin-top:20px}.ezpz-finish{display:grid;place-items:center;width:44px;height:44px;border:0;padding:0;background:none;color:inherit;opacity:.7}.ezpz-finish[aria-pressed=true]{opacity:1}.ezpz-finish span{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1px #0001}.ezpz-finish[aria-pressed=true] span{outline:1px solid currentColor;outline-offset:3px}\n.ezpz-details{margin-top:25px;max-width:320px}.ezpz-range{display:flex;align-items:center;gap:18px;font-size:14px}.ezpz-range input{min-width:80px;width:100%;accent-color:var(--ezpz-ink);cursor:ew-resize}.ezpz-parts{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.ezpz-parts button{border:0;border-radius:30px;background:#ffffff55;padding:9px 12px;color:inherit;font-size:13px!important}.ezpz-parts button[aria-pressed=true]{background:var(--ezpz-ink);color:var(--ezpz-bg)}\n@media(min-width:1700px){.ezpz-story{width:43%}.ezpz-stage-wrap{left:34%}}\n@media(max-width:900px){.ezpz-showcase{min-height:920px;height:auto;max-height:none}.ezpz-stage-wrap{inset:170px 0 auto;height:500px}.ezpz-story{width:100%;padding:42px 28px 120px;min-height:920px;display:flex;flex-direction:column;align-items:flex-start}.ezpz-story h1{font-size:clamp(58px,9vw,90px);line-height:.95}.ezpz-story h1 span{display:inline}.ezpz-story h1 span+span:before{content:' '}.ezpz-primary-actions{margin-top:520px}.ezpz-finishes{margin-top:20px}.ezpz-details{max-width:100%;width:100%;margin-top:20px}}\n@media(max-width:520px){.ezpz-showcase{min-height:940px}.ezpz-stage-wrap{top:170px;height:430px;left:-10px;right:-10px}.ezpz-story{padding:36px 23px 110px;min-height:940px}.ezpz-story h1{font-size:64px}.ezpz-story h1 span{display:block}.ezpz-story h1 span+span:before{content:none}.ezpz-primary-actions{margin-top:450px}.ezpz-finishes{gap:7px}.ezpz-details{margin-top:18px}.ezpz-parts{gap:6px}.ezpz-parts button{font-size:12px!important;padding:9px 10px}}\n@media(prefers-reduced-motion:reduce){.ezpz-showcase *{transition:none!important}.ezpz-explore:hover{transform:none}}\n@media(max-width:900px){.ezpz-finish{font-size:14px!important;min-height:44px;padding:10px 0}.ezpz-parts button{min-height:44px}.ezpz-finishes{margin-top:14px}.ezpz-details{margin-top:12px}}\n\n.ezpz-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}\n\n/* Short landscape embeds, including component-library preview panels. */\n@media(min-width:521px) and (max-height:700px){\n .ezpz-showcase{height:100svh;min-height:360px;max-height:none}\n .ezpz-stage-wrap{inset:0 0 0 38%;height:auto}\n .ezpz-story{display:block;width:46%;min-height:0;padding:28px 0 55px 28px}\n .ezpz-story h1{font-size:clamp(38px,6vw,66px);line-height:.96}\n .ezpz-story h1 span{display:block}.ezpz-story h1 span+span:before{content:none}\n .ezpz-primary-actions{margin-top:18px;gap:14px}\n .ezpz-explore{padding:11px 18px;min-width:110px;font-size:14px!important}\n .ezpz-reset{font-size:13px!important}\n .ezpz-finishes{margin-top:6px}\n .ezpz-details{margin-top:4px;max-width:290px}\n .ezpz-parts{margin-top:8px;gap:5px}.ezpz-parts button{min-height:30px;padding:6px 10px;font-size:12px!important}\n}\n";
/** Render a soft, model-derived floor shadow. No product-specific baked image. */
function createContactShadow(renderer:THREE.WebGLRenderer,scene:THREE.Scene,ground:number,span:number){
  const size=512;
  const a=new THREE.WebGLRenderTarget(size,size), b=new THREE.WebGLRenderTarget(size,size);
  const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.1,8);
  camera.position.set(0,ground+7,0);camera.up.set(0,0,-1);camera.lookAt(0,ground,0);
  const depth=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'void main(){float a=pow(gl_FragCoord.z,3.0)*0.48;gl_FragColor=vec4(0.0,0.0,0.0,a);}',transparent:true,side:THREE.DoubleSide});
  const planeGeometry=new THREE.PlaneGeometry(span,span);
  const planeMaterial=new THREE.MeshBasicMaterial({map:a.texture,transparent:true,depthWrite:false,toneMapped:false});
  const plane=new THREE.Mesh(planeGeometry,planeMaterial);plane.rotation.x=-Math.PI/2;plane.position.y=ground+.003;plane.renderOrder=1;scene.add(plane);
  const blurScene=new THREE.Scene();const blurCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const blurMaterial=new THREE.ShaderMaterial({uniforms:{map:{value:a.texture},direction:{value:new THREE.Vector2()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`varying vec2 vUv;uniform sampler2D map;uniform vec2 direction;void main(){vec4 c=texture2D(map,vUv)*0.227027; c+=texture2D(map,vUv+direction*1.384615)*0.316216;c+=texture2D(map,vUv-direction*1.384615)*0.316216;c+=texture2D(map,vUv+direction*3.230769)*0.070270;c+=texture2D(map,vUv-direction*3.230769)*0.070270;gl_FragColor=c;}`});
  const quadGeometry=new THREE.PlaneGeometry(2,2);blurScene.add(new THREE.Mesh(quadGeometry,blurMaterial));
  return {update(){
    const background=scene.background,override=scene.overrideMaterial,target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
    plane.visible=false;scene.background=null;scene.overrideMaterial=depth;
    renderer.setClearColor(0x000000,0);renderer.setRenderTarget(a);renderer.clear();renderer.render(scene,camera);
    scene.overrideMaterial=override;scene.background=background;plane.visible=true;
    for(const strength of [2,1]){
      blurMaterial.uniforms.map.value=a.texture;blurMaterial.uniforms.direction.value.set(strength/size,0);renderer.setRenderTarget(b);renderer.clear();renderer.render(blurScene,blurCamera);
      blurMaterial.uniforms.map.value=b.texture;blurMaterial.uniforms.direction.value.set(0,strength/size);renderer.setRenderTarget(a);renderer.clear();renderer.render(blurScene,blurCamera);
    }
    renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);
  },dispose(){plane.removeFromParent();planeGeometry.dispose();planeMaterial.dispose();quadGeometry.dispose();blurMaterial.dispose();depth.dispose();a.dispose();b.dispose();}};
}

/** Original MIT-licensed examples. Override model/poster to self-host. */
export const showcaseProducts: ShowcaseProduct[] = [
  {
    id: 'headphones', name: 'Headphones', title: ['Sound,', 'inside out.'],
    model: 'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/models/headphones.glb', poster: 'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/posters/headphones.webp',
    camera: [5.6, 2.9, 7.2], target: [0.35, 0.9, 0], ground: -.53, size: 6.2, assembledSize:4.8, explodeTarget:[.9,.12,0],
    background: '#ece9e2', ink: '#232520', accent: '#da582e',
    finishes: [{name:'Silver',color:'#aeb8bd'}, {name:'Graphite',color:'#474d53'}, {name:'Champagne',color:'#c7ab7d'}],
    parts: [
      {id:'headband',name:'Headband',description:'A continuous aluminum arch connects two cushioned listening chambers.',offset:[0,.22,0]},
      {id:'cushion_right',name:'Cushion',description:'A soft oval cushion wraps around an acoustically transparent cloth insert.',offset:[-.32,-.3,.26]},
      {id:'driver_right',name:'Driver',description:'A copper voice coil and concentric diaphragm sit at the heart of each earcup.',offset:[.68,0,0]},
      {id:'electronics_right',name:'Electronics',description:'A compact controller board sits between the driver and the outer shell.',offset:[1.38,.16,0]},
      {id:'shell_right',name:'Shell',description:'A rounded aluminum shell holds the assembly, with a polished edge and recessed vents.',offset:[2.12,.34,0]},
    ],
  },
  {
    id: 'switch', name: 'Switch', title: ['Small part.', 'Big feeling.'],
    model: 'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/models/switch.glb', poster: 'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/posters/switch.webp',
    camera: [4.6,3.1,6], target:[0,.5,0],ground:-.79,size:5.8,assembledSize:3.4,explodeTarget:[0,.9,0],
    background:'#e5e8df',ink:'#252b23',accent:'#d64c29',
    finishes:[{name:'Limestone',color:'#d0c5ad'},{name:'Cobalt',color:'#3c56c7'},{name:'Graphite',color:'#51585b'}],
    parts:[
      {id:'keycap',name:'Keycap',description:'A rounded ceramic cap gives every press a smooth, generous contact surface.',offset:[0,1.9,0]},
      {id:'top',name:'Housing',description:'The upper housing guides the moving stem and holds the switch together.',offset:[0,1.12,0]},
      {id:'stem',name:'Stem',description:'A cross-shaped mount carries the keycap through its travel.',offset:[0,.72,0]},
      {id:'spring',name:'Spring',description:'A helical spring returns the stem after each press.',offset:[0,.28,0]},
      {id:'base',name:'Base',description:'The lower housing contains the brass contacts and solder pins.',offset:[0,-.2,0]},
    ],
  },
  {
    id:'emblem',name:'Emblem',title:['Make an', 'impression.'],
    model:'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/models/emblem.glb',poster:'https://raw.githubusercontent.com/ezam0000/ezpz-exploded-showcase/5119abb670f27fd3577b1607d535452e6fa27bab/public/posters/emblem.webp',
    camera:[3.4,5.4,5],target:[0,0,0],ground:-.52,size:6.5,assembledSize:5.3,explodeTarget:[0,.4,0],
    background:'#e3e7ef',ink:'#1c2c4a',accent:'#3655c6',
    finishes:[{name:'Cobalt',color:'#2643c2'},{name:'Vermilion',color:'#cb482d'},{name:'Silver',color:'#adb9c5'}],
    parts:[
      {id:'face',name:'Face',description:'A sculpted enamel face gives the wordmark its color and depth.',offset:[0,1.25,0]},
      {id:'core',name:'Core',description:'A satin metal core catches the light beneath the face.',offset:[0,.35,0]},
      {id:'back',name:'Backing',description:'A dark backing separates the silhouette from its surroundings.',offset:[0,-.14,0]},
    ],
  },
];
