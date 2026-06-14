const fs = require("fs");
const path = require("path");

function requirePlaywright() {
  try {
    return require("playwright");
  } catch (_) {
    const bundled = process.env.CODEX_NODE_MODULES ||
      "C:/Users/15164/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
    return require(path.join(bundled, "playwright"));
  }
}

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "reports", "phase5_full_acceptance_evidence");
const DEFAULT_URL = process.env.A_SITE_URL || "http://127.0.0.1:8765/index.html";

function usage() {
  return [
    "Usage:",
    "  node reports/validate_v2_closure_export.js --save <export.json> [--baseline <before.json>] [--url <runtime-url>] [--no-runtime] [--strict-deltas]",
    "",
    "This script reads A-site export JSON and verifies the V2 accept-closure fields.",
    "It does not modify the save, browser storage, or call external AI APIs."
  ].join("\n");
}

function parseArgs(argv) {
  const args = { save: "", baseline: "", url: DEFAULT_URL, runtime: true, strictDeltas: false };
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--save") args.save = argv[++i] || "";
    else if (item === "--baseline") args.baseline = argv[++i] || "";
    else if (item === "--url") args.url = argv[++i] || "";
    else if (item === "--no-runtime") args.runtime = false;
    else if (item === "--strict-deltas") args.strictDeltas = true;
    else if (item === "--help" || item === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${item}`);
  }
  return args;
}

function readJson(file) {
  const resolved = path.resolve(file);
  return { file: resolved, data: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function playerOf(payload) {
  return payload && payload.player && typeof payload.player === "object" ? payload.player : payload;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function obj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function namesFromArray(value) {
  return arr(value).map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") return text(item.name || item.title || item.npcName || item.id);
    return "";
  }).filter(Boolean);
}

function objectKeys(value) {
  return Object.keys(obj(value)).filter(Boolean);
}

function latestEntry(value) {
  const list = arr(value).filter(Boolean);
  return list.length ? list[list.length - 1] : null;
}

function entryText(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return text(entry.text || entry.story || entry.storytellerText || entry.content || entry.summary || entry.result || entry.theme);
}

function goalSnapshot(goals) {
  const g = obj(goals);
  return {
    longTerm: text(g.longTerm),
    shortTerm: arr(g.shortTerm).map((item) => typeof item === "string" ? item : text(item && (item.text || item.name))).filter(Boolean),
    completed: arr(g.completed).map((item) => typeof item === "string" ? item : text(item && (item.text || item.name))).filter(Boolean)
  };
}

function attributeMap(attributes) {
  const result = {};
  arr(attributes).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const key = text(item.name || item.id);
    if (!key) return;
    result[key] = item.value;
  });
  return result;
}

function summaryFor(payload) {
  const player = playerOf(payload);
  const latestHistory = latestEntry(player.history);
  const latestCanon = latestEntry(player.canonHistory);
  const latestDiff = latestEntry(player.stateDiffHistory);
  return {
    rootSchemaVersion: payload && payload.schemaVersion,
    rootAppVersion: payload && payload.appVersion,
    playerId: text(player.id),
    name: text(player.name),
    age: text(player.age),
    currentYear: text(player.currentYear),
    currentDate: text(player.calendarState && player.calendarState.currentDate),
    totalDays: player.totalDays,
    eventCount: player.eventCount,
    historyCount: arr(player.history).length,
    canonHistoryCount: arr(player.canonHistory).length,
    stateDiffHistoryCount: arr(player.stateDiffHistory).length,
    patchHistoryCount: arr(player.patchHistory).length,
    pendingAcceptedEventsCount: arr(player.pendingAcceptedEvents).length,
    pendingStateDiffsCount: arr(player.pendingStateDiffs).length,
    attributes: attributeMap(player.attributes),
    tagNames: namesFromArray(player.tags),
    npcNames: namesFromArray(player.npcs),
    goals: goalSnapshot(player.goals),
    npcProfileKeys: objectKeys(player.npcProfiles),
    relationshipNames: namesFromArray(player.relationshipStates),
    openThreadNames: namesFromArray(player.openThreads),
    loreTitles: namesFromArray(player.loreEntries),
    sceneMemorySummaries: arr(player.sceneMemoryArchive).map((item) => text(item && (item.summary || item.text || item.title))).filter(Boolean),
    shortTermSceneNotes: arr(player.shortTermSceneMemory && player.shortTermSceneMemory.notes).map((item) => text(item && (item.summary || item.text))).filter(Boolean),
    latestHistoryId: text(latestHistory && latestHistory.id),
    latestCanonId: text(latestCanon && latestCanon.id),
    latestStateDiffId: text(latestDiff && latestDiff.id),
    latestHistoryTextSample: entryText(latestHistory).slice(0, 240),
    latestCanonTextSample: entryText(latestCanon).slice(0, 240)
  };
}

function setDelta(after, before) {
  const a = new Set(after || []);
  const b = new Set(before || []);
  return {
    added: Array.from(a).filter((item) => !b.has(item)),
    removed: Array.from(b).filter((item) => !a.has(item))
  };
}

function attributesChanged(after, before) {
  const changed = [];
  const keys = new Set(Object.keys(after || {}).concat(Object.keys(before || {})));
  keys.forEach((key) => {
    if ((after || {})[key] !== (before || {})[key]) changed.push({ name: key, before: (before || {})[key], after: (after || {})[key] });
  });
  return changed;
}

function goalsChanged(after, before) {
  return JSON.stringify(after || {}) !== JSON.stringify(before || {});
}

function hasPatchModule(player, moduleName) {
  const target = text(moduleName);
  const patches = arr(player.patchHistory).concat(arr(player.stateDiffHistory).flatMap((diff) => arr(diff && diff.proposedPatches)));
  return patches.some((patch) => text(patch && patch.module) === target);
}

function latestDiffHasNpcBeliefs(player) {
  const diff = latestEntry(player.stateDiffHistory);
  return arr(diff && diff.npcBeliefs).length > 0;
}

function validationFor(savePayload, baselinePayload, options) {
  const player = playerOf(savePayload);
  const save = summaryFor(savePayload);
  const baseline = baselinePayload ? summaryFor(baselinePayload) : null;
  const deltas = baseline ? {
    history: save.historyCount - baseline.historyCount,
    canonHistory: save.canonHistoryCount - baseline.canonHistoryCount,
    eventCount: Number(save.eventCount || 0) - Number(baseline.eventCount || 0),
    stateDiffHistory: save.stateDiffHistoryCount - baseline.stateDiffHistoryCount,
    tags: setDelta(save.tagNames, baseline.tagNames),
    npcs: setDelta(save.npcNames, baseline.npcNames),
    npcProfiles: setDelta(save.npcProfileKeys, baseline.npcProfileKeys),
    relationships: setDelta(save.relationshipNames, baseline.relationshipNames),
    openThreads: setDelta(save.openThreadNames, baseline.openThreadNames),
    loreEntries: setDelta(save.loreTitles, baseline.loreTitles),
    sceneMemoryArchive: save.sceneMemorySummaries.length - baseline.sceneMemorySummaries.length,
    shortTermSceneNotes: save.shortTermSceneNotes.length - baseline.shortTermSceneNotes.length,
    attributes: attributesChanged(save.attributes, baseline.attributes),
    goalsChanged: goalsChanged(save.goals, baseline.goals)
  } : null;

  const unnamed = "\u672a\u547d\u540d\u8ba4\u77e5";
  const v2StatePresent = [
    save.npcProfileKeys.length,
    save.relationshipNames.length,
    save.openThreadNames.length,
    save.loreTitles.length,
    save.sceneMemorySummaries.length
  ].some((count) => count > 0);
  const v2StateChanged = !deltas || [
    deltas.npcProfiles.added.length,
    deltas.relationships.added.length,
    deltas.openThreads.added.length,
    deltas.loreEntries.added.length,
    deltas.sceneMemoryArchive
  ].some((count) => count > 0);
  const baseClosureChanged = !deltas || deltas.history > 0 || deltas.canonHistory > 0 || deltas.eventCount > 0 ||
    save.latestHistoryId !== baseline.latestHistoryId || save.latestCanonId !== baseline.latestCanonId;

  const checks = {
    hasPlayer: !!player && typeof player === "object",
    hasHistory: save.historyCount > 0,
    hasCanonHistory: save.canonHistoryCount > 0,
    hasDateOrYear: !!(save.currentDate || save.currentYear),
    hasAge: !!save.age,
    hasNumericEventCount: typeof save.eventCount === "number",
    hasAttributes: Object.keys(save.attributes).length > 0,
    hasTags: save.tagNames.length > 0,
    hasNpcs: save.npcNames.length > 0,
    hasGoals: !!(save.goals.longTerm || save.goals.shortTerm.length || save.goals.completed.length),
    pendingQueuesCleared: save.pendingAcceptedEventsCount === 0 && save.pendingStateDiffsCount === 0,
    noUnnamedRelationships: !save.relationshipNames.includes(unnamed),
    v2StatePresent,
    baseClosureChanged,
    v2StateChanged,
    falseBeliefsStayNpcScoped: !latestDiffHasNpcBeliefs(player) || save.relationshipNames.length > 0,
    strictTagDelta: !baseline || !options.strictDeltas || deltas.tags.added.length || deltas.tags.removed.length || hasPatchModule(player, "tags"),
    strictNpcDelta: !baseline || !options.strictDeltas || deltas.npcs.added.length || hasPatchModule(player, "npcs"),
    strictGoalDelta: !baseline || !options.strictDeltas || deltas.goalsChanged || hasPatchModule(player, "goals"),
    attributeChangeOrNoExplicitPatch: !baseline || deltas.attributes.length > 0 || !hasPatchModule(player, "attributes")
  };

  return {
    ok: Object.values(checks).every(Boolean),
    generatedAt: new Date().toISOString(),
    save,
    baseline,
    deltas,
    checks
  };
}

async function runtimePromptCheck(player, url) {
  const { chromium } = requirePlaywright();
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch (_) {
    browser = await chromium.launch({ headless: true });
  }
  const page = await browser.newPage();
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}_v2_export_validate=${Date.now()}`);
  await page.waitForLoadState("domcontentloaded");
  const result = await page.evaluate(async (arg) => {
    const api = window.__ASiteV2;
    if (!api) return { ok: false, error: "window.__ASiteV2 missing" };
    const normalized = api.normalizePlayer(arg.player || {});
    const latest = (Array.isArray(normalized.canonHistory) && normalized.canonHistory.length ? normalized.canonHistory[normalized.canonHistory.length - 1] : null) ||
      (Array.isArray(normalized.history) && normalized.history.length ? normalized.history[normalized.history.length - 1] : null);
    const requestText = [
      latest && (latest.text || latest.story || latest.storytellerText || latest.summary || latest.theme),
      (normalized.npcs || []).map((item) => item && (item.name || item)).join(" "),
      (normalized.loreEntries || []).map((item) => item && item.title).join(" ")
    ].filter(Boolean).join(" ").slice(0, 800);
    const storyteller = String(api.buildMainGenerationContextBlock(normalized, "STORYTELLER", { requestText, agentName: "STORYTELLER" }));
    const planner = String(api.buildMainTaskGenerationContextBlock(normalized, "PLANNER", { requestText, agentName: "PLANNER" }));
    const markerNames = []
      .concat((normalized.relationshipStates || []).map((item) => item && (item.name || item.npcName)))
      .concat((normalized.openThreads || []).map((item) => item && (item.name || item.summary)))
      .concat((normalized.loreEntries || []).map((item) => item && item.title))
      .concat((normalized.sceneMemoryArchive || []).map((item) => item && item.summary))
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
    const matchedMarkers = markerNames.filter((marker) => storyteller.includes(marker) || planner.includes(marker));
    return {
      ok: true,
      runtimeVersion: api.version,
      scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      storytellerHasRecallBlock: storyteller.includes("[PERSISTENT_STATE_RECALL]"),
      plannerHasRecallBlock: planner.includes("[PERSISTENT_STATE_RECALL]"),
      markerCount: markerNames.length,
      matchedMarkerCount: matchedMarkers.length,
      matchedMarkers: matchedMarkers.slice(0, 8)
    };
  }, { player });
  await browser.close();
  result.ok = !!(result.ok && result.storytellerHasRecallBlock && result.plannerHasRecallBlock && (!result.markerCount || result.matchedMarkerCount > 0));
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.save) {
    console.log(usage());
    process.exit(args.help ? 0 : 2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const save = readJson(args.save);
  const baseline = args.baseline ? readJson(args.baseline) : null;
  const result = validationFor(save.data, baseline && baseline.data, args);
  result.input = { save: save.file, baseline: baseline && baseline.file, url: args.url, runtime: args.runtime, strictDeltas: args.strictDeltas };
  if (args.runtime) {
    result.runtimePrompt = await runtimePromptCheck(playerOf(save.data), args.url);
    result.ok = result.ok && result.runtimePrompt.ok;
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const outPath = path.join(OUT, `v2_closure_export_validation_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify({ ok: result.ok, outPath, checks: result.checks, runtimePrompt: result.runtimePrompt }, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
