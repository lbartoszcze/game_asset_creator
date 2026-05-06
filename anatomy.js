import * as THREE from 'three';
import { buildWeaponArm, buildArmorTier } from '../lib/weapons.js';

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });
const basic = (color) => new THREE.MeshBasicMaterial({ color });

const RACE_VISUALS = {
  humans:    { skin: 0xe6c39a, helmet: 0xc4a14a, scaleY: 1.00, width: 1.00, accessory: null,    capH: 0.45, hair: 0x4a2a14 },
  dwarves:   { skin: 0xd9a06d, helmet: 0x707378, scaleY: 0.78, width: 1.16, accessory: 'beard', capH: 0.32, hair: 0x6e3f1f },
  elves:     { skin: 0xd2e6b4, helmet: 0x4a8a4a, scaleY: 1.10, width: 0.90, accessory: 'ears',  capH: 0.65, hair: 0xd4b878 },
  skeletons: { skin: 0xeee5d0, helmet: 0x6a6a6a, scaleY: 0.95, width: 0.92, accessory: 'skull', capH: 0.0, hair: 0x000000 },
};

const LEG_PROFILE = [[0.20, 0.00], [0.22, 0.05], [0.20, 0.16], [0.16, 0.30], [0.21, 0.42], [0.16, 0.56], [0.18, 0.65], [0.20, 0.78], [0.22, 0.90], [0.20, 1.00]];
const ARM_PROFILE = [[0.10, 0.00], [0.12, 0.10], [0.16, 0.18], [0.13, 0.30], [0.10, 0.45], [0.09, 0.50]];
const TORSO_PROFILE = [[0.34, 0.00], [0.42, 0.10], [0.48, 0.30], [0.46, 0.50], [0.40, 0.65], [0.46, 0.80], [0.40, 0.85]];

function lathe(profile, segments = 16) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segments);
}

function buildHead(v, raceKey, skinMat, boneMat, eyeMat) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(raceKey === 'skeletons' ? 0.24 : 0.27, 24, 18), raceKey === 'skeletons' ? boneMat : skinMat);
  head.position.y = 2.00; head.castShadow = true;
  head.scale.set(1.0, 1.05, 0.92);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.08), raceKey === 'skeletons' ? boneMat : skinMat);
  brow.position.set(0, 2.10, 0.21);
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), raceKey === 'skeletons' ? boneMat : skinMat);
  cheekL.position.set(-0.16, 1.93, 0.17); cheekL.scale.set(0.7, 0.5, 0.7);
  const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), raceKey === 'skeletons' ? boneMat : skinMat);
  cheekR.position.set( 0.16, 1.93, 0.17); cheekR.scale.set(0.7, 0.5, 0.7);
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.10), raceKey === 'skeletons' ? boneMat : skinMat);
  chin.position.set(0, 1.78, 0.18);
  const eyeGeom = new THREE.SphereGeometry(raceKey === 'skeletons' ? 0.06 : 0.04, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeom, eyeMat); eyeL.position.set(-0.10, 2.04, 0.22);
  const eyeR = new THREE.Mesh(eyeGeom, eyeMat); eyeR.position.set( 0.10, 2.04, 0.22);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), raceKey === 'skeletons' ? boneMat : skinMat);
  nose.position.set(0, 1.97, 0.27); nose.rotation.x = Math.PI / 2;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.02), basic(0x4a2a18));
  mouth.position.set(0, 1.84, 0.26);
  g.add(head, brow, cheekL, cheekR, chin, eyeL, eyeR, nose, mouth);
  if (v.hair && raceKey !== 'skeletons' && v.capH === 0) {
    const hairMat = lambert(v.hair, true);
    for (const [dx, dz] of [[0, 0], [-0.14, 0], [0.14, 0], [0, -0.14], [0, 0.14]]) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), hairMat);
      tuft.position.set(dx, 2.18, dz); tuft.castShadow = true; g.add(tuft);
    }
  }
  return g;
}

function buildLegs(accentMat, dark) {
  const g = new THREE.Group();
  const legGeom = lathe(LEG_PROFILE, 16);
  const legL = new THREE.Mesh(legGeom, accentMat); legL.position.set(-0.18, 0.0, 0); legL.castShadow = true;
  const legR = new THREE.Mesh(legGeom, accentMat); legR.position.set( 0.18, 0.0, 0); legR.castShadow = true;
  const calfL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), accentMat); calfL.position.set(-0.18, 0.42, -0.06); calfL.scale.set(0.9, 1.4, 0.7);
  const calfR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), accentMat); calfR.position.set( 0.18, 0.42, -0.06); calfR.scale.set(0.9, 1.4, 0.7);
  const kneeGeom = new THREE.SphereGeometry(0.13, 12, 8);
  const kneeL = new THREE.Mesh(kneeGeom, accentMat); kneeL.position.set(-0.18, 0.55, 0.06); kneeL.scale.set(1, 0.6, 1);
  const kneeR = new THREE.Mesh(kneeGeom, accentMat); kneeR.position.set( 0.18, 0.55, 0.06); kneeR.scale.set(1, 0.6, 1);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.46), dark); bootL.position.set(-0.18, 0.10, 0.05); bootL.castShadow = true;
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.46), dark); bootR.position.set( 0.18, 0.10, 0.05); bootR.castShadow = true;
  const heelL = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.16), dark); heelL.position.set(-0.18, 0.05, -0.12);
  const heelR = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.16), dark); heelR.position.set( 0.18, 0.05, -0.12);
  g.add(legL, legR, calfL, calfR, kneeL, kneeR, bootL, bootR, heelL, heelR);
  return g;
}

function buildTorso(team, liveryMat, accentMat, beltMat, skinMat) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(lathe(TORSO_PROFILE, 18), liveryMat); torso.position.y = 1.05; torso.castShadow = true;
  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 10), liveryMat); shoulderL.position.set(-0.42, 1.78, 0); shoulderL.castShadow = true;
  const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 10), liveryMat); shoulderR.position.set( 0.42, 1.78, 0); shoulderR.castShadow = true;
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.10), accentMat); collar.position.set(0, 1.80, 0.18);
  const pecL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), liveryMat); pecL.position.set(-0.16, 1.55, 0.30); pecL.scale.set(1.0, 0.7, 0.7); pecL.castShadow = true;
  const pecR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), liveryMat); pecR.position.set( 0.16, 1.55, 0.30); pecR.scale.set(1.0, 0.7, 0.7); pecR.castShadow = true;
  const abMat = lambert(0x6a4a2a, true);
  for (const [dy, sy] of [[0, 1.0], [-0.08, 0.95], [-0.16, 0.90], [-0.24, 0.85]]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.06), abMat); seg.position.set(0, 1.32 + dy, 0.36); seg.scale.set(sy, 1, 1); g.add(seg);
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.06, 8, 20), beltMat); belt.rotation.x = Math.PI / 2; belt.position.y = 0.95;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.06), accentMat); buckle.position.set(0, 0.95, 0.42);
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.10), beltMat); pouchL.position.set(-0.30, 0.85, 0.30);
  const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.65, 0.10), beltMat); scabbard.position.set(-0.42, 0.55, 0); scabbard.rotation.z = -0.15;
  g.add(torso, shoulderL, shoulderR, collar, pecL, pecR, belt, buckle, pouchL, scabbard);
  return g;
}

function buildShieldArm(team, raceKey, liveryMat, skinMat, accentMat, weaponStyle) {
  const TWO_HAND = new Set(['spear', 'pike', 'halberd', 'lance']);
  const twoHand = TWO_HAND.has(weaponStyle);
  const arm = new THREE.Group(); arm.position.set(-0.50, 1.65, 0);
  const upper = new THREE.Mesh(lathe(ARM_PROFILE, 12), liveryMat);
  upper.position.set(0.05, -0.50, 0); upper.castShadow = true; upper.rotation.z = Math.PI;
  const bicep = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), liveryMat);
  bicep.position.set(0.05, -0.30, 0.05); bicep.scale.set(1.0, 0.9, 0.7); bicep.castShadow = true;
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.32, 12), skinMat);
  fore.position.set(0.05, -0.74, 0); fore.castShadow = true;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.18), skinMat);
  hand.position.set(0.05, -0.92, 0.05); hand.castShadow = true;
  const fingerMat = skinMat;
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.10, 0.04), fingerMat);
    f.position.set(0.05 + (i - 1.5) * 0.035, -1.02, 0.10);
    arm.add(f);
  }
  const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24), liveryMat);
  shieldDisc.position.set(-0.08, -0.92, 0.10); shieldDisc.rotation.z = Math.PI / 2; shieldDisc.castShadow = true;
  const sboss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), accentMat); sboss.position.set(-0.13, -0.92, 0.10);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 24), accentMat); rim.position.set(-0.10, -0.92, 0.10); rim.rotation.y = Math.PI / 2;
  arm.add(upper, bicep, fore, hand, shieldDisc, sboss, rim);
  if (twoHand) { shieldDisc.visible = false; sboss.visible = false; rim.visible = false; arm.rotation.y = -0.55; }
  arm.userData.twoHand = twoHand;
  return arm;
}

function buildAccessory(v, helmetMat, skinMat, boneMat, raceKey, hair) {
  const g = new THREE.Group();
  if (v.capH > 0) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, v.capH, 16), helmetMat);
    cap.position.y = 2.20 + v.capH * 0.5 - 0.10; cap.castShadow = true;
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.04, 8, 18), helmetMat);
    brim.rotation.x = Math.PI / 2; brim.position.y = 2.18;
    const plumeMat = lambert(0xc44545, true);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.40, 6), plumeMat);
    plume.position.y = 2.20 + v.capH + 0.14; plume.rotation.x = -0.3; plume.castShadow = true;
    g.add(cap, brim, plume);
  }
  if (v.accessory === 'beard') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), lambert(hair));
    beard.position.set(0, 1.78, 0.20); beard.scale.set(1.1, 1.0, 0.8); beard.castShadow = true;
    const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.08), lambert(hair));
    moustache.position.set(0, 1.92, 0.27);
    g.add(beard, moustache);
  } else if (v.accessory === 'ears') {
    const earGeom = new THREE.ConeGeometry(0.06, 0.26, 8); const earMat = lambert(0xd2e6b4);
    const earL = new THREE.Mesh(earGeom, earMat); earL.position.set(-0.27, 2.10, 0); earL.rotation.z = Math.PI / 2;
    const earR = new THREE.Mesh(earGeom, earMat); earR.position.set( 0.27, 2.10, 0); earR.rotation.z = -Math.PI / 2;
    g.add(earL, earR);
  } else if (v.accessory === 'skull') {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.20), boneMat); jaw.position.set(0, 1.83, 0.06);
    g.add(jaw);
  }
  return g;
}

function buildCape(accentMat) {
  const g = new THREE.Group();
  const capeMat = new THREE.MeshLambertMaterial({ color: accentMat.color, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.18;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.95), capeMat);
    seg.position.set(Math.sin(a) * 0.30, 1.15, -0.42 - Math.cos(a) * 0.05);
    seg.rotation.y = a; seg.rotation.x = -0.06;
    g.add(seg);
  }
  return g;
}

export function makeBody(team, raceKey, armorTier = 0, weaponTier = 0, klass = 'infantry', magicType = null, weaponStyle = null) {
  const v = RACE_VISUALS[raceKey] || RACE_VISUALS.humans;
  const liveryMat = lambert(team.livery);
  const accentMat = lambert(team.accent);
  const skinMat = lambert(v.skin);
  const helmetMat = lambert(v.helmet, true);
  const boneMat = lambert(0xeee5d0);
  const dark = lambert(0x2a2a2a);
  const beltMat = lambert(0x4a3a2a);
  const eyeMat = basic(0x101015);
  const g = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.20, 12), raceKey === 'skeletons' ? boneMat : skinMat);
  neck.position.y = 1.80;
  g.add(buildLegs(accentMat, dark));
  g.add(buildTorso(team, liveryMat, accentMat, beltMat, skinMat));
  g.add(buildHead(v, raceKey, skinMat, boneMat, eyeMat));
  g.add(buildAccessory(v, helmetMat, skinMat, boneMat, raceKey, v.hair));
  g.add(buildCape(accentMat));
  const tierArmor = buildArmorTier(team, raceKey, armorTier);
  g.add(tierArmor);
  const shieldArm = buildShieldArm(team, raceKey, liveryMat, skinMat, accentMat, weaponStyle);
  g.add(shieldArm);
  g.add(neck);
  const weaponArm = buildWeaponArm(team, raceKey, helmetMat, weaponTier, klass, magicType, weaponStyle);
  g.add(weaponArm);
  g.userData.weaponArm = weaponArm;
  g.userData.shieldArm = shieldArm;
  g.userData.twoHand = shieldArm.userData.twoHand;
  g.rotation.order = 'YXZ';
  const ks = klass === 'beast' ? 1.45 : klass === 'archer' ? 0.94 : 1.0;
  g.scale.set(v.width * ks, v.scaleY * ks, v.width * ks);
  return g;
}
