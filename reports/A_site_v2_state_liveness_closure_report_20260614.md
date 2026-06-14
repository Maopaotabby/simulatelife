# A Site V2 State Liveness Closure Report - 2026-06-14

## Scope

目标：修复普通事件接受后 V2 状态系统的真实闭环。验收对象为 `save_林墨_full_2026-06-14_v2(1).json` 暴露的问题：NPC、tags、attributes、goals、npcProfiles 必须能根据剧情变化生成、解析、合并、落盘、导出重导入，并进入后续剧情上下文。

未做内容：没有扩展事件链、镜头系统、调试面板或新 UI。

## Root Causes

1. 旧存档里有已接受 `stateDiffHistory.npcBeliefs`，但 normalize/import 时没有把这些结构化 NPC 认知回填到 `npcs` 和 `npcProfiles`。
2. `npcProfiles` patch 只更新档案卡，不保证对应 NPC 进入 `npcs` 列表，导致“档案有定义、NPC 状态不活”的断层。
3. 轻量提取的 `shortTermSceneMemory` patch 使用旧 memory 且 `selected:false`，实际不会留下短期场景记忆。
4. `goals.shortTerm` 硬限制为 3，目标样本已有 3 个短期目标时，新剧情目标会被静默丢弃。
5. 主生成上下文 `buildContextBlock` 没有稳定注入 attributes、tags、NPC 名单和 goals，所以状态即使落盘，也不能可靠影响后续剧情。

## Fixes

1. `normalizePlayer()` 增加 `repairNpcStateFromStateDiffHistory()`，只从已接受/已合并的结构化 `npcBeliefs` 回填 NPC 和 NPC 档案，不从正文里猜人名。
2. `ensureNpcRecordForBelief()` 增加 `skipSceneState` 选项和 recentInteractions 幂等检查，避免旧存档导入反复追加重复互动。
3. `npcProfiles` patch 合并时同步建立对应 `npcs` 条目，并重新 normalize `npcProfiles`。
4. 轻量提取现在会写入 `shortTermSceneMemory.notes` 与 `lastActions`，并把 patch 标记为 selected。
5. 短期目标上限统一为 `SHORT_TERM_GOAL_LIMIT = 5`，避免样本已有 3 个目标时新目标无法落盘。
6. `buildContextForAgent()` 的通用状态模块补入 attributes、tags、NPC 名单和 goals，使接受后的状态进入下一轮生成上下文。

## Evidence

目标样本回归：

```powershell
node reports\run_v2_state_liveness_save_regression.js
```

结果：通过。证据文件：

- `reports/phase5_full_acceptance_evidence/v2_state_liveness_save_regression_results.json`
- `output/playwright/v2_state_liveness_save_regression_pixel5.png`

关键证明：

- 旧样本 normalize 后补出 `Emma`、`加菲`、`阿哲`、`柜台办事员` 的 `npcs` 和 `npcProfiles`。
- 普通事件接受后 `history/canonHistory/eventCount` 更新。
- `精神`、`同行关系启动` tag、`和Emma等人一起去食堂` goal、NPC 和 npcProfiles 均落盘。
- `pendingAcceptedEvents` 和 `pendingStateDiffs` 清零。
- 导出重导入后 NPC、tag、goal 保留。
- 调试面板显示 NPC/npcProfiles；主页面可见新 tag。
- 后续 Prompt 上下文包含新 NPC、新 tag 和新 goal。

兼容回归：

```powershell
node reports\run_edit_authority_regression.js
$env:NODE_PATH='C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'; node reports\run_v2_state_closure_regression.js
$env:NODE_PATH='C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright@1.60.0\node_modules;C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'; node reports\run_phase5_runtime_compat_test.js
```

结果：均通过。证据文件：

- `reports/phase5_full_acceptance_evidence/edit_authority_regression_results.json`
- `reports/phase5_full_acceptance_evidence/edit_authority_export_roundtrip_save.json`
- `reports/phase5_full_acceptance_evidence/v2_state_closure_regression_results.json`
- `reports/phase5_full_acceptance_evidence/phase5_runtime_compat_results.json`

静态检查：

```powershell
node --check assets\a-site-v2-runtime.js
node --check reports\run_v2_state_liveness_save_regression.js
node --check reports\run_edit_authority_regression.js
git diff --check -- assets/a-site-v2-runtime.js index.html reports/run_v2_state_liveness_save_regression.js reports/run_edit_authority_regression.js
```

结果：通过。

## Known Boundary

现有页面 UI 不显示 shortTerm goals 文本，本轮没有新增 UI。目标验证中，goals 通过状态落盘、导出重导入和后续 Prompt 上下文证明生效。UI 层按现有能力验证：tag 在主页面可见，NPC/npcProfiles 在 V2 调试面板可见。

## Publish

Runtime version: `v2-state-liveness-20260614`

`index.html` cache bust: `20260614-v2-state-liveness-a`

发布状态：待 commit/push 和 GitHub Pages 验证。
