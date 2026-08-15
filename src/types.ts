// 动作（用户自定义代码）
export interface UserAction {
  id: string;
  name: string;
  // 是否设为“常用”：常用动作会直接出现在右键二级菜单里，方便一键调用
  favorite?: boolean;
  // 一段 JavaScript 代码（函数体，可多行），必须 return 一个字符串。
  // 可用变量：text（输入文本，字符串）。
  // 例如：return text.replace(/^#+\s+/gm, '');
  code: string;
}

// 序列里的一个步骤（引用某个动作）
export interface SequenceStep {
  actionId: string;
}

// 序列（动作的有序组合）
export interface Sequence {
  id: string;
  name: string;
  // 是否设为“常用”：常用序列会直接出现在右键二级菜单里，方便一键调用
  favorite?: boolean;
  steps: SequenceStep[];
}

// 插件设置（会持久化到 data.json）
export interface PluginSettings {
  actions: UserAction[];
  sequences: Sequence[];
}

// 默认内置的示范动作与序列，首次安装时自动写入。
// 这些都是“用户代码”动作，和你在设置里写的没有任何区别，可随意改名/改代码/删除。
export const DEFAULT_SETTINGS: PluginSettings = {
  actions: [
    {
      id: 'builtin-heading-to-text',
      name: '标题降级为普通文本',
      // 去掉行首的若干个 # 号及其后的一个空格
      code: '// 去掉行首的 # 号及其后的一个空格（多个 # 也会一起去掉）\nreturn text.replace(/^#+\\s+/gm, \'\');',
    },
    {
      id: 'builtin-remove-extra-blank-lines',
      name: '去除多余空行',
      // 连续多个“空行或只有空格/全角空格的行”合并为一个空行
      code:
        'const lines = text.split(\'\\n\');\n' +
        'const out = [];\n' +
        'let prevBlank = false;\n' +
        'for (const line of lines) {\n' +
        "  const isBlank = /^[\\s\\u3000]*$/.test(line);\n" +
        '  if (isBlank) {\n' +
        '    if (!prevBlank) out.push(\'\');\n' +
        '    prevBlank = true;\n' +
        '  } else {\n' +
        '    out.push(line);\n' +
        '    prevBlank = false;\n' +
        '  }\n' +
        '}\n' +
        'return out.join(\'\\n\');',
    },
  ],
  sequences: [
    {
      id: 'builtin-demo-sequence',
      name: '示范序列：标题降级 + 去空行',
      steps: [
        { actionId: 'builtin-heading-to-text' },
        { actionId: 'builtin-remove-extra-blank-lines' },
      ],
    },
  ],
};
