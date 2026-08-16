import { App, Platform, Notice } from 'obsidian';
import { PluginSettings, UserAction, Sequence, SequenceStep } from './types';
import { actionFingerprint, sequenceFingerprint, shortHash } from './fingerprint';

// 把类别输入归一化：空/空白/“未分类”都视为空（未分类），避免底层数据出现多种“未分类”表示。
export function normalizeCategory(v?: string): string {
  const s = (v ?? '').trim();
  return s === '' || s === '未分类' ? '' : s;
}

// ===== 数据包格式 =====
// 序列步骤用「动作名」在包内关联（而非 id），导入时重新生成 id 并重新映射，
// 这样同一份配置在不同用户的 vault 之间可移植、不会污染各自的 id 命名空间。
export interface PackAction {
  name: string;
  code: string;
  category?: string;
  favorite?: boolean;
}
export interface PackSequence {
  name: string;
  category?: string;
  favorite?: boolean;
  steps: { actionName: string }[];
}
export interface Pack {
  $schema?: string;
  version?: number;
  actions: PackAction[];
  sequences: PackSequence[];
}

export type ImportStrategy = 'rename-old' | 'override';
// 「同内容不同名」时的处理：keep=保留原有名称（跳过），rename=用导入的新名称覆盖旧的
export type SameContentStrategy = 'keep' | 'rename';

export interface ImportSummary {
  skipped: number; // 内容完全相同 → 跳过
  added: number; // 新增
  renamed: number; // 同名不同内容：旧的重命名
  overridden: number; // 覆盖旧的
  renamedSameContent: number; // 同内容不同名：用新名称覆盖（仅改名）
  warnings: string[];
}

function genId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 保证 desired 在 items（除 selfId 自身外、且同类别）中唯一；冲突则追加序号
function ensureUniqueName<T extends { name: string; id: string; category?: string }>(
  items: T[],
  desired: string,
  selfId: string,
  category: string
): string {
  const taken = new Set<string>();
  for (const it of items) {
    if (it.id !== selfId && (it.category ?? '') === category) {
      taken.add(it.name.trim());
    }
  }
  const d = desired.trim();
  if (!taken.has(d)) return desired;
  let i = 2;
  while (taken.has(d + ' ' + i)) i++;
  return d + ' ' + i;
}

function resolveActionIdByName(
  settings: PluginSettings,
  name: string
): string | undefined {
  const a = settings.actions.find((x) => x.name.trim() === name.trim());
  return a ? a.id : undefined;
}

/**
 * 把一份解析好的数据包导入到当前设置中。
 * strategy 决定「同名但内容不同」时的处理方式：
 *  - 'rename-old'（默认）：把“旧的”改名加短指纹，导入项作为新增保留（双方都在）
 *  - 'override'：同名即替换旧内容（保留旧 id，因此引用它的序列自动更新指向）
 */
export function applyImport(
  settings: PluginSettings,
  pack: Pack,
  strategy: ImportStrategy,
  sameContentStrategy: SameContentStrategy = 'keep'
): ImportSummary {
  const summary: ImportSummary = {
    skipped: 0,
    added: 0,
    renamed: 0,
    overridden: 0,
    renamedSameContent: 0,
    warnings: [],
  };

  // 现有动作：以「类别 + 分隔符 + 指纹/名字」为 key，使得去重只在「同类别内」生效
  const catKey = (cat: string, s: string) => (cat ?? '') + '\u0000' + s;
  const existingActionFp = new Map<string, UserAction>();
  const existingActionName = new Map<string, UserAction>();
  for (const a of settings.actions) {
    const fp = actionFingerprint(a.code);
    const k = catKey(a.category ?? '', fp);
    if (!existingActionFp.has(k)) existingActionFp.set(k, a);
    existingActionName.set(catKey(a.category ?? '', a.name.trim()), a);
  }

  // 第一步：导入动作，建立「包内动作名 → vault 动作 id」映射
  const nameToActionId = new Map<string, string>();
  for (const pa of pack.actions ?? []) {
    const name = pa?.name?.trim();
    if (!name) {
      summary.warnings.push('跳过一个无名动作');
      continue;
    }
    const fp = actionFingerprint(pa.code ?? '');
    const cat = normalizeCategory(pa.category);
    const fpKey = catKey(cat, fp);

    // 1) 同类别内内容完全相同（即便名字不同）
    if (existingActionFp.has(fpKey)) {
      const existing = existingActionFp.get(fpKey)!;
      const oldName = existing.name;
      if (sameContentStrategy === 'rename' && oldName.trim() !== name) {
        // 同内容不同名：用新名称覆盖（保留 id 与内容，仅改名）
        const newName = ensureUniqueName(
          settings.actions,
          name,
          existing.id,
          cat
        );
        existing.name = newName;
        existingActionName.delete(
          catKey(existing.category ?? '', oldName.trim())
        );
        existingActionName.set(catKey(cat, newName.trim()), existing);
        summary.renamedSameContent++;
      } else {
        // 保持原有名称 → 视为同一动作，跳过
        summary.skipped++;
      }
      nameToActionId.set(name, existing.id);
      continue;
    }

    // 2) 同类别内同名但内容不同
    const nameKey = catKey(cat, name);
    const sameName = existingActionName.get(nameKey);
    if (sameName) {
      if (strategy === 'override') {
        sameName.name = name;
        sameName.code = pa.code ?? '';
        sameName.category = cat;
        sameName.favorite = pa.favorite ?? sameName.favorite;
        existingActionFp.set(fpKey, sameName);
        summary.overridden++;
        nameToActionId.set(name, sameName.id);
      } else {
        // 重命名旧的（默认）：旧动作改名加短指纹，导入项作为新增
        sameName.name = sameName.name + '·' + shortHash(fp);
        existingActionName.delete(nameKey);
        const newAction: UserAction = {
          id: genId('action'),
          name,
          code: pa.code ?? '',
          category: cat,
          favorite: pa.favorite,
        };
        settings.actions.push(newAction);
        existingActionFp.set(fpKey, newAction);
        existingActionName.set(catKey(cat, name), newAction);
        summary.renamed++;
        summary.added++;
        nameToActionId.set(name, newAction.id);
      }
      continue;
    }

    // 3) 全新动作（跨类别的同名同内容也视为新增）
    const newAction: UserAction = {
      id: genId('action'),
      name,
      code: pa.code ?? '',
      category: cat,
      favorite: pa.favorite,
    };
    settings.actions.push(newAction);
    existingActionFp.set(fpKey, newAction);
    existingActionName.set(catKey(cat, name), newAction);
    summary.added++;
    nameToActionId.set(name, newAction.id);
  }

  // 现有序列：以「类别 + 分隔符 + 指纹/名字」为 key，去重只在「同类别内」生效
  const existingSeqFp = new Map<string, Sequence>();
  const existingSeqName = new Map<string, Sequence>();
  for (const s of settings.sequences) {
    const fp = sequenceFingerprint(
      s.steps.map((st) => {
        const a = settings.actions.find((x) => x.id === st.actionId);
        return a ? actionFingerprint(a.code) : '';
      })
    );
    const k = catKey(s.category ?? '', fp);
    if (!existingSeqFp.has(k)) existingSeqFp.set(k, s);
    existingSeqName.set(catKey(s.category ?? '', s.name.trim()), s);
  }

  // 第二步：导入序列
  for (const ps of pack.sequences ?? []) {
    const name = ps?.name?.trim();
    if (!name) {
      summary.warnings.push('跳过一个无名序列');
      continue;
    }

    // 解析步骤：优先用包内映射，其次按 vault 名字兜底；找不到则不计入该步骤
    const resolvedSteps: SequenceStep[] = [];
    for (const st of ps.steps ?? []) {
      const an = st?.actionName?.trim();
      let actionId: string | undefined = an ? nameToActionId.get(an) : undefined;
      if (!actionId) actionId = resolveActionIdByName(settings, an ?? '');
      if (actionId) {
        resolvedSteps.push({ actionId });
      } else {
        summary.warnings.push(
          `序列「${name}」的步骤「${an ?? '?'}」未找到对应动作，已忽略该步骤`
        );
      }
    }

    const stepFps = resolvedSteps.map((st) => {
      const a = settings.actions.find((x) => x.id === st.actionId)!;
      return actionFingerprint(a.code);
    });
    const fp = sequenceFingerprint(stepFps);
    const cat = normalizeCategory(ps.category);
    const fpKey = catKey(cat, fp);

    // 1) 同类别内内容完全相同
    if (existingSeqFp.has(fpKey)) {
      const existing = existingSeqFp.get(fpKey)!;
      const oldName = existing.name;
      if (sameContentStrategy === 'rename' && oldName.trim() !== name) {
        const newName = ensureUniqueName(
          settings.sequences,
          name,
          existing.id,
          cat
        );
        existing.name = newName;
        existingSeqName.delete(
          catKey(existing.category ?? '', oldName.trim())
        );
        existingSeqName.set(catKey(cat, newName.trim()), existing);
        summary.renamedSameContent++;
      } else {
        summary.skipped++;
      }
      continue;
    }

    // 2) 同类别内同名但内容不同
    const nameKey = catKey(cat, name);
    const sameName = existingSeqName.get(nameKey);
    if (sameName) {
      if (strategy === 'override') {
        sameName.name = name;
        sameName.steps = resolvedSteps;
        sameName.category = cat;
        sameName.favorite = ps.favorite ?? sameName.favorite;
        existingSeqFp.set(fpKey, sameName);
        summary.overridden++;
      } else {
        sameName.name = sameName.name + '·' + shortHash(fp);
        existingSeqName.delete(nameKey);
        const newSeq: Sequence = {
          id: genId('seq'),
          name,
          steps: resolvedSteps,
          category: cat,
          favorite: ps.favorite,
        };
        settings.sequences.push(newSeq);
        existingSeqFp.set(fpKey, newSeq);
        existingSeqName.set(catKey(cat, name), newSeq);
        summary.renamed++;
        summary.added++;
      }
      continue;
    }

    // 3) 全新序列（跨类别的同名同内容也视为新增）
    const newSeq: Sequence = {
      id: genId('seq'),
      name,
      steps: resolvedSteps,
      category: cat,
      favorite: ps.favorite,
    };
    settings.sequences.push(newSeq);
    existingSeqFp.set(fpKey, newSeq);
    existingSeqName.set(catKey(cat, name), newSeq);
    summary.added++;
  }

  return summary;
}

// ===== 导入前分析（预览阶段告知用户将发生什么，不修改任何数据）=====
export interface DupeItem {
  name: string;
  existingName?: string; // 同内容不同名时，记录已有项名称
  category?: string; // 该项的类别（用于预览时展示【类别】）
}
export interface ImportAnalysis {
  actionCount: number;
  sequenceCount: number;
  actionAdded: number;
  sequenceAdded: number;
  // 同名但内容不同 → 将按所选策略处理（重命名旧的 / 覆盖）
  actionSameNameDiffContent: DupeItem[];
  // 内容相同但名字不同 → 导入时将跳过
  actionSameContentDiffName: DupeItem[];
  // 同名且同内容（完全相同）→ 导入时将跳过
  actionExactDuplicate: DupeItem[];
  sequenceSameNameDiffContent: DupeItem[];
  sequenceSameContentDiffName: DupeItem[];
  sequenceExactDuplicate: DupeItem[];
}

// 计算 vault 内每个动作的「id → 指纹」映射，供序列指纹计算复用
function vaultActionFpMap(settings: PluginSettings): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of settings.actions) m.set(a.id, actionFingerprint(a.code));
  return m;
}

// 计算某条序列的「指纹」（基于其步骤对应的动作指纹）
function sequenceFpOf(seq: Sequence, idFp: Map<string, string>): string {
  const fps = seq.steps.map((st) => idFp.get(st.actionId) ?? '');
  return sequenceFingerprint(fps);
}

// 将数据包与当前 vault 对比，给出导入前的冲突/重复概览。
// 注意：这里只做“包 vs 当前 vault”的静态对比，不考虑包内相互覆盖，
// 因此计数与 applyImport 的最终结果在极端情形下可能有微小出入（仅用于预览提示）。
export function analyzeImport(
  settings: PluginSettings,
  pack: Pack
): ImportAnalysis {
  const result: ImportAnalysis = {
    actionCount: pack.actions?.length ?? 0,
    sequenceCount: pack.sequences?.length ?? 0,
    actionAdded: 0,
    sequenceAdded: 0,
    actionSameNameDiffContent: [],
    actionSameContentDiffName: [],
    actionExactDuplicate: [],
    sequenceSameNameDiffContent: [],
    sequenceSameContentDiffName: [],
    sequenceExactDuplicate: [],
  };

  // ---- 动作 ----
  const catKey = (cat: string, s: string) => (cat ?? '') + '\u0000' + s;
  const vActFp = new Map<string, UserAction>(); // 同类别内指纹去重
  const vActName = new Map<string, UserAction>(); // 仅用于“按动作名解析序列步骤”（忽略类别）
  for (const a of settings.actions) {
    const fp = actionFingerprint(a.code);
    const k = catKey(a.category ?? '', fp);
    if (!vActFp.has(k)) vActFp.set(k, a);
    vActName.set(a.name.trim(), a);
  }
  for (const pa of pack.actions ?? []) {
    const name = (pa?.name ?? '').trim();
    if (!name) continue;
    const fp = actionFingerprint(pa.code ?? '');
    const cat = normalizeCategory(pa.category);
    const byFp = vActFp.get(catKey(cat, fp));
    if (byFp) {
      if (byFp.name.trim() === name) {
        // 同名且同内容（完全相同）→ 导入时跳过
        result.actionExactDuplicate.push({ name, category: cat });
      } else {
        // 内容相同但名字不同 → 导入时跳过
        result.actionSameContentDiffName.push({
          name,
          existingName: byFp.name,
          category: cat,
        });
      }
      continue;
    }
    const byName = vActName.get(name);
    if (byName && (byName.category ?? '') === cat) {
      // 同类别内同名但内容不同 → 将按策略处理
      result.actionSameNameDiffContent.push({ name, category: cat });
      continue;
    }
    result.actionAdded++;
  }

  // ---- 序列 ----
  const idFp = vaultActionFpMap(settings);
  const vSeqFp = new Map<string, Sequence>(); // 同类别内指纹去重
  const vSeqName = new Map<string, Sequence>();
  for (const s of settings.sequences) {
    const fp = sequenceFpOf(s, idFp);
    const k = catKey(s.category ?? '', fp);
    if (!vSeqFp.has(k)) vSeqFp.set(k, s);
    vSeqName.set(s.name.trim(), s);
  }
  // 包内动作名 → 指纹（解析序列步骤时，优先用包内新动作）
  const packActFp = new Map<string, string>();
  for (const pa of pack.actions ?? []) {
    const n = (pa?.name ?? '').trim();
    if (n) packActFp.set(n, actionFingerprint(pa.code ?? ''));
  }
  for (const ps of pack.sequences ?? []) {
    const name = (ps?.name ?? '').trim();
    if (!name) continue;
    const fps = (ps.steps ?? []).map((st) => {
      const an = (st?.actionName ?? '').trim();
      if (packActFp.has(an)) return packActFp.get(an)!;
      const va = vActName.get(an);
      return va ? actionFingerprint(va.code) : '';
    });
    const fp = sequenceFingerprint(fps);
    const cat = normalizeCategory(ps.category);
    const byFp = vSeqFp.get(catKey(cat, fp));
    if (byFp) {
      if (byFp.name.trim() === name) {
        result.sequenceExactDuplicate.push({ name, category: cat });
      } else {
        result.sequenceSameContentDiffName.push({
          name,
          existingName: byFp.name,
          category: cat,
        });
      }
      continue;
    }
    const byName = vSeqName.get(name);
    if (byName && (byName.category ?? '') === cat) {
      result.sequenceSameNameDiffContent.push({ name, category: cat });
      continue;
    }
    result.sequenceAdded++;
  }

  return result;
}

// 把当前设置序列化为可导出的数据包文本
export function exportPackText(settings: PluginSettings): string {
  const pack: Pack = {
    $schema: 'text-batch-processor-pack',
    version: 1,
    actions: settings.actions.map((a) => ({
      name: a.name,
      code: a.code,
      category: a.category ?? '',
      favorite: a.favorite,
    })),
    sequences: settings.sequences.map((s) => ({
      name: s.name,
      category: s.category ?? '',
      favorite: s.favorite,
      steps: s.steps.map((st) => {
        const a = settings.actions.find((x) => x.id === st.actionId);
        return { actionName: a ? a.name : '' };
      }),
    })),
  };
  return JSON.stringify(pack, null, 2);
}

// 解析数据包文本，宽松容错
export function parsePack(text: string): Pack {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('JSON 解析错误：' + (e as Error).message);
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('格式不正确：根节点不是对象');
  }
  const rawActions = Array.isArray(data.actions) ? data.actions : [];
  const rawSeqs = Array.isArray(data.sequences) ? data.sequences : [];
  const pack: Pack = { actions: [], sequences: [] };
  for (const a of rawActions) {
    if (!a || typeof a.name !== 'string' || typeof a.code !== 'string') continue;
    pack.actions.push({
      name: a.name,
      code: a.code,
      category: typeof a.category === 'string' ? a.category : '',
      favorite: !!a.favorite,
    });
  }
  for (const s of rawSeqs) {
    if (!s || typeof s.name !== 'string') continue;
    const steps = Array.isArray(s.steps)
      ? s.steps
          .filter((st: any) => st && typeof st.actionName === 'string')
          .map((st: any) => ({ actionName: st.actionName }))
      : [];
    pack.sequences.push({
      name: s.name,
      category: typeof s.category === 'string' ? s.category : '',
      favorite: !!s.favorite,
      steps,
    });
  }
  return pack;
}

// 导出下载：桌面端尝试系统“另存为”对话框；移动端/失败则写入仓库根目录
export async function downloadPack(
  app: App,
  text: string,
  filename = 'text-batch-export.json'
): Promise<void> {
  if (!Platform.isMobile) {
    try {
      const electron = (window as any).require?.('electron');
      const dialog = electron?.remote?.dialog ?? electron?.dialog;
      const fs = electron?.remote?.fs ?? electron?.fs;
      if (dialog?.showSaveDialog && fs?.writeFileSync) {
        const result = await dialog.showSaveDialog({
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, text, 'utf8');
          new Notice('已导出到：' + result.filePath);
          return;
        }
      }
    } catch (e) {
      // 走到这里说明桌面端 electron 不可用，下面回退到写入仓库
      console.warn('文本批处理：系统保存对话框不可用，回退到写入仓库', e);
    }
  }
  // 回退：写入仓库根目录（移动端可在文件列表中用系统分享保存）
  try {
    const existing = app.vault.getAbstractFileByPath(filename);
    if (existing) await app.vault.delete(existing);
    await app.vault.create(filename, text);
    new Notice('已导出到仓库根目录：' + filename + '（移动端可用系统分享另存）');
  } catch (e) {
    new Notice('导出失败：' + (e as Error).message);
  }
}
