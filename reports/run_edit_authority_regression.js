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
  await page.goto(`${URL}?_edit_authority=${Date.now()}`);
  await page.waitForLoadState("domcontentloaded");

  const result = await page.evaluate(async () => {
    const api = window.__ASiteV2;
    if (!api) return { ok: false, error: "window.__ASiteV2 missing" };

    const arr = (value) => Array.isArray(value) ? value : [];
    const names = (value) => arr(value).map((item) => item && item.name).filter(Boolean);
    const attr = (player, name) => arr(player.attributes).find((item) => item && item.name === name);
    const latestText = (list) => {
      const item = arr(list).slice(-1)[0] || {};
      return String(item.text || item.storytellerText || item.summary || "");
    };

    const originalText = "原始正文：林墨只是安静走过走廊，没有遇见任何新人物，也没有任何标签或属性变化。";
    const editedText = "编辑后正文：林墨在走廊遇见测试NPC陆青，获得标签「编辑痕迹」，精神提升1点，并完成目标「验证编辑影响」。";

    api.writePendingDiffs([]);
    api.writePendingTextEvents([]);

    const base = api.normalizePlayer({
      id: `edit_authority_${Date.now()}`,
      name: "EditAuthorityRegression",
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
      tags: [],
      npcs: [],
      goals: {
        longTerm: "测试编辑文本是否具备后续权威。",
        shortTerm: ["验证编辑影响"],
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
        sceneId: "scene_edit_authority",
        currentSceneId: "scene_edit_authority",
        currentLocationText: "教学楼走廊",
        activeNpcIds: [],
        presentCharacters: []
      },
      shortTermSceneMemory: {
        sceneId: "scene_edit_authority",
        notes: [],
        lastActions: [],
        unresolvedThreads: []
      },
      npcProfiles: {}
    });

    const calls = [];
    window.__ASiteV2TestSettings = {
      id: "game_settings",
      apiKey: "test-key",
      apiBaseUrl: "https://example.invalid/v1",
      modelName: "stub-model",
      supportsJsonMode: true
    };
    window.__aSiteV2OriginalFetch = async (url, init) => {
      const body = JSON.parse(init && init.body || "{}");
      const messagesText = arr(body.messages).map((message) => String(message && message.content || "")).join("\n");
      const isStorytellerData = messagesText.includes("你是 STORYTELLER_DATA");
      const isArchivist = !isStorytellerData && messagesText.includes("你是 ARCHIVIST");
      const sawEdited = messagesText.includes(editedText);
      const sawOriginal = messagesText.includes(originalText);
      calls.push({
        agent: isArchivist ? "ARCHIVIST" : "STORYTELLER_DATA",
        sawEdited,
        sawOriginal,
        preview: messagesText.slice(0, 300)
      });

      const emptyPayload = {
        confirmedFacts: [],
        speculations: [],
        npcBeliefs: [],
        rejectedOrUnconfirmed: [],
        proposedPatches: [],
        actualElapsedDaysSuggestion: null
      };
      const dataPayload = sawEdited ? {
        statChanges: { "精神": 1 },
        confirmedFacts: [
          { text: "编辑后正文已经作为接受文本进入状态提取。", targetModule: "structuredSummaries", confidence: "confirmed" }
        ],
        speculations: [],
        npcBeliefs: [
          { npc: "陆青", belief: "林墨刚在走廊与自己发生了第一次可延续互动。", confidence: "high" }
        ],
        rejectedOrUnconfirmed: [],
        proposedPatches: [
          { module: "tags", operation: "add", value: [{ name: "编辑痕迹", duration: 2, description: "由编辑后正文触发的测试标签。" }], reason: "只有编辑后正文包含该标签。", confidence: "confirmed" },
          { module: "npcs", operation: "add", value: ["陆青"], reason: "只有编辑后正文包含该 NPC。", confidence: "confirmed" },
          { module: "goals", operation: "update", value: { modifyGoals: { achieve: ["验证编辑影响"], add: [] }, achievedGoals: [] }, reason: "只有编辑后正文声明该目标完成。", confidence: "confirmed" },
          { module: "shortTermSceneMemory", operation: "update", value: { notes: [{ summary: "陆青刚在走廊与林墨接触。", sourceEventId: "event_edit_authority" }], lastActions: ["林墨收起编辑痕迹测试记录"], unresolvedThreads: [] }, reason: "下一轮应记住编辑后正文里的局部连续性。", confidence: "confirmed" }
        ],
        actualElapsedDaysSuggestion: { days: 0, evidence: "同一走廊即时连续。", confidence: "confirmed", selected: true }
      } : emptyPayload;
      const archivistPayload = sawEdited ? {
        confirmedFacts: [],
        speculations: [],
        npcBeliefs: [],
        rejectedOrUnconfirmed: [],
        proposedPatches: [
          { module: "storySummary", operation: "append_note", value: "编辑后正文确认陆青、编辑痕迹标签和验证编辑影响目标进入正史。", reason: "ARCHIVIST 归档编辑后接受文本。", confidence: "confirmed" }
        ],
        actualElapsedDaysSuggestion: null
      } : emptyPayload;
      const payload = isArchivist ? archivistPayload : dataPayload;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: `stub_${calls.length}`,
          object: "chat.completion",
          choices: [{ message: { role: "assistant", content: JSON.stringify(payload) }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 }
        }),
        text: async () => ""
      };
    };

    const originalCurrentYearEvent = {
      id: "event_edit_authority",
      selectedTimeStepDays: 0,
      eventYear: "公历2023年9月1日",
      nextAge: "17岁",
      theme: "编辑功能影响测试",
      outcomeType: "SUCCESS",
      story: originalText,
      storytellerText: originalText,
      text: originalText,
      storyText: originalText,
      resultText: originalText,
      statChanges: {},
      selectedKeyword: "编辑测试",
      isInteractive: true,
      selectedOption: { id: "option_original", text: "原始选项：安静走过走廊" },
      probabilityBreakdown: { finalChance: 90 },
      rollResult: 83
    };
    let currentYearEventAfterEdit = null;
    window.__aiLifeSetCurrentYearEvent = function(updater) {
      currentYearEventAfterEdit = typeof updater === "function" ? updater(originalCurrentYearEvent) : updater;
      return currentYearEventAfterEdit;
    };
    window.__aiLifeSetCurrentYearEvent((event) => Object.assign({}, event, { story: editedText }));
    const bridgeBeforeWarningProbe = window.__ASiteV2ReactBridge;
    const warningHost = document.createElement("div");
    const acceptProbe = document.createElement("button");
    acceptProbe.textContent = "接受命运并成长";
    warningHost.appendChild(acceptProbe);
    document.body.appendChild(warningHost);
    window.__ASiteV2ReactBridge = Object.assign({}, bridgeBeforeWarningProbe || {}, {
      getSnapshot: () => ({ player: base, currentYearEvent: currentYearEventAfterEdit })
    });
    if (typeof api.renderEditedStoryAuthorityWarning === "function") api.renderEditedStoryAuthorityWarning();
    warningHost.appendChild(document.createElement("span"));
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    const warningText = (warningHost.querySelector(".asv2-edit-authority-warning") || {}).textContent || "";
    if (bridgeBeforeWarningProbe) window.__ASiteV2ReactBridge = bridgeBeforeWarningProbe;
    else delete window.__ASiteV2ReactBridge;
    warningHost.remove();

    const accepted = api.interceptLegacyAccept(base, currentYearEventAfterEdit, { autoCommit: true });
    const eventId = accepted.lastV2AcceptedStoryEventId;
    const storyEvent = arr(accepted.pendingAcceptedEvents).find((event) => event && event.id === eventId) ||
      arr(accepted.draftHistory).find((event) => event && event.id === eventId);
    const extraction = await api.runPostAcceptanceExtraction(accepted, storyEvent, { forceLegacyStateSettlement: true, alreadyNormalized: true });
    const settled = api.applyAcceptedEventSettlement(extraction.player, eventId, { alreadyNormalized: true });
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
    const importedPlayer = api.normalizePlayer(JSON.parse(JSON.stringify(exportPayload.player)));
    await api.saveProfile(importedPlayer, { alreadyNormalized: true });
    const importedReloaded = await api.getLatestProfile({ skipLatestSavedCache: true });
    const roundtrip = importedReloaded && importedReloaded.id === importedPlayer.id ? importedReloaded : importedPlayer;
    const storytellerContext = String(api.buildMainGenerationContextBlock(settled, "STORYTELLER", {
      requestText: "继续走廊剧情，检查陆青和编辑痕迹",
      agentName: "STORYTELLER"
    }));

    const historyLatest = latestText(settled.history);
    const canonLatest = latestText(settled.canonHistory);
    const pendingOrDraftLatest = storyEvent && storyEvent.storytellerText || "";

    return {
      ok: true,
      runtimeVersion: api.version,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      originalText,
      editedText,
      fetchCalls: calls,
      eventId,
      setterMarkedEvent: {
        userEditedStory: currentYearEventAfterEdit && currentYearEventAfterEdit.userEditedStory,
        storyTextAuthority: currentYearEventAfterEdit && currentYearEventAfterEdit.storyTextAuthority,
        decisionMetadataStale: currentYearEventAfterEdit && currentYearEventAfterEdit.decisionMetadataStale,
        editRevision: currentYearEventAfterEdit && currentYearEventAfterEdit.editRevision,
        originalStoryHash: currentYearEventAfterEdit && currentYearEventAfterEdit.originalStoryHash,
        originalStoryLength: currentYearEventAfterEdit && currentYearEventAfterEdit.originalStoryLength,
        editedStoryHash: currentYearEventAfterEdit && currentYearEventAfterEdit.editedStoryHash,
        story: currentYearEventAfterEdit && currentYearEventAfterEdit.story,
        storytellerText: currentYearEventAfterEdit && currentYearEventAfterEdit.storytellerText,
        text: currentYearEventAfterEdit && currentYearEventAfterEdit.text,
        storyText: currentYearEventAfterEdit && currentYearEventAfterEdit.storyText,
        resultText: currentYearEventAfterEdit && currentYearEventAfterEdit.resultText
      },
      uiWarningText: warningText,
      storyEvent: {
        text: pendingOrDraftLatest,
        sourceHash: storyEvent && storyEvent.sourceHash,
        userEditedStory: storyEvent && storyEvent.userEditedStory,
        storyTextAuthority: storyEvent && storyEvent.storyTextAuthority,
        decisionMetadataStale: storyEvent && storyEvent.decisionMetadataStale,
        legacyStory: storyEvent && storyEvent.legacyEventPayload && storyEvent.legacyEventPayload.story,
        legacyStorytellerText: storyEvent && storyEvent.legacyEventPayload && storyEvent.legacyEventPayload.storytellerText,
        legacyText: storyEvent && storyEvent.legacyEventPayload && storyEvent.legacyEventPayload.text,
        legacyStoryText: storyEvent && storyEvent.legacyEventPayload && storyEvent.legacyEventPayload.storyText,
        legacyResultText: storyEvent && storyEvent.legacyEventPayload && storyEvent.legacyEventPayload.resultText,
        selectedOptionText: storyEvent && storyEvent.playerAction,
        roll: storyEvent && storyEvent.arbiterResult && storyEvent.arbiterResult.roll
      },
      settled: {
        historyLatest,
        canonLatest,
        historyCount: arr(settled.history).length,
        canonHistoryCount: arr(settled.canonHistory).length,
        spirit: attr(settled, "精神") && attr(settled, "精神").value,
        tags: names(settled.tags),
        npcs: names(settled.npcs),
        npcProfileKeys: Object.keys(settled.npcProfiles || {}),
        goals: settled.goals,
        stateDiffAgents: arr(settled.stateDiffHistory).map((diff) => diff && diff.sourceAgent),
        patchModules: arr(settled.patchHistory).map((patch) => patch && patch.module),
        pendingAcceptedEvents: arr(settled.pendingAcceptedEvents).length,
        pendingStateDiffs: arr(settled.pendingStateDiffs).length,
        storytellerContextHasEditedText: storytellerContext.includes(editedText),
        storytellerContextHasNpc: storytellerContext.includes("陆青"),
        storytellerContextHasTag: storytellerContext.includes("编辑痕迹"),
        storytellerContextHasOriginalText: storytellerContext.includes(originalText)
      },
      persisted: {
        historyLatest: latestText(persisted.history),
        canonLatest: latestText(persisted.canonHistory),
        spirit: attr(persisted, "精神") && attr(persisted, "精神").value,
        tags: names(persisted.tags),
        npcs: names(persisted.npcs),
        goals: persisted.goals
      },
      roundtrip: {
        historyLatest: latestText(roundtrip.history),
        canonLatest: latestText(roundtrip.canonHistory),
        spirit: attr(roundtrip, "精神") && attr(roundtrip, "精神").value,
        tags: names(roundtrip.tags),
        npcs: names(roundtrip.npcs),
        npcProfileKeys: Object.keys(roundtrip.npcProfiles || {}),
        goals: roundtrip.goals
      },
      exportPayload
    };
  });

  const evidencePath = path.join(OUT, "edit_authority_regression_results.json");
  fs.writeFileSync(evidencePath, JSON.stringify(result, null, 2), "utf8");
  const exportPath = path.join(OUT, "edit_authority_export_roundtrip_save.json");
  if (result && result.exportPayload) {
    fs.writeFileSync(exportPath, JSON.stringify(result.exportPayload, null, 2), "utf8");
  }
  const screenshotPath = path.join(SHOTS, "edit_authority_regression_pixel5.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  assert(result.ok, result.error || "page evaluation failed", result);
  assert(result.fetchCalls.some((call) => call.agent === "STORYTELLER_DATA" && call.sawEdited), "STORYTELLER_DATA did not receive edited accepted text", result.fetchCalls);
  assert(result.fetchCalls.some((call) => call.agent === "ARCHIVIST" && call.sawEdited), "ARCHIVIST did not receive edited accepted text", result.fetchCalls);
  assert(result.setterMarkedEvent.userEditedStory === true, "edit setter did not mark userEditedStory", result.setterMarkedEvent);
  assert(result.setterMarkedEvent.storyTextAuthority === "user_edit", "edit setter did not mark storyTextAuthority", result.setterMarkedEvent);
  assert(result.setterMarkedEvent.decisionMetadataStale === true, "edit setter did not mark stale decision metadata", result.setterMarkedEvent);
  assert(result.uiWarningText.includes("正文已编辑") && result.uiWarningText.includes("唯一正史依据"), "edited-story UI warning did not render", result.uiWarningText);
  ["story", "storytellerText", "text", "storyText", "resultText"].forEach((field) => {
    assert(String(result.setterMarkedEvent[field] || "").includes(result.editedText), `edit setter did not synchronize ${field}`, result.setterMarkedEvent);
    assert(!String(result.setterMarkedEvent[field] || "").includes(result.originalText), `edit setter left original text in ${field}`, result.setterMarkedEvent);
  });
  assert(result.storyEvent.text.includes(result.editedText), "pending/accepted story event did not store edited text", result.storyEvent);
  assert(result.storyEvent.userEditedStory === true, "accepted story event did not preserve userEditedStory", result.storyEvent);
  assert(result.storyEvent.storyTextAuthority === "user_edit", "accepted story event did not preserve storyTextAuthority", result.storyEvent);
  assert(result.storyEvent.decisionMetadataStale === true, "accepted story event did not preserve stale metadata marker", result.storyEvent);
  assert(result.storyEvent.legacyStory.includes(result.editedText), "legacy story field did not use edited text", result.storyEvent);
  assert(result.storyEvent.legacyStorytellerText.includes(result.editedText), "legacy storytellerText did not use edited text", result.storyEvent);
  assert(result.storyEvent.legacyText.includes(result.editedText), "legacy text did not use edited text", result.storyEvent);
  assert(result.storyEvent.legacyStoryText.includes(result.editedText), "legacy storyText did not use edited text", result.storyEvent);
  assert(result.storyEvent.legacyResultText.includes(result.editedText), "legacy resultText did not use edited text", result.storyEvent);
  assert(!JSON.stringify(result.storyEvent).includes(result.originalText), "accepted story event still retained original text", result.storyEvent);
  assert(result.settled.historyLatest.includes(result.editedText), "history did not finalize edited text", result.settled);
  assert(!result.settled.historyLatest.includes(result.originalText), "history finalized the stale original text", result.settled);
  assert(result.settled.canonLatest.includes(result.editedText), "canonHistory did not finalize edited text", result.settled);
  assert(!result.settled.canonLatest.includes(result.originalText), "canonHistory finalized the stale original text", result.settled);
  assert(result.settled.spirit === 51, "edited-text-driven attribute patch did not land", result.settled);
  assert(result.settled.tags.includes("编辑痕迹"), "edited-text-driven tag patch did not land", result.settled);
  assert(result.settled.npcs.includes("陆青"), "edited-text-driven NPC patch did not land", result.settled);
  assert(result.settled.npcProfileKeys.includes("陆青"), "edited-text-driven npcProfile did not land", result.settled);
  assert((result.settled.goals.completed || []).some((goal) => String(goal.text || goal).includes("验证编辑影响")), "edited-text-driven goal completion did not land", result.settled.goals);
  assert(result.settled.storytellerContextHasEditedText, "next STORYTELLER context did not include edited accepted text", result.settled);
  assert(result.settled.storytellerContextHasNpc, "next STORYTELLER context did not include edited NPC/state", result.settled);
  assert(result.settled.storytellerContextHasTag, "next STORYTELLER context did not include edited tag/state", result.settled);
  assert(result.persisted.historyLatest.includes(result.editedText), "saved/reloaded profile lost edited history text", result.persisted);
  assert(result.persisted.tags.includes("编辑痕迹"), "saved/reloaded profile lost edited tag", result.persisted);
  assert(result.persisted.npcs.includes("陆青"), "saved/reloaded profile lost edited NPC", result.persisted);
  assert(result.roundtrip.historyLatest.includes(result.editedText), "export/reimport profile lost edited history text", result.roundtrip);
  assert(result.roundtrip.canonLatest.includes(result.editedText), "export/reimport profile lost edited canonHistory text", result.roundtrip);
  assert(!result.roundtrip.historyLatest.includes(result.originalText), "export/reimport profile restored stale original history text", result.roundtrip);
  assert(result.roundtrip.spirit === 51, "export/reimport profile lost edited attribute patch", result.roundtrip);
  assert(result.roundtrip.tags.includes("编辑痕迹"), "export/reimport profile lost edited tag", result.roundtrip);
  assert(result.roundtrip.npcs.includes("陆青"), "export/reimport profile lost edited NPC", result.roundtrip);
  assert(result.roundtrip.npcProfileKeys.includes("陆青"), "export/reimport profile lost edited npcProfile", result.roundtrip);
  assert((result.roundtrip.goals.completed || []).some((goal) => String(goal.text || goal).includes("验证编辑影响")), "export/reimport profile lost edited goal completion", result.roundtrip.goals);

  console.log(JSON.stringify({
    ok: true,
    evidencePath,
    exportPath,
    screenshotPath,
    runtimeVersion: result.runtimeVersion,
    agents: result.fetchCalls.map((call) => ({ agent: call.agent, sawEdited: call.sawEdited, sawOriginal: call.sawOriginal }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  if (error && error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
