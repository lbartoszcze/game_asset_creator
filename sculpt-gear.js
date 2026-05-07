import * as THREE from 'three';

export function addBox(verts, colors, idx, color, cx, cy, cz, hx, hy, hz) {
  const v0 = verts.length / 3;
  const corners = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
  ];
  for (const [x, y, z] of corners) { verts.push(x, y, z); colors.push(color.r, color.g, color.b); }
  for (const [a, b, c, d] of [[0,1,2,3],[5,4,7,6],[1,5,6,2],[4,0,3,7],[3,2,6,7],[4,5,1,0]]) idx.push(v0+a, v0+b, v0+c, v0+a, v0+c, v0+d);
}

function stitchRings(idx, ringA, ringB, segments) {
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    idx.push(ringA + i, ringA + j, ringB + i, ringB + i, ringA + j, ringB + j);
  }
}

export function buildAxe(verts, colors, idx, haftCol, bladeCol) {
  const HX = 0.60, HY = 1.06, HZ = 0.70;
  const haftSeg = 12;
  const haftRings = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const cx = HX + (t - 0.5) * 0.08, cy = HY - 0.40 + t * 0.80, cz = HZ + (t - 0.5) * 0.30;
    const start = verts.length / 3;
    for (let j = 0; j < haftSeg; j++) {
      const a = (j / haftSeg) * Math.PI * 2;
      verts.push(cx + Math.cos(a) * 0.04, cy, cz + Math.sin(a) * 0.04);
      colors.push(haftCol.r, haftCol.g, haftCol.b);
    }
    haftRings.push(start);
  }
  for (let i = 0; i < haftRings.length - 1; i++) stitchRings(idx, haftRings[i], haftRings[i + 1], haftSeg);
  const HEAD_X = HX + 0.16, HEAD_Y = HY + 0.45, HEAD_Z = HZ + 0.28;
  const profile = [[-0.04,-0.10],[0.04,-0.18],[0.20,-0.20],[0.36,-0.14],[0.42,-0.04],[0.44,0.06],[0.40,0.16],[0.30,0.22],[0.16,0.22],[0.04,0.18],[-0.04,0.10]];
  const v0 = verts.length / 3;
  const T = 0.06;
  for (const [u, w] of profile) { verts.push(HEAD_X + u, HEAD_Y + w, HEAD_Z + T); colors.push(bladeCol.r, bladeCol.g, bladeCol.b); }
  for (const [u, w] of profile) { verts.push(HEAD_X + u, HEAD_Y + w, HEAD_Z - T); colors.push(bladeCol.r, bladeCol.g, bladeCol.b); }
  const N = profile.length;
  for (let i = 1; i < N - 1; i++) idx.push(v0, v0 + i, v0 + i + 1);
  for (let i = 1; i < N - 1; i++) idx.push(v0 + N, v0 + N + i + 1, v0 + N + i);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    idx.push(v0 + i, v0 + N + i, v0 + j, v0 + j, v0 + N + i, v0 + N + j);
  }
}

export function buildArmorDetails(verts, colors, idx, palette, opts) {
  const armorCol = new THREE.Color(opts.armor != null ? opts.armor : 0xc9a44a);
  const emblem = new THREE.Color(opts.emblem != null ? opts.emblem : 0xfff5b8);
  const buckle = new THREE.Color(0xc9a44a);
  const greave = new THREE.Color(0x9a9aa6);
  const trimGold = new THREE.Color(0xfff5b8);
  const rivet = new THREE.Color(0x404048);
  addBox(verts, colors, idx, emblem, 0.0, 1.42, 0.32, 0.04, 0.18, 0.02);
  addBox(verts, colors, idx, emblem, 0.0, 1.42, 0.32, 0.14, 0.04, 0.02);
  addBox(verts, colors, idx, buckle, 0.0, 1.06, 0.22, 0.10, 0.06, 0.02);
  addBox(verts, colors, idx, greave, -0.23, 0.20, 0.45, 0.10, 0.16, 0.03);
  addBox(verts, colors, idx, greave,  0.18, 0.20, -0.13, 0.10, 0.16, 0.03);
  addBox(verts, colors, idx, armorCol, -0.46, 1.72, 0.0, 0.10, 0.06, 0.16);
  addBox(verts, colors, idx, armorCol,  0.46, 1.72, 0.10, 0.10, 0.06, 0.16);
  addBox(verts, colors, idx, trimGold, 0.0, 1.66, 0.30, 0.40, 0.02, 0.02);
  for (const [hx, hy, hz] of [[-0.46, 0.86, 0.26], [0.58, 1.12, 0.62]]) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addBox(verts, colors, idx, rivet, hx + Math.cos(a) * 0.09, hy + Math.sin(a) * 0.04, hz + Math.sin(a) * 0.04, 0.018, 0.018, 0.018);
    }
  }
  addBox(verts, colors, idx, armorCol, -0.18, 0.36, 0.30, 0.14, 0.06, 0.02);
  addBox(verts, colors, idx, armorCol,  0.18, 0.36, -0.04, 0.14, 0.06, 0.02);
}

export function buildCape(verts, colors, idx, opts) {
  const c = new THREE.Color(opts.cape != null ? opts.cape : 0x8a1a1a);
  const c0 = verts.length / 3;
  const v = [[-0.30,1.78,-0.18],[0.30,1.78,-0.18],[-0.36,1.40,-0.34],[0.36,1.40,-0.34],[-0.32,0.80,-0.42],[0.32,0.80,-0.42]];
  for (const [x, y, z] of v) { verts.push(x, y, z); colors.push(c.r, c.g, c.b); }
  idx.push(c0+0, c0+2, c0+1, c0+1, c0+2, c0+3, c0+2, c0+4, c0+3, c0+3, c0+4, c0+5);
  for (const [x, y, z] of v) { verts.push(x, y, z + 0.02); colors.push(c.r * 0.7, c.g * 0.7, c.b * 0.7); }
  idx.push(c0+6, c0+7, c0+8, c0+7, c0+9, c0+8, c0+8, c0+9, c0+10, c0+9, c0+11, c0+10);
}
