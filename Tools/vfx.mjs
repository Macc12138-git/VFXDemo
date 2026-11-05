#!/usr/bin/env node
// Project-local authoring entry. Never starts Unity or writes imported Unity assets.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const library = join(project, 'Tools', 'PixelFX');
const [command = 'help', ...args] = process.argv.slice(2);
const commands = { list:'list.mjs', new:'new.mjs', render:'render.mjs', check:'check.mjs',
  index:'index.mjs', act:'act.mjs', serve:'serve.mjs', 'render-hd':'render-hd.mjs', 'check-hd':'check-hd.mjs',
  'export-brazier':'export-brazier-inspector.mjs' };

function outsideAssets(path) {
  const delta = relative(join(project, 'Assets'), resolve(path));
  if (delta === '' || (delta !== '..' && !delta.startsWith('..'+sep) && !isAbsolute(delta)))
    throw new Error('此入口只生成创作/中间资源，不能直接写入 Assets。导入请在作者明确授权后用 Unity 编辑器工具完成。');
}
function main() {
  if (command === 'help' || command === '--help') {
    console.log(`VFXDemo — pixelfx 创作工作台 (Node 18+)\n
需求 → 制作/预览/迭代 → 作者验收 → 等待明确“导入 Unity”指令 → 分层导出/原生粒子组装/验证
验收通过不等于导入授权；此 CLI 不启动 Unity，也不自动组装或修改场景。

node Tools/vfx.mjs doctor
node Tools/vfx.mjs list fire
node Tools/vfx.mjs new fire/my-effect --loop
node Tools/vfx.mjs index
node Tools/vfx.mjs render fire/my-effect --no-actor
node Tools/vfx.mjs check fire/my-effect
node Tools/vfx.mjs serve 8086
node Tools/vfx.mjs render-hd [--canvas-module /path/to/module]
node Tools/vfx.mjs check-hd [--canvas-module /path/to/module]
node Tools/vfx.mjs export-brazier [--out /path/to/staging]

serve 默认端口 8086，入口 /gallery/workbench.html。
export-brazier 仅为已验证案例的分层中间导出，默认 VFXWork/Exports/brazier-inspector。
它不是任意效果的一键转换器，只在作者明确要求导出/迁移时使用。
像素预览默认 Tools/PixelFX/records；高清预览 Tools/PixelFX/output/hd。
新增效果或改名后运行 index 更新画廊目录，再刷新浏览器。
详见 VFX_WORKBENCH.md 和 .agents/skills/vfxdemo-pixelfx/SKILL.md。`);
    return;
  }
  if (+process.versions.node.split('.')[0] < 18) throw new Error('需要 Node.js 18 或更新版本。');
  if (command === 'doctor') {
    const required = ['Assets','Packages','ProjectSettings','Tools/PixelFX/src/core/index.js',
      'Tools/PixelFX/src/fx/fire/brazier.js','Tools/PixelFX/tools/render.mjs',
      '.agents/skills/vfxdemo-pixelfx/SKILL.md'];
    const missing = required.filter(p => !existsSync(join(project,p)));
    if (missing.length) throw new Error('缺少工程文件: '+missing.join(', '));
    console.log(`PASS — Node ${process.versions.node}\nproject: ${project}\npixelfx: ${library}\n无需旧 checkout；基础制作/预览无需 npm install。\n高清离线导出可选 @napi-rs/canvas；GIF/MP4 可选 ffmpeg。\n未连接 Unity，未修改 Assets。`);
    return;
  }
  if (!commands[command]) throw new Error(`未知命令 ${command}；运行 node Tools/vfx.mjs help。`);
  const forwarded = [...args];
  if (command === 'serve' && !forwarded.length) forwarded.push('8086');
  if (command === 'export-brazier' && !forwarded.includes('--out'))
    forwarded.push('--out',join(project,'VFXWork','Exports','brazier-inspector'));
  const outputIndex = forwarded.indexOf('--out');
  if (outputIndex >= 0) {
    if (!forwarded[outputIndex+1]) throw new Error('--out 缺少输出目录。');
    // Caller paths are project-relative, regardless of the vendored tool's own cwd.
    const output = resolve(project,forwarded[outputIndex+1]);outsideAssets(output);
    forwarded[outputIndex+1] = output;
  }
  const child = spawn(process.execPath,[join(library,'tools',commands[command]),...forwarded],{cwd:library,stdio:'inherit'});
  const stop = () => child.kill('SIGINT');process.once('SIGINT',stop);
  child.once('error',error=>{console.error(error.message);process.exitCode=1;});
  child.once('exit',(code,signal)=>{process.removeListener('SIGINT',stop);process.exitCode=code ?? (signal?1:0);});
}
try { main(); } catch(error) { console.error(error.message);process.exitCode=1; }
