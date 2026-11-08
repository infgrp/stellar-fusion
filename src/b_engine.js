<script>
/* ═══════════════════════════════════════════════════════════════
   1. 렌더러 · 장면 · 카메라
   ═══════════════════════════════════════════════════════════════ */
const V3 = THREE.Vector3;
const COL = { p: 0xff3a1c, n: 0x2f6dff, pos: 0x5ff7ff, ele: 0xb48cff, nu: 0xa6ff7a, g: 0xffe066, he: 0xffc46b };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const seg = (t, a, b) => clamp01((t - a) / (b - a));

const stage = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);

const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
document.getElementById("labels").appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030208);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(170, 70, 190);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.minDistance = 6;
controls.maxDistance = 600;

scene.add(new THREE.AmbientLight(0xffe0c8, 0.22));
const key = new THREE.PointLight(0xffe2c4, 0.85, 0, 2);
key.position.set(8, 14, 16);
scene.add(key);
const rim = new THREE.PointLight(0x8fb4ff, 0.8, 0, 2);
rim.position.set(-14, -6, -10);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffc89a, 0x401020, 0.3));

/* 블룸 + 마지막 sRGB 변환 (r128 은 렌더 타깃에도 톤매핑을 거므로 감마만 따로) */
const GAMMA_SHADER = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 l = max(c.rgb, 0.0);
      vec3 s = mix(l * 12.92, 1.055 * pow(l, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, l)); gl_FragColor = vec4(s, c.a); }`,
};
let composer = null, bloom = null;
if (THREE.EffectComposer && THREE.UnrealBloomPass && THREE.ShaderPass) {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.95, 0.6, 0.62);
  composer.addPass(bloom);
  composer.addPass(new THREE.ShaderPass(GAMMA_SHADER));
} else {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
});

/* ═══════════════════════════════════════════════════════════════
   2. 공통 셰이더 조각 · 텍스처
   ═══════════════════════════════════════════════════════════════ */
const NOISE = `
  vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
  float noise(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); vec3 u = f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
  float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*noise(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
  // 보로노이 (대류 세포·쌀알무늬)
  float cells(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); float d = 1.0;
    for (int x=-1;x<=1;x++) for (int y=-1;y<=1;y++) for (int z=-1;z<=1;z++){ vec3 g = vec3(float(x),float(y),float(z));
      vec3 o = 0.5 + 0.5*hash3(i+g); d = min(d, length(g + o - f)); } return d; }
`;
function glowTexture(inner = "rgba(255,255,255,1)", mid = "rgba(255,255,255,0.35)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, mid);
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}
const GLOW = glowTexture();
function glowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

/* ═══════════════════════════════════════════════════════════════
   3. 별 전체 — 4분의 1을 잘라 낸 태양 단면
   반지름 비: 핵 0.25 · 복사층 ~0.71 · 대류층 ~1.0 (태양)
   ═══════════════════════════════════════════════════════════════ */
const STAR_R = 80;
const starGroup = new THREE.Group();
scene.add(starGroup);
const clipPlanes = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, 0, -1), 0)];

const starUniforms = { uTime: { value: 0 }, uFade: { value: 1 } };
const photosphere = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_R, 160, 120),
  new THREE.ShaderMaterial({
    uniforms: starUniforms,
    clipping: true, clippingPlanes: clipPlanes, clipIntersection: true,
    transparent: true, toneMapped: false,
    vertexShader: `
      varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      #include <clipping_planes_pars_vertex>
      void main(){ vPos = position; vN = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uFade; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      #include <clipping_planes_pars_fragment>
      ${NOISE}
      void main(){
        #include <clipping_planes_fragment>
        vec3 p = normalize(vPos);
        float gran = cells(p*38.0 + vec3(0.0, uTime*0.05, 0.0));
        float big = fbm(p*4.0 + uTime*0.02);
        float spots = smoothstep(0.42, 0.55, fbm(p*2.2 + 11.0));
        float mu = clamp(dot(vN, vView), 0.0, 1.0);
        float limb = 0.35 + 0.65*pow(mu, 0.55);            // 주연 감광
        vec3 hot = vec3(1.0, 0.86, 0.55), mid = vec3(1.0, 0.55, 0.16), cool = vec3(0.55, 0.18, 0.04);
        vec3 c = mix(hot, mid, smoothstep(0.05, 0.55, gran));
        c = mix(c, cool, 0.35*smoothstep(0.35, 0.75, gran) + 0.25*big);
        c *= 1.0 - 0.55*spots;
        c *= limb * 2.4;
        c += vec3(1.0,0.45,0.1) * pow(1.0 - mu, 3.0) * 1.2;   // 가장자리 달아오름
        gl_FragColor = vec4(c, uFade);
      }`,
  })
);
starGroup.add(photosphere);

/* 단면: 잘린 두 면에 같은 셰이더 — 반지름에 따라 핵/복사층/대류층 */
const crossMat = new THREE.ShaderMaterial({
  uniforms: starUniforms, side: THREE.DoubleSide, transparent: true, toneMapped: false,
  vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }",
  fragmentShader: `
    uniform float uTime; uniform float uFade; varying vec3 vP;
    ${NOISE}
    void main(){
      float r = length(vP) / ${STAR_R.toFixed(1)};
      float a = atan(vP.y, length(vP.xz));
      vec3 c;
      // 핵 — 하얗게 달아오른 플라스마, 안쪽이 가장 뜨겁다
      float core = 1.0 - smoothstep(0.23, 0.27, r);
      vec3 cCore = mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.75, 0.35), smoothstep(0.0, 0.25, r));
      cCore *= 2.6 + 0.6*fbm(vP*0.18 + uTime*0.4);
      // 복사층 — 빛이 이리저리 흩어지며 빠져나가는 결 (동심원 무늬 + 잔결)
      float rad = smoothstep(0.23, 0.27, r) * (1.0 - smoothstep(0.69, 0.73, r));
      float wav = 0.5 + 0.5*sin(r*160.0 - uTime*1.5 + fbm(vP*0.12)*6.0);
      vec3 cRad = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.75, 0.35), wav*0.5) * (1.7 - 1.1*smoothstep(0.25, 0.71, r));
      cRad *= 0.85 + 0.3*fbm(vP*0.25 - uTime*0.15);
      // 대류층 — 끓어오르는 세포
      float conv = smoothstep(0.69, 0.73, r);
      vec3 q = vec3(vP.x*0.09, vP.y*0.09 - uTime*0.25, vP.z*0.09);
      float cl = cells(q);
      vec3 cConv = mix(vec3(1.0, 0.5, 0.12), vec3(0.45, 0.12, 0.03), smoothstep(0.1, 0.7, cl)) * (1.25 - 0.5*smoothstep(0.73, 1.0, r));
      c = cCore*core + cRad*rad + cConv*conv;
      // 경계선
      float edge = (1.0 - smoothstep(0.0, 0.006, abs(r - 0.25))) + (1.0 - smoothstep(0.0, 0.006, abs(r - 0.71)));
      c += vec3(1.0, 0.85, 0.6) * edge * 0.9;
      if (r > 1.0) discard;
      gl_FragColor = vec4(c, uFade);
    }`,
});
{
  const f1 = new THREE.Mesh(new THREE.CircleGeometry(STAR_R * 0.999, 160, Math.PI / 2, Math.PI), crossMat);
  f1.rotation.y = Math.PI / 2; // 면 x = 0, z > 0
  const f2 = new THREE.Mesh(new THREE.CircleGeometry(STAR_R * 0.999, 160, -Math.PI / 2, Math.PI), crossMat); // 면 z = 0, x > 0
  starGroup.add(f1, f2);
}
const corona = glowSprite(0xff8a3a, STAR_R * 4.2, 0.55);
starGroup.add(corona);
const corona2 = glowSprite(0xffd090, STAR_R * 2.5, 0.35);
starGroup.add(corona2);

function cssLabel(html, cls = "") {
  const div = document.createElement("div");
  div.className = "lbl " + cls;
  div.innerHTML = html;
  const o = new THREE.CSS2DObject(div);
  return o;
}
const starLabels = [
  [0.1, 0.06, "<b>핵</b> · 약 1570만 K<br>여기서 핵융합이 일어난다"],
  [0.48, 0.32, "<b>복사층</b><br>빛이 수십만 년에 걸쳐 헤매며 빠져나간다"],
  [0.86, -0.15, "<b>대류층</b><br>뜨거운 기체가 끓어오르며 열을 나른다"],
].map(([r, y, html]) => {
  const l = cssLabel(html, "layer");
  l.position.set(STAR_R * r * 0.82, STAR_R * y, STAR_R * r * 0.82 * 0.0 + 1);
  starGroup.add(l);
  return l;
});
{
  const l = cssLabel("<b>광구</b> · 약 5800 K", "layer");
  l.position.set(-STAR_R * 0.55, STAR_R * 0.86, STAR_R * 0.2);
  starGroup.add(l);
  starLabels.push(l);
}

/* ═══════════════════════════════════════════════════════════════
   4. 핵 속 — 플라스마 배경과 열운동하는 입자들
   ═══════════════════════════════════════════════════════════════ */
const coreGroup = new THREE.Group();
coreGroup.visible = false;
scene.add(coreGroup);
const coreUniforms = { uTime: { value: 0 }, uTemp: { value: 15.7 }, uFade: { value: 0 } };

const plasmaBg = new THREE.Mesh(
  new THREE.SphereGeometry(400, 64, 48),
  new THREE.ShaderMaterial({
    uniforms: coreUniforms, side: THREE.BackSide, depthWrite: false, transparent: true, toneMapped: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `
      uniform float uTime; uniform float uTemp; uniform float uFade; varying vec3 vD;
      ${NOISE}
      void main(){
        float n = fbm(vD*2.6 + vec3(uTime*0.03, -uTime*0.02, uTime*0.025));
        float m = fbm(vD*7.0 - uTime*0.05);
        float h = clamp((uTemp - 8.0) / 32.0, 0.0, 1.0);        // 뜨거울수록 하얗고 푸르게
        vec3 deep = mix(vec3(0.20, 0.03, 0.02), vec3(0.16, 0.10, 0.22), h);
        vec3 glow = mix(vec3(1.0, 0.42, 0.10), vec3(0.95, 0.88, 1.0), h);
        vec3 c = mix(deep, glow, smoothstep(-0.25, 0.65, n) * 0.55 + m*0.12);
        c *= 0.55;
        gl_FragColor = vec4(c, uFade);
      }`,
  })
);
coreGroup.add(plasmaBg);

/* 열운동 입자: 위치 + 무작위 진동 (셰이더에서) — 온도가 오르면 빨라진다 */
const THERM = 2600;
const thermal = (() => {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(THERM * 3), col = new Float32Array(THERM * 3), ph = new Float32Array(THERM * 4);
  const pc = new THREE.Color(COL.p), ec = new THREE.Color(COL.ele), hc = new THREE.Color(COL.he);
  for (let i = 0; i < THERM; i++) {
    const r = 10 + Math.pow(Math.random(), 0.6) * 70;
    const th = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    const k = Math.random();
    const c = k < 0.55 ? pc : k < 0.92 ? ec : hc; // 양성자 · 전자 · 헬륨
    col.set([c.r, c.g, c.b], i * 3);
    ph.set([Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, k < 0.55 ? 1.0 : k < 0.92 ? 0.55 : 1.4], i * 4);
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("phase", new THREE.BufferAttribute(ph, 4));
  const m = new THREE.ShaderMaterial({
    uniforms: coreUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      uniform float uTime; uniform float uTemp; attribute vec3 color; attribute vec4 phase; varying vec3 vC;
      void main(){
        float v = sqrt(uTemp / 15.7);                       // 열속도 ∝ √T
        float sp = v / sqrt(phase.w);                        // 무거울수록 느리다 (전자 가벼움)
        vec3 p = position + vec3(sin(uTime*1.3*sp + phase.x), sin(uTime*1.1*sp + phase.y), sin(uTime*1.7*sp + phase.z)) * 1.6 * v;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min((phase.w < 0.9 ? 9.0 : 16.0) * (60.0 / -mv.z), 36.0);
        vC = color; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uFade; varying vec3 vC;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a*a;
        gl_FragColor = vec4(vC * a * 1.4, a * 0.85 * uFade); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
})();
coreGroup.add(thermal);

/* ═══════════════════════════════════════════════════════════════
   5. 핵 — 핵자(양성자·중성자) 묶음
   ═══════════════════════════════════════════════════════════════ */
const NR = 0.42;
const nucleonGeo = new THREE.SphereGeometry(NR, 40, 28);
function nucleonMaterial(type) {
  const c = new THREE.Color(type === "p" ? COL.p : COL.n);
  return new THREE.MeshPhysicalMaterial({
    color: c, emissive: c.clone(), emissiveIntensity: type === "p" ? 0.16 : 0.12,
    roughness: 0.32, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.18,
  });
}
/* A 개의 핵자를 뭉친 배치 — 중심으로 당기고 서로 밀어내는 이완을 몇 백 번 (결정적) */
const layoutCache = {};
function layout(A) {
  if (layoutCache[A]) return layoutCache[A];
  let seed = 7 + A * 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const P = [];
  for (let i = 0; i < A; i++) {
    const y = A === 1 ? 0 : 1 - (2 * i) / (A - 1), r = Math.sqrt(1 - y * y), th = i * 2.399963;
    const rad = NR * 1.1 * Math.cbrt(A);
    P.push(new V3(r * Math.cos(th) * rad + rnd() * 0.1, y * rad + rnd() * 0.1, r * Math.sin(th) * rad + rnd() * 0.1));
  }
  const D = NR * 2 * 0.93;
  for (let it = 0; it < 400; it++) {
    for (const p of P) p.multiplyScalar(0.985);
    for (let i = 0; i < A; i++) for (let j = i + 1; j < A; j++) {
      const d = P[i].clone().sub(P[j]);
      const L = d.length() || 1e-3;
      if (L < D) { d.multiplyScalar((D - L) / L * 0.5); P[i].add(d); P[j].sub(d); }
    }
  }
  const c = new V3();
  P.forEach((p) => c.add(p));
  c.multiplyScalar(1 / A);
  P.forEach((p) => p.sub(c));
  return (layoutCache[A] = P);
}
const SYM = { 1: "H", 2: "He", 3: "Li", 4: "Be", 5: "B", 6: "C", 7: "N", 8: "O", 9: "F" };
const NAME = { "1-1": "양성자", "2-1": "중수소", "3-2": "헬륨-3", "4-2": "헬륨-4 (알파 입자)" };
function nucHTML(A, Z, sym) { return '<span class="nuc"><span class="az"><span>' + A + "</span><span>" + Z + "</span></span>" + sym + "</span>"; }

const actors = new Set(); // 매 프레임 update(dt) 를 받는 것들

class Nucleus {
  constructor(types, pos, opts = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(pos || new V3());
    this.body = new THREE.Group(); // 자전은 몸통만 — 라벨은 늘 위에
    this.group.add(this.body);
    coreGroup.add(this.group);
    this.items = [];
    this.spin = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    this.spinRate = 0.35;
    for (const t of types) {
      const mesh = new THREE.Mesh(nucleonGeo, nucleonMaterial(t));
      this.body.add(mesh);
      this.items.push({ mesh, type: t, target: new V3(), colorK: 1 });
    }
    this.halo = glowSprite(0xff9a50, 1, 0.22);
    this.group.add(this.halo);
    this.label = cssLabel("", "small");
    this.group.add(this.label);
    this.showLabel = opts.label !== false;
    this.relayout(true);
    actors.add(this);
  }
  get Z() { return this.items.filter((i) => i.type === "p").length; }
  get A() { return this.items.length; }
  get radius() { return NR * 1.25 * Math.cbrt(this.A) + 0.05; }
  get pos() { return this.group.position; }
  relayout(instant) {
    const P = layout(this.items.length);
    const ps = this.items.filter((i) => i.type === "p"), ns = this.items.filter((i) => i.type === "n");
    const order = [];
    while (ps.length || ns.length) { if (ps.length) order.push(ps.shift()); if (ns.length) order.push(ns.shift()); }
    order.forEach((it, k) => { it.target.copy(P[k]); if (instant) it.mesh.position.copy(P[k]); });
    this.refreshLabel();
  }
  refreshLabel() {
    const A = this.A, Z = this.Z;
    const isHe = Z === 2 && A === 4;
    let html = A === 1 ? (Z === 1 ? "p" : "n") : nucHTML(A, Z, SYM[Z] || "?");
    const nm = NAME[A + "-" + Z];
    if (nm && A > 1) html += ' <span style="font-weight:500;opacity:.8">' + nm + "</span>";
    this.label.element.innerHTML = html;
    this.label.element.className = "lbl small " + (isHe ? "he" : A === 1 ? "p" : "");
    this.label.position.set(0, this.radius + 0.55, 0);
    this.label.visible = this.showLabel;
    this.halo.scale.setScalar(this.radius * 4.2);
    this.halo.material.color.set(isHe ? 0xffc46b : 0xff8a4a);
  }
  /* 다른 물체의 핵자를 받아들인다 (월드 위치를 지킨 채) */
  absorb(other) {
    this.body.updateWorldMatrix(true, false);
    for (const it of other.items) {
      const w = it.mesh.getWorldPosition(new V3());
      this.body.add(it.mesh);
      it.mesh.position.copy(this.body.worldToLocal(w));
      this.items.push(it);
    }
    other.items = [];
    other.dispose();
    this.relayout(false);
  }
  /* 양성자 하나를 중성자로 (색이 천천히 바뀐다) */
  convert() {
    const it = this.items.find((i) => i.type === "p");
    if (!it) return null;
    it.type = "n";
    it.colorK = 0;
    this.relayout(false);
    return it.mesh.getWorldPosition(new V3());
  }
  /* 핵자 몇 개를 떼어 새 핵으로 */
  split(np, nn) {
    const take = [];
    for (const t of ["p", "n"]) {
      let k = t === "p" ? np : nn;
      for (let i = this.items.length - 1; i >= 0 && k > 0; i--) if (this.items[i].type === t) { take.push(this.items.splice(i, 1)[0]); k--; }
    }
    const c = new V3();
    take.forEach((it) => c.add(it.mesh.getWorldPosition(new V3())));
    c.multiplyScalar(1 / take.length);
    const child = new Nucleus([], c);
    child.body.updateWorldMatrix(true, false);
    for (const it of take) {
      const w = it.mesh.getWorldPosition(new V3());
      child.body.add(it.mesh);
      it.mesh.position.copy(child.body.worldToLocal(w));
      child.items.push(it);
    }
    child.relayout(false);
    this.relayout(false);
    return child;
  }
  update(dt) {
    const k = 1 - Math.exp(-dt * 7);
    for (const it of this.items) {
      it.mesh.position.lerp(it.target, k);
      if (it.colorK < 1) {
        it.colorK = Math.min(1, it.colorK + dt * 0.9);
        const from = new THREE.Color(COL.p), to = new THREE.Color(COL.n);
        const c = from.lerp(to, easeInOut(it.colorK));
        it.mesh.material.color.copy(c);
        it.mesh.material.emissive.copy(c);
        it.mesh.material.emissiveIntensity = lerp(0.16, 0.12, it.colorK) + Math.sin(it.colorK * Math.PI) * 1.6;
      }
    }
    if (this.A > 1) this.body.rotateOnAxis(this.spin, dt * this.spinRate);
  }
  dispose() {
    actors.delete(this);
    this.label.element.remove();
    coreGroup.remove(this.group);
    for (const it of this.items) it.mesh.material.dispose();
  }
}

/* ═══════════════════════════════════════════════════════════════
   6. 가벼운 입자와 효과
   ═══════════════════════════════════════════════════════════════ */
/* 점을 길게 이어 그리는 발광 띠 — 감마선(물결)·중성미자(직선)·꼬리 */
function streak(color, count, size) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(count), 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uOp: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `attribute float alpha; uniform float uSize; varying float vA;
      void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize * (40.0 / -mv.z) * (0.4 + 0.6*alpha); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * (1.0 + a), a * vA * uOp); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

class Gamma {   // 물결치며 빛의 속도로 (화면에서는 천천히) 퍼져 나가는 감마선
  constructor(origin, dir, opts = {}) {
    this.o = origin.clone(); this.d = dir.clone().normalize(); this.t = 0;
    this.speed = opts.speed || 9; this.len = opts.len || 4.5; this.life = opts.life || 3.2;
    const up = Math.abs(this.d.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
    this.side = new V3().crossVectors(this.d, up).normalize();
    this.N = 90;
    this.pts = streak(COL.g, this.N, 13);
    coreGroup.add(this.pts);
    this.head = glowSprite(COL.g, 1.6, 0.9);
    coreGroup.add(this.head);
    if (opts.label) { this.lbl = cssLabel("γ", "small g"); this.head.add(this.lbl); this.lbl.position.set(0, 0.6, 0); }
    actors.add(this);
  }
  update(dt) {
    this.t += dt;
    const s = this.t * this.speed;
    const P = this.pts.geometry.attributes.position, A = this.pts.geometry.attributes.alpha;
    for (let i = 0; i < this.N; i++) {
      const f = i / (this.N - 1), si = Math.max(0, s - this.len * (1 - f));
      const w = Math.sin(si * 4.2 - this.t * 2) * 0.32 * Math.min(1, si);
      const p = this.o.clone().addScaledVector(this.d, si).addScaledVector(this.side, w);
      P.setXYZ(i, p.x, p.y, p.z);
      A.setX(i, f * f * (s > 0 ? 1 : 0));
    }
    P.needsUpdate = A.needsUpdate = true;
    this.head.position.copy(this.o).addScaledVector(this.d, s);
    const fade = 1 - seg(this.t, this.life * 0.7, this.life);
    this.pts.material.uniforms.uOp.value = fade;
    this.head.material.opacity = 0.9 * fade;
    if (this.t > this.life) this.dispose();
  }
  dispose() { actors.delete(this); coreGroup.remove(this.pts, this.head); if (this.lbl) this.lbl.element.remove(); }
}

class Neutrino { // 거의 아무것과도 반응하지 않고 곧장 별 밖으로
  constructor(origin, dir) {
    this.o = origin.clone(); this.d = dir.clone().normalize(); this.t = 0; this.speed = 15; this.life = 3.2;
    this.N = 50;
    this.pts = streak(COL.nu, this.N, 7);
    coreGroup.add(this.pts);
    this.head = glowSprite(COL.nu, 0.9, 0.95);
    coreGroup.add(this.head);
    this.lbl = cssLabel("νₑ", "small nu");
    this.head.add(this.lbl);
    this.lbl.position.set(0, 0.5, 0);
    actors.add(this);
  }
  update(dt) {
    this.t += dt;
    const s = this.t * this.speed;
    const P = this.pts.geometry.attributes.position, A = this.pts.geometry.attributes.alpha;
    for (let i = 0; i < this.N; i++) {
      const f = i / (this.N - 1), si = Math.max(0, s - 6 * (1 - f));
      const p = this.o.clone().addScaledVector(this.d, si);
      P.setXYZ(i, p.x, p.y, p.z);
      A.setX(i, f * 0.8);
    }
    P.needsUpdate = A.needsUpdate = true;
    this.head.position.copy(this.o).addScaledVector(this.d, s);
    const fade = 1 - seg(this.t, 2.2, this.life);
    this.pts.material.uniforms.uOp.value = fade;
    this.head.material.opacity = 0.95 * fade;
    this.lbl.element.style.opacity = fade;
    if (this.t > this.life) this.dispose();
  }
  dispose() { actors.delete(this); coreGroup.remove(this.pts, this.head); this.lbl.element.remove(); }
}

class Lepton { // 양전자 / 전자 — 작은 빛 알갱이 + 꼬리, 위치는 단계 스크립트가 정한다
  constructor(kind, pos) {
    this.kind = kind;
    const color = kind === "e+" ? COL.pos : COL.ele;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    this.mesh.material.color.multiplyScalar(2.2);
    this.mesh.position.copy(pos);
    this.glow = glowSprite(color, 1.3, 0.9);
    this.mesh.add(this.glow);
    this.lbl = cssLabel(kind === "e+" ? "e⁺" : "e⁻", "small e" + (kind === "e+" ? "" : " ele"));
    if (kind !== "e+") { this.lbl.element.style.color = "#cdb6ff"; this.lbl.element.style.borderColor = "rgba(180,140,255,.7)"; }
    this.lbl.position.set(0, 0.45, 0);
    this.mesh.add(this.lbl);
    this.N = 24;
    this.trail = streak(color, this.N, 6);
    this.hist = [];
    coreGroup.add(this.mesh, this.trail);
    actors.add(this);
  }
  get pos() { return this.mesh.position; }
  update() {
    this.hist.unshift(this.mesh.position.clone());
    if (this.hist.length > this.N) this.hist.pop();
    const P = this.trail.geometry.attributes.position, A = this.trail.geometry.attributes.alpha;
    for (let i = 0; i < this.N; i++) {
      const h = this.hist[Math.min(i, this.hist.length - 1)];
      P.setXYZ(i, h.x, h.y, h.z);
      A.setX(i, 1 - i / this.N);
    }
    P.needsUpdate = A.needsUpdate = true;
  }
  dispose() { actors.delete(this); coreGroup.remove(this.mesh, this.trail); this.lbl.element.remove(); }
}

class Flash { // 융합 섬광 + 충격파 고리
  constructor(pos, color, size, ring = true) {
    this.t = 0; this.size = size; this.life = 1.1;
    this.s = glowSprite(color, size, 1);
    this.s.position.copy(pos);
    coreGroup.add(this.s);
    if (ring) {
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 128), new THREE.MeshBasicMaterial({
        color, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      this.ring.material.color.multiplyScalar(2);
      this.ring.position.copy(pos);
      coreGroup.add(this.ring);
    }
    this.light = new THREE.PointLight(color, 6, size * 6, 2);
    this.light.position.copy(pos);
    coreGroup.add(this.light);
    actors.add(this);
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.life;
    this.s.scale.setScalar(this.size * (0.4 + 1.6 * easeOut(Math.min(1, k * 1.6))));
    this.s.material.opacity = 1 - easeIn(clamp01(k));
    this.light.intensity = 6 * (1 - clamp01(k * 1.4));
    if (this.ring) {
      this.ring.quaternion.copy(camera.quaternion);
      this.ring.scale.setScalar(0.2 + this.size * 1.3 * easeOut(clamp01(k)));
      this.ring.material.opacity = 0.8 * Math.pow(1 - clamp01(k), 2);
    }
    if (this.t > this.life) this.dispose();
  }
  dispose() { actors.delete(this); coreGroup.remove(this.s, this.light); if (this.ring) coreGroup.remove(this.ring); }
}

class Barrier { // 쿨롱 장벽 — 두 핵 사이에서 맥동하는 반투명 껍질
  constructor(pos, radius, text) {
    this.t = 0; this.alive = true;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uOp: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: "varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }",
      fragmentShader: `uniform float uT; uniform float uOp; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); float w = 0.5 + 0.5*sin(length(vP)*0.0 + vP.y*6.0 - uT*6.0);
          vec3 c = mix(vec3(1.0,0.35,0.25), vec3(1.0,0.7,0.45), w); gl_FragColor = vec4(c * (0.25 + f*1.4), (0.03 + f*0.5) * uOp); }`,
    }));
    this.mesh.position.copy(pos);
    coreGroup.add(this.mesh);
    if (text) { this.lbl = cssLabel(text, "barrier"); this.lbl.position.set(0, radius + 0.4, 0); this.mesh.add(this.lbl); }
    actors.add(this);
  }
  update(dt) {
    this.t += dt;
    const u = this.mesh.material.uniforms;
    u.uT.value = this.t;
    u.uOp.value = this.alive ? Math.min(1, this.t * 2) * (0.75 + 0.25 * Math.sin(this.t * 9)) : Math.max(0, u.uOp.value - dt * 2.5);
    if (!this.alive && u.uOp.value <= 0) this.dispose();
  }
  pop() { this.alive = false; if (this.lbl) this.lbl.element.style.opacity = 0; }
  dispose() { actors.delete(this); coreGroup.remove(this.mesh); if (this.lbl) this.lbl.element.remove(); }
}

function clearActors() { for (const a of [...actors]) a.dispose(); }
const randDir = () => new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
</script>
