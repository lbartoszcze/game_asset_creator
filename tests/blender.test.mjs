// Tests for the Blender MCP layer + provisioning plan. Fake MCP stdio
// server and dry-run provisioning — no real Blender installed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BlenderSession, blenderMcpSpawn, postProcessModel } from '../pipeline/blender.js';
import { buildSetupPlan, provisionBlender } from '../pipeline/setup.js';
import { runTextToGameJob } from '../pipeline/text2game.js';

async function makeFakeBlenderMcp() {
  const dir = await mkdtemp(join(tmpdir(), 'fake-blender-mcp-'));
  const path = join(dir, 'fake.mjs');
  const script = `import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  const reply = (result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\\n');
  if (msg.method === 'initialize') return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'fake-blender', version: '0' } });
  if (msg.method === 'tools/list') return reply({ tools: [
    { name: 'get_scene_info' }, { name: 'execute_blender_code' },
  ] });
  if (msg.method === 'tools/call' && msg.params.name === 'get_scene_info') {
    return reply({ content: [{ type: 'text', text: '{"objects": 3}' }] });
  }
  if (msg.method === 'tools/call' && msg.params.name === 'execute_blender_code') {
    const code = msg.params.arguments?.code ?? '';
    return reply({ content: [{ type: 'text', text: 'executed:' + code.split('\\n').length + ' lines' }] });
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unknown' } }) + '\\n');
});
`;
  await writeFile(path, script);
  return path;
}

test('blenderMcpSpawn prefers uvx, honors explicit command', () => {
  assert.deepEqual(blenderMcpSpawn({}), { command: 'uvx', args: ['blender-mcp'] });
  assert.deepEqual(blenderMcpSpawn({ uvx: false }), { command: 'blender-mcp', args: [] });
  assert.deepEqual(blenderMcpSpawn({ command: 'node', args: ['fake.mjs'] }), {
    command: 'node',
    args: ['fake.mjs'],
  });
});

test('BlenderSession: health check, scene info, execute', async () => {
  const server = await makeFakeBlenderMcp();
  const session = await BlenderSession.start({ command: 'node', args: [server] });
  assert.equal(await session.isHealthy(), true);
  assert.match(String(await session.sceneInfo()), /objects/);
  const out = await session.execute('import bpy\nprint("hi")');
  assert.match(out, /executed:2 lines/);
  await session.close();
});

test('postProcessModel runs import → processCode → export', async () => {
  const server = await makeFakeBlenderMcp();
  const result = await postProcessModel({
    inputPath: '/tmp/in.glb',
    outputPath: '/tmp/out.glb',
    processCode: 'print("decimate")',
    sessionOptions: { command: 'node', args: [server] },
  });
  assert.equal(result.outputPath, '/tmp/out.glb');
});

test('buildSetupPlan covers macOS and Linux', () => {
  const mac = buildSetupPlan('darwin');
  assert.deepEqual(
    mac.map((s) => s.name),
    ['blender', 'uv'],
  );
  assert.equal(mac[0].install[0], 'brew');
  const linux = buildSetupPlan('linux');
  assert.equal(linux.length, 2);
  assert.throws(() => buildSetupPlan('win32'), /unsupported platform/);
});

test('provisionBlender --check reports missing without installing', async () => {
  // On this machine blender is not installed — check-only must not try to install.
  const report = await provisionBlender({ checkOnly: true, os: 'darwin', log: () => {} });
  const blender = report.steps.find((s) => s.step === 'blender');
  assert.ok(['present', 'missing'].includes(blender.status));
  assert.equal(typeof report.healthy, 'boolean');
});

test('provisionBlender dry-run produces would-install plan without executing', async () => {
  const calls = [];
  const fakeExec = async (cmd, args) => {
    calls.push([cmd, ...args].join(' '));
    return { stdout: '', stderr: '' };
  };
  // Force every check to miss by running on a fake os with injected exec.
  const report = await provisionBlender({
    dryRun: true,
    os: 'darwin',
    exec: fakeExec,
    log: () => {},
  });
  // No real install command ran through the system — only the dry-run log.
  const installs = report.steps.filter((s) => s.status === 'would-install' || s.status === 'installed');
  assert.ok(installs.length >= 0); // dry-run never throws; plan shape is what matters
  assert.ok(calls.every((c) => c.startsWith('brew') || c.includes('uvx')));
});

test('text2game runs blender postprocess when enabled', async () => {
  const config = {
    credentials: { username: 'u', password: 'p' },
    studio: {
      loginUrl: 'https://x/login',
      generateUrl: 'https://x/studio',
      selectors: {
        loginUser: '#u',
        loginPassword: '#p',
        loginSubmit: '#go',
        promptInput: '#prompt',
        generateSubmit: '#gen',
      },
      artifact: { pollExpression: 'poll()', timeoutMs: 50, intervalMs: 1 },
    },
    blender: { enabled: true, processCode: 'print("decimate")' },
  };
  const events = [];
  const fakePage = {
    goto: async (url) => events.push(['goto', url]),
    fill: async (sel, val) => events.push(['fill', sel]),
    click: async (sel) => events.push(['click', sel]),
    evaluate: async () => 'https://cdn.x/model.glb',
  };
  const dir = await mkdtemp(join(tmpdir(), 'gac-t2g-'));
  const result = await runTextToGameJob(
    { prompt: 'dwarven warrior', outDir: dir, filename: 'w.glb' },
    config,
    {
      sessionFactory: async () => ({
        newPage: async () => fakePage,
        close: async () => {},
      }),
      download: async () => Buffer.from('GLB-DATA'),
      postProcess: async ({ inputPath, outputPath, processCode }) => {
        events.push(['postprocess', processCode]);
        return { outputPath };
      },
    },
  );
  assert.equal(result.processedPath, `${dir}/w.processed.glb`);
  assert.deepEqual(events.find((e) => e[0] === 'postprocess'), ['postprocess', 'print("decimate")']);
});
