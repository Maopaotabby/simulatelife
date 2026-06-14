const fs = require("fs");
const path = require("path");

function requirePlaywright() {
  const bundled = process.env.CODEX_NODE_MODULES ||
    "C:/Users/15164/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
  const candidates = [
    "playwright",
    "playwright-core",
    path.join(bundled, ".pnpm", "playwright-core@1.60.0", "node_modules", "playwright-core"),
    path.join(bundled, ".pnpm", "playwright@1.60.0", "node_modules", "playwright")
  ];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const { chromium } = requirePlaywright();

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "reports", "phase5_full_acceptance_evidence");
const SHOTS = path.join(ROOT, "output", "playwright");
const URL = process.env.A_SITE_URL || "http://127.0.0.1:8765/index.html";
const DEFAULT_SAMPLE_DIR = "C:/Users/15164/OneDrive/xwechat_files/wxid_g86cwlojcs9022_7b68/temp/RWTemp/2026-06/26b33e1176bd8676725a49b8242ced58";

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function findSampleSave() {
  if (process.env.A_SITE_SAMPLE_SAVE && fs.existsSync(process.env.A_SITE_SAMPLE_SAVE)) {
    return process.env.A_SITE_SAMPLE_SAVE;
  }
  const files = fs.readdirSync(DEFAULT_SAMPLE_DIR);
  const file = files.find((name) => /^save_.*_full_2026-06-14_v2\(1\)\.json$/u.test(name));
  if (!file) throw new Error(`sample save not found in ${DEFAULT_SAMPLE_DIR}`);
  return path.join(DEFAULT_SAMPLE_DIR, file);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch (_) {
    return chromium.launch({ headless: true });
  }
}

async function main() {
  const samplePath = findSampleSave();
  const sampleSave = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${URL}?_v2_state_liveness=${Date.now()}`);
  await page.waitForLoadState("domcontentloaded");

  const result = await page.evaluate(async ({ sampleSave }) => {
    const api = window.__ASiteV2;
    if (!api) return { ok: false, error: "window.__ASiteV2 missing" };

    const arr = (value) => Array.isArray(value) ? value : [];
    const names = (value) => arr(value).map((item) => item && item.name).filter(Boolean);
    const attr = (player, name) => arr(player.attributes).find((item) => item && item.name === name);
    const textOf = (entry) => String(entry && (entry.text || entry.storytellerText || entry.summary || "") || "");
    const latestText = (list) => textOf(arr(list).slice(-1)[0]);

    api.writePendingDiffs([]);
    api.writePendingTextEvents([]);

    const samplePlayer = api.normalizePlayer(sampleSave.player || sampleSave);
    const expectedLegacyNpcNames = ["Emma", "加菲", "阿哲", "柜台办事员"];

    const profileOnlyEvent = {
      id: "event_profile_only_patch",
      status: "accepted_text_pending_state",
      acceptedAt: new Date().toISOString(),
      storytellerText: "林墨和只在档案里的同学短暂交换了联系方式。",
      text: "林墨和只在档案里的同学短暂交换了联系方式。",
      eventYearText: "公历2023年9月1日",
      eventAgeText: "17岁",
      eventDate: "2023-09-01"
    };
    const profileOnlyBase = api.normalizePlayer({
      id: `profile_only_${Date.now()}`,
      name: "ProfileOnlyRegression",
      age: "17岁",
      currentYear: "公历2023年9月1日",
      totalDays: 6205,
      calendarState: { currentDate: "2023-09-01" },
      characterAgeState: { legalBirthDate: "2006-09-01", ageDisplayMode: "legacy" },
      attributes: [{ name: "精神", value: 50 }],
      tags: [],
      npcs: [],
      npcProfiles: {},
      goals: { longTerm: "测试", shortTerm: [], completed: [] },
      history: [],
      canonHistory: [],
      pendingAcceptedEvents: [profileOnlyEvent],
      draftHistory: [profileOnlyEvent],
      pendingStateDiffs: []
    });
    const profileOnlyApplied = api.applyConfirmedStateDiff(profileOnlyBase, {
      id: "diff_profile_only_patch",
      status: "pending",
      sourceEventId: profileOnlyEvent.id,
      sourceAgent: "STORYTELLER_DATA",
      confirmedFacts: [],
      speculations: [],
      npcBeliefs: [],
      rejectedOrUnconfirmed: [],
      proposedPatches: [{
        module: "npcProfiles",
        operation: "update",
        value: {
          id: "profile_only_classmate",
          name: "只在档案里的同学",
          publicSummary: "只由 npcProfiles patch 引入的人物。",
          attitude: "初步友好",
          recentInteractions: [{ summary: "与林墨交换联系方式。", sourceEventId: profileOnlyEvent.id }]
        },
        confidence: "confirmed"
      }]
    });

    const lightEvent = {
      id: "event_light_memory_patch",
      status: "accepted_text_pending_state",
      acceptedAt: new Date().toISOString(),
      storytellerText: "Emma把牛奶糖推到林墨手边，林墨用指尖把糖纸压平，暂时没有拆开。",
      text: "Emma把牛奶糖推到林墨手边，林墨用指尖把糖纸压平，暂时没有拆开。",
      eventYearText: "公历2023年9月1日",
      eventAgeText: "17岁",
      eventDate: "2023-09-01"
    };
    const lightBase = api.normalizePlayer({
      id: `light_memory_${Date.now()}`,
      name: "LightMemoryRegression",
      age: "17岁",
      currentYear: "公历2023年9月1日",
      totalDays: 6205,
      calendarState: { currentDate: "2023-09-01" },
      characterAgeState: { legalBirthDate: "2006-09-01", ageDisplayMode: "legacy" },
      attributes: [{ name: "精神", value: 50 }],
      tags: [],
      npcs: [{ name: "Emma" }],
      npcProfiles: {},
      goals: { longTerm: "测试", shortTerm: [], completed: [] },
      history: [],
      canonHistory: [],
      pendingAcceptedEvents: [lightEvent],
      draftHistory: [lightEvent],
      pendingStateDiffs: [],
      sceneControl: { granularityPreset: "micro_action", extractionMode: "light" },
      sceneState: { sceneId: "scene_light", currentSceneId: "scene_light", currentLocationText: "走廊", activeNpcIds: ["Emma"], presentCharacters: ["Emma"] },
      shortTermSceneMemory: { sceneId: "scene_light", notes: [], lastActions: [], unresolvedThreads: [] }
    });
    const lightExtraction = await api.runPostAcceptanceExtraction(lightBase, lightEvent, { alreadyNormalized: true });
    const lightSettled = api.applyAcceptedEventSettlement(lightExtraction.player, lightEvent.id, { alreadyNormalized: true });

    const base = api.normalizePlayer(Object.assign({}, samplePlayer, {
      id: `state_liveness_${Date.now()}`,
      sceneControl: { granularityPreset: "normal_event", extractionMode: "standard" },
      sceneState: {
        sceneId: "scene_state_liveness",
        currentSceneId: "scene_state_liveness",
        currentLocationText: "行政办公室",
        activeNpcIds: ["Emma", "加菲", "阿哲"],
        presentCharacters: ["Emma", "加菲", "阿哲"]
      },
      shortTermSceneMemory: {
        sceneId: "scene_state_liveness",
        currentSceneId: "scene_state_liveness",
        notes: [],
        lastActions: [],
        unresolvedThreads: []
      },
      pendingAcceptedEvents: [],
      pendingStateDiffs: []
    }));

    const dataPayload = {
      statChanges: { "精神": 1 },
      confirmedFacts: [
        { text: "林墨和Emma、加菲、阿哲确认了去食堂前的下一步安排。", targetModule: "structuredSummaries", confidence: "confirmed" }
      ],
      speculations: [
        { text: "Emma可能会继续观察林墨是否真的低血糖。", reason: "她刚才已经递糖并继续同行。", selected: true }
      ],
      npcBeliefs: [
        { npc: "Emma", belief: "林墨愿意接受帮助，但仍在维持低血糖口径。", confidence: "high" },
        { npc: "加菲", belief: "林墨需要一点温水和安静环境。", confidence: "high" },
        { npc: "阿哲", belief: "林墨身体不适但不希望被追问。", confidence: "medium" }
      ],
      rejectedOrUnconfirmed: [],
      proposedPatches: [
        { module: "attributes", operation: "update", value: { "精神": 1 }, reason: "林墨稳定处理社交场面。", confidence: "confirmed" },
        { module: "tags", operation: "add", value: [{ name: "同行关系启动", duration: 4, description: "由普通事件接受后的状态提取写入。" }], reason: "三名同学与林墨形成可延续同行关系。", confidence: "confirmed" },
        { module: "goals", operation: "update", value: { modifyGoals: { add: [{ type: "shortTerm", text: "和Emma等人一起去食堂" }] }, achievedGoals: [] }, reason: "下一步短期行动目标已明确。", confidence: "confirmed" },
        { module: "npcProfiles", operation: "update", value: [
          { id: "Emma", name: "Emma", attitude: "关心但不追问", recentInteractions: [{ summary: "递糖后继续观察林墨状态。", sourceEventId: "event_state_liveness_accept" }] },
          { id: "加菲", name: "加菲", attitude: "认真记录且会主动提醒", recentInteractions: [{ summary: "提醒林墨补水。", sourceEventId: "event_state_liveness_accept" }] },
          { id: "阿哲", name: "阿哲", attitude: "笨拙关心", recentInteractions: [{ summary: "没有追问但跟上同行。", sourceEventId: "event_state_liveness_accept" }] }
        ], reason: "更新三名同学的后续互动状态。", confidence: "confirmed" }
      ],
      actualElapsedDaysSuggestion: { days: 0, evidence: "同一行政办公室外连续事件。", confidence: "confirmed", selected: true }
    };
    const archivistPayload = {
      confirmedFacts: [],
      speculations: [],
      npcBeliefs: [],
      rejectedOrUnconfirmed: [],
      proposedPatches: [
        { module: "storySummary", operation: "append_note", value: "林墨与Emma、加菲、阿哲形成去食堂前的同行关系。", reason: "ARCHIVIST 归档普通事件。", confidence: "confirmed" }
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
      const text = arr(body.messages).map((message) => String(message && message.content || "")).join("\n");
      const isStorytellerData = text.includes("你是 STORYTELLER_DATA");
      const isArchivist = !isStorytellerData && text.includes("你是 ARCHIVIST");
      fetchCalls.push({
        agent: isArchivist ? "ARCHIVIST" : "STORYTELLER_DATA",
        promptHasEmma: text.includes("Emma"),
        promptHasSampleNpc: text.includes("加菲") && text.includes("阿哲"),
        promptHasCurrentEvent: text.includes("同行关系")
      });
      const payload = isArchivist ? archivistPayload : dataPayload;
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
      id: "event_state_liveness_accept",
      selectedTimeStepDays: 0,
      eventYear: "公历2023年9月1日",
      nextAge: "17岁",
      theme: "去食堂前的同行关系启动",
      outcomeType: "SUCCESS",
      story: "林墨在行政办公室外和Emma、加菲、阿哲一起停了几秒。Emma把牛奶糖递过来，加菲提醒饮水机在走廊尽头，阿哲没有追问，只是跟着一起往食堂方向走。林墨维持低血糖口径，默认和他们同行。",
      selectedKeyword: "同行关系",
      isInteractive: true,
      selectedOption: { id: "option_state_liveness", text: "接受同行并去食堂" },
      probabilityBreakdown: { finalChance: 90 },
      rollResult: 83
    };
    const accepted = api.interceptLegacyAccept(base, currentYearEvent, { autoCommit: true });
    const eventId = accepted.lastV2AcceptedStoryEventId;
    const storyEvent = arr(accepted.pendingAcceptedEvents).find((event) => event && event.id === eventId) ||
      arr(accepted.draftHistory).find((event) => event && event.id === eventId);
    const extraction = await api.runPostAcceptanceExtraction(accepted, storyEvent, { forceLegacyStateSettlement: true, alreadyNormalized: true });
    const settled = api.applyAcceptedEventSettlement(extraction.player, eventId, { alreadyNormalized: true });
    const futureContextBlock = api.buildContextBlock(settled, { requestText: "后续普通事件推进" });
    const saved = await api.saveProfile(settled, { alreadyNormalized: true });
    const reloaded = await api.getLatestProfile({ skipLatestSavedCache: true });
    const persisted = reloaded && reloaded.id === saved.id ? reloaded : saved;
    const exportPayload = {
      version: "1.23",
      schemaVersion: "a-site-v2",
      appVersion: api.version,
      exportedAt: new Date().toISOString(),
      isPruned: false,
      player: JSON.parse(JSON.stringify(persisted)),
      logs: []
    };
    const imported = api.normalizePlayer(JSON.parse(JSON.stringify(exportPayload.player)));
    await api.saveProfile(imported, { alreadyNormalized: true });
    const importedReloaded = await api.getLatestProfile({ skipLatestSavedCache: true });
    const roundtrip = importedReloaded && importedReloaded.id === imported.id ? importedReloaded : imported;

    const uiSaved = await api.saveProfile(settled, { alreadyNormalized: true });
    const realBridge = window.__ASiteV2ReactBridge;
    if (realBridge && typeof realBridge.setPlayer === "function") {
      realBridge.setPlayer(uiSaved);
      if (typeof realBridge.setPhase === "function") realBridge.setPhase("IDLE");
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      window.__ASiteV2ReactBridge = {
        getSnapshot: () => ({ player: uiSaved, currentYearEvent: null }),
        setPlayer: () => {},
        setPhase: () => {},
        addLog: () => {}
      };
    }
    const debugButton = document.querySelector("#a-site-v2-button");
    if (typeof api.openV2DebugPanel === "function") await api.openV2DebugPanel(true);
    else if (debugButton) debugButton.click();
    let panelText = "";
    let panelHtml = "";
    let panelClass = "";
    for (let i = 0; i < 20; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      document.querySelectorAll("#a-site-v2-panel details").forEach((details) => { details.open = true; });
      const panel = document.querySelector("#a-site-v2-panel");
      panelClass = String((panel && panel.className) || "");
      panelHtml = String((panel && panel.innerHTML) || "");
      panelText = String((panel && (panel.innerText || panel.textContent)) || "");
      if ((panelText + panelHtml).includes("Emma") && (panelText + panelHtml).includes("加菲") && (panelText + panelHtml).includes("阿哲")) break;
    }
    const panelCombinedText = panelText + "\n" + panelHtml;
    const bodyText = String(document.body && document.body.innerText || "");
    const uiCombinedText = bodyText + "\n" + panelCombinedText;

    return {
      ok: true,
      runtimeVersion: api.version,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      sampleRepair: {
        history: arr(samplePlayer.history).length,
        stateDiffHistory: arr(samplePlayer.stateDiffHistory).length,
        npcs: names(samplePlayer.npcs),
        npcProfileKeys: Object.keys(samplePlayer.npcProfiles || {}),
        expectedLegacyNpcNames
      },
      profileOnly: {
        npcs: names(profileOnlyApplied.npcs),
        npcProfileKeys: Object.keys(profileOnlyApplied.npcProfiles || {})
      },
      lightMemory: {
        notes: arr(lightSettled.shortTermSceneMemory && lightSettled.shortTermSceneMemory.notes).map((item) => item && item.summary),
        lastActions: arr(lightSettled.shortTermSceneMemory && lightSettled.shortTermSceneMemory.lastActions),
        historyLatest: latestText(lightSettled.history)
      },
      acceptClosure: {
        fetchCalls,
        eventId,
        historyLatest: latestText(settled.history),
        canonLatest: latestText(settled.canonHistory),
        historyCount: arr(settled.history).length,
        canonHistoryCount: arr(settled.canonHistory).length,
        eventCount: settled.eventCount,
        spirit: attr(settled, "精神") && attr(settled, "精神").value,
        tags: names(settled.tags),
        npcs: names(settled.npcs),
        npcProfileKeys: Object.keys(settled.npcProfiles || {}),
        goals: settled.goals,
        patchModules: arr(settled.patchHistory).map((patch) => patch && patch.module),
        stateDiffAgents: arr(settled.stateDiffHistory).map((diff) => diff && diff.sourceAgent),
        pendingAcceptedEvents: arr(settled.pendingAcceptedEvents).length,
        pendingStateDiffs: arr(settled.pendingStateDiffs).length,
        panelHasButton: !!debugButton,
        panelClass,
        panelTextLength: panelText.length,
        panelHtmlLength: panelHtml.length,
        panelHasEmma: panelCombinedText.includes("Emma"),
        panelHasJiafei: panelCombinedText.includes("加菲"),
        panelHasAzhe: panelCombinedText.includes("阿哲"),
        panelHasTag: panelCombinedText.includes("同行关系启动"),
        bodyHasTag: bodyText.includes("同行关系启动"),
        bodyHasGoal: bodyText.includes("和Emma等人一起去食堂"),
        uiHasTag: uiCombinedText.includes("同行关系启动"),
        uiHasGoal: uiCombinedText.includes("和Emma等人一起去食堂"),
        futureContextHasEmma: futureContextBlock.includes("Emma"),
        futureContextHasJiafei: futureContextBlock.includes("加菲"),
        futureContextHasAzhe: futureContextBlock.includes("阿哲"),
        futureContextHasTag: futureContextBlock.includes("同行关系启动"),
        futureContextHasGoal: futureContextBlock.includes("和Emma等人一起去食堂"),
        panelPreview: panelCombinedText.slice(0, 1000)
      },
      persisted: {
        npcs: names(persisted.npcs),
        npcProfileKeys: Object.keys(persisted.npcProfiles || {}),
        tags: names(persisted.tags),
        goals: persisted.goals,
        historyLatest: latestText(persisted.history)
      },
      roundtrip: {
        npcs: names(roundtrip.npcs),
        npcProfileKeys: Object.keys(roundtrip.npcProfiles || {}),
        tags: names(roundtrip.tags),
        goals: roundtrip.goals,
        historyLatest: latestText(roundtrip.history)
      }
    };
  }, { sampleSave });

  const evidencePath = path.join(OUT, "v2_state_liveness_save_regression_results.json");
  fs.writeFileSync(evidencePath, JSON.stringify({
    samplePath,
    ...result
  }, null, 2), "utf8");
  const screenshotPath = path.join(SHOTS, "v2_state_liveness_save_regression_pixel5.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  assert(result.ok, result.error || "page evaluation failed", result);
  result.sampleRepair.expectedLegacyNpcNames.forEach((name) => {
    assert(result.sampleRepair.npcs.includes(name), `sample normalize did not repair NPC ${name}`, result.sampleRepair);
    assert(result.sampleRepair.npcProfileKeys.includes(name), `sample normalize did not repair npcProfile ${name}`, result.sampleRepair);
  });
  assert(result.profileOnly.npcs.includes("只在档案里的同学"), "npcProfiles-only patch did not add NPC list entry", result.profileOnly);
  assert(result.profileOnly.npcProfileKeys.includes("profile_only_classmate"), "npcProfiles-only patch did not keep profile", result.profileOnly);
  assert(result.lightMemory.notes.some((text) => String(text || "").includes("Emma把牛奶糖")), "light extraction did not write shortTermSceneMemory note", result.lightMemory);
  assert(result.lightMemory.lastActions.some((text) => String(text || "").includes("Emma把牛奶糖")), "light extraction did not write lastActions", result.lightMemory);
  assert(result.acceptClosure.fetchCalls.some((call) => call.agent === "STORYTELLER_DATA"), "STORYTELLER_DATA was not called", result.acceptClosure.fetchCalls);
  assert(result.acceptClosure.fetchCalls.some((call) => call.agent === "ARCHIVIST"), "ARCHIVIST was not called", result.acceptClosure.fetchCalls);
  assert(result.acceptClosure.fetchCalls.every((call) => call.promptHasEmma && call.promptHasSampleNpc), "state extraction prompt did not include repaired sample NPC state", result.acceptClosure.fetchCalls);
  assert(result.acceptClosure.historyLatest.includes("同行"), "accepted normal event did not finalize into history", result.acceptClosure);
  assert(result.acceptClosure.canonLatest.includes("同行"), "accepted normal event did not finalize into canonHistory", result.acceptClosure);
  assert(result.acceptClosure.spirit >= 1, "attributes patch did not land", result.acceptClosure);
  assert(result.acceptClosure.tags.includes("同行关系启动"), "tags patch did not land", result.acceptClosure);
  assert(result.acceptClosure.patchModules.includes("goals"), "goals patch was not recorded as applied", result.acceptClosure);
  ["Emma", "加菲", "阿哲"].forEach((name) => {
    assert(result.acceptClosure.npcs.includes(name), `accepted event did not keep/add NPC ${name}`, result.acceptClosure);
    assert(result.acceptClosure.npcProfileKeys.includes(name), `accepted event did not keep/add npcProfile ${name}`, result.acceptClosure);
  });
  assert((result.acceptClosure.goals.shortTerm || []).includes("和Emma等人一起去食堂"), "goals patch did not land", result.acceptClosure.goals);
  assert(result.acceptClosure.pendingAcceptedEvents === 0 && result.acceptClosure.pendingStateDiffs === 0, "pending queues were not cleared", result.acceptClosure);
  assert(result.acceptClosure.panelHasEmma && result.acceptClosure.panelHasJiafei && result.acceptClosure.panelHasAzhe, "debug UI did not display settled NPC/npcProfiles state", result.acceptClosure);
  assert(result.acceptClosure.uiHasTag, "page UI did not display settled tag state", result.acceptClosure);
  assert(result.acceptClosure.futureContextHasEmma && result.acceptClosure.futureContextHasJiafei && result.acceptClosure.futureContextHasAzhe, "future prompt context lost settled NPC state", result.acceptClosure);
  assert(result.acceptClosure.futureContextHasTag && result.acceptClosure.futureContextHasGoal, "future prompt context lost settled tag/goal state", result.acceptClosure);
  ["Emma", "加菲", "阿哲"].forEach((name) => {
    assert(result.persisted.npcs.includes(name), `saved/reloaded profile lost NPC ${name}`, result.persisted);
    assert(result.roundtrip.npcs.includes(name), `export/reimport profile lost NPC ${name}`, result.roundtrip);
  });
  assert(result.persisted.tags.includes("同行关系启动"), "saved/reloaded profile lost tag", result.persisted);
  assert(result.roundtrip.tags.includes("同行关系启动"), "export/reimport profile lost tag", result.roundtrip);

  console.log(JSON.stringify({
    ok: true,
    samplePath,
    evidencePath,
    screenshotPath,
    runtimeVersion: result.runtimeVersion
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  if (error && error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
