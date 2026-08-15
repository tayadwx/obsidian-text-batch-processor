import {
  App,
  PluginSettingTab,
  Setting,
  TextComponent,
  DropdownComponent,
} from 'obsidian';
import type TextProcessorPlugin from './main';

// 设置页：动作管理 + 序列构建器（按钮式：添加 / 上移 / 下移 / 删除）。
export class TextProcessorSettingTab extends PluginSettingTab {
  plugin: TextProcessorPlugin;

  constructor(app: App, plugin: TextProcessorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ===== 动作管理 =====
    containerEl.createEl('h2', { text: '动作（可自定义代码）' });
    new Setting(containerEl)
      .setName('新增动作')
      .setDesc('动作是一段 JavaScript 代码：拿到变量 text，return 处理后的字符串。')
      .addButton((btn) =>
        btn.setButtonText('+ 新增动作').onClick(() => {
          this.plugin.settings.actions.push({
            id: 'action-' + Date.now().toString(36),
            name: '新动作',
            code: 'return text;',
          });
          this.plugin.saveSettings();
          this.display();
        })
      );

    this.plugin.settings.actions.forEach((action, index) => {
      const setting = new Setting(containerEl).setName(`动作 ${index + 1}`);
      const nameInput = new TextComponent(setting.controlEl);
      nameInput.setValue(action.name).setPlaceholder('动作名称');
      nameInput.inputEl.style.marginRight = '8px';
      nameInput.onChange((v) => {
        action.name = v;
        this.plugin.saveSettings();
      });
      setting.addButton((btn) =>
        btn
          .setButtonText(action.favorite ? '★ 常用' : '☆ 常用')
          .setCta(action.favorite)
          .onClick(() => {
            action.favorite = !action.favorite;
            this.plugin.saveSettings();
            this.display();
          })
      );
      setting.addButton((btn) =>
        btn.setButtonText('删除').onClick(() => {
          this.plugin.settings.actions.splice(index, 1);
          // 同步从所有序列里移除该动作
          this.plugin.settings.sequences.forEach((seq) => {
            seq.steps = seq.steps.filter((s) => s.actionId !== action.id);
          });
          this.plugin.saveSettings();
          this.display();
        })
      );

      const codeSetting = new Setting(containerEl).setName('代码');
      codeSetting.addTextArea((ta) => {
        ta.setValue(action.code).onChange((v) => {
          action.code = v;
          this.plugin.saveSettings();
        });
        ta.inputEl.rows = 4;
        ta.inputEl.classList.add('text-batch-code');
        ta.inputEl.style.width = '100%';
      });
    });

    // ===== 序列构建器 =====
    containerEl.createEl('h2', { text: '序列（动作的组合）' });
    new Setting(containerEl)
      .setName('新增序列')
      .setDesc('把多个动作按顺序排列，形成可一键执行的序列。')
      .addButton((btn) =>
        btn.setButtonText('+ 新增序列').onClick(() => {
          this.plugin.settings.sequences.push({
            id: 'seq-' + Date.now().toString(36),
            name: '新序列',
            steps: [],
          });
          this.plugin.saveSettings();
          this.display();
        })
      );

    this.plugin.settings.sequences.forEach((seq, seqIndex) => {
      const setting = new Setting(containerEl).setName(`序列 ${seqIndex + 1}`);
      const nameInput = new TextComponent(setting.controlEl);
      nameInput.setValue(seq.name).setPlaceholder('序列名称');
      nameInput.inputEl.style.marginRight = '8px';
      nameInput.onChange((v) => {
        seq.name = v;
        this.plugin.saveSettings();
      });
      setting.addButton((btn) =>
        btn
          .setButtonText(seq.favorite ? '★ 常用' : '☆ 常用')
          .setCta(seq.favorite)
          .onClick(() => {
            seq.favorite = !seq.favorite;
            this.plugin.saveSettings();
            this.display();
          })
      );
      setting.addButton((btn) =>
        btn.setButtonText('删除序列').onClick(() => {
          this.plugin.settings.sequences.splice(seqIndex, 1);
          this.plugin.saveSettings();
          this.display();
        })
      );

      // 步骤列表（每个步骤可上移/下移/删除）
      seq.steps.forEach((step, stepIndex) => {
        const action = this.plugin.settings.actions.find(
          (a) => a.id === step.actionId
        );
        const stepSetting = new Setting(containerEl).setName(
          `步骤 ${stepIndex + 1}` + (action ? `：${action.name}` : '：（动作已删除）')
        );
        stepSetting.addButton((btn) =>
          btn.setButtonText('↑ 上移').onClick(() => {
            if (stepIndex > 0) {
              const tmp = seq.steps[stepIndex - 1];
              seq.steps[stepIndex - 1] = seq.steps[stepIndex];
              seq.steps[stepIndex] = tmp;
              this.plugin.saveSettings();
              this.display();
            }
          })
        );
        stepSetting.addButton((btn) =>
          btn.setButtonText('↓ 下移').onClick(() => {
            if (stepIndex < seq.steps.length - 1) {
              const tmp = seq.steps[stepIndex + 1];
              seq.steps[stepIndex + 1] = seq.steps[stepIndex];
              seq.steps[stepIndex] = tmp;
              this.plugin.saveSettings();
              this.display();
            }
          })
        );
        stepSetting.addButton((btn) =>
          btn.setButtonText('删除步骤').onClick(() => {
            seq.steps.splice(stepIndex, 1);
            this.plugin.saveSettings();
            this.display();
          })
        );
      });

      // 添加步骤（下拉选择动作）
      const addSetting = new Setting(containerEl).setName('添加动作到序列');
      const dropdown = new DropdownComponent(addSetting.controlEl);
      this.plugin.settings.actions.forEach((a) => dropdown.addOption(a.id, a.name));
      addSetting.addButton((btn) =>
        btn.setButtonText('添加').onClick(() => {
          const val = dropdown.getValue();
          if (val) {
            seq.steps.push({ actionId: val });
            this.plugin.saveSettings();
            this.display();
          }
        })
      );
    });
  }
}
