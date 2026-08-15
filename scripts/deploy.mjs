// 部署脚本：把插件的三个核心文件复制到 Obsidian 测试仓库的插件目录。
// 只复制 manifest.json / main.js / styles.css，绝不覆盖 data.json（用户配置）。
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 目标：Obsidian 测试仓库插件目录
const dest = 'D:/Fast-Note/.obsidian/plugins/text-batch-processor';

const files = ['manifest.json', 'main.js', 'styles.css'];

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
  console.log('已创建目标目录：' + dest);
}

for (const f of files) {
  const src = resolve(root, f);
  if (!existsSync(src)) {
    console.error('跳过（源文件不存在）：' + src);
    continue;
  }
  copyFileSync(src, `${dest}/${f}`);
  console.log('已复制：' + f);
}

console.log('部署完成 → ' + dest);
