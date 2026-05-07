import * as THREE from 'three';
import { addBox, buildAxe, buildArmorDetails, buildCape } from './sculpt-gear.js';

const SEG = 40;

const TORSO_RINGS = [
  { y: 0.95, rx: 0.34, rz: 0.22, c: 'pants' },
  { y: 1.00, rx: 0.36, rz: 0.24, c: 'belt' },
  { y: 1.06, rx: 0.30, rz: 0.20, c: 'belt' },
  { y: 1.14, rx: 0.34, rz: 0.22, c: 'armor' },
  { y: 1.28, rx: 0.42, rz: 0.26, c: 'armor' },
  { y: 1.42, rx: 0.48, rz: 0.30, c: 'armor' },
  { y: 1.54, rx: 0.50, rz: 0.30, c: 'armor' },
  { y: 1.62, rx: 0.50, rz: 0.30, c: 'armor' },
  { y: 1.70, rx: 0.42, rz: 0.26, c: 'collar' },
  { y: 1.76, rx: 0.20, rz: 0.16, c: 'skin' },
];

const HEAD_RINGS = [
  { y: 1.80, r: 0.16, c: 'skin' },
  { y: 1.86, r: 0.20, c: 'skin' },
  { y: 1.94, r: 0.22, c: 'skin' },
  { y: 2.02, r: 0.24, c: 'helmet' },
  { y: 2.10, r: 0.25, c: 'helmet' },
  { y: 2.18, r: 0.24, c: 'helmet' },
  { y: 2.26, r: 0.20, c: 'helmet' },
  { y: 2.32, r: 0.14, c: 'helmet' },
];

const ARM_PATH_LEFT = [
  { r: 0.18, c: 'armor',    p: [-0.48, 1.66, 0.00] },
  { r: 0.16, c: 'armor',    p: [-0.52, 1.50, 0.04] },
  { r: 0.14, c: 'skin',     p: [-0.52, 1.32, 0.08] },
  { r: 0.12, c: 'skin',     p: [-0.50, 1.16, 0.14] },
  { r: 0.11, c: 'skin',     p: [-0.48, 1.00, 0.20] },
  { r: 0.13, c: 'gauntlet', p: [-0.46, 0.86, 0.26] },
  { r: 0.10, c: 'skin',     p: [-0.44, 0.78, 0.30] },
];

const ARM_PATH_RIGHT = [
  { r: 0.18, c: 'armor',    p: [ 0.48, 1.66, 0.00] },
  { r: 0.16, c: 'armor',    p: [ 0.50, 1.55, 0.10] },
  { r: 0.14, c: 'skin',     p: [ 0.52, 1.42, 0.22] },
  { r: 0.12, c: 'skin',     p: [ 0.54, 1.30, 0.36] },
  { r: 0.11, c: 'skin',     p: [ 0.56, 1.20, 0.50] },
  { r: 0.13, c: 'gauntlet', p: [ 0.58, 1.12, 0.62] },
  { r: 0.10, c: 'skin',     p: [ 0.60, 1.06, 0.70] },
];

const LEG_PATH_LEFT = [
  { r: 0.22, c: 'pants', p: [-0.20, 0.92, 0.00] },
  { r: 0.22, c: 'pants', p: [-0.21, 0.78, 0.10] },
  { r: 0.18, c: 'pants', p: [-0.22, 0.60, 0.20] },
  { r: 0.16, c: 'pants', p: [-0.23, 0.44, 0.30] },
  { r: 0.17, c: 'pants', p: [-0.23, 0.30, 0.36] },
  { r: 0.15, c: 'boot',  p: [-0.23, 0.18, 0.40] },
  { r: 0.18, c: 'boot',  p: [-0.23, 0.08, 0.42] },
  { r: 0.22, c: 'boot',  p: [-0.23, 0.02, 0.48] },
];

const LEG_PATH_RIGHT = [
  { r: 0.22, c: 'pants', p: [ 0.18, 0.92,  0.00] },
  { r: 0.22, c: 'pants', p: [ 0.18, 0.78, -0.04] },
  { r: 0.18, c: 'pants', p: [ 0.18, 0.60, -0.08] },
  { r: 0.16, c: 'pants', p: [ 0.18, 0.44, -0.12] },
  { r: 0.17, c: 'pants', p: [ 0.18, 0.30, -0.14] },
  { r: 0.15, c: 'boot',  p: [ 0.18, 0.18, -0.16] },
  { r: 0.18, c: 'boot',  p: [ 0.18, 0.08, -0.16] },
  { r: 0.22, c: 'boot',  p: [ 0.18, 0.02, -0.10] },
];

function colorOf(palette, name) {
  return palette[name] || palette.skin;
}

function pushRing(verts, colors, palette, cName, cx, cy, cz, rx, rz, segments = SEG) {
  const startIdx = verts.length / 3;
  const col = colorOf(palette, cName);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    verts.push(cx + Math.cos(a) * rx, cy, cz + Math.sin(a) * rz);
    colors.push(col.r, col.g, col.b);
  }
  return startIdx;
}

function stitchRings(idx, ringA, ringB, segments = SEG) {
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    idx.push(ringA + i, ringA + j, ringB + i);
    idx.push(ringB + i, ringA + j, ringB + j);
  }
}

function capRing(idx, ringStart, centerIdx, segments = SEG) {
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    idx.push(ringStart + j, centerIdx, ringStart + i);
  }
}

function buildTorso(verts, colors, idx, palette) {
  const starts = TORSO_RINGS.map((r) => pushRing(verts, colors, palette, r.c, 0, r.y, 0, r.rx, r.rz));
  for (let i = 0; i < starts.length - 1; i++) stitchRings(idx, starts[i], starts[i + 1]);
  return starts;
}

function buildHead(verts, colors, idx, palette) {
  const starts = HEAD_RINGS.map((r) => pushRing(verts, colors, palette, r.c, 0, r.y, 0.02, r.r, r.r * 0.92));
  for (let i = 0; i < starts.length - 1; i++) stitchRings(idx, starts[i], starts[i + 1]);
  const topIdx = verts.length / 3;
  verts.push(0, 2.36, 0.02);
  const helmCol = colorOf(palette, 'helmet');
  colors.push(helmCol.r, helmCol.g, helmCol.b);
  capRing(idx, starts[starts.length - 1], topIdx);
  return starts;
}

function pathRing(verts, colors, palette, node, mirrorX = false) {
  const [x, y, z] = node.p;
  const px = mirrorX ? -x : x;
  return pushRing(verts, colors, palette, node.c, px, y, z, node.r, node.r);
}

function buildLimb(verts, colors, idx, palette, path, mirrorX, capColorName) {
  const starts = path.map((n) => pathRing(verts, colors, palette, n, mirrorX));
  for (let i = 0; i < starts.length - 1; i++) stitchRings(idx, starts[i], starts[i + 1]);
  const tipIdx = verts.length / 3;
  const tip = path[path.length - 1];
  const px = mirrorX ? -tip.p[0] : tip.p[0];
  verts.push(px, tip.p[1] - 0.04, tip.p[2] + 0.04);
  const cc = colorOf(palette, capColorName || tip.c);
  colors.push(cc.r, cc.g, cc.b);
  capRing(idx, starts[starts.length - 1], tipIdx);
  return starts;
}

function addFaceFeatures(verts, colors, idx, palette, opts = {}) {
  const eye = new THREE.Color(0x101015);
  const lip = new THREE.Color(0x6a2010);
  const nose = colorOf(palette, 'skin');
  addBox(verts, colors, idx, eye, -0.07, 1.96, 0.215, 0.022, 0.020, 0.012);
  addBox(verts, colors, idx, eye,  0.07, 1.96, 0.215, 0.022, 0.020, 0.012);
  addBox(verts, colors, idx, nose, 0.0, 1.92, 0.225, 0.030, 0.050, 0.025);
  addBox(verts, colors, idx, lip, 0.0, 1.84, 0.215, 0.050, 0.014, 0.010);
  if (opts.beard) {
    const beard = new THREE.Color(opts.beardColor != null ? opts.beardColor : 0x6e3f1f);
    addBox(verts, colors, idx, beard, 0.00, 1.82, 0.20, 0.18, 0.10, 0.08);
    addBox(verts, colors, idx, beard, 0.00, 1.72, 0.18, 0.16, 0.08, 0.06);
  }
  if (opts.ears) {
    const earCol = colorOf(palette, 'skin');
    addBox(verts, colors, idx, earCol, -0.22, 2.00, 0.0, 0.04, 0.10, 0.04);
    addBox(verts, colors, idx, earCol,  0.22, 2.00, 0.0, 0.04, 0.10, 0.04);
  }
}

function addBrow(verts, colors, idx, palette) {
  const skinCol = colorOf(palette, 'skin');
  const baseY = 2.04, baseZ = 0.22;
  const start = verts.length / 3;
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 15) * Math.PI - Math.PI / 2;
    pts.push([Math.sin(a) * 0.12, baseY + Math.cos(a) * 0.02, baseZ]);
  }
  for (const [x, y, z] of pts) { verts.push(x, y, z); colors.push(skinCol.r, skinCol.g, skinCol.b); }
  for (const [x, y, z] of pts) { verts.push(x, y - 0.04, z + 0.005); colors.push(skinCol.r * 0.6, skinCol.g * 0.6, skinCol.b * 0.6); }
  for (let i = 0; i < pts.length - 1; i++) {
    idx.push(start + i, start + i + 1, start + pts.length + i);
    idx.push(start + pts.length + i, start + i + 1, start + pts.length + i + 1);
  }
}

function paletteFor(opts) {
  const skin = new THREE.Color(opts.skin != null ? opts.skin : 0xd9b48a);
  const armor = new THREE.Color(opts.armor != null ? opts.armor : 0xc9a44a);
  const helmet = new THREE.Color(opts.helmet != null ? opts.helmet : 0x9a9aa6);
  const pants = new THREE.Color(opts.pants != null ? opts.pants : 0x4a3a2a);
  const boot = new THREE.Color(opts.boot != null ? opts.boot : 0x2a1f15);
  const belt = new THREE.Color(opts.belt != null ? opts.belt : 0x33231a);
  const collar = new THREE.Color(opts.collar != null ? opts.collar : 0xb8843e);
  const gauntlet = new THREE.Color(opts.gauntlet != null ? opts.gauntlet : 0x8a8a98);
  return { skin, armor, helmet, pants, boot, belt, collar, gauntlet };
}

export function sculptHumanoid(opts = {}) {
  const palette = paletteFor(opts);
  const verts = []; const colors = []; const idx = [];
  buildTorso(verts, colors, idx, palette);
  buildHead(verts, colors, idx, palette);
  buildLimb(verts, colors, idx, palette, ARM_PATH_LEFT, false, 'gauntlet');
  buildLimb(verts, colors, idx, palette, ARM_PATH_RIGHT, false, 'gauntlet');
  buildLimb(verts, colors, idx, palette, LEG_PATH_LEFT, false, 'boot');
  buildLimb(verts, colors, idx, palette, LEG_PATH_RIGHT, false, 'boot');
  addBrow(verts, colors, idx, palette);
  addFaceFeatures(verts, colors, idx, palette, { beard: opts.beard, beardColor: opts.beardColor, ears: opts.ears });
  buildAxe(verts, colors, idx, colorOf(palette, 'belt'), colorOf(palette, 'gauntlet'));
  buildArmorDetails(verts, colors, idx, palette, opts);
  buildCape(verts, colors, idx, opts);
  // Helmet visor band — dark slot across the eye line
  addBox(verts, colors, idx, new THREE.Color(0x1a1a1f), 0.0, 2.06, 0.235, 0.18, 0.018, 0.018);
  // Helmet crest — raised spine running front-to-back along the top
  addBox(verts, colors, idx, new THREE.Color(0x6a2010), 0.0, 2.34, 0.0, 0.025, 0.05, 0.20);
  // Cheek guards — vertical plates on each side of the face
  const helmCol = colorOf(palette, 'helmet');
  addBox(verts, colors, idx, helmCol, -0.21, 1.96, 0.10, 0.025, 0.10, 0.10);
  addBox(verts, colors, idx, helmCol,  0.21, 1.96, 0.10, 0.025, 0.10, 0.10);
  // Chin strap
  addBox(verts, colors, idx, new THREE.Color(0x3a2a1a), 0.0, 1.80, 0.18, 0.18, 0.02, 0.02);
  // Boot toes — wedge in front of each foot
  const bootCol = colorOf(palette, 'boot');
  addBox(verts, colors, idx, bootCol, -0.23, 0.04, 0.56, 0.10, 0.06, 0.10);
  addBox(verts, colors, idx, bootCol,  0.18, 0.04, -0.20, 0.10, 0.06, 0.10);
  // Wide belt strip wrapping the waist (front)
  const beltCol = colorOf(palette, 'belt');
  addBox(verts, colors, idx, beltCol, 0.0, 1.04, 0.20, 0.32, 0.04, 0.04);
  addBox(verts, colors, idx, beltCol, -0.30, 1.04, 0.10, 0.04, 0.04, 0.16);
  addBox(verts, colors, idx, beltCol,  0.30, 1.04, 0.10, 0.04, 0.04, 0.16);
  // Knee plates — rounded armor pads on each knee
  const kneeCol = colorOf(palette, 'helmet');
  addBox(verts, colors, idx, kneeCol, -0.22, 0.44, 0.32, 0.10, 0.06, 0.04);
  addBox(verts, colors, idx, kneeCol,  0.18, 0.44, -0.12, 0.10, 0.06, 0.04);
  // Forearm bracer rings on left (shield) arm
  const bracerCol = colorOf(palette, 'gauntlet');
  addBox(verts, colors, idx, bracerCol, -0.49, 1.10, 0.16, 0.06, 0.04, 0.06);
  // Tabard — decorative cloth panel hanging from belt down to mid-thigh
  const tabard = new THREE.Color(opts.tabard != null ? opts.tabard : (opts.cape != null ? opts.cape : 0x8a1a1a));
  addBox(verts, colors, idx, tabard, 0.0, 0.84, 0.24, 0.16, 0.20, 0.02);
  // Tabard trim — gold edge
  addBox(verts, colors, idx, new THREE.Color(0xfff5b8), 0.0, 0.66, 0.245, 0.18, 0.014, 0.018);
  // Sword scabbard hanging at left hip
  const scabbardCol = new THREE.Color(0x3a2a1a);
  addBox(verts, colors, idx, scabbardCol, -0.34, 0.70, -0.10, 0.04, 0.34, 0.05);
  // Scabbard mouth (gold cap)
  addBox(verts, colors, idx, new THREE.Color(0xc9a44a), -0.34, 0.94, -0.10, 0.06, 0.04, 0.06);
  // Sword hilt poking out of the scabbard
  addBox(verts, colors, idx, new THREE.Color(0x3a2a1a), -0.34, 1.04, -0.10, 0.025, 0.10, 0.025);
  addBox(verts, colors, idx, new THREE.Color(0xc9a44a), -0.34, 1.16, -0.10, 0.10, 0.025, 0.04);
  addBox(verts, colors, idx, new THREE.Color(0xfff5b8), -0.34, 1.21, -0.10, 0.030, 0.030, 0.030);
  // Hair fringe — short bangs under the helmet brim (skip for skeletons or beard races since beard already hints hair)
  if (!opts.bald) {
    const hairCol = new THREE.Color(opts.hair != null ? opts.hair : 0x4a2a14);
    addBox(verts, colors, idx, hairCol, -0.10, 1.93, 0.215, 0.06, 0.04, 0.02);
    addBox(verts, colors, idx, hairCol,  0.10, 1.93, 0.215, 0.06, 0.04, 0.02);
    addBox(verts, colors, idx, hairCol,  0.0,  1.93, 0.225, 0.05, 0.04, 0.02);
  }
  // Pauldron rim — gold edge around each pauldron
  const rimGold = new THREE.Color(0xfff5b8);
  addBox(verts, colors, idx, rimGold, -0.46, 1.66, 0.02, 0.10, 0.012, 0.16);
  addBox(verts, colors, idx, rimGold,  0.46, 1.66, 0.12, 0.10, 0.012, 0.16);
  // Boot top cuffs
  const cuffCol = new THREE.Color(0xc9a44a);
  addBox(verts, colors, idx, cuffCol, -0.22, 0.16, 0.40, 0.10, 0.025, 0.08);
  addBox(verts, colors, idx, cuffCol,  0.18, 0.16, -0.16, 0.10, 0.025, 0.08);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
