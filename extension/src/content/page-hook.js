(() => {
  "use strict";

  const CHANNEL = "aviator-history-recorder-v1";
  const SOURCE = "aviator-page-hook";
  const bridgeId = crypto.randomUUID();
  const pendingResults = [];
  const seenRoundIds = new Set();
  const MAX_PENDING_RESULTS = 100;

  let captureState = "pending";
  let diagnosticsEnabled = false;

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.channel !== CHANNEL) {
      return;
    }

    if (
      event.data.source === "aviator-content-script" &&
      event.data.type === "discover"
    ) {
      postReady();
      return;
    }

    if (
      event.data.source === "aviator-content-script" &&
      event.data.type === "control" &&
      event.data.bridgeId === bridgeId
    ) {
      captureState = event.data.enabled ? "enabled" : "disabled";
      diagnosticsEnabled = Boolean(event.data.diagnosticsEnabled);

      if (captureState === "enabled") {
        flushPendingResults();
      } else {
        pendingResults.length = 0;
      }
    }
  });

  if (isTargetGameFrame()) {
    patchConsoleLog();
  }

  postReady();

  function isTargetGameFrame() {
    const hostname = String(location.hostname || "").toLowerCase();

    // Betera сначала открывает launch.spribegaming.com/games/launch/aviator,
    // а уже эта страница загружает клиент с aviator-next.spribegaming.com.
    // Перехват должен устанавливаться в обоих вариантах кадра.
    return (
      hostname === "spribegaming.com" ||
      hostname.endsWith(".spribegaming.com")
    );
  }

  function postReady() {
    window.postMessage(
      {
        channel: CHANNEL,
        source: SOURCE,
        type: "ready",
        bridgeId
      },
      "*"
    );
  }

  function patchConsoleLog() {
    const nativeLog = console.log;
    if (typeof nativeLog !== "function" || nativeLog.__aviatorRecorderPatched) {
      return;
    }

    function recorderLog(...args) {
      try {
        inspectSfsResponseLog(args);
      } catch {
        // Сборщик не должен влиять на работу игры или консоли.
      }

      return Reflect.apply(nativeLog, this, args);
    }

    Object.defineProperty(recorderLog, "__aviatorRecorderPatched", {
      value: true
    });

    console.log = recorderLog;
  }

  function inspectSfsResponseLog(args) {
    const firstArgument = String(args[0] || "");
    const match = firstArgument.match(
      /\[\s*SFS RESPONSE\s*\]\s+([A-Za-z0-9_]+)/i
    );

    if (!match) {
      return;
    }

    const command = match[1];
    const payload = findPayloadObject(args);
    if (!payload || !isSuccessfulResponse(payload)) {
      return;
    }

    if (command === "init") {
      captureInitialHistory(payload.roundsInfo);
      return;
    }

    if (command === "roundChartInfo") {
      captureCompletedRound(payload, command);
      return;
    }

    if (diagnosticsEnabled && command === "previousRoundInfoResponse") {
      postDiagnostic(command, payload);
    }
  }

  function findPayloadObject(args) {
    for (let index = args.length - 1; index >= 1; index -= 1) {
      const candidate = args[index];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  function isSuccessfulResponse(payload) {
    return payload.code === undefined || Number(payload.code) === 200;
  }

  function captureInitialHistory(roundsInfo) {
    if (!Array.isArray(roundsInfo)) {
      return;
    }

    const results = [];
    for (const round of roundsInfo.slice(0, 100)) {
      const result = buildCompletedRound(round, "init");
      if (result) {
        results.push(result);
      }
    }

    queueOrPost(results);
  }

  function captureCompletedRound(round, command) {
    const result = buildCompletedRound(round, command);
    if (result) {
      queueOrPost([result]);
    }
  }

  function buildCompletedRound(round, command) {
    if (!round || typeof round !== "object") {
      return null;
    }

    const roundId = normalizeRoundId(round.roundId);
    const multiplier = normalizeMultiplier(round.maxMultiplier);

    if (!roundId || multiplier === null || seenRoundIds.has(roundId)) {
      return null;
    }

    seenRoundIds.add(roundId);

    return {
      multiplier,
      roundId,
      happenedAt: normalizeTimestamp(
        round.roundEndDate ??
          round.endedAt ??
          round.roundStartDate ??
          round.createdAt ??
          round.serverTime ??
          null
      ),
      source: "websocket",
      confidence: 1,
      metadata: {
        parser: "spribe-sfs-console",
        command,
        final: true
      }
    };
  }

  function queueOrPost(results) {
    if (!Array.isArray(results) || results.length === 0 || captureState === "disabled") {
      return;
    }

    if (captureState === "pending") {
      for (const result of results) {
        if (pendingResults.length >= MAX_PENDING_RESULTS) {
          break;
        }
        pendingResults.push(result);
      }
      return;
    }

    postCapture(results);
  }

  function flushPendingResults() {
    if (pendingResults.length === 0) {
      return;
    }

    const results = pendingResults.splice(0, pendingResults.length);
    postCapture(results);
  }

  function normalizeRoundId(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return String(value).trim().slice(0, 128) || null;
  }

  function normalizeMultiplier(value) {
    if (typeof value === "string") {
      value = value.trim().replace(/[xх]/gi, "").replace(",", ".");
    }

    const multiplier = Number(value);
    if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 1_000_000) {
      return null;
    }

    return Number(multiplier.toFixed(2));
  }

  function normalizeTimestamp(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    let date;
    if (typeof value === "number") {
      date = new Date(value < 10_000_000_000 ? value * 1000 : value);
    } else {
      date = new Date(value);
    }

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function postCapture(results) {
    window.postMessage(
      {
        channel: CHANNEL,
        source: SOURCE,
        bridgeId,
        type: "capture",
        payload: JSON.stringify({ results })
      },
      "*"
    );
  }

  function postDiagnostic(command, payload) {
    window.postMessage(
      {
        channel: CHANNEL,
        source: SOURCE,
        bridgeId,
        type: "diagnostic",
        payload: JSON.stringify({
          sample: {
            transport: "websocket",
            direction: "in",
            endpointUrl: null,
            payloadSample: JSON.stringify({ command, payload }).slice(0, 8000)
          }
        })
      },
      "*"
    );
  }
})();
