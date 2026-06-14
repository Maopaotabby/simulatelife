const fs = require("fs");
const path = require("path");

function requirePlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const bundled = process.env.CODEX_NODE_MODULES ||
      "C:/Users/15164/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
    return require(path.join(bundled, "playwright"));
  }
}

const { chromium } = requirePlaywright();

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "reports", "phase5_full_acceptance_evidence");
const SHOTS = path.join(ROOT, "output", "playwright");
const URL = process.env.A_SITE_URL || "http://127.0.0.1:8765/index.html";

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch (_) {
    return chromium.launch({ headless: true });
  }
}

async function main() {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${URL}?_v2_state_closure=${Date.now()}`);
  await page.waitForLoadState("domcontentloaded");

  const result = await page.evaluate(async () => {
    const api = window.__ASiteV2;
    if (!api) return { ok: false, error: "window.__ASiteV2 missing" };

    const arr = (value) => Array.isArray(value) ? value : [];
    const names = (value) => arr(value).map((item) => item && item.name).filter(Boolean);
    const attr = (player, name) => arr(player.attributes).find((item) => item && item.name === name);

    api.writePendingDiffs([]);
    api.writePendingTextEvents([]);

    const base = api.normalizePlayer({
      id: `v2_state_closure_${Date.now()}`,
      name: "ClosureRegression",
      age: "17岁",
      currentYear: "公历2023年9月1日",
      totalDays: 6205,
      calendarState: { currentDate: "2023-09-01" },
      characterAgeState: { legalBirthDate: "2006-09-01", ageDisplayMode: "legacy" },
      attributes: [
        { name: "智力", value: 80 },
        { name: "魅力", value: 60 },
        { name: "体质", value: 40 },
        { name: "敏捷", value: 55 },
        { name: "精神", value: 50 },
        { name: "财富", value: 90 }
      ],
      tags: [{ name: "入学手续中", duration: 2 }],
      npcs: [{ name: "小金", relation: "绑定权限系统", status: "活跃", description: "低干涉辅助。" }],
      goals: {
        longTerm: "在第三世活出真正属于自己的、有实感的人生。",
        shortTerm: ["拿到校园卡", "认识同学"],
        completed: []
      },
      history: [],
      canonHistory: [],
      pendingAcceptedEvents: [],
      pendingStateDiffs: [],
      stateDiffHistory: [],
      patchHistory: [],
      relationshipStates: [],
      openThreads: [],
      loreEntries: [],
      sceneMemoryArchive: [],
      sceneControl: { granularityPreset: "normal_event", extractionMode: "standard" },
      sceneState: {
        sceneId: "scene_admin_office",
        currentSceneId: "scene_admin_office",
        currentLocationText: "行政办公室",
        activeNpcIds: ["Emma", "加菲", "阿哲"],
        presentCharacters: ["Emma", "加菲", "阿哲"]
      },
      shortTermSceneMemory: {
        sceneId: "scene_admin_office",
        notes: [],
        lastActions: [],
        unresolvedThreads: []
      },
      npcProfiles: {}
    });

    const oldBeliefOnlyEvent = {
      id: "event_old_belief_shape",
      status: "accepted_text_pending_state",
      acceptedAt: new Date().toISOString(),
      storytellerText: "Emma给林墨递了牛奶糖，加菲提醒她去饮水机，阿哲表现出笨拙关心。",
      text: "Emma给林墨递了牛奶糖，加菲提醒她去饮水机，阿哲表现出笨拙关心。",
      eventYearText: "公历2023年9月1日",
      eventAgeText: "17岁",
      eventDate: "2023-09-01",
      theme: "旧 npcBeliefs 兼容测试"
    };
    const beliefBase = api.normalizePlayer({
      ...base,
      id: `${base.id}_belief_only`,
      pendingAcceptedEvents: [oldBeliefOnlyEvent],
      draftHistory: [oldBeliefOnlyEvent],
      stateDiffHistory: [],
      patchHistory: []
    });
    const beliefOnlyApplied = api.applyConfirmedStateDiff(beliefBase, {
      id: "diff_old_belief_shape",
      status: "pending",
      sourceEventId: oldBeliefOnlyEvent.id,
      sourceAgent: "STORYTELLER_DATA",
      confirmedFacts: [],
      speculations: [],
      npcBeliefs: [
        { npc: "Emma", belief: "林墨身体不适但已经收下牛奶糖。", confidence: "high" },
        { npc: "加菲", belief: "林墨需要补充温水和糖分。", confidence: "high" },
        { npc: "阿哲", belief: "林墨可能低血糖。", confidence: "medium" }
      ],
      rejectedOrUnconfirmed: [],
      proposedPatches: []
    });

    const dataPayload = {
      statChanges: { "精神": 1 },
      confirmedFacts: [
        { text: "林墨在行政办公室完成校园卡领取，并使用低血糖口径解释短暂眩晕。", targetModule: "structuredSummaries", confidence: "confirmed" }
      ],
      speculations: [
        { text: "Emma可能会继续留意林墨的身体状态。", reason: "她主动递糖并观察林墨反应。", selected: true }
      ],
      npcBeliefs: [
        { npc: "Emma", belief: "林墨因低血糖身体不适，但愿意接受同学帮助。", confidence: "high" },
        { npc: "加菲", belief: "林墨需要按实际状态补糖和饮水。", confidence: "high" },
        { npc: "阿哲", belief: "林墨身体不适，需要留意但不宜追问。", confidence: "medium" },
        { npc: "柜台办事员", belief: "林墨低血糖，需要坐下缓一缓。", confidence: "high" }
      ],
      rejectedOrUnconfirmed: [],
      proposedPatches: [
        { module: "tags", operation: "add", value: [{ name: "行政口径建立", duration: 3 }], reason: "已接受正文明确形成对外解释口径。", confidence: "confirmed" },
        { module: "npcs", operation: "add", value: ["Emma", "加菲", "阿哲", "柜台办事员"], reason: "已接受正文中发生可延续互动的人物。", confidence: "confirmed" },
        { module: "goals", operation: "update", value: { modifyGoals: { add: [{ type: "shortTerm", text: "完成学生系统绑定" }], achieve: ["拿到校园卡"] }, achievedGoals: [] }, reason: "校园卡领取已完成，并出现下一步手续目标。", confidence: "confirmed" },
        { module: "npcProfiles", operation: "update", value: [{ id: "Emma", name: "Emma", attitude: "担心但尊重林墨的解释", recentInteractions: [{ summary: "递给林墨一颗牛奶糖。", sourceEventId: "event_accept_stub", weight: 0.7 }] }], reason: "Emma与林墨产生可延续互动。", confidence: "confirmed" },
        { module: "loreEntries", operation: "add", value: [{ id: "lore_admin_card_flow", title: "行政办公室校园卡流程", summary: "林墨在行政办公室领取校园卡，正式进入学生系统日常流程。", keywords: ["行政办公室", "校园卡", "学生系统"], visibility: "protagonist_only", truth: "confirmed", status: "active" }], reason: "已接受事件产生后续可召回流程信息。", confidence: "confirmed" },
        { module: "sceneMemoryArchive", operation: "add", value: [{ id: "scene_archive_admin_office", sceneId: "scene_admin_office", summary: "Emma递糖，加菲提示饮水机，阿哲担心，办事员给纸巾。", unresolvedThreads: ["同学们会如何记住林墨这次身体不适"], sourceEventId: "event_accept_stub" }], reason: "普通事件接受后形成可复用场景记忆。", confidence: "confirmed" },
        { module: "shortTermSceneMemory", operation: "update", value: { notes: [{ summary: "林墨手里有Emma给的牛奶糖。", sourceEventId: "event_accept_stub", expiresAfterTurns: 3 }], lastActions: ["剥开牛奶糖"], unresolvedThreads: ["Emma还在观察林墨状态"] }, reason: "保留下一轮局部连续性。", confidence: "confirmed" }
      ],
      actualElapsedDaysSuggestion: { days: 0, evidence: "同一行政办公室连续场景。", confidence: "confirmed", selected: true }
    };
    const archivistPayload = {
      confirmedFacts: [],
      speculations: [],
      npcBeliefs: [],
      rejectedOrUnconfirmed: [],
      proposedPatches: [
        { module: "storySummary", operation: "append_note", value: "林墨在行政办公室领取校园卡，并以低血糖口径处理短暂眩晕。", reason: "ARCHIVIST 归档已接受事件。", confidence: "confirmed" },
        { module: "dynamicWorldSetting", operation: "append_note", value: "上海星桥国际学校行政流程已进入林墨日常线。", reason: "ARCHIVIST 归档动态背景。", confidence: "confirmed" }
      ],
      actualElapsedDaysSuggestion: null
    };

    const fetchCalls = [];
    window.__ASiteV2TestSettings = {
      id: "game_settings",
      apiKey: "test-key",
      apiBaseUrl: "https://example.invalid/v1",
      modelName: "stub-model",
      supportsJsonMode: true
    };
    window.__aSiteV2OriginalFetch = async (url, init) => {
      const body = JSON.parse(init && init.body || "{}");
      const systemText = String((body.messages || [])[0] && (body.messages || [])[0].content || "");
      const isStorytellerData = systemText.includes("你是 STORYTELLER_DATA");
      const isArchivist = !isStorytellerData && systemText.includes("你是 ARCHIVIST");
      const payload = isArchivist ? archivistPayload : dataPayload;
      fetchCalls.push({ url: String(url), agent: isArchivist ? "ARCHIVIST" : "STORYTELLER_DATA" });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: `stub_${fetchCalls.length}`,
          object: "chat.completion",
          choices: [{ message: { role: "assistant", content: JSON.stringify(payload) }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 }
        }),
        text: async () => ""
      };
    };

    const currentYearEvent = {
      id: "event_accept_stub",
      selectedTimeStepDays: 0,
      eventYear: "公历2023年9月1日",
      nextAge: "17岁",
      theme: "行政办公室校园卡领取后的身体不适处理",
      outcomeType: "SUCCESS",
      story: "林墨在行政办公室领取校园卡后短暂眩晕。Emma递来一颗牛奶糖，加菲提醒走廊尽头有温水饮水机，阿哲表现出笨拙的担心，柜台办事员给了纸巾并让她坐下缓一缓。林墨用低血糖作为对外解释。",
      statChanges: {},
      selectedKeyword: "校园卡",
      isInteractive: true,
      selectedOption: { id: "option_accept", text: "接受同学的糖并维持低血糖口径" },
      probabilityBreakdown: { finalChance: 90 },
      rollResult: 83
    };
    const accepted = api.interceptLegacyAccept(base, currentYearEvent, { autoCommit: true });
    const eventId = accepted.lastV2AcceptedStoryEventId;
    const storyEvent = (accepted.pendingAcceptedEvents || []).find((event) => event && event.id === eventId) ||
      (accepted.draftHistory || []).find((event) => event && event.id === eventId);
    const extraction = await api.runPostAcceptanceExtraction(accepted, storyEvent, { forceLegacyStateSettlement: true, alreadyNormalized: true });
    const settled = api.applyAcceptedEventSettlement(extraction.player, eventId, { alreadyNormalized: true });
    const saved = await api.saveProfile(settled, { alreadyNormalized: true });
    const reloaded = await api.getLatestProfile({ skipLatestSavedCache: true });
    const persisted = reloaded && reloaded.id === saved.id ? reloaded : saved;
    const storytellerContext = api.buildMainGenerationContextBlock(settled, "STORYTELLER", { requestText: "Emma 行政办公室 校园卡", agentName: "STORYTELLER" });
    const plannerContext = api.buildMainTaskGenerationContextBlock(settled, "PLANNER", { requestText: "Emma 行政办公室 校园卡", agentName: "PLANNER" });
    const lore = api.retrieveLoreEntries(settled, { requestText: "行政办公室 校园卡 Emma" });

    return {
      ok: true,
      runtimeVersion: api.version,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      beliefOnly: {
        npcNames: names(beliefOnlyApplied.npcs),
        npcProfileKeys: Object.keys(beliefOnlyApplied.npcProfiles || {}),
        relationshipNames: names(beliefOnlyApplied.relationshipStates),
        hasUnnamedRelationship: names(beliefOnlyApplied.relationshipStates).includes("未命名认知")
      },
      acceptClosure: {
        fetchAgents: fetchCalls.map((call) => call.agent),
        eventId,
        history: arr(settled.history).length,
        canonHistory: arr(settled.canonHistory).length,
        eventCount: settled.eventCount,
        currentDate: settled.calendarState && settled.calendarState.currentDate,
        spirit: attr(settled, "精神") && attr(settled, "精神").value,
        tags: names(settled.tags),
        npcs: names(settled.npcs),
        goals: settled.goals,
        npcProfileKeys: Object.keys(settled.npcProfiles || {}),
        emmaProfile: settled.npcProfiles && settled.npcProfiles.Emma,
        relationshipNames: names(settled.relationshipStates),
        openThreads: arr(settled.openThreads).map((item) => item && item.name || item && item.summary),
        loreTitles: arr(settled.loreEntries).map((item) => item && item.title),
        sceneMemoryArchive: arr(settled.sceneMemoryArchive).map((item) => item && item.summary),
        shortTermNotes: arr(settled.shortTermSceneMemory && settled.shortTermSceneMemory.notes).map((item) => item && item.summary),
        stateDiffAgents: arr(settled.stateDiffHistory).map((diff) => diff && diff.sourceAgent),
        patchModules: arr(settled.patchHistory).map((patch) => patch && patch.module),
        pendingAcceptedEvents: arr(settled.pendingAcceptedEvents).length,
        pendingStateDiffs: arr(settled.pendingStateDiffs).length,
        persistedHistory: arr(persisted.history).length,
        persistedCanonHistory: arr(persisted.canonHistory).length,
        persistedNpcProfileKeys: Object.keys(persisted.npcProfiles || {}),
        persistedLoreTitles: arr(persisted.loreEntries).map((item) => item && item.title),
        persistedSceneMemoryArchive: arr(persisted.sceneMemoryArchive).map((item) => item && item.summary),
        storytellerContextHasEmma: String(storytellerContext).includes("Emma"),
        storytellerContextHasLore: String(storytellerContext).includes("行政办公室校园卡流程"),
        storytellerContextHasOpenThread: String(storytellerContext).includes("Emma可能会继续留意"),
        plannerContextHasLore: String(plannerContext).includes("行政办公室校园卡流程"),
        plannerContextHasOpenThread: String(plannerContext).includes("Emma可能会继续留意"),
        plannerContextHasSceneArchive: String(plannerContext).includes("Emma递糖，加菲提示饮水机"),
        loreSelected: arr(lore && lore.selected).map((item) => item && item.entry && item.entry.title)
      }
    };
  });

  const evidencePath = path.join(OUT, "v2_state_closure_regression_results.json");
  fs.writeFileSync(evidencePath, JSON.stringify(result, null, 2), "utf8");
  const screenshotPath = path.join(SHOTS, "v2_state_closure_regression_pixel5.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  assert(result.ok, result.error || "page evaluation failed", result);
  assert(result.beliefOnly.npcNames.includes("Emma"), "belief-only npc field did not create Emma NPC", result.beliefOnly);
  assert(result.beliefOnly.npcProfileKeys.includes("Emma"), "belief-only npc field did not create Emma npcProfile", result.beliefOnly);
  assert(!result.beliefOnly.hasUnnamedRelationship, "belief-only npc field still created unnamed relationship", result.beliefOnly);
  assert(result.acceptClosure.fetchAgents.includes("STORYTELLER_DATA"), "STORYTELLER_DATA was not called", result.acceptClosure.fetchAgents);
  assert(result.acceptClosure.fetchAgents.includes("ARCHIVIST"), "ARCHIVIST was not called", result.acceptClosure.fetchAgents);
  assert(result.acceptClosure.history === 1 && result.acceptClosure.canonHistory === 1, "history/canonHistory were not finalized", result.acceptClosure);
  assert(result.acceptClosure.eventCount >= 1, "eventCount was not advanced", result.acceptClosure);
  assert(result.acceptClosure.currentDate === "2023-09-01", "date changed unexpectedly for zero-day event", result.acceptClosure);
  assert(result.acceptClosure.spirit === 51, "legacy statChanges did not update attributes", result.acceptClosure);
  assert(result.acceptClosure.tags.includes("行政口径建立"), "tags patch did not land", result.acceptClosure);
  ["Emma", "加菲", "阿哲", "柜台办事员"].forEach((name) => {
    assert(result.acceptClosure.npcs.includes(name), `NPC ${name} did not land`, result.acceptClosure);
    assert(result.acceptClosure.npcProfileKeys.includes(name), `npcProfile ${name} did not land`, result.acceptClosure);
  });
  assert((result.acceptClosure.goals.completed || []).some((goal) => String(goal.text || "").includes("拿到校园卡")), "goal completion did not land", result.acceptClosure.goals);
  assert((result.acceptClosure.goals.shortTerm || []).includes("完成学生系统绑定"), "new short-term goal did not land", result.acceptClosure.goals);
  assert(result.acceptClosure.openThreads.length >= 1, "speculation/openThreads did not land", result.acceptClosure);
  assert(result.acceptClosure.loreTitles.includes("行政办公室校园卡流程"), "loreEntries patch did not land", result.acceptClosure);
  assert(result.acceptClosure.sceneMemoryArchive.length >= 1, "sceneMemoryArchive patch did not land", result.acceptClosure);
  assert(result.acceptClosure.shortTermNotes.includes("林墨手里有Emma给的牛奶糖。"), "shortTermSceneMemory patch did not land", result.acceptClosure);
  assert(result.acceptClosure.persistedHistory === 1 && result.acceptClosure.persistedCanonHistory === 1, "saved/reloaded profile lost history", result.acceptClosure);
  assert(result.acceptClosure.persistedNpcProfileKeys.includes("Emma"), "saved/reloaded profile lost npcProfiles", result.acceptClosure);
  assert(result.acceptClosure.persistedLoreTitles.includes("行政办公室校园卡流程"), "saved/reloaded profile lost loreEntries", result.acceptClosure);
  assert(result.acceptClosure.persistedSceneMemoryArchive.length >= 1, "saved/reloaded profile lost sceneMemoryArchive", result.acceptClosure);
  assert(
    result.acceptClosure.storytellerContextHasEmma &&
    result.acceptClosure.storytellerContextHasLore &&
    result.acceptClosure.storytellerContextHasOpenThread &&
    result.acceptClosure.plannerContextHasLore &&
    result.acceptClosure.plannerContextHasOpenThread &&
    result.acceptClosure.plannerContextHasSceneArchive,
    "next prompt context missed settled state",
    result.acceptClosure
  );
  assert(result.acceptClosure.loreSelected.includes("行政办公室校园卡流程"), "lore retrieval did not select settled lore", result.acceptClosure);
  assert(result.acceptClosure.pendingAcceptedEvents === 0 && result.acceptClosure.pendingStateDiffs === 0, "pending queues were not cleared", result.acceptClosure);

  console.log(JSON.stringify({ ok: true, evidencePath, screenshotPath, runtimeVersion: result.runtimeVersion }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  if (error && error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
