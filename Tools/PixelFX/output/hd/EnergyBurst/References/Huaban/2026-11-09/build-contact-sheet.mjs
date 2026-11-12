import { createCanvas, loadImage, GlobalFonts } from '/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath('/System/Library/Fonts/STHeiti Medium.ttc', 'HuabanCJK');
const canvas = createCanvas(1280, 1080);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0a111d';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = '32px HuabanCJK';
ctx.fillStyle = '#e7f4ff';
ctx.fillText('赛博能量爆炸 · 参考分工', 40, 52);
ctx.font = '18px HuabanCJK';
ctx.fillStyle = '#99b3c9';
ctx.fillText('花瓣公开页面截图｜仅供方向讨论，非制作贴图；商用授权未核实', 40, 86);

const cards = [
  { file: '01-round-burst.png', title: '01  整体：近圆形蓝白爆发', use: '取：白亮爆发 → 蓝色能量残留', avoid: '舍：大面积过曝、过密尖刺' },
  { file: '03-hard-brush.png', title: '03  笔触：硬边与蓝白层次', use: '取：深蓝轮廓、青蓝片层、白热核', avoid: '舍：地面喷溅、竖直尖刺构图' },
  { file: '02-current.png', title: '02  细节：断续游走的短电弧', use: '取：分段、跳动，只作局部细节', avoid: '舍：堆满全屏、代替爆炸主体' },
  { file: '04-timing.png', title: '04  节奏：扩散后分片消失', use: '取：释放 → 撑开 → 分片消散', avoid: '舍：橙色火焰、软烟团（图为尾段）' },
];
for (let i = 0; i < cards.length; i++) {
  const c = cards[i];
  const x = 40 + (i % 2) * 610;
  const y = 120 + Math.floor(i / 2) * 450;
  ctx.fillStyle = '#131e2e';
  ctx.fillRect(x, y, 590, 430);
  ctx.font = '23px HuabanCJK';
  ctx.fillStyle = '#c8eafa';
  ctx.fillText(c.title, x + 18, y + 36);
  ctx.fillStyle = '#070c15';
  ctx.fillRect(x + 18, y + 53, 554, 280);
  const image = await loadImage(join(dir, c.file));
  const scale = Math.min(554 / image.width, 280 / image.height, 1.35);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x + 18 + (554 - w) / 2, y + 53 + (280 - h) / 2, w, h);
  ctx.font = '18px HuabanCJK';
  ctx.fillStyle = '#c2d8e7';
  ctx.fillText(c.use, x + 18, y + 371);
  ctx.fillStyle = '#8fa6bb';
  ctx.fillText(c.avoid, x + 18, y + 405);
}
ctx.font = '18px HuabanCJK';
ctx.fillStyle = '#9fb8ce';
ctx.fillText('建议：01 定整体，03 定笔触配色，02 补少量电流，04 仅参考节奏。', 40, 1056);
await writeFile(join(dir, 'reference-board.png'), canvas.toBuffer('image/png'));
