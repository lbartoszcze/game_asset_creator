import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://unpkg.com/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';

const RACE_MODELS = {
  humans:    new URL('./models/humans.glb', import.meta.url).href,
  dwarves:   new URL('./models/dwarves.glb', import.meta.url).href,
  elves:     new URL('./models/elves.glb', import.meta.url).href,
  skeletons: new URL('./models/skeletons.glb', import.meta.url).href,
};

const PROTOTYPES = {};
const LOAD_PROMISES = {};

export function loadRaceModel(raceKey) {
  if (PROTOTYPES[raceKey]) return Promise.resolve(PROTOTYPES[raceKey]);
  if (LOAD_PROMISES[raceKey]) return LOAD_PROMISES[raceKey];
  const url = RACE_MODELS[raceKey];
  if (!url) return Promise.reject(new Error('no model for ' + raceKey));
  const loader = new GLTFLoader();
  LOAD_PROMISES[raceKey] = new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      gltf.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      PROTOTYPES[raceKey] = gltf;
      resolve(gltf);
    }, undefined, (err) => { console.warn('[loader] ' + raceKey + ' failed', err); reject(err); });
  });
  return LOAD_PROMISES[raceKey];
}

export function loadAllRaces() {
  return Promise.all(Object.keys(RACE_MODELS).map((r) => loadRaceModel(r).catch(() => null)));
}

export function loadHumanoid() { return loadRaceModel('humans'); }
export function isHumanoidReady() { return PROTOTYPES.humans != null; }
export function isRaceReady(raceKey) { return PROTOTYPES[raceKey] != null; }

export function buildRaceUnit(raceKey, team) {
  const proto = PROTOTYPES[raceKey];
  if (!proto) return null;
  const inner = SkeletonUtils.clone(proto.scene);
  const root = new THREE.Group();
  root.add(inner);
  let hasSkinned = false;
  inner.traverse((m) => { if (m.isSkinnedMesh) hasSkinned = true; });
  if (!hasSkinned) {
    const ib = new THREE.Box3().setFromObject(inner);
    const sz = ib.getSize(new THREE.Vector3());
    if (sz.y < sz.x * 0.6 && sz.y < sz.z * 0.6) inner.rotation.x = -Math.PI / 2;
    const ib2 = new THREE.Box3().setFromObject(inner);
    const sz2 = ib2.getSize(new THREE.Vector3());
    const h = Math.max(sz2.y, sz2.x, sz2.z);
    if (h > 0) inner.scale.setScalar(2 / h);
    const ib3 = new THREE.Box3().setFromObject(inner);
    const ic = ib3.getCenter(new THREE.Vector3());
    inner.position.x -= ic.x; inner.position.z -= ic.z; inner.position.y -= ib3.min.y;
  }
  root.traverse((m) => {
    if (m.isMesh && m.material) {
      m.frustumCulled = false;
      if (m.geometry) {
        m.geometry.computeBoundingBox();
        m.geometry.computeBoundingSphere();
        if (m.geometry.boundingSphere) m.geometry.boundingSphere.radius *= 3;
      }
      const mat = m.material.clone();
      if (team && team.livery && mat.color) {
        const tint = new THREE.Color(team.livery);
        if (mat.map) mat.color = new THREE.Color(0xffffff).lerp(tint, 0.35);
        else mat.color = tint;
      }
      m.material = mat;
    }
  });
  const mixer = new THREE.AnimationMixer(inner);
  const clips = {};
  for (const c of proto.animations) clips[c.name] = c;
  return { root, mixer, clips };
}

export function buildHumanoidUnit(team) { return buildRaceUnit('humans', team); }

export function playClip(unitGltf, name, opts = {}) {
  if (!unitGltf || !unitGltf.clips[name]) return null;
  const action = unitGltf.mixer.clipAction(unitGltf.clips[name]);
  action.reset();
  action.setLoop(opts.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.timeScale = opts.timeScale || 1;
  action.fadeIn(opts.fade || 0.2);
  action.play();
  return action;
}

export function crossFadeTo(unitGltf, currentAction, name, fade = 0.2) {
  if (!unitGltf || !unitGltf.clips[name]) return currentAction;
  const next = unitGltf.mixer.clipAction(unitGltf.clips[name]);
  next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
  if (currentAction) currentAction.fadeOut(fade);
  return next;
}
