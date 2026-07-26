// Tests for the skarbiec + weles + config layers. Uses node:test with a
// fake `skarbiec` binary and a fake MCP stdio server — no real vault,
// no real browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  isSkarbiecRef,
  parseSkarbiecRef,
  resolveSkarbiecRef,
  resolveConfigSecrets,
  nonSecretEnv,
  SkarbiecError,
} from '../pipeline/skarbiec.js';
import { loadPipelineConfig } from '../pipeline/config.js';
import { McpStdioClient } from '../pipeline/weles.js';

async function makeFakeSkarbiec(itemPayloads) {
  const dir = await mkdtemp(join(tmpdir(), 'fake-skarbiec-'));
  const path = join(dir, 'skarbiec');
  const script = `#!/bin/sh
if [ "$1" = "get" ]; then
  case "$2" in
${Object.entries(itemPayloads)
  .map(([item, payload]) => `    ${item}) echo '${JSON.stringify(payload)}' ;;`)
  .join('\n')}
    *) echo "item not found: $2" >&2; exit 1 ;;
  esac
  exit 0
fi
echo "unknown command: $1" >&2
exit 1
`;
  await writeFile(path, script);
  await chmod(path, 0o755);
  return path;
}

test('isSkarbiecRef / parseSkarbiecRef', () => {
  assert.ok(isSkarbiecRef('skarbiec://ITEM/field'));
  assert.ok(!isSkarbiecRef('plain-string'));
  assert.deepEqual(parseSkarbiecRef('skarbiec://TEXT2GAME_ACCOUNT/login_email'), {
    item: 'TEXT2GAME_ACCOUNT',
    field: 'login_email',
  });
  assert.throws(() => parseSkarbiecRef('skarbiec://missing-field'));
});

test('resolveSkarbiecRef resolves via the CLI', async () => {
  const binary = await makeFakeSkarbiec({
    TEXT2GAME_ACCOUNT: { fields: { login_email: 'a@b.c', login_password: 's3cr3t' } },
  });
  const value = await resolveSkarbiecRef('skarbiec://TEXT2GAME_ACCOUNT/login_password', { binary });
  assert.equal(value, 's3cr3t');
});

test('resolveSkarbiecRef rejects unknown items and missing fields', async () => {
  const binary = await makeFakeSkarbiec({ A: { fields: { x: '1' } } });
  await assert.rejects(resolveSkarbiecRef('skarbiec://NOPE/x', { binary }), SkarbiecError);
  await assert.rejects(resolveSkarbiecRef('skarbiec://A/missing', { binary }), /no non-empty field/);
});

test('resolveConfigSecrets deep-resolves only references', async () => {
  const binary = await makeFakeSkarbiec({
    ACC: { fields: { u: 'user1', p: 'pass1' } },
  });
  const config = {
    studio: { url: 'https://example.com', timeout: 5 },
    credentials: {
      username: 'skarbiec://ACC/u',
      password: 'skarbiec://ACC/p',
    },
    list: ['skarbiec://ACC/u', 42, null],
  };
  const resolved = await resolveConfigSecrets(config, { binary });
  assert.equal(resolved.credentials.username, 'user1');
  assert.equal(resolved.credentials.password, 'pass1');
  assert.equal(resolved.studio.url, 'https://example.com');
  assert.deepEqual(resolved.list, ['user1', 42, null]);
});

test('loadPipelineConfig rejects inline secrets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gac-config-'));
  const path = join(dir, 'bad.json');
  await writeFile(
    path,
    JSON.stringify({ credentials: { api_token: 'inline-not-allowed' } }),
  );
  await assert.rejects(loadPipelineConfig(path), /skarbiec:\/\/<item>\/<field>/);
});

test('loadPipelineConfig resolves a full config end-to-end', async () => {
  const binary = await makeFakeSkarbiec({
    ACC: { fields: { login_email: 'u@x.y', login_password: 'pw' } },
  });
  const dir = await mkdtemp(join(tmpdir(), 'gac-config-'));
  const path = join(dir, 'ok.json');
  await writeFile(
    path,
    JSON.stringify({
      browser: { headless: true },
      credentials: {
        username: 'skarbiec://ACC/login_email',
        password: 'skarbiec://ACC/login_password',
      },
      studio: { loginUrl: 'https://studio.example/login' },
    }),
  );
  const resolved = await loadPipelineConfig(path, { skarbiecOptions: { binary } });
  assert.equal(resolved.credentials.username, 'u@x.y');
  assert.equal(resolved.credentials.password, 'pw');
  assert.equal(resolved.browser.headless, true);
});

test('nonSecretEnv refuses non-allowlisted vars', () => {
  assert.equal(nonSecretEnv('SKARBIEC_BIN'), process.env.SKARBIEC_BIN);
  assert.throws(() => nonSecretEnv('TEXT2GAME_PASSWORD'), /not allowlisted/);
});

// ---- Weles MCP client over a fake stdio server ----

async function makeFakeMcpServer() {
  const dir = await mkdtemp(join(tmpdir(), 'fake-mcp-'));
  const path = join(dir, 'fake-mcp.mjs');
  const script = `import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '0' } } }) + '\\n');
    return;
  }
  if (msg.method === 'tools/list') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'weles_browser_start', description: 'start' }] } }) + '\\n');
    return;
  }
  if (msg.method === 'tools/call' && msg.params.name === 'weles_browser_start') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { browserId: 7 } }) + '\\n');
    return;
  }
  if (msg.method === 'tools/call' && msg.params.name === 'weles_page_new') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { pageId: 42 } }) + '\\n');
    return;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unknown' } }) + '\\n');
});
`;
  await writeFile(path, script);
  return path;
}

test('McpStdioClient talks JSON-RPC and unwraps tool results', async () => {
  const serverPath = await makeFakeMcpServer();
  const client = new McpStdioClient({ command: 'node', args: [serverPath] });
  await client.start();

  const tools = await client.listTools();
  assert.equal(tools[0].name, 'weles_browser_start');

  const started = await client.callTool('weles_browser_start', { headless: true });
  assert.equal(started.browserId, 7);

  const page = await client.callTool('weles_page_new', { browserId: 7 });
  assert.equal(page.pageId, 42);

  await client.close();
});
