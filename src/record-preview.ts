import type { ShowcaseControls,ShowcaseProduct } from './components/ezpz-exploded-showcase';
/** An editorial motion preview: the live WebGL canvas plus native Canvas 2D type. */
export async function recordPreview(product:ShowcaseProduct,controls:ShowcaseControls){
  const output=document.createElement('canvas');output.width=1600;output.height=1000;
  const ctx=output.getContext('2d')!;
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw Error('Video recording is unavailable in this browser.');
  const stream=output.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:10_000_000});
  const chunks:BlobPart[]=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  controls.separation(0);controls.finish(0);controls.reset();
  await new Promise(resolve=>setTimeout(resolve,700));
  const done=new Promise<Blob>(resolve=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));});
  recorder.start();const start=performance.now();
  await new Promise<void>(resolve=>{
    function frame(){
      const t=(performance.now()-start)/1000;
      const separation=t<1.2?0:t<5?1:t<7.6?1:0;
      controls.separation(separation);controls.rotate(Math.sin(t*.38)*.18);
      if(t>5.8&&t<9.4)controls.finish(1);else controls.finish(0);
      ctx.fillStyle=product.background;ctx.fillRect(0,0,1600,1000);
      const source=document.querySelector('.ezpz-stage canvas') as HTMLCanvasElement|null;
      if(source){const scale=Math.min(1080/source.width,1000/source.height);const w=source.width*scale,h=source.height*scale;ctx.drawImage(source,520+(1080-w)/2,(1000-h)/2,w,h);}
      ctx.fillStyle=product.ink;ctx.font='500 106px Arial';ctx.textBaseline='alphabetic';ctx.letterSpacing='-7px';
      product.title.forEach((line,i)=>ctx.fillText(line,80,265+i*105));
      ctx.beginPath();ctx.roundRect(82,430,190,65,33);ctx.fillStyle=product.ink;ctx.fill();ctx.fillStyle=product.background;ctx.font='21px Arial';ctx.letterSpacing='0px';ctx.textAlign='center';ctx.fillText(separation?'Reassemble':'Explore',177,470);ctx.textAlign='start';
      const finish=t>5.8&&t<9.4?1:0;
      product.finishes.forEach((f,i)=>{const x=84+i*50;ctx.beginPath();ctx.arc(x+10,546,10,0,Math.PI*2);ctx.fillStyle=f.color;ctx.fill();if(i===finish){ctx.beginPath();ctx.arc(x+10,546,14,0,Math.PI*2);ctx.strokeStyle=product.ink;ctx.lineWidth=1;ctx.stroke();}});
      if(t<11.5)requestAnimationFrame(frame);else resolve();
    }frame();
  });
  recorder.stop();const blob=await done;stream.getTracks().forEach(track=>track.stop());controls.separation(0);controls.finish(0);controls.reset();
  const response=await fetch(`/__export/${product.id}.webm`,{method:'POST',headers:{'Content-Type':'video/webm'},body:blob});if(!response.ok)throw Error('Could not save video.');
}
