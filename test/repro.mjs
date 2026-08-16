import './setup-dom.mjs';
import fs from 'fs';
import { TextProcessorSettingTab } from '../src/settings.ts';
import { App } from './obsidian-stub.mjs';

function inspect(tag) {
  const tab = globalThis.__tab;
  const stepsContainers = tab.containerEl.querySelectorAll('.text-batch-steps');
  console.log(`\n===== [${tag}] 步骤容器数:`, stepsContainers.length, '=====');
  stepsContainers.forEach((sc, i) => {
    const items = sc.querySelectorAll('.setting-item');
    const names = [...items].map((it) => it.querySelector('.setting-item-name')?.textContent || '?');
    console.log(`  步骤容器[${i}] .setting-item 数:`, items.length, '名称:', JSON.stringify(names));
  });
  const titles = [...tab.containerEl.querySelectorAll('.text-batch-card-title')].map((e) => e.textContent);
  console.log('  卡片标题:', JSON.stringify(titles));
  const groups = [...tab.containerEl.querySelectorAll('.text-batch-group')].map(
    (g) => g.getAttribute('data-type') + '|' + g.getAttribute('data-category')
  );
  console.log('  分组:', JSON.stringify(groups));
}

function run() {
  const dataPath = 'D:/Obsidian/测试/测试/.obsidian/plugins/text-batch-processor/data.json';
  const settings = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const app = new App();
  const plugin = { app, settings, saveSettings: () => {} };
  const tab = new TextProcessorSettingTab(app, plugin);
  tab.containerEl = document.createElement('div');
  document.body.appendChild(tab.containerEl);
  globalThis.__tab = tab;

  console.log('--------- 场景1：初次 display() ---------');
  tab.display();
  inspect('初次');

  console.log('\n--------- 场景2：新增一个动作后 display() ---------');
  tab.addItem('action', '');
  inspect('新增动作后');
}

run();
