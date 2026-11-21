// Gece Kaçağı — ekran efektleri: parlama (bloom), hız bulanıklığı, renk kayması, vinyet, sinematik renk, ACES ton eşleme
// Sahne doğrusal (HDR) olarak bir doku hedefine çizilir; sonra tam ekran gölgelendiricilerle birleştirilir.
(function (G) {
  'use strict';
  let THREE, ren, rtScene, rtA, rtB, rtC, rtD, quad, cam2, mats = {}, W = 0, H = 0, hdr = false, ok = false, scaleBloom = 0.25;
  const P = { speed: 0, nitro: 0, exposure: 1.05, bloom: 0.9, sat: 1.1, vign: 0.35, tint: [1, 1, 1], grain: 0.03, odak: 0, hit: 0 };

  const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const FS_BRIGHT = `uniform sampler2D tDiffuse; uniform float thr; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(thr, thr + 0.6, l);
      gl_FragColor = vec4(min(c * k, vec3(2.5)), 1.0); }`;
  const FS_BLUR = `uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227;
      s += texture2D(tDiffuse, vUv + dir * 1.385).rgb * 0.316; s += texture2D(tDiffuse, vUv - dir * 1.385).rgb * 0.316;
      s += texture2D(tDiffuse, vUv + dir * 3.231).rgb * 0.070; s += texture2D(tDiffuse, vUv - dir * 3.231).rgb * 0.070;
      gl_FragColor = vec4(s, 1.0); }`;
  const FS_COMP = `uniform sampler2D tScene; uniform sampler2D tBloom1; uniform sampler2D tBloom2;
    uniform float speed, nitro, exposure, bloom, sat, vign, grain, time, odak, hit, hdr; uniform vec3 tint; varying vec2 vUv;
    vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 dc = uv - vec2(0.5, 0.55); float r = length(dc);
      // hız bulanıklığı: merkezden dışa doğru (kenarlarda güçlü)
      float amt = speed * smoothstep(0.15, 0.75, r) * 0.045;
      vec3 col = texture2D(tScene, uv).rgb;
      if (amt > 0.001) {
        vec3 acc = col; for (int i = 1; i < 6; i++) { acc += texture2D(tScene, uv - dc * amt * float(i)).rgb; } col = acc / 6.0;
      }
      // nitro / çarpma: renk kayması
      float ca = (nitro * 0.006 + hit * 0.01) * r;
      if (ca > 0.0001) { col.r = mix(col.r, texture2D(tScene, uv + dc * ca).r, 0.9); col.b = mix(col.b, texture2D(tScene, uv - dc * ca).b, 0.9); }
      col += texture2D(tBloom1, uv).rgb * bloom * 0.8 + texture2D(tBloom2, uv).rgb * bloom * 0.3;
      col *= tint;
      col = aces(col * exposure);
      // doygunluk + hafif kontrast
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, sat * (1.0 - odak * 0.6));
      col = col * col * (3.0 - 2.0 * col) * 0.25 + col * 0.75;
      // vinyet
      col *= 1.0 - vign * smoothstep(0.35, 0.95, length((vUv - 0.5) * vec2(1.25, 1.0)));
      // sRGB
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));
      col += (rnd(vUv * 731.0) - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function mk(fs, uni) { return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: uni, depthTest: false, depthWrite: false, toneMapped: false }); }
  function rt(w, h, opt) {
    const t = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), Object.assign({ type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }, opt || {}));
    return t;
  }

  function init(renderer, quality) {
    THREE = G.THREE; ren = renderer;
    const gl = ren.getContext();
    const isGL2 = ren.capabilities.isWebGL2;
    hdr = isGL2 && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    cam2 = new THREE.Camera();
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    mats.bright = mk(FS_BRIGHT, { tDiffuse: { value: null }, thr: { value: hdr ? 1.3 : 0.92 } });
    mats.blur = mk(FS_BLUR, { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } });
    mats.comp = mk(FS_COMP, {
      tScene: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, speed: { value: 0 }, nitro: { value: 0 }, exposure: { value: 1 }, bloom: { value: 1 },
      sat: { value: 1 }, vign: { value: 0.3 }, grain: { value: 0.03 }, time: { value: 0 }, odak: { value: 0 }, hit: { value: 0 }, hdr: { value: hdr ? 1 : 0 }, tint: { value: new THREE.Vector3(1, 1, 1) },
    });
    ok = true;
    setQuality(quality);
    return ok;
  }
  let samples = 0;
  function setQuality(q) {
    samples = q >= 2 && ren.capabilities.isWebGL2 ? 4 : 0;
    scaleBloom = q >= 2 ? 0.5 : 0.25;
    W = 0; // yeniden boyutlandır
  }
  function ensure() {
    const s = new THREE.Vector2(); ren.getDrawingBufferSize(s);
    if (s.x === W && s.y === H && rtScene) return;
    W = s.x; H = s.y;
    for (const t of [rtScene, rtA, rtB, rtC, rtD]) if (t) t.dispose();
    rtScene = rt(W, H, { depthBuffer: true, samples });
    const bw = Math.round(W * scaleBloom), bh = Math.round(H * scaleBloom);
    rtA = rt(bw, bh); rtB = rt(bw, bh);
    rtC = rt(bw >> 1, bh >> 1); rtD = rt(bw >> 1, bh >> 1);
  }
  function pass(mat, target) { quad.material = mat; ren.setRenderTarget(target); ren.render(quad, cam2); }

  let t0 = 0;
  function render(scene, camera) {
    ensure();
    const tm = ren.toneMapping;
    ren.setRenderTarget(rtScene);
    ren.render(scene, camera);
    // parlak bölgeleri ayıkla ve iki seviyede bulanıklaştır
    mats.bright.uniforms.tDiffuse.value = rtScene.texture; pass(mats.bright, rtA);
    const bl = mats.blur.uniforms;
    bl.tDiffuse.value = rtA.texture; bl.dir.value.set(1 / rtA.width, 0); pass(mats.blur, rtB);
    bl.tDiffuse.value = rtB.texture; bl.dir.value.set(0, 1 / rtA.height); pass(mats.blur, rtA);
    bl.tDiffuse.value = rtA.texture; bl.dir.value.set(2 / rtA.width, 0); pass(mats.blur, rtC);
    bl.tDiffuse.value = rtC.texture; bl.dir.value.set(0, 2 / rtA.height); pass(mats.blur, rtD);
    bl.tDiffuse.value = rtD.texture; bl.dir.value.set(3 / rtA.width, 0); pass(mats.blur, rtC);
    bl.tDiffuse.value = rtC.texture; bl.dir.value.set(0, 3 / rtA.height); pass(mats.blur, rtD);
    const u = mats.comp.uniforms;
    u.tScene.value = rtScene.texture; u.tBloom1.value = rtA.texture; u.tBloom2.value = rtD.texture;
    u.speed.value = P.speed; u.nitro.value = P.nitro; u.exposure.value = P.exposure; u.bloom.value = P.bloom; u.sat.value = P.sat; u.vign.value = P.vign;
    u.grain.value = P.grain; u.time.value = (t0 += 0.016) % 100; u.odak.value = P.odak; u.hit.value = P.hit; u.tint.value.set(P.tint[0], P.tint[1], P.tint[2]);
    pass(mats.comp, null);
    ren.toneMapping = tm;
  }
  function dispose() { for (const t of [rtScene, rtA, rtB, rtC, rtD]) if (t) t.dispose(); rtScene = null; }

  G.POST = { init, render, setQuality, dispose, P, get hdr() { return hdr; }, get ok() { return ok; } };
})(window);
