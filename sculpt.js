import * as THREE from 'three';

// Each ring is { y, rx, rz, dx } — height, half-width X, half-depth Z, lateral offset.
// SEG = vertices per ring. Higher = smoother circumference.
const SEG = 40;

const TORSO_RINGS = [
  { y: 0.95, rx: 0.16, rz: 0.13 },
  { y: 1.00, rx: 0.22, rz: 0.16 },
  { y: 1.10, rx: 0.30, rz: 0.20 },
  { y: 1.22, rx: 0.36, rz: 0.22 },
  { y: 1.36, rx: 0.42, rz: 0.24 },
  { y: 1.50, rx: 0.46, rz: 0.26 },
  { y: 1.62, rx: 0.46, rz: 0.26 },
  { y: 1.72, rx: 0.40, rz: 0.22 },
  { y: 1.82, rx: 0.16, rz: 0.14 },
];

const HEAD_RINGS = [
  { y: 1.86, r: 0.16 },
  { y: 1.92, r: 0.20 },
  { y: 2.00, r: 0.22 },
  { y: 2.10, r: 0.22 },
  { y: 2.18, r: 0.18 },
  { y: 2.24, r: 0.10 },
];

const ARM_PATH = [
  { t: 0.0,  r: 0.12, p: [-0.46, 1.66, 0.0] },
  { t: 0.15, r: 0.14, p: [-0.50, 1.50, 0.05] },
  { t: 0.30, r: 0.13, p: [-0.50, 1.30, 0.10] },
  { t: 0.50, r: 0.10, p: [-0.50, 1.10, 0.18] },
  { t: 0.70, r: 0.09, p: [-0.50, 0.92, 0.26] },
  { t: 0.85, r: 0.08, p: [-0.48, 0.78, 0.32] },
  { t: 1.00, r: 0.07, p: [-0.46, 0.72, 0.34] },
];

const LEG_PATH = [
  { t: 0.0,  r: 0.20, p: [-0.18, 0.98, 0.0] },
  { t: 0.10, r: 0.21, p: [-0.18, 0.86, 0.0] },
  { t: 0.30, r: 0.18, p: [-0.18, 0.62, 0.0] },
  { t: 0.45, r: 0.15, p: [-0.18, 0.46, 0.02] },
  { t: 0.55, r: 0.16, p: [-0.18, 0.36, 0.0] },
  { t: 0.75, r: 0.14, p: [-0.18, 0.20, -0.02] },
  { t: 0.92, r: 0.13, p: [-0.18, 0.06, -0.04] },
  { t: 1.00, r: 0.16, p: [-0.18, 0.02, 0.05] },
];

function pushRing(verts, cx, cy, cz, rx, rz, segments = SEG) {
  const startIdx = verts.length / 3;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    verts.push(cx + Math.cos(a) * rx, cy, cz + Math.sin(a) * rz);
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

function capRing(idx, ringStart, centerIdx, segments = SEG, flip = false) {
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    if (flip) idx.push(ringStart + i, centerIdx, ringStart + j);
    else idx.push(ringStart + j, centerIdx, ringStart + i);
  }
}

function buildTorso(verts, idx) {
  const ringStarts = [];
  for (const r of TORSO_RINGS) ringStarts.push(pushRing(verts, 0, r.y, 0, r.rx, r.rz));
  for (let i = 0; i < ringStarts.length - 1; i++) stitchRings(idx, ringStarts[i], ringStarts[i + 1]);
  return ringStarts;
}

function buildHead(verts, idx) {
  const ringStarts = [];
  for (const r of HEAD_RINGS) ringStarts.push(pushRing(verts, 0, r.y, 0.02, r.r, r.r * 0.92));
  for (let i = 0; i < ringStarts.length - 1; i++) stitchRings(idx, ringStarts[i], ringStarts[i + 1]);
  const topVert = verts.length / 3;
  verts.push(0, 2.30, 0.02);
  capRing(idx, ringStarts[ringStarts.length - 1], topVert);
  return ringStarts;
}

function pathRing(verts, node, segments = SEG, mirrorX = false) {
  const [x, y, z] = node.p;
  const px = mirrorX ? -x : x;
  return pushRing(verts, px, y, z, node.r, node.r, segments);
}

function buildLimb(verts, idx, path, mirrorX) {
  const starts = path.map((n) => pathRing(verts, n, SEG, mirrorX));
  for (let i = 0; i < starts.length - 1; i++) stitchRings(idx, starts[i], starts[i + 1]);
  const tipVert = verts.length / 3;
  const tip = path[path.length - 1];
  const px = mirrorX ? -tip.p[0] : tip.p[0];
  verts.push(px, tip.p[1] - 0.02, tip.p[2]);
  capRing(idx, starts[starts.length - 1], tipVert);
  return starts;
}

export function sculptHumanoid(opts = {}) {
  const skinHex = opts.skin != null ? opts.skin : 0xc89a6a;
  const verts = [];
  const idx = [];
  buildTorso(verts, idx);
  buildHead(verts, idx);
  buildLimb(verts, idx, ARM_PATH, false);
  buildLimb(verts, idx, ARM_PATH, true);
  buildLimb(verts, idx, LEG_PATH, false);
  buildLimb(verts, idx, LEG_PATH, true);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: skinHex });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
