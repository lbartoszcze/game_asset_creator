// Tests for the LLM→Blender sculpt loop. Scripted fake model + fake
// Blender MCP session — no network, no Blender.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sculptWithLlm, SculptError } from '../pipeline/llm_blender.js';
import { buildCompleter, parseJsonFrom, LlmError } from '../pipeline/llm.js';
import { makeGlb } from './verify.test.mjs';

function fakeBlenderSession(record) {
  return {
    async listTools() {
      return [{ name: 'execute_blender_code' }];
    },
    async execute(code) {
      record.push(code);
      return 'OK';
    },
    async exportGlb(path) {
      record.push(`EXPORT ${path}`);
      await writeFile(path, makeGlb({
        asset: { version: '2.0' },
        accessors: [{ count: 300 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
        materials: [{}],
      }));
    },
    async close() {},
    client: { callTool: async () => ({}) },
  };
}

const STEP = (code, done = false) =>
  JSON.stringify({ thought: 'step', code, done });

test('sculpt loop: rounds execute code, done triggers export + verify', async () => {
  const executed = [];
  const replies = [
    STEP('bpy.ops.mesh.primitive_cube_add()'),
    STEP('print("refine")'),
    STEP('', true),
  ];
  let calls = 0;
  const complete = async () => ({ text: replies[calls++] });
  const dir = await mkdtemp(join(tmpdir(), 'gac-sculpt-'));

  const result = await sculptWithLlm(
    { prompt: 'dwarven tower', outDir: dir, filename: 'tower.glb' },
    { models: {}, verify: { enabled: true } },
    {
      complete,
      sessionFactory: async () => fakeBlenderSession(executed),
    },
  );

  assert.equal(calls, 3);
  assert.deepEqual(executed[0], 'bpy.ops.mesh.primitive_cube_add()');
  assert.ok(executed.some((c) => c.startsWith('EXPORT')));
  assert.equal(result.outPath, join(dir, 'tower.glb'));
  assert.equal(result.verification.ok, true);
  assert.equal(result.rounds, 3);
  assert.equal(result.transcript.length, 3);
});

test('sculpt loop: execution errors are fed back to the model, not fatal', async () => {
  const replies = [STEP('raise Exception("boom")'), STEP('', true)];
  let calls = 0;
  const seen = [];
  const complete = async ({ messages }) => {
    seen.push(JSON.stringify(messages));
    return { text: replies[calls++] };
  };
  const failing = {
    ...(await (async () => {})()),
    async listTools() { return []; },
    async execute() { throw new Error('boom'); },
    async exportGlb(path) {
      await writeFile(path, makeGlb({
        asset: { version: '2.0' },
        accessors: [{ count: 300 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
        materials: [{}],
      }));
    },
    async close() {},
    client: { callTool: async () => ({}) },
  };
  const dir = await mkdtemp(join(tmpdir(), 'gac-sculpt-'));
  await sculptWithLlm(
    { prompt: 'x', outDir: dir },
    { models: {}, verify: { enabled: false } },
    { complete, sessionFactory: async () => failing },
  );
  assert.ok(seen[1].includes('ERROR: boom'));
});

test('sculpt loop: maxRounds without done fails', async () => {
  const complete = async () => ({ text: STEP('pass') });
  const executed = [];
  await assert.rejects(
    sculptWithLlm(
      { prompt: 'x', outDir: await mkdtemp(join(tmpdir(), 'gac-sculpt-')), maxRounds: 2 },
      { models: {} },
      { complete, sessionFactory: async () => fakeBlenderSession(executed) },
    ),
    (error) => error instanceof SculptError && error.round === 2,
  );
});

test('sculpt loop: unparseable model reply fails with round info', async () => {
  const complete = async () => ({ text: 'sorry, no JSON today' });
  await assert.rejects(
    sculptWithLlm(
      { prompt: 'x', outDir: await mkdtemp(join(tmpdir(), 'gac-sculpt-')) },
      { models: {} },
      { complete, sessionFactory: async () => fakeBlenderSession([]) },
    ),
    (error) => error instanceof SculptError && error.round === 1,
  );
});

test('parseJsonFrom handles fences and prose', () => {
  assert.deepEqual(parseJsonFrom('```json\n{"a": 1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonFrom('sure! {"b": 2} done'), { b: 2 });
  assert.throws(() => parseJsonFrom('no object'), LlmError);
});

test('buildCompleter: anthropic request shape (fake fetch)', async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"done": true, "code": ""}' }],
        stop_reason: 'end_turn',
      }),
    };
  };
  const complete = buildCompleter(
    { anthropic: { api_key: 'sk-test', model: 'claude-opus-4-6', consent: true } },
    { fetchImpl },
  );
  const reply = await complete({ system: 's', messages: [{ role: 'user', content: 'hi' }] });
  assert.match(reply.text, /done/);
  assert.equal(requests[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(requests[0].init.headers['x-api-key'], 'sk-test');
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.model, 'claude-opus-4-6');
  assert.equal(body.system, 's');
});

test('buildCompleter: brama router shape (fake fetch)', async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"done": true}' }, finish_reason: 'stop' }],
      }),
    };
  };
  const complete = buildCompleter(
    { brama: { url: 'https://router.example/', key: 'k', model: 'any' } },
    { fetchImpl },
  );
  await complete({
    system: 's',
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'look' }, { type: 'image', source: {} }] },
    ],
  });
  assert.equal(requests[0].url, 'https://router.example/v1/chat/completions');
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.messages[0].role, 'system');
  assert.match(body.messages[1].content, /screenshot attached/);
});

test('buildCompleter: no backend configured throws', () => {
  assert.throws(() => buildCompleter({}), LlmError);
});

test('buildCompleter: direct Anthropic without recorded consent is refused', () => {
  assert.throws(
    () => buildCompleter({ anthropic: { api_key: 'sk-test' } }),
    (error) => error instanceof LlmError && /consent/.test(error.message),
  );
  // ...and Brama wins when both are configured (sanctioned path first).
  const complete = buildCompleter(
    {
      anthropic: { api_key: 'sk-test' },
      brama: { url: 'https://r.example', key: 'k' },
    },
    {
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{}' } }] }),
      }),
    },
  );
  assert.equal(typeof complete, 'function');
});
