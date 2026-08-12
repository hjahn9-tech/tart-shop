// Fog of war (스프린트3) — 어둠 층 벽 인식 시야
// 구조: CPU 각도 레이(진실) → 1행 룩업 텍스처 → 풀스크린 셰이더 1장.
// 셰이더는 인지를 '그릴' 뿐, 적 공개/타겟팅 판정은 main.js의 sightBlocked가 소유한다.
import * as THREE from 'three';

const CAL = { // 검증된 캘리브레이션 (mechanics.md 기반, 아레나 21에 맞춤)
  visionR: 14, clearR: 8, edgeSoft: 1.35, angSoft: 1.8,
  obstacleDark: 0.32, maxOpacity: 0.46, rays: 144,
  updateInterval: 0.08, moveThreshold: 0.08,
};

export function createFog(scene, rays) {
  const N = Math.max(32, Math.min(256, rays || CAL.rays)); // 레이 예산 클램프
  const dists = new Float32Array(N);
  const pixels = new Uint8Array(N);
  const tex = new THREE.DataTexture(pixels, N, 1, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;          // 0/2π 이음새 연속
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;

  const uniforms = {
    uLookup: { value: tex },
    uPlayer: { value: new THREE.Vector2() },
    uCorners: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
    uVisionR: { value: CAL.visionR },
    uClearR: { value: CAL.clearR },
    uEdge: { value: CAL.edgeSoft },
    uAngSoft: { value: CAL.angSoft },
    uDark: { value: CAL.obstacleDark },
    uMaxA: { value: CAL.maxOpacity },
    uColor: { value: new THREE.Color(0x07101a) },
    uRayCount: { value: N },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      #define TWO_PI 6.28318530718
      uniform sampler2D uLookup;
      uniform vec2 uPlayer;
      uniform vec2 uCorners[4]; // 0:(-1,-1) 1:(1,-1) 2:(-1,1) 3:(1,1) NDC 모서리의 지면 XZ
      uniform float uVisionR, uClearR, uEdge, uAngSoft, uDark, uMaxA, uRayCount;
      uniform vec3 uColor;
      varying vec2 vUv;
      float hitDist(float ang) { return texture2D(uLookup, vec2(ang, 0.5)).r * uVisionR; }
      void main() {
        vec2 bottom = mix(uCorners[0], uCorners[1], vUv.x);
        vec2 top = mix(uCorners[2], uCorners[3], vUv.x);
        vec2 world = mix(bottom, top, vUv.y);
        vec2 off = world - uPlayer;
        float d = length(off);
        float ang = fract(atan(off.y, off.x) / TWO_PI + 1.0);
        // 방사 성분
        float radialVis = 1.0 - smoothstep(uClearR, uVisionR, d);
        float radialFog = 1.0 - radialVis;
        // 벽 성분 — 5탭 각도 스무딩 (스포크 제거)
        float step1 = max(1.0 / uRayCount, uAngSoft / max(d, 2.0) / TWO_PI);
        float obsVis = 0.0;
        float w[5]; w[0]=.08; w[1]=.24; w[2]=.36; w[3]=.24; w[4]=.08;
        for (int i = 0; i < 5; i++) {
          float a = ang + float(i - 2) * step1;
          float h = hitDist(fract(a + 1.0));
          obsVis += w[i] * (1.0 - smoothstep(h - uEdge, h + uEdge, d));
        }
        float obsFog = (1.0 - obsVis) * uDark;
        float alpha = uMaxA * max(radialFog, obsFog);
        gl_FragColor = vec4(uColor, alpha);
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 9999;
  mesh.visible = false;
  scene.add(mesh);

  let acc = 0;
  const lastPos = new THREE.Vector2(1e9, 1e9);
  const ndc = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const vNear = new THREE.Vector3(), vFar = new THREE.Vector3();

  function groundCorner(camera, nx, ny, out) { // NDC → y=0 지면 교점
    vNear.set(nx, ny, -1).unproject(camera);
    vFar.set(nx, ny, 1).unproject(camera);
    const t = vNear.y / (vNear.y - vFar.y || 1e-9);
    out.set(vNear.x + (vFar.x - vNear.x) * t, vNear.z + (vFar.z - vNear.z) * t);
  }

  return {
    setEnabled(on) { mesh.visible = on; },
    get enabled() { return mesh.visible; },
    update(camera, px, pz, castRay, dt) {
      if (!mesh.visible) return;
      uniforms.uPlayer.value.set(px, pz);
      camera.updateMatrixWorld();
      for (let i = 0; i < 4; i++) groundCorner(camera, ndc[i][0], ndc[i][1], uniforms.uCorners.value[i]);
      // CPU 룩업 — 이동/시간 스로틀
      acc += Math.max(0, dt);
      const moved = lastPos.distanceTo(uniforms.uPlayer.value) > CAL.moveThreshold;
      if (!moved && acc < CAL.updateInterval) return;
      acc = 0;
      lastPos.copy(uniforms.uPlayer.value);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        dists[i] = castRay(px, pz, Math.cos(a), Math.sin(a), CAL.visionR);
        pixels[i] = Math.max(0, Math.min(255, Math.round((dists[i] / CAL.visionR) * 255)));
      }
      tex.needsUpdate = true;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mat.dispose();
      tex.dispose();
    },
    CAL,
  };
}
