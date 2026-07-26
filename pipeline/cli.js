#!/usr/bin/env node
// cli.js — `node pipeline/cli.js` entry point for the asset-creation pipeline.
//
// Commands:
//   create <prompt> [--race <race>] [--out <dir>] [--config <path>]
//   check-config [--config <path>]     validate + resolve the config (no browser)
//   weles-tools                        list the tools the Weles MCP server exposes
//
// Credentials: resolved ONLY from Skarbiec (skarbiec:// refs in the config).
// Browser:     driven ONLY through the Weles MCP server.

import { loadPipelineConfig } from './config.js';
import { runTextToGameJob } from './text2game.js';
import { McpStdioClient } from './weles.js';
import { BlenderSession } from './blender.js';
import { provisionBlender } from './setup.js';
import { verifyAsset } from './verify.js';

const DEFAULT_CONFIG = new URL('../pipeline.config.json', import.meta.url).pathname;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, options };
}

const USAGE = `usage: node pipeline/cli.js <command> [args]

commands:
  create <prompt> [--race r] [--out dir] [--config path]
  verify <file.glb> [--config path]   structural + optional render gate
  check-config [--config path]
  weles-tools
  blender-health              MCP handshake + execute_blender_code probe
  setup [--check] [--dry-run] provision Blender + uv + blender-mcp

credentials come only from skarbiec:// references in the config;
browser automation goes only through the Weles MCP server;
Blender work goes only through the Blender MCP server.`;

async function main() {
  const { command, positional, options } = parseArgs(process.argv.slice(2));
  const configPath = options.config ?? DEFAULT_CONFIG;

  switch (command) {
    case 'create': {
      const prompt = positional.join(' ').trim();
      if (!prompt) {
        console.error('error: create requires a prompt');
        process.exitCode = 2;
        return;
      }
      const config = await loadPipelineConfig(configPath);
      const result = await runTextToGameJob(
        {
          prompt: options.race ? `${options.race} ${prompt}` : prompt,
          race: options.race,
          outDir: options.out,
        },
        config,
      );
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'check-config': {
      const config = await loadPipelineConfig(configPath);
      const redacted = JSON.parse(JSON.stringify(config));
      if (redacted.credentials) redacted.credentials = '<resolved: ok>';
      console.log(JSON.stringify(redacted, null, 2));
      return;
    }
    case 'weles-tools': {
      const client = new McpStdioClient({});
      await client.start();
      const tools = await client.listTools();
      for (const tool of tools) console.log(`${tool.name} — ${tool.description ?? ''}`);
      await client.close();
      return;
    }
    case 'blender-health': {
      const session = await BlenderSession.start({});
      const healthy = await session.isHealthy();
      const tools = await session.listTools().catch(() => []);
      console.log(JSON.stringify({ healthy, tools: tools.map((t) => t.name) }, null, 2));
      await session.close();
      process.exitCode = healthy ? 0 : 1;
      return;
    }
    case 'setup': {
      const report = await provisionBlender({
        checkOnly: Boolean(options.check),
        dryRun: Boolean(options['dry-run']),
      });
      console.log(JSON.stringify(report, null, 2));
      if (!report.healthy) process.exitCode = 1;
      return;
    }
    case 'verify': {
      const file = positional[0];
      if (!file) {
        console.error('error: verify requires a .glb path');
        process.exitCode = 2;
        return;
      }
      let config = {};
      try {
        config = await loadPipelineConfig(configPath);
      } catch {
        // config is optional for verify — defaults kick in without it
      }
      const report = await verifyAsset(file, config);
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
      return;
    }
    case 'help':
    case undefined:
      console.log(USAGE);
      return;
    default:
      console.error(`unknown command: ${command}\n\n${USAGE}`);
      process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
