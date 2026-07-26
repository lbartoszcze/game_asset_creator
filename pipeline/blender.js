// blender.js — Blender access for the pipeline, through the Blender MCP API.
//
// Same transport discipline as the Weles layer: the pipeline talks to a
// Blender MCP server over stdio JSON-RPC (never hand-rolled sockets to
// Blender, never a hand-managed Blender subprocess). The MCP server
// bridges into Blender's own addon; `pipeline/setup.js` provisions both.
//
// Tool surface used (blender-mcp): get_scene_info, execute_blender_code.
// Anything else (export, decimate, rig) is expressed as Blender Python
// executed through execute_blender_code, so the wrapper stays tiny and
// every Blender behavior lives in config-driven code strings.

import { McpStdioClient, WelesError } from './weles.js';

export class BlenderError extends Error {
  constructor(message, { code, cause } = {}) {
    super(message);
    this.name = 'BlenderError';
    this.code = code;
    this.cause = cause;
  }
}

/** Default spawn for a blender-mcp server: uvx resolver first, binary fallback. */
export function blenderMcpSpawn(config = {}) {
  if (config.command) {
    return { command: config.command, args: config.args ?? [] };
  }
  if (config.uvx !== false) {
    return { command: config.uvxBin ?? 'uvx', args: ['blender-mcp'] };
  }
  return { command: 'blender-mcp', args: [] };
}

export class BlenderSession {
  /**
   * Start a Blender MCP session.
   * @param {object} options { command, args, uvx, uvxBin, timeoutMs }
   */
  static async start(options = {}) {
    const spawn_ = blenderMcpSpawn(options);
    const client = new McpStdioClient({
      command: spawn_.command,
      args: spawn_.args,
      env: options.env,
    });
    try {
      await client.start();
    } catch (error) {
      throw new BlenderError(
        `blender MCP server failed to start (${spawn_.command} ${spawn_.args.join(' ')}): ${error.message}. ` +
          `Run 'node pipeline/setup.js' to provision Blender + blender-mcp.`,
        { cause: error },
      );
    }
    return new BlenderSession(client);
  }

  constructor(client) {
    this.client = client;
  }

  async listTools() {
    return this.client.listTools();
  }

  /** True when the server answers and exposes execute_blender_code. */
  async isHealthy() {
    try {
      const tools = await this.listTools();
      return tools.some((t) => t.name === 'execute_blender_code');
    } catch {
      return false;
    }
  }

  async sceneInfo() {
    const result = await this.client.callTool('get_scene_info', {});
    return result?.content?.map((c) => c.text ?? '').join('') ?? result;
  }

  /**
   * Run Blender Python (`bpy`) inside the connected Blender instance.
   * Returns whatever the MCP tool reports back (usually the captured
   * stdout / last expression value as text).
   */
  async execute(code) {
    const result = await this.client.callTool('execute_blender_code', { code });
    return result?.content?.map((c) => c.text ?? '').join('') ?? result;
  }

  /** Convenience: import a model file into the scene. */
  async importModel(path, format = 'glb') {
    const code = [
      'import bpy',
      'bpy.ops.wm.read_factory_settings(use_empty=True)',
      format === 'glb'
        ? `bpy.ops.import_scene.gltf(filepath=${JSON.stringify(path)})`
        : `bpy.ops.wm.obj_import(filepath=${JSON.stringify(path)})`,
      'print("imported", len(bpy.context.scene.objects), "objects")',
    ].join('\n');
    return this.execute(code);
  }

  /** Convenience: export the whole scene as GLB. */
  async exportGlb(path) {
    const code = [
      'import bpy',
      `bpy.ops.export_scene.gltf(filepath=${JSON.stringify(path)}, export_format='GLB')`,
      'print("exported", ' + JSON.stringify(path) + ')',
    ].join('\n');
    return this.execute(code);
  }

  async close() {
    await this.client.close();
  }
}

/**
 * One post-processing job on a model file: import → run a config-supplied
 * Blender Python body → export GLB. The body sees `INPUT_PATH` and
 * `OUTPUT_PATH` as injected globals.
 */
export async function postProcessModel({ inputPath, outputPath, processCode, sessionOptions } = {}) {
  const session = await BlenderSession.start(sessionOptions ?? {});
  try {
    await session.importModel(inputPath);
    if (processCode) {
      const header = `INPUT_PATH = ${JSON.stringify(inputPath)}\nOUTPUT_PATH = ${JSON.stringify(outputPath)}\n`;
      await session.execute(header + processCode);
    }
    await session.exportGlb(outputPath);
    return { outputPath };
  } finally {
    await session.close().catch(() => {});
  }
}
