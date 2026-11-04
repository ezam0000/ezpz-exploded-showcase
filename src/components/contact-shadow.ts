import * as THREE from 'three';
/** Render a soft, model-derived floor shadow. No product-specific baked image. */
export function createContactShadow(renderer:THREE.WebGLRenderer,scene:THREE.Scene,ground:number,span:number){
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
