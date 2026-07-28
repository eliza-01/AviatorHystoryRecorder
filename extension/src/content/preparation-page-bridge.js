(() => {
  "use strict";

  const GAME_HOST_PATTERN = /(^|\.)spribegaming\.com$/i;
  const CHANNEL = "aviator-preparation-v2";
  const CONTROLLER_SOURCE = "aviator-preparation-controller";
  const BRIDGE_SOURCE = "aviator-preparation-page-bridge";
  const POLL_INTERVAL_MS = 120;
  const GAME_READY_TIMEOUT_MS = 60_000;
  const STEP_TIMEOUT_MS = 10_000;
  const ACTION_RETRY_TIMEOUT_MS = 2_500;

  if (!GAME_HOST_PATTERN.test(location.hostname)) {
    return;
  }

  let activeRun = 0;

  window.addEventListener("message", onControllerMessage, false);

  function onControllerMessage(event) {
    if (event.source !== window) {
      return;
    }

    const message = event.data;
    if (
      !message ||
      message.channel !== CHANNEL ||
      message.source !== CONTROLLER_SOURCE
    ) {
      return;
    }

    if (message.type === "PING") {
      postMessageToController("BRIDGE_READY", message.requestId);
      return;
    }

    if (message.type === "CANCEL") {
      activeRun += 1;
      return;
    }

    if (message.type !== "PREPARE") {
      return;
    }

    const run = ++activeRun;
    const requestId = String(message.requestId || "");
    const settings = {
      bet: normalizePositiveNumber(message.settings?.bet, 1),
      cashout: normalizePositiveNumber(message.settings?.cashout, 2)
    };

    void runPreparation(run, requestId, settings);
  }

  async function runPreparation(run, requestId, settings) {
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

      ensureActiveRun(run);
      postMessageToController("PREPARE_RESULT", requestId, {
        ok: true,
        stage: "completed",
        bet: settings.bet,
        cashout: settings.cashout
      });
    } catch (error) {
      if (error?.name === "PreparationCancelledError") {
        return;
      }

      postMessageToController("PREPARE_RESULT", requestId, {
        ok: false,
        stage: "error",
        error: error instanceof Error ? error.message : String(error)
      });
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

    if (!wasFocused || document.activeElement === input) {
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
    const focusLeftInput = document.activeElement !== input;
    const angularTouched = !spinner || spinner.classList.contains("ng-touched");

    return Boolean(
      focusLeftInput && angularTouched && valuesMatch(input.value, expected)
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

  function ensureActiveRun(run) {
    if (run !== activeRun) {
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
    });
  }

  function postMessageToController(type, requestId, payload = {}) {
    window.postMessage(
      {
        channel: CHANNEL,
        source: BRIDGE_SOURCE,
        type,
        requestId,
        ...payload
      },
      "*"
    );
  }
})();
