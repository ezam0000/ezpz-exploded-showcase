import { StrictMode, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ExplodedShowcase, type ShowcaseControls } from './components/ezpz-exploded-showcase';
import { products } from './catalog';
import './style.css';
import { recordPreview } from './record-preview';
function App(){
  const controls=useRef<ShowcaseControls>(null);const [recording,setRecording]=useState(false);const [recordLabel,setRecordLabel]=useState('Record preview');
  const params=new URLSearchParams(location.search);
  const [active,setActive]=useState(Math.max(0,products.findIndex(p=>p.id===params.get('example'))));
  const product=useMemo(()=>import.meta.env.DEV&&params.has('model-error')?{...products[active],model:'/models/missing-test-model.glb'}:products[active],[active]);
  const review=params.has('review');const [exportState,setExportState]=useState('Save view');
  async function save(){
    const canvas=document.querySelector('.ezpz-stage canvas') as HTMLCanvasElement|null;if(!canvas)return;
    setExportState('Saving');
    canvas.toBlob(async blob=>{
      if(!blob){setExportState('Try again');return;}
      const response=await fetch(`/__export/${products[active].id}`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});
      setExportState(response.ok?'Saved':'Try again');
    },'image/png');
  }
  return <main><ExplodedShowcase key={products[active].id} product={product} controlsRef={controls} reducedMotion={import.meta.env.DEV&&params.has('reduced-motion')} initialSeparation={params.has('open')?1:0}/><nav className="examples" aria-label="Examples">{products.map((p,i)=><button disabled={recording} key={p.id} aria-pressed={active===i} onClick={()=>{setActive(i);setExportState('Save view');}}>{p.name}</button>)}{review&&<><button disabled={recording} onClick={save}>{exportState}</button><button disabled={recording} onClick={async()=>{if(!controls.current)return;setRecording(true);setRecordLabel('Recording');try{await recordPreview(products[active],controls.current);setRecordLabel('Video saved');}catch(e){console.error(e);setRecordLabel('Try recording again');}finally{setRecording(false);}}}>{recordLabel}</button></>}</nav></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
