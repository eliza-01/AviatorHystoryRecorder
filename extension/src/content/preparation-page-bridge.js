(() => {
  "use strict";

  const GAME_HOST_PATTERN = /(^|\.)spribegaming\.com$/i;
  const CHANNEL = "aviator-preparation-v2";
  const CONTROLLER_SOURCE = "aviator-preparation-controller";
  const STRATEGY_CONTROLLER_SOURCE = "aviator-strategy-controller";
  const BRIDGE_SOURCE = "aviator-preparation-page-bridge";
  const POLL_INTERVAL_MS = 120;
  const GAME_READY_TIMEOUT_MS = 60_000;
  const STEP_TIMEOUT_MS = 10_000;
  const ACTION_RETRY_TIMEOUT_MS = 2_500;

  if (!GAME_HOST_PATTERN.test(location.hostname)) {
    return;
  }

  let runSequence = 0;
  const activeRuns = new Map();
  let activeControllerSource = null;

  window.addEventListener("message", onControllerMessage, false);

  function onControllerMessage(event) {
    if (event.source !== window) {
      return;
    }

    const message = event.data;
    if (
      !message ||
      message.channel !== CHANNEL ||
      ![CONTROLLER_SOURCE, STRATEGY_CONTROLLER_SOURCE].includes(message.source)
    ) {
      return;
    }

    if (message.type === "PING") {
      postMessageToController(
        "BRIDGE_READY",
        message.requestId,
        {},
        message.source
      );
      return;
    }

    if (message.type === "CANCEL") {
      cancelControllerRun(message.source, message.requestId);
      return;
    }

    if (!["PREPARE", "PREPARE_AND_BET", "FAKE_BET"].includes(message.type)) {
      return;
    }

    const requestId = String(message.requestId || "");
    const run = beginControllerRun(message.source, requestId);
    if (!run) {
      postMessageToController(
        "PREPARE_RESULT",
        requestId,
        {
          ok: false,
          stage: "error",
          error: "Интерфейс уже управляется активной стратегией"
        },
        message.source
      );
      return;
    }

    const settings = {
      bet: normalizePositiveNumber(message.settings?.bet, 1),
      cashout: normalizePositiveNumber(message.settings?.cashout, 2)
    };

    if (message.type === "FAKE_BET") {
      void runFakeBet(run, requestId);
      return;
    }

    void runPreparation(
      run,
      requestId,
      settings,
      message.type === "PREPARE_AND_BET"
    );
  }

  async function runFakeBet(run, requestId) {
    let firstClickPerformed = false;
    try {
      const initial = await waitFor(() => {
        const current = findBetButtonState();
        return current?.ready ? current : null;
      }, 1_200, run).catch(() => null);

      if (!initial?.button) {
        postMessageToController("PREPARE_RESULT", requestId, {
          ok: true,
          performed: false,
          skipped: true,
          reason: "bet-button-not-ready"
        }, run.source);
        completeControllerRun(run);
        return;
      }

      ensureActiveRun(run);
      performClick(initial.button);
      firstClickPerformed = true;
      await delay(300, run);

      const afterFirstClick = findBetButtonState();
      if (afterFirstClick?.ready) {
        postMessageToController("PREPARE_RESULT", requestId, {
          ok: true,
          performed: false,
          skipped: true,
          reason: "bet-was-not-accepted"
        }, run.source);
        completeControllerRun(run);
        return;
      }

      const cancelState = await waitFor(() => {
        const current = findBetButtonState();
        if (!current || current.disabled) {
          return null;
        }
        if (current.ready) {
          return { mode: "ready", state: current };
        }
        if (isCancelBetLabel(current.label)) {
          return { mode: "cancel", state: current };
        }
        return null;
      }, 1_200, run).catch(() => null);

      if (cancelState?.mode === "ready") {
        postMessageToController("PREPARE_RESULT", requestId, {
          ok: true,
          performed: false,
          skipped: true,
          reason: "bet-returned-to-ready"
        }, run.source);
        completeControllerRun(run);
        return;
      }
      if (cancelState?.mode !== "cancel" || !cancelState.state?.button) {
        throw new Error("после первого клика не появилась подтверждённая кнопка отмены");
      }

      performClick(cancelState.state.button);
      await waitFor(() => {
        const current = findBetButtonState();
        return current?.ready ? current : null;
      }, ACTION_RETRY_TIMEOUT_MS, run);

      postMessageToController("PREPARE_RESULT", requestId, {
        ok: true,
        performed: true,
        cancelled: true,
        delayMs: 300
      }, run.source);
      completeControllerRun(run);
    } catch (error) {
      if (error?.name === "PreparationCancelledError") {
        return;
      }
      postMessageToController("PREPARE_RESULT", requestId, {
        ok: false,
        performed: firstClickPerformed,
        stage: "error",
        error: error instanceof Error ? error.message : String(error)
      }, run.source);
      completeControllerRun(run);
    }
  }

  async function runPreparation(run, requestId, settings, placeBetAfterPreparation) {
    try {
      emitStage(requestId, "waiting-game", settings);
      await waitFor(() => findPrimaryBetControl(), GAME_READY_TIMEOUT_MS, run);

      emitStage(requestId, "switching-auto", settings);
      await switchToAutoTab(run);

      emitStage(requestId, "enabling-cashout", settings);
      await enableAutoCashout(run);

      emitStage(requestId, "setting-cashout", settings);
      await setCashoutValue(settings.cashout, run);

      emitStage(requestId, "setting-bet", settings);
      await setBetValue(settings.bet, run);

      if (placeBetAfterPreparation) {
        emitStage(requestId, "placing-bet", settings);
        await placeBet(run);
      }

      ensureActiveRun(run);
      postMessageToController("PREPARE_RESULT", requestId, {
        ok: true,
        stage: "completed",
        bet: settings.bet,
        cashout: settings.cashout
      }, run.source);
      completeControllerRun(run);
    } catch (error) {
      if (error?.name === "PreparationCancelledError") {
        return;
      }

      postMessageToController("PREPARE_RESULT", requestId, {
        ok: false,
        stage: "error",
        error: error instanceof Error ? error.message : String(error)
      }, run.source);
      completeControllerRun(run);
    }
  }

  async function switchToAutoTab(run) {
    const alreadyActive = findAutoTabState();
    if (alreadyActive?.active && findCashoutSwitcherState()?.visible) {
      return;
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      ensureActiveRun(run);

      const state = await waitFor(() => {
        const current = findAutoTabState();
        if (!current || current.disabled) {
          return null;
        }
        return current;
      }, STEP_TIMEOUT_MS, run);

      if (!state.active) {
        performClick(state.button);
      }

      try {
        await waitFor(() => {
          const currentTab = findAutoTabState();
          const cashout = findCashoutSwitcherState();
          return Boolean(currentTab?.active && cashout?.visible);
        }, ACTION_RETRY_TIMEOUT_MS, run);
        return;
      } catch (error) {
        if (error?.name === "PreparationCancelledError") {
          throw error;
        }
      }
    }

    throw new Error("Не удалось переключить первый блок ставки на вкладку «Авто»");
  }

  async function enableAutoCashout(run) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      ensureActiveRun(run);

      const state = await waitFor(() => {
        const current = findCashoutSwitcherState();
        return current?.visible ? current : null;
      }, STEP_TIMEOUT_MS, run);

      if (state.disabled) {
        await delay(POLL_INTERVAL_MS * 2, run);
        continue;
      }

      if (!state.off) {
        await waitFor(() => {
          const input = findCashoutInput();
          return input && !input.disabled ? input : null;
        }, STEP_TIMEOUT_MS, run);
        return;
      }

      performClick(state.clickTarget);

      try {
        await waitFor(() => {
          const current = findCashoutSwitcherState();
          const input = findCashoutInput();
          return Boolean(
            current?.visible &&
              !current.off &&
              !current.disabled &&
              input &&
              !input.disabled
          );
        }, ACTION_RETRY_TIMEOUT_MS, run);
        return;
      } catch (error) {
        if (error?.name === "PreparationCancelledError") {
          throw error;
        }
      }
    }

    throw new Error("Не удалось включить тумблер «Авто кешаут»");
  }

  async function setCashoutValue(value, run) {
    await setAngularInputValue({
      value,
      run,
      inputFinder: findCashoutInput,
      verifier: () => {
        const input = findCashoutInput();
        return Boolean(input && isInputCommitted(input, value));
      },
      errorMessage: "Не удалось установить значение авто кешаута"
    });
  }

  async function setBetValue(value, run) {
    await setAngularInputValue({
      value,
      run,
      inputFinder: findBetInput,
      verifier: () => {
        const input = findBetInput();
        const control = findPrimaryBetControl();
        const amount = control?.querySelector(
          ".controls-content-top .buttons-block .amount span:first-child"
        );

        return Boolean(
          input &&
            isInputCommitted(input, value) &&
            amount &&
            valuesMatch(amount.textContent, value)
        );
      },
      errorMessage: "Не удалось установить размер ставки"
    });
  }

  async function placeBet(run) {
    const state = await waitFor(() => {
      const current = findBetButtonState();
      return current?.ready ? current : null;
    }, GAME_READY_TIMEOUT_MS, run);

    ensureActiveRun(run);
    performClick(state.button);

    // Повторно кнопку не нажимаем: после физического клика любое повторение
    // потенциально может отменить уже принятую ставку.
    await delay(250, run);
  }

  async function setAngularInputValue({
    value,
    run,
    inputFinder,
    verifier,
    errorMessage
  }) {
    const text = formatNumber(value);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      ensureActiveRun(run);

      const input = await waitFor(() => {
        const current = inputFinder();
        return isEditableInput(current) ? current : null;
      }, STEP_TIMEOUT_MS, run);

      await writeInputValue(input, text, run, attempt > 0);

      try {
        await waitFor(() => verifier(), ACTION_RETRY_TIMEOUT_MS, run);
        return;
      } catch (error) {
        if (error?.name === "PreparationCancelledError") {
          throw error;
        }
      }
    }

    throw new Error(errorMessage);
  }

  function findPrimaryBetControl() {
    const controls = Array.from(
      document.querySelectorAll(
        "app-bet-controls > .controls > app-bet-control"
      )
    ).filter((control) =>
      Boolean(
        control.isConnected &&
          control.querySelector(
            ".controls-content-top .navigation-switcher button.tab"
          ) &&
          control.querySelector(
            ".controls-content-top .bet-block app-spinner .spinner.big input[inputmode='decimal']"
          )
      )
    );

    return (
      controls.find((control) => !control.querySelector(".sec-hand-btn.remove")) ||
      null
    );
  }

  function findAutoTabState() {
    const control = findPrimaryBetControl();
    if (!control) {
      return null;
    }

    const navigation = control.querySelector(
      ".controls-content-top .navigation-wrapper .navigation-switcher"
    );
    const tabs = Array.from(
      control.querySelectorAll(
        ".controls-content-top .navigation-wrapper .navigation-switcher button.tab"
      )
    );
    const button =
      tabs.find((tab) => /^авто$/i.test(normalizeText(tab.textContent))) || null;

    if (!button || !isDisplayed(button)) {
      return null;
    }

    return {
      button,
      active: button.classList.contains("active"),
      disabled:
        Boolean(button.disabled) ||
        Boolean(navigation?.classList.contains("disabled"))
    };
  }

  function findCashoutSwitcherState() {
    const control = findPrimaryBetControl();
    if (!control) {
      return null;
    }

    const wrapper = control.querySelector(
      ".controls-content-bottom .cashout-block .cash-out-switcher"
    );
    const host = wrapper?.querySelector("app-ui-switcher");
    const switchElement = host?.querySelector(".input-switch") || null;

    if (!wrapper || !switchElement) {
      return null;
    }

    return {
      visible: isDisplayed(wrapper) && isDisplayed(switchElement),
      off: switchElement.classList.contains("off"),
      disabled:
        switchElement.classList.contains("disabled") ||
        host?.classList.contains("disabled") ||
        wrapper.classList.contains("disabled"),
      clickTarget: switchElement
    };
  }

  function findCashoutInput() {
    return (
      findPrimaryBetControl()?.querySelector(
        ".controls-content-bottom .cashout-block .cashout-spinner-wrapper " +
          ".cashout-spinner app-spinner .spinner.small input[inputmode='decimal']"
      ) || null
    );
  }

  function findBetInput() {
    return (
      findPrimaryBetControl()?.querySelector(
        ".controls-content-top .bet-block app-spinner .spinner.big input[inputmode='decimal']"
      ) || null
    );
  }

  function findBetButtonState() {
    const control = findPrimaryBetControl();
    const button = control?.querySelector(
      ".controls-content-top .buttons-block button.bet"
    );

    if (!(button instanceof HTMLButtonElement) || !isDisplayed(button)) {
      return null;
    }

    const label = normalizeText(
      button.querySelector(".label")?.textContent || button.textContent
    );
    const disabled =
      Boolean(button.disabled) ||
      button.classList.contains("disabled") ||
      button.getAttribute("aria-disabled") === "true";

    return {
      button,
      label,
      disabled,
      ready: !disabled && /^ставка$/i.test(label)
    };
  }

  function isCancelBetLabel(value) {
    return /отмен|cancel/i.test(normalizeText(value));
  }

  async function writeInputValue(input, text, run, forceScriptedTyping) {
    activateInputWithMouse(input);
    await delay(50, run);

    selectEntireInput(input);

    let inserted = false;
    if (!forceScriptedTyping) {
      inserted = insertTextWithBrowserCommand(input, text);
    }

    if (!inserted || !valuesMatch(input.value, text)) {
      typeTextThroughInputEvents(input, text);
    }

    await delay(100, run);
    commitInputWithOutsideFocus(input);
    await delay(180, run);
  }

  function activateInputWithMouse(input) {
    dispatchPointerAndMouseDown(input);

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }

    dispatchPointerAndMouseUp(input);
    input.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
        buttons: 0,
        view: window
      })
    );

    if (document.activeElement !== input) {
      input.dispatchEvent(
        new FocusEvent("focus", {
          bubbles: false,
          composed: true,
          relatedTarget: document.activeElement
        })
      );
      input.dispatchEvent(
        new FocusEvent("focusin", {
          bubbles: true,
          composed: true,
          relatedTarget: document.activeElement
        })
      );
    }
  }

  function selectEntireInput(input) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: "a",
        code: "KeyA",
        ctrlKey: true
      })
    );

    try {
      input.setSelectionRange(0, String(input.value || "").length);
    } catch {
      input.select?.();
    }

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: "a",
        code: "KeyA",
        ctrlKey: true
      })
    );
  }

  function insertTextWithBrowserCommand(input, text) {
    if (typeof document.execCommand !== "function") {
      return false;
    }

    try {
      const inserted = document.execCommand("insertText", false, text);
      return Boolean(inserted && valuesMatch(input.value, text));
    } catch {
      return false;
    }
  }

  function typeTextThroughInputEvents(input, text) {
    setInputValueWithNativeSetter(input, "");
    setInputSelectionToEnd(input);
    dispatchTextInputEvent(input, {
      inputType: "deleteContentBackward",
      data: null
    });

    let currentValue = "";
    for (const character of String(text)) {
      const keyboardOptions = {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: character,
        code: keyboardCodeFor(character),
        charCode: character.charCodeAt(0),
        keyCode: character.charCodeAt(0),
        which: character.charCodeAt(0)
      };

      input.dispatchEvent(new KeyboardEvent("keydown", keyboardOptions));
      input.dispatchEvent(new KeyboardEvent("keypress", keyboardOptions));

      currentValue += character;
      dispatchBeforeInput(input, character, "insertText");
      setInputValueWithNativeSetter(input, currentValue);
      setInputSelectionToEnd(input);
      dispatchTextInputEvent(input, {
        inputType: "insertText",
        data: character
      });

      input.dispatchEvent(new KeyboardEvent("keyup", keyboardOptions));
    }
  }

  function setInputValueWithNativeSetter(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
  }

  function setInputSelectionToEnd(input) {
    const end = String(input.value || "").length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      // Для текстовых decimal input setSelectionRange доступен в Chrome.
    }
  }

  function dispatchBeforeInput(input, data, inputType) {
    try {
      input.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType,
          data
        })
      );
    } catch {
      // beforeinput не обязателен для Angular value accessor.
    }
  }

  function dispatchTextInputEvent(input, { inputType, data }) {
    try {
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType,
          data
        })
      );
    } catch {
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }
  }

  function commitInputWithOutsideFocus(input) {
    const control = input.closest("app-bet-control");
    const target =
      control?.querySelector(".controls-content-top") ||
      control?.querySelector(".controls") ||
      document.body;

    const hadTabIndex = target.hasAttribute("tabindex");
    const previousTabIndex = target.getAttribute("tabindex");
    const wasFocused = document.activeElement === input;

    if (!hadTabIndex) {
      target.setAttribute("tabindex", "-1");
    }

    dispatchPointerAndMouseDown(target);

    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus?.();
    }

    // В неактивном окне Chrome может не передать реальный фокус другому
    // элементу iframe. В таком случае принудительно вызываем blur-сценарий,
    // который app-spinner использует для записи pending value в Angular-модель.
    if (document.activeElement === input) {
      try {
        input.blur();
      } catch {
        // Ниже в любом случае есть синтетический blur/focusout.
      }
    }

    if (!wasFocused || document.activeElement === input || !document.hasFocus()) {
      dispatchExplicitBlur(input, target);
    }

    dispatchPointerAndMouseUp(target);
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

    if (!hadTabIndex) {
      target.removeAttribute("tabindex");
    } else if (previousTabIndex !== null) {
      target.setAttribute("tabindex", previousTabIndex);
    }
  }

  function dispatchExplicitBlur(input, relatedTarget) {
    input.dispatchEvent(
      new FocusEvent("blur", {
        bubbles: false,
        composed: true,
        relatedTarget
      })
    );
    input.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        composed: true,
        relatedTarget
      })
    );
  }

  function dispatchPointerAndMouseDown(element) {
    const pointerOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 1
    };
    const mouseOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: 1,
      view: window
    };

    try {
      element.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
    } catch {
      // PointerEvent доступен во всех актуальных Chrome, но не обязателен.
    }
    element.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
  }

  function dispatchPointerAndMouseUp(element) {
    const pointerOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 0
    };
    const mouseOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: 0,
      view: window
    };

    try {
      element.dispatchEvent(new PointerEvent("pointerup", pointerOptions));
    } catch {
      // См. комментарий выше.
    }
    element.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
  }

  function keyboardCodeFor(character) {
    if (/^[0-9]$/.test(character)) {
      return `Digit${character}`;
    }
    if (character === ".") {
      return "Period";
    }
    if (character === ",") {
      return "Comma";
    }
    return "Unidentified";
  }

  function isInputCommitted(input, expected) {
    const spinner = input.closest("app-spinner");
    const focusWasCommitted =
      document.activeElement !== input || !document.hasFocus();
    const angularTouched = !spinner || spinner.classList.contains("ng-touched");

    return Boolean(
      focusWasCommitted && angularTouched && valuesMatch(input.value, expected)
    );
  }

  function performClick(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus?.();
    }

    dispatchPointerAndMouseDown(element);
    dispatchPointerAndMouseUp(element);
    element.click();
  }

  function isEditableInput(element) {
    return (
      element instanceof HTMLInputElement &&
      element.isConnected &&
      !element.disabled &&
      !element.readOnly &&
      isDisplayed(element)
    );
  }

  function isDisplayed(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false;
    }

    let current = element;
    while (current && current !== document.documentElement) {
      if (current.classList?.contains("d-none")) {
        return false;
      }

      const style = getComputedStyle(current);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        return false;
      }
      current = current.parentElement;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function valuesMatch(rawValue, expected) {
    const parsed = Number(
      String(rawValue || "")
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(/[^0-9.+-]/g, "")
    );
    return Number.isFinite(parsed) && Math.abs(parsed - Number(expected)) < 0.001;
  }

  function formatNumber(value) {
    return Number(value)
      .toFixed(2)
      .replace(/\.00$/, "")
      .replace(/(\.\d)0$/, "$1");
  }

  function normalizePositiveNumber(value, fallback) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function waitFor(probe, timeoutMs, run) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          ensureActiveRun(run);
        } catch (error) {
          reject(error);
          return;
        }

        let value = null;
        try {
          value = probe();
        } catch {
          value = null;
        }

        if (value) {
          resolve(value);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error("Интерфейс Aviator не подготовился вовремя"));
          return;
        }

        setTimeout(check, POLL_INTERVAL_MS);
      };

      check();
    });
  }

  function delay(milliseconds, run) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          ensureActiveRun(run);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, milliseconds);
    });
  }

  function beginControllerRun(source, requestId) {
    if (
      source === CONTROLLER_SOURCE &&
      activeControllerSource === STRATEGY_CONTROLLER_SOURCE &&
      activeRuns.has(STRATEGY_CONTROLLER_SOURCE)
    ) {
      return null;
    }

    if (source === STRATEGY_CONTROLLER_SOURCE) {
      cancelControllerRun(CONTROLLER_SOURCE);
    }

    cancelControllerRun(source);
    const run = {
      source,
      requestId,
      sequence: ++runSequence
    };
    activeRuns.set(source, run);
    activeControllerSource = source;
    return run;
  }

  function cancelControllerRun(source, requestId = null) {
    const current = activeRuns.get(source);
    if (!current) {
      return;
    }
    if (requestId && current.requestId !== String(requestId)) {
      return;
    }

    activeRuns.delete(source);
    if (activeControllerSource === source) {
      activeControllerSource = activeRuns.has(STRATEGY_CONTROLLER_SOURCE)
        ? STRATEGY_CONTROLLER_SOURCE
        : activeRuns.has(CONTROLLER_SOURCE)
          ? CONTROLLER_SOURCE
          : null;
    }
  }

  function completeControllerRun(run) {
    if (activeRuns.get(run.source) === run) {
      activeRuns.delete(run.source);
    }
    if (activeControllerSource === run.source) {
      activeControllerSource = activeRuns.has(STRATEGY_CONTROLLER_SOURCE)
        ? STRATEGY_CONTROLLER_SOURCE
        : activeRuns.has(CONTROLLER_SOURCE)
          ? CONTROLLER_SOURCE
          : null;
    }
  }

  function ensureActiveRun(run) {
    if (activeRuns.get(run.source) !== run) {
      const error = new Error("Подготовка отменена новой конфигурацией");
      error.name = "PreparationCancelledError";
      throw error;
    }
  }

  function emitStage(requestId, stage, settings) {
    postMessageToController("PREPARE_STAGE", requestId, {
      stage,
      bet: settings.bet,
      cashout: settings.cashout
    }, activeControllerSource);
  }

  function postMessageToController(
    type,
    requestId,
    payload = {},
    controllerSource = null
  ) {
    window.postMessage(
      {
        channel: CHANNEL,
        source: BRIDGE_SOURCE,
        controllerSource,
        type,
        requestId,
        ...payload
      },
      "*"
    );
  }
})();
