import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://unpkg.com/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';

const SOLDIER_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

let PROTOTYPE = null;
let LOAD_PROMISE = null;

export function loadHumanoid() {
  if (PROTOTYPE) return Promise.resolve(PROTOTYPE);
  if (LOAD_PROMISE) return LOAD_PROMISE;
  const loader = new GLTFLoader();
  LOAD_PROMISE = new Promise((resolve, reject) => {
    loader.load(SOLDIER_URL, (gltf) => {
      gltf.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      PROTOTYPE = gltf;
      resolve(gltf);
    }, undefined, (err) => {
      console.warn('[loader] humanoid load failed', err);
      reject(err);
    });
  });
  return LOAD_PROMISE;
}

export function isHumanoidReady() { return PROTOTYPE != null; }

export function buildHumanoidUnit(team) {
  if (!PROTOTYPE) return null;
  const root = SkeletonUtils.clone(PROTOTYPE.scene);
  root.scale.setScalar(1.0);
  const bbox = new THREE.Box3().setFromObject(root);
  if (bbox.min.y < 0) root.position.y = -bbox.min.y;
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
  const mixer = new THREE.AnimationMixer(root);
  const clips = {};
  for (const c of PROTOTYPE.animations) clips[c.name] = c;
  return { root, mixer, clips };
}

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
