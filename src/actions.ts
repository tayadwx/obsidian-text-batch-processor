import { UserAction, Sequence } from './types';

// 把用户写的代码（JavaScript 函数体）编译成真正可运行的函数。
//
// 安全说明：这里运行的是用户自己在本地笔记仓库里写的代码，不存在外部安全风险，
// 等价于你在浏览器控制台执行自己的脚本。
export function compileAction(code: string): (text: string) => string {
  // new Function('text', code) 会生成一个 function(text){ <code> }
  const fn = new Function('text', code) as (text: string) => string;
  return (text: string): string => {
    const result = fn(text);
    if (typeof result !== 'string') {
      throw new Error('动作代码没有 return 一个字符串（请确认最后有 return）');
    }
    return result;
  };
}

export function runAction(action: UserAction, text: string): string {
  return compileAction(action.code)(text);
}

// 流水线：把文本依次喂给序列里的每个动作，上一个的输出是下一个的输入。
export function runSequence(
  sequence: Sequence,
  actionsById: Map<string, UserAction>,
  text: string
): string {
  let current = text;
  for (const step of sequence.steps) {
    const action = actionsById.get(step.actionId);
    if (!action) continue; // 跳过已被删除的动作，避免中断
    current = runAction(action, current);
  }
  return current;
}
