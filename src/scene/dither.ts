import * as THREE from "three";

const vertex = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const fragment = `
precision highp float;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uPixel;
varying vec2 vUv;
float bayer(vec2 p){
  int x=int(mod(p.x,8.)),y=int(mod(p.y,8.)); float rank=0.;
  for(int bit=0;bit<3;bit++){
    int a=int(mod(floor(float(x)/pow(2.,float(bit))),2.));
    int b=int(mod(floor(float(y)/pow(2.,float(bit))),2.));
    float digit=b==0?(a==0?0.:2.):(a==0?3.:1.);
    rank=rank*4.+digit;
  }
  return (rank+.5)/64.;
}
void main(){
  vec2 cell=floor(vUv*uResolution/uPixel);
  vec2 coord=(cell+.5)*uPixel/uResolution;
  vec4 tex=texture2D(tScene,coord);
  if(tex.a<.003){gl_FragColor=vec4(0.);return;}
  float threshold=bayer(cell)-.5;
  vec3 linear=clamp(tex.rgb/max(tex.a,.001),0.,1.);
  vec3 c=mix(12.92*linear,1.055*pow(linear,vec3(1./2.4))-.055,step(vec3(.0031308),linear));
  c=floor(c*6.+threshold+.5)/6.;
  gl_FragColor=vec4(clamp(c,0.,1.),tex.a);
}`;

export class DitherPass {
  target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });
  material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      tScene: { value: this.target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixel: { value: 1.6 },
    },
    transparent: false,
    depthTest: false,
    depthWrite: false,
  });
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor() {
    this.scene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material),
    );
  }
  resize(w: number, h: number, dpr: number) {
    this.target.setSize(Math.round(w * dpr), Math.round(h * dpr));
    this.material.uniforms.uResolution.value.set(w, h);
    this.material.uniforms.uPixel.value = w < 640 ? 0.9 : 1.25;
  }
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.target.dispose();
    this.material.dispose();
    (this.scene.children[0] as THREE.Mesh).geometry.dispose();
  }
}
