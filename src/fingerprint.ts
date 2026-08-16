// 内容指纹：用于「按内容」而非「按名字」识别动作/序列是否相同，
// 从而支持：相同内容即使改名也算同一项（避免重复导入），
// 同名但内容不同则用短指纹后缀区分。

// 归一化代码：统一换行符、去掉首尾空白，便于“内容相同”判定
export function normalizeCode(code: string): string {
  return code.replace(/\r\n?/g, '\n').trim();
}

// 32 位 FNV-1a 哈希 → 8 位十六进制（同步、无依赖，适合插件内使用）
export function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// 短指纹（用于重命名后缀）：取 8 位哈希的后 3 位，紧凑且对个人信息规模足够区分
export function shortHash(str: string): string {
  return hashString(str).slice(-3);
}

// 动作指纹 = 归一化代码 的哈希
export function actionFingerprint(code: string): string {
  return hashString(normalizeCode(code));
}

// 序列指纹 = 其组成动作指纹的有序列表 的哈希
// （按“内容”而非动作名解析，因此改名/换来源但动作相同，也识别为同一序列）
export function sequenceFingerprint(stepActionFingerprints: string[]): string {
  return hashString(stepActionFingerprints.join('|'));
}
