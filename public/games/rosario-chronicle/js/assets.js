// ============================================================
// 에셋 로딩 — KayKit CC0 GLB (캐릭터/몬스터/프롭)
// 스켈레톤 복제 + 애니메이션 컨트롤러 + 틴트
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const MODELS = [
  'Rogue_Hooded', 'Mage', 'Knight',
  'Skeleton_Minion', 'Skeleton_Warrior', 'Skeleton_Mage', 'Skeleton_Rogue',
  'Rogue', 'Barbarian', // 제2성: 세이렌/무희, 욕망의 수호자
  'pillar', 'banner', 'torch', 'stairs',
];

const cache = {};
const loader = new GLTFLoader();

export async function loadAll(onProgress) {
  let done = 0;
  for (const name of MODELS) {
    cache[name] = await loader.loadAsync(`assets/${name}.glb`);
    done++;
    if (onProgress) onProgress(done / MODELS.length, name);
  }
}

// height: 원하는 월드 높이로 자동 정규화 (에셋 원본 단위에 무관하게)
export function spawnModel(name, { tint, height, opacity, shadow = true } = {}) {
  const src = cache[name];
  const obj = SkeletonUtils.clone(src.scene);
  const box = new THREE.Box3().setFromObject(obj);
  const h = box.max.y - box.min.y;
  const scale = height && h > 0 ? height / h : 1;
  obj.scale.setScalar(scale);
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = shadow;
      o.receiveShadow = false;
      o.material = o.material.clone();
      if (tint) o.material.color.multiply(new THREE.Color(tint));
      if (opacity !== undefined) { o.material.transparent = true; o.material.opacity = opacity; }
    }
  });
  return { obj, clips: src.animations, scale };
}

// 애니메이션 컨트롤러: idle/run 베이스 + 원샷(attack/hit/death) 자동 복귀
const CLIP_MAP = {
  idle: ['Idle'],
  run: ['Running_A', 'Running_B', 'Walking_A'],
  attack: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop'],
  shoot: ['1H_Ranged_Shoot', 'Spellcast_Shoot', 'Spellcasting'],
  cast: ['Spellcast_Raise', 'Spellcast_Long', 'Cheer'],
  hit: ['Hit_A', 'Hit_B'],
  death: ['Death_A', 'Death_B'],
};

export function makeAnimator(obj, clips) {
  const mixer = new THREE.AnimationMixer(obj);
  const actions = {};
  for (const [key, names] of Object.entries(CLIP_MAP)) {
    for (const n of names) {
      const clip = clips.find((c) => c.name === n) || clips.find((c) => c.name.includes(n));
      if (clip) { actions[key] = { clip, action: mixer.clipAction(clip) }; break; }
    }
  }
  let current = null;
  let oneshotUntil = 0;
  let now = 0;
  let onceName = null;
  let onceSeq = 0; // 코옵: 게스트 애니메이션 동기화용 시퀀스

  function play(key, { once = false, speed = 1 } = {}) {
    const a = actions[key];
    if (!a) return 0;
    if (current === a && !once) return a.clip.duration;
    if (current) current.action.fadeOut(0.15);
    a.action.reset().fadeIn(0.12).play();
    a.action.timeScale = speed;
    if (once) {
      a.action.setLoop(THREE.LoopOnce);
      a.action.clampWhenFinished = true;
      oneshotUntil = now + a.clip.duration / speed - 0.12;
      onceName = key;
      onceSeq++;
    } else {
      a.action.setLoop(THREE.LoopRepeat);
    }
    current = a;
    return a.clip.duration / speed;
  }

  return {
    play,
    // 매 프레임: 원샷 중이 아니면 이동 여부에 따라 idle/run 유지
    base(moving) {
      if (now < oneshotUntil) return;
      play(moving ? 'run' : 'idle');
    },
    update(dt) { now += dt; mixer.update(dt); },
    busy() { return now < oneshotUntil; },
    onceInfo() { return { n: onceName, s: onceSeq }; },
  };
}
