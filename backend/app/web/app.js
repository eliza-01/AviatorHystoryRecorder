(() => {
  "use strict";

  const thresholdInput = document.getElementById("threshold-input");
  const visibleResultsInput = document.getElementById("visible-results-input");
  const visibleHeightInput = document.getElementById("visible-height-input");
  const balanceTickStepInput = document.getElementById("balance-tick-step-input");
  const calculateButton = document.getElementById("calculate-button");
  const autoRefresh = document.getElementById("auto-refresh");
  const crosshairEnabled = document.getElementById("crosshair-enabled");
  const addHorizontalLineButton = document.getElementById("add-horizontal-line-button");
  const analysisWorkspace = document.getElementById("analysis-workspace");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const presetNameInput = document.getElementById("preset-name-input");
  const savePresetButton = document.getElementById("save-preset-button");
  const presetsList = document.getElementById("presets-list");
  const connectionStatus = document.getElementById("connection-status");
  const lastUpdate = document.getElementById("last-update");
  const chartCaption = document.getElementById("chart-caption");
  const recentResults = document.getElementById("recent-results");
  const chartWrap = document.getElementById("chart-wrap");
  const chartViewport = document.getElementById("chart-viewport");
  const chartCanvas = document.getElementById("chart-canvas");
  const chart = document.getElementById("result-chart");
  const chartYAxis = document.getElementById("chart-y-axis");
  const crosshairYValue = document.getElementById("crosshair-y-value");
  const chartXAxis = document.getElementById("chart-x-axis");
  const chartAxisCorner = document.getElementById("chart-axis-corner");
  const manualLinesLayer = document.getElementById("manual-lines-layer");
  const chartEmpty = document.getElementById("chart-empty");
  const tooltip = document.getElementById("chart-tooltip");
  const errorBox = document.getElementById("error-box");

  const fields = {
    total: document.getElementById("stat-total"),
    positive: document.getElementById("stat-positive"),
    negative: document.getElementById("stat-negative"),
    positiveRate: document.getElementById("stat-positive-rate"),
    negativeRate: document.getElementById("stat-negative-rate"),
    comparisonNegative: document.getElementById("stat-comparison-negative"),
    comparisonPositive: document.getElementById("stat-comparison-positive"),
    requestedResult: document.getElementById("stat-requested-result"),
    chartResult: document.getElementById("stat-chart-result")
  };

  const numberFormatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4
  });
  const percentFormatter = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium"
  });
  const SETTINGS_STORAGE_KEY = "aviator-analysis-interface-v1";
  const RECENT_RESULTS_LIMIT = 15;
  const PRESETS_LIMIT = 30;
  const CHART_PAN_THRESHOLD = 4;

  let latestResponse = null;
  let activeController = null;
  let autoRefreshTimer = null;
  let autoRefreshEnabled = true;
  let resizeTimer = null;
  let chartControlTimer = null;
  let chartHasRendered = false;
  let currentAxisModel = null;
  let axisRenderFrame = null;
  let manualLines = [];
  let presets = [];
  let linePlacementMode = false;
  let activeLineDragId = null;
  let chartPanState = null;
  let chartPanFrame = null;
  let suppressNextChartClick = false;
  let lastChartOptions = {
    visibleResults: 100,
    visibleHeight: 50,
    balanceTickStep: 0
  };

  restoreInterfaceSettings();
  syncAutoRefreshButton();
  renderPresets();
  enableWheelNumberInput(thresholdInput, { decimals: 2, ctrlStep: 10 });
  enableWheelNumberInput(visibleResultsInput, { decimals: 0, ctrlStep: 100 });
  enableWheelNumberInput(visibleHeightInput, { decimals: 0, ctrlStep: 50 });
  enableWheelNumberInput(balanceTickStepInput, { decimals: 2, ctrlStep: 10 });

  calculateButton.addEventListener("click", () => {
    saveInterfaceSettings();
    loadAnalysis();
  });
  thresholdInput.addEventListener("keydown", handleCalculateOnEnter);
  thresholdInput.addEventListener("input", saveInterfaceSettings);
  visibleResultsInput.addEventListener("keydown", handleChartControlOnEnter);
  visibleHeightInput.addEventListener("keydown", handleChartControlOnEnter);
  balanceTickStepInput.addEventListener("keydown", handleChartControlOnEnter);
  visibleResultsInput.addEventListener("input", () => {
    saveInterfaceSettings();
    scheduleLocalChartRender();
  });
  visibleHeightInput.addEventListener("input", () => {
    saveInterfaceSettings();
    scheduleLocalChartRender();
  });
  balanceTickStepInput.addEventListener("input", () => {
    saveInterfaceSettings();
    scheduleLocalChartRender();
  });
  autoRefresh.addEventListener("click", () => {
    autoRefreshEnabled = !autoRefreshEnabled;
    syncAutoRefreshButton();
    saveInterfaceSettings();
    configureAutoRefresh();
  });
  crosshairEnabled.addEventListener("change", () => {
    saveInterfaceSettings();
    syncCrosshairMode();
  });
  addHorizontalLineButton.addEventListener("click", () => {
    setLinePlacementMode(!linePlacementMode);
  });
  savePresetButton.addEventListener("click", saveCurrentPreset);
  presetNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentPreset();
    }
  });
  presetsList.addEventListener("click", handlePresetListClick);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenState);
  document.addEventListener("fullscreenerror", () => {
    showError("Браузер не разрешил открыть полноэкранный режим.");
  });
  manualLinesLayer.addEventListener("pointerdown", handleManualLinePointerDown);
  manualLinesLayer.addEventListener("click", handleManualLineClick);
  window.addEventListener("pointermove", handleManualLinePointerMove);
  window.addEventListener("pointerup", stopManualLineDrag);
  window.addEventListener("pointercancel", stopManualLineDrag);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (linePlacementMode) {
      setLinePlacementMode(false);
    }
    if (document.fullscreenElement === analysisWorkspace) {
      document.exitFullscreen().catch(() => {
        // Браузер также обрабатывает Esc самостоятельно.
      });
    }
  });
  chartViewport.addEventListener("scroll", () => {
    tooltip.hidden = true;
    setElementHidden(crosshairYValue, true);
    scheduleStickyAxesRender();
  });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (latestResponse) {
        renderChart(latestResponse.points, { preserveScroll: true });
      }
    }, 120);
  });

  syncCrosshairMode();
  configureAutoRefresh();
  loadAnalysis();

  function handleCalculateOnEnter(event) {
    if (event.key === "Enter") {
      saveInterfaceSettings();
      loadAnalysis();
    }
  }

  function handleChartControlOnEnter(event) {
    if (event.key === "Enter") {
      renderCurrentChart({ preserveScroll: false });
    }
  }

  function scheduleLocalChartRender() {
    clearTimeout(chartControlTimer);
    chartControlTimer = setTimeout(() => {
      renderCurrentChart({ preserveScroll: false, quietValidation: true });
    }, 250);
  }

  function renderCurrentChart({ preserveScroll, quietValidation = false }) {
    if (!latestResponse) {
      return;
    }

    const options = readChartOptions();
    if (!options) {
      if (!quietValidation) {
        showError("Проверьте параметры размеров графика.");
      }
      return;
    }

    hideError();
    normalizeChartInputs(options);
    renderChart(latestResponse.points, { preserveScroll });
    updateChartCaption(latestResponse.stats, options);
  }

  function saveCurrentPreset() {
    const threshold = parseThreshold(thresholdInput.value);
    const chartOptions = readChartOptions();

    if (threshold === null || !chartOptions) {
      showError("Перед сохранением пресета проверьте значение x и настройки графика.");
      return;
    }

    hideError();
    thresholdInput.value = threshold.toFixed(2);
    normalizeChartInputs(chartOptions);

    const requestedName = presetNameInput.value.trim();
    const fallbackName =
      `x ${threshold.toFixed(2)} · ${chartOptions.visibleResults} × ${chartOptions.visibleHeight} · ` +
      `шаг ${formatBalanceTickStep(chartOptions.balanceTickStep)}`;
    const name = (requestedName || fallbackName).slice(0, 60);
    const existingIndex = presets.findIndex(
      (preset) => preset.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU")
    );
    const preset = {
      id: existingIndex >= 0 ? presets[existingIndex].id : createPresetId(),
      name,
      threshold,
      visibleResults: chartOptions.visibleResults,
      visibleHeight: chartOptions.visibleHeight,
      balanceTickStep: chartOptions.balanceTickStep
    };

    if (existingIndex >= 0) {
      presets.splice(existingIndex, 1);
    }
    presets.unshift(preset);
    presets = presets.slice(0, PRESETS_LIMIT);
    presetNameInput.value = "";
    saveInterfaceSettings();
    renderPresets();
  }

  function renderPresets() {
    if (!presets.length) {
      presetsList.innerHTML = '<span class="presets-empty">Пресетов пока нет</span>';
      return;
    }

    presetsList.innerHTML = presets
      .map((preset) => {
        const title =
          `x ${formatPresetThreshold(preset.threshold)} · ` +
          `${formatNumber(preset.visibleResults)} × ${formatNumber(preset.visibleHeight)} · ` +
          `шаг ${formatBalanceTickStep(preset.balanceTickStep)}`;
        return (
          `<div class="preset-item" data-preset-id="${escapeXml(preset.id)}">` +
            `<button class="preset-apply" type="button" data-preset-action="apply" ` +
              `title="Применить: ${escapeXml(title)}">` +
              `<strong>${escapeXml(preset.name)}</strong>` +
              `<span>${escapeXml(title)}</span>` +
            `</button>` +
            `<button class="preset-delete" type="button" data-preset-action="delete" ` +
              `aria-label="Удалить пресет ${escapeXml(preset.name)}" ` +
              `title="Удалить пресет">×</button>` +
          `</div>`
        );
      })
      .join("");
  }

  function handlePresetListClick(event) {
    const actionButton = event.target.closest("[data-preset-action]");
    const presetElement = event.target.closest("[data-preset-id]");
    if (!actionButton || !presetElement) {
      return;
    }

    const presetId = presetElement.dataset.presetId;
    const presetIndex = presets.findIndex((preset) => preset.id === presetId);
    if (presetIndex < 0) {
      return;
    }

    if (actionButton.dataset.presetAction === "delete") {
      presets.splice(presetIndex, 1);
      saveInterfaceSettings();
      renderPresets();
      return;
    }

    const preset = presets[presetIndex];
    thresholdInput.value = Number(preset.threshold).toFixed(2);
    visibleResultsInput.value = String(preset.visibleResults);
    visibleHeightInput.value = String(preset.visibleHeight);
    balanceTickStepInput.value = formatInputNumber(preset.balanceTickStep);
    saveInterfaceSettings();
    loadAnalysis();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (!analysisWorkspace.requestFullscreen) {
        showError("Этот браузер не поддерживает полноэкранный режим.");
        return;
      }

      hideError();
      await analysisWorkspace.requestFullscreen();
    } catch (error) {
      showError(`Не удалось открыть полноэкранный режим: ${error.message}`);
    }
  }

  function syncFullscreenState() {
    const isFullscreen = document.fullscreenElement === analysisWorkspace;
    analysisWorkspace.classList.toggle("is-fullscreen", isFullscreen);
    fullscreenButton.textContent = isFullscreen
      ? "Выйти из полного экрана"
      : "Во весь экран";
    fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));

    tooltip.hidden = true;
    setElementHidden(crosshairYValue, true);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (latestResponse) {
        renderChart(latestResponse.points, { preserveScroll: true });
      }
    }, 100);
  }

  function configureAutoRefresh() {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;

    if (autoRefreshEnabled) {
      autoRefreshTimer = setInterval(() => loadAnalysis({ quiet: true }), 5000);
    }
  }

  function syncAutoRefreshButton() {
    autoRefresh.classList.toggle("is-enabled", autoRefreshEnabled);
    autoRefresh.classList.toggle("is-disabled", !autoRefreshEnabled);
    autoRefresh.setAttribute("aria-pressed", String(autoRefreshEnabled));
    autoRefresh.title = autoRefreshEnabled
      ? "Автообновление включено: каждые 5 секунд"
      : "Автообновление выключено";
  }

  async function loadAnalysis({ quiet = false } = {}) {
    const threshold = parseThreshold(thresholdInput.value);
    const chartOptions = readChartOptions();

    if (threshold === null) {
      showError("Введите корректное значение x: число не меньше 1.");
      thresholdInput.focus();
      return;
    }
    if (!chartOptions) {
      showError(
        "Количество результатов должно быть не меньше 2, высота — не меньше 1, " +
        "шаг меток — 0 или положительное число."
      );
      return;
    }

    thresholdInput.value = threshold.toFixed(2);
    normalizeChartInputs(chartOptions);
    saveInterfaceSettings();
    activeController?.abort();
    activeController = new AbortController();

    if (!quiet) {
      calculateButton.disabled = true;
      calculateButton.textContent = "Расчёт…";
    }
    hideError();

    try {
      const query = new URLSearchParams({ x: String(threshold) });
      const response = await fetch(`/api/v1/analysis?${query}`, {
        signal: activeController.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`API вернул HTTP ${response.status}`);
      }

      latestResponse = await response.json();
      render(latestResponse, { preserveScroll: quiet && chartHasRendered });
      setConnection(true);
      lastUpdate.textContent = `Последнее обновление: ${dateFormatter.format(new Date())}`;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      setConnection(false);
      showError(`Не удалось получить данные: ${error.message}`);
    } finally {
      if (!quiet) {
        calculateButton.disabled = false;
        calculateButton.textContent = "Рассчитать";
      }
    }
  }

  function render(data, { preserveScroll }) {
    const options = readChartOptions() || lastChartOptions;
    renderStats(data.stats);
    renderRecentResults(data.points);
    renderChart(data.points, { preserveScroll });
    updateChartCaption(data.stats, options);
  }

  function updateChartCaption(stats, options) {
    if (stats.total === 0) {
      chartCaption.textContent = "В базе пока нет результатов.";
      return;
    }

    chartCaption.textContent =
      `Показаны все ${formatNumber(stats.total)} результатов. ` +
      `В окне: ${formatNumber(options.visibleResults)} результатов × ` +
      `${formatNumber(options.visibleHeight)} пунктов; остальное доступно прокруткой.`;
  }

  function renderRecentResults(points) {
    if (!Array.isArray(points) || points.length === 0) {
      recentResults.innerHTML = "";
      recentResults.hidden = true;
      return;
    }

    const latestPoints = points
      .slice(-RECENT_RESULTS_LIMIT)
      .reverse();

    recentResults.innerHTML = latestPoints
      .map((point) => {
        const multiplier = Number(point.multiplier);
        if (!Number.isFinite(multiplier)) {
          return "";
        }

        let levelClass = "recent-result-low";
        if (multiplier >= 10) {
          levelClass = "recent-result-high";
        } else if (multiplier >= 2) {
          levelClass = "recent-result-medium";
        }

        return (
          `<span class="recent-result ${levelClass}" ` +
          `title="${escapeXml(formatRecentMultiplier(multiplier))}x">` +
          `${escapeXml(formatRecentMultiplier(multiplier))}x</span>`
        );
      })
      .join("");
    recentResults.hidden = false;
    recentResults.scrollLeft = 0;
  }

  function renderStats(stats) {
    fields.total.textContent = formatNumber(stats.total);
    fields.positive.textContent = formatNumber(stats.positive);
    fields.negative.textContent = formatNumber(stats.negative);
    fields.positiveRate.textContent = `${percentFormatter.format(stats.positive_rate)}%`;
    fields.negativeRate.textContent = `${percentFormatter.format(stats.negative_rate)}%`;
    fields.comparisonNegative.textContent = formatNumber(stats.negative);
    fields.comparisonPositive.textContent = formatNumber(stats.weighted_positive);
    fields.requestedResult.textContent = formatSigned(stats.requested_result);
    fields.chartResult.textContent = formatSigned(stats.chart_result);

    toggleSignedClass(fields.requestedResult, stats.requested_result);
    toggleSignedClass(fields.chartResult, stats.chart_result);
  }

  function toggleSignedClass(element, value) {
    element.classList.toggle("value-positive", Number(value) > 0);
    element.classList.toggle("value-negative", Number(value) < 0);
  }

  function renderChart(points, { preserveScroll = false } = {}) {
    const options = readChartOptions() || lastChartOptions;

    const previousScroll = captureScrollState();
    cancelChartPan();
    tooltip.hidden = true;
    setElementHidden(crosshairYValue, true);
    chart.innerHTML = "";

    if (!Array.isArray(points) || points.length === 0) {
      chartEmpty.hidden = false;
      chartCanvas.style.width = "100%";
      chartCanvas.style.height = "100%";
      chart.removeAttribute("width");
      chart.removeAttribute("height");
      chart.removeAttribute("viewBox");
      currentAxisModel = null;
      chartYAxis.innerHTML = "";
      chartXAxis.innerHTML = "";
      manualLinesLayer.innerHTML = "";
      manualLinesLayer.hidden = true;
      setLinePlacementMode(false);
      setElementHidden(chartYAxis, true);
      setElementHidden(chartXAxis, true);
      chartAxisCorner.hidden = true;
      chartHasRendered = false;
      return;
    }
    chartEmpty.hidden = true;

    const viewportWidth = Math.max(chartViewport.clientWidth, 320);
    const viewportHeight = Math.max(chartViewport.clientHeight, window.innerWidth <= 640 ? 340 : 430);
    const margin = {
      top: 22,
      right: 22,
      bottom: 48,
      left: viewportWidth < 520 ? 52 : 68
    };
    const viewportPlotWidth = Math.max(viewportWidth - margin.left - margin.right, 1);
    const viewportPlotHeight = Math.max(viewportHeight - margin.top - margin.bottom, 1);

    const horizontalFactor = points.length <= options.visibleResults
      ? 1
      : (points.length - 1) / Math.max(options.visibleResults - 1, 1);
    const plotWidth = Math.max(viewportPlotWidth * horizontalFactor, viewportPlotWidth);
    const width = margin.left + plotWidth + margin.right;

    const balances = points.map((point) => Number(point.balance));
    const manualLineValues = manualLines
      .map((line) => Number(line.value))
      .filter(Number.isFinite);
    const dataMinY = Math.min(0, ...balances, ...manualLineValues);
    const dataMaxY = Math.max(0, ...balances, ...manualLineValues);
    const yTickStep = options.balanceTickStep > 0
      ? options.balanceTickStep
      : calculateNiceStep(options.visibleHeight / 5);
    let minY = Math.floor(dataMinY / yTickStep) * yTickStep;
    let maxY = Math.ceil(dataMaxY / yTickStep) * yTickStep;

    if (minY === maxY) {
      minY -= yTickStep;
      maxY += yTickStep;
    }

    const yRange = Math.max(maxY - minY, yTickStep);
    const verticalFactor = Math.max(1, yRange / options.visibleHeight);
    const plotHeight = Math.max(viewportPlotHeight * verticalFactor, viewportPlotHeight);
    const height = margin.top + plotHeight + margin.bottom;

    const minX = Number(points[0].index);
    const maxX = Number(points[points.length - 1].index);
    const xRange = Math.max(maxX - minX, 1);

    const xScale = (value) =>
      margin.left + ((Number(value) - minX) / xRange) * plotWidth;
    const yScale = (value) =>
      margin.top + ((maxY - Number(value)) / yRange) * plotHeight;

    chartCanvas.style.width = `${width}px`;
    chartCanvas.style.height = `${height}px`;
    chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    chart.setAttribute("width", String(width));
    chart.setAttribute("height", String(height));

    const svgParts = [];
    const yTicks = [];
    const yTickCount = Math.round((maxY - minY) / yTickStep);
    for (let tick = 0; tick <= yTickCount; tick += 1) {
      const value = normalizeFloatingPoint(maxY - tick * yTickStep);
      const y = yScale(value);
      yTicks.push({ value, y });
      svgParts.push(
        `<line class="chart-grid-line" x1="${margin.left}" y1="${y}" ` +
        `x2="${width - margin.right}" y2="${y}"></line>`
      );
    }

    const xTickStep = calculateNiceIntegerStep(options.visibleResults / 5);
    const firstXTick = Math.ceil(minX / xTickStep) * xTickStep;
    const xTicks = [];
    for (let value = firstXTick; value <= maxX; value += xTickStep) {
      xTicks.push({ value, x: xScale(value) });
    }

    if (minY <= 0 && maxY >= 0) {
      const zeroY = yScale(0);
      svgParts.push(
        `<line class="chart-zero-line" x1="${margin.left}" y1="${zeroY}" ` +
        `x2="${width - margin.right}" y2="${zeroY}"></line>`
      );
    }

    const path = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command}${xScale(point.index).toFixed(2)},${yScale(point.balance).toFixed(2)}`;
      })
      .join(" ");

    svgParts.push(`<path class="chart-path" d="${path}"></path>`);
    svgParts.push(
      `<line id="hover-line" class="chart-hover-line" hidden></line>` +
      `<line id="hover-horizontal-line" class="chart-hover-horizontal-line" hidden></line>` +
      `<circle id="hover-dot" class="chart-hover-dot" r="5" hidden></circle>` +
      `<rect id="chart-overlay" x="${margin.left}" y="${margin.top}" ` +
      `width="${plotWidth}" height="${plotHeight}" fill="transparent"></rect>`
    );

    chart.innerHTML = svgParts.join("");
    currentAxisModel = {
      margin,
      viewportWidth,
      viewportHeight,
      yTicks,
      xTicks,
      minY,
      maxY,
      yRange,
      plotHeight,
      height
    };
    setElementHidden(chartYAxis, false);
    setElementHidden(chartXAxis, false);
    chartAxisCorner.hidden = false;
    renderStickyAxes();

    attachChartInteraction({
      points,
      minX,
      xRange,
      plotWidth,
      width,
      height,
      margin,
      xScale,
      yScale
    });

    const latestPointY = yScale(points[points.length - 1].balance);
    restoreScrollState({
      previousScroll,
      preserveScroll,
      latestPointY
    });
    chartHasRendered = true;
  }

  function attachChartInteraction({
    points,
    minX,
    xRange,
    plotWidth,
    width,
    height,
    margin,
    xScale,
    yScale
  }) {
    const overlay = chart.querySelector("#chart-overlay");
    const hoverLine = chart.querySelector("#hover-line");
    const horizontalHoverLine = chart.querySelector("#hover-horizontal-line");
    const hoverDot = chart.querySelector("#hover-dot");
    const pointHoverRadius = 10;

    overlay.addEventListener("pointerdown", (event) => {
      beginChartPan(event, overlay);
    });

    overlay.addEventListener("pointermove", (event) => {
      if (updateChartPan(event)) {
        return;
      }

      const svgRect = chart.getBoundingClientRect();
      const localX = clamp(
        event.clientX - svgRect.left,
        margin.left,
        width - margin.right
      );
      const localY = clamp(
        event.clientY - svgRect.top,
        margin.top,
        height - margin.bottom
      );
      const targetIndex = minX + ((localX - margin.left) / plotWidth) * xRange;
      const point = findNearestPoint(points, targetIndex);
      const pointX = xScale(point.index);
      const pointY = yScale(point.balance);
      const freeCrosshair = crosshairEnabled.checked;

      const verticalX = freeCrosshair ? localX : pointX;
      setElementHidden(hoverLine, false);
      hoverLine.setAttribute("x1", verticalX);
      hoverLine.setAttribute("x2", verticalX);
      hoverLine.setAttribute("y1", margin.top);
      hoverLine.setAttribute("y2", height - margin.bottom);

      if (freeCrosshair) {
        setElementHidden(horizontalHoverLine, false);
        horizontalHoverLine.setAttribute("x1", margin.left);
        horizontalHoverLine.setAttribute("x2", width - margin.right);
        horizontalHoverLine.setAttribute("y1", localY);
        horizontalHoverLine.setAttribute("y2", localY);
        showCrosshairYValue(localY);
      } else {
        setElementHidden(horizontalHoverLine, true);
        setElementHidden(crosshairYValue, true);
      }

      const isPointHovered = !freeCrosshair ||
        Math.hypot(pointX - localX, pointY - localY) <= pointHoverRadius;

      if (isPointHovered) {
        setElementHidden(hoverDot, false);
        hoverDot.setAttribute("cx", pointX);
        hoverDot.setAttribute("cy", pointY);
        showPointTooltip(point, event);
      } else {
        setElementHidden(hoverDot, true);
        tooltip.hidden = true;
      }
    });

    overlay.addEventListener("pointerup", finishChartPan);
    overlay.addEventListener("pointercancel", finishChartPan);
    overlay.addEventListener("lostpointercapture", finishChartPan);

    overlay.addEventListener("click", (event) => {
      if (suppressNextChartClick) {
        suppressNextChartClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!linePlacementMode || !currentAxisModel) {
        return;
      }

      const value = chartValueFromClientY(event.clientY);
      if (value === null) {
        return;
      }

      manualLines.push({
        id: createManualLineId(),
        value
      });
      saveInterfaceSettings();
      setLinePlacementMode(false);
      renderManualLinesOverlay();
    });

    overlay.addEventListener("pointerleave", () => {
      if (chartPanState?.active) {
        return;
      }

      setElementHidden(hoverLine, true);
      setElementHidden(horizontalHoverLine, true);
      setElementHidden(crosshairYValue, true);
      setElementHidden(hoverDot, true);
      tooltip.hidden = true;
    });
  }

  function beginChartPan(event, overlay) {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      linePlacementMode ||
      activeLineDragId !== null
    ) {
      return;
    }

    cancelChartPan();
    suppressNextChartClick = false;
    chartPanState = {
      pointerId: event.pointerId,
      overlay,
      startClientX: event.clientX,
      startClientY: event.clientY,
      latestClientX: event.clientX,
      latestClientY: event.clientY,
      startScrollLeft: chartViewport.scrollLeft,
      startScrollTop: chartViewport.scrollTop,
      active: false
    };

    try {
      overlay.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Pointer capture может быть недоступен в старых браузерах.
    }

    event.preventDefault();
  }

  function updateChartPan(event) {
    const state = chartPanState;
    if (!state || event.pointerId !== state.pointerId) {
      return false;
    }

    state.latestClientX = event.clientX;
    state.latestClientY = event.clientY;
    const deltaX = event.clientX - state.startClientX;
    const deltaY = event.clientY - state.startClientY;

    if (!state.active && Math.hypot(deltaX, deltaY) >= CHART_PAN_THRESHOLD) {
      state.active = true;
      suppressNextChartClick = true;
      chartWrap.classList.add("is-panning");
      hideChartHover();
    }

    if (!state.active) {
      return false;
    }

    event.preventDefault();
    scheduleChartPanFrame();
    return true;
  }

  function scheduleChartPanFrame() {
    if (chartPanFrame !== null) {
      return;
    }

    chartPanFrame = requestAnimationFrame(() => {
      chartPanFrame = null;
      applyChartPanPosition();
    });
  }

  function applyChartPanPosition() {
    const state = chartPanState;
    if (!state?.active) {
      return;
    }

    chartViewport.scrollLeft = state.startScrollLeft -
      (state.latestClientX - state.startClientX);
    chartViewport.scrollTop = state.startScrollTop -
      (state.latestClientY - state.startClientY);
  }

  function finishChartPan(event) {
    const state = chartPanState;
    if (!state || (event?.pointerId !== undefined && event.pointerId !== state.pointerId)) {
      return;
    }

    if (chartPanFrame !== null) {
      cancelAnimationFrame(chartPanFrame);
      chartPanFrame = null;
    }
    applyChartPanPosition();

    const wasActive = state.active;
    chartPanState = null;
    chartWrap.classList.remove("is-panning");

    try {
      if (state.overlay.hasPointerCapture?.(state.pointerId)) {
        state.overlay.releasePointerCapture(state.pointerId);
      }
    } catch (_error) {
      // Захват уже мог быть снят браузером.
    }

    if (wasActive) {
      hideChartHover();
      scheduleStickyAxesRender();
      setTimeout(() => {
        suppressNextChartClick = false;
      }, 0);
    } else {
      suppressNextChartClick = false;
    }
  }

  function cancelChartPan() {
    const state = chartPanState;
    if (chartPanFrame !== null) {
      cancelAnimationFrame(chartPanFrame);
      chartPanFrame = null;
    }

    chartPanState = null;
    suppressNextChartClick = false;
    chartWrap.classList.remove("is-panning");

    if (!state) {
      return;
    }

    try {
      if (state.overlay.hasPointerCapture?.(state.pointerId)) {
        state.overlay.releasePointerCapture(state.pointerId);
      }
    } catch (_error) {
      // SVG мог быть уже перерисован.
    }
  }

  function hideChartHover() {
    setElementHidden(chart.querySelector("#hover-line"), true);
    setElementHidden(chart.querySelector("#hover-horizontal-line"), true);
    setElementHidden(chart.querySelector("#hover-dot"), true);
    setElementHidden(crosshairYValue, true);
    tooltip.hidden = true;
  }

  function showPointTooltip(point, event) {
    tooltip.hidden = false;
    tooltip.innerHTML =
      `<strong>Раунд ${formatNumber(point.index)}</strong>` +
      `Multiplier: ${formatNumber(point.multiplier)}x<br>` +
      `Изменение: ${formatSigned(point.delta)}<br>` +
      `Баланс: ${formatSigned(point.balance)}<br>` +
      `${escapeXml(formatDate(point.occurred_at))}`;

    const viewportRect = chartViewport.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth || 190;
    const tooltipHeight = tooltip.offsetHeight || 110;
    let left = event.clientX - viewportRect.left + 12;
    let top = event.clientY - viewportRect.top - tooltipHeight / 2;

    if (left + tooltipWidth > chartViewport.clientWidth - 8) {
      left = event.clientX - viewportRect.left - tooltipWidth - 12;
    }
    left = Math.max(8, left);
    top = Math.max(8, Math.min(top, chartViewport.clientHeight - tooltipHeight - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showCrosshairYValue(contentY) {
    if (!currentAxisModel || !crosshairEnabled.checked) {
      setElementHidden(crosshairYValue, true);
      return;
    }

    const {
      margin,
      minY,
      maxY,
      yRange,
      plotHeight
    } = currentAxisModel;
    const plotPosition = clamp(
      (contentY - margin.top) / plotHeight,
      0,
      1
    );
    const value = normalizeFloatingPoint(
      clamp(maxY - plotPosition * yRange, minY, maxY)
    );
    const viewportY = contentY - chartViewport.scrollTop;
    const axisHeight = Math.max(chartViewport.clientHeight - margin.bottom, 1);

    if (viewportY < 0 || viewportY > axisHeight) {
      setElementHidden(crosshairYValue, true);
      return;
    }

    crosshairYValue.textContent = formatNumber(Math.round(value));
    crosshairYValue.style.width = `${margin.left}px`;
    crosshairYValue.style.top = `${viewportY}px`;
    setElementHidden(crosshairYValue, false);
  }

  function syncCrosshairMode() {
    chartWrap.classList.toggle("is-crosshair-active", crosshairEnabled.checked);

    if (!crosshairEnabled.checked) {
      const horizontalHoverLine = chart.querySelector("#hover-horizontal-line");
      if (horizontalHoverLine) {
        setElementHidden(horizontalHoverLine, true);
      }
      setElementHidden(crosshairYValue, true);
    }
  }

  function captureScrollState() {
    const maxLeft = Math.max(chartViewport.scrollWidth - chartViewport.clientWidth, 0);
    const maxTop = Math.max(chartViewport.scrollHeight - chartViewport.clientHeight, 0);
    return {
      left: chartViewport.scrollLeft,
      top: chartViewport.scrollTop,
      maxLeft,
      maxTop,
      nearRight: maxLeft - chartViewport.scrollLeft <= 40,
      horizontalRatio: maxLeft > 0 ? chartViewport.scrollLeft / maxLeft : 1,
      verticalRatio: maxTop > 0 ? chartViewport.scrollTop / maxTop : 0
    };
  }

  function restoreScrollState({ previousScroll, preserveScroll, latestPointY }) {
    requestAnimationFrame(() => {
      const maxLeft = Math.max(chartViewport.scrollWidth - chartViewport.clientWidth, 0);
      const maxTop = Math.max(chartViewport.scrollHeight - chartViewport.clientHeight, 0);

      if (!preserveScroll || previousScroll.nearRight) {
        chartViewport.scrollLeft = maxLeft;
        chartViewport.scrollTop = clamp(
          latestPointY - chartViewport.clientHeight / 2,
          0,
          maxTop
        );
        scheduleStickyAxesRender();
        return;
      }

      chartViewport.scrollLeft = clamp(
        previousScroll.horizontalRatio * maxLeft,
        0,
        maxLeft
      );
      chartViewport.scrollTop = clamp(
        previousScroll.verticalRatio * maxTop,
        0,
        maxTop
      );
      scheduleStickyAxesRender();
    });
  }

  function scheduleStickyAxesRender() {
    if (axisRenderFrame !== null) {
      return;
    }

    axisRenderFrame = requestAnimationFrame(() => {
      axisRenderFrame = null;
      renderStickyAxes();
    });
  }

  function renderStickyAxes() {
    if (!currentAxisModel) {
      return;
    }

    const { margin, yTicks, xTicks } = currentAxisModel;
    const viewportWidth = chartViewport.clientWidth;
    const viewportHeight = chartViewport.clientHeight;
    const axisWidth = margin.left;
    const axisHeight = margin.bottom;
    const yAxisHeight = Math.max(viewportHeight - axisHeight, 1);
    const xAxisWidth = Math.max(viewportWidth - axisWidth, 1);
    const scrollbarHeight = Math.max(chartViewport.offsetHeight - chartViewport.clientHeight, 0);

    chartYAxis.style.width = `${axisWidth}px`;
    chartYAxis.style.height = `${yAxisHeight}px`;

    chartXAxis.style.left = `${axisWidth}px`;
    chartXAxis.style.bottom = `${scrollbarHeight}px`;
    chartXAxis.style.width = `${xAxisWidth}px`;
    chartXAxis.style.height = `${axisHeight}px`;

    chartAxisCorner.style.bottom = `${scrollbarHeight}px`;
    chartAxisCorner.style.width = `${axisWidth}px`;
    chartAxisCorner.style.height = `${axisHeight}px`;

    const yParts = [];
    for (const tick of yTicks) {
      const y = tick.y - chartViewport.scrollTop;
      if (y < -12 || y > yAxisHeight + 12) {
        continue;
      }
      yParts.push(
        `<div class="chart-axis-mark chart-axis-mark-y" style="top:${y}px">` +
        `<span>${escapeXml(formatCompact(tick.value))}</span>` +
        `<i aria-hidden="true"></i>` +
        `</div>`
      );
    }
    chartYAxis.innerHTML = yParts.join("");

    const xParts = [];
    for (const tick of xTicks) {
      const x = tick.x - chartViewport.scrollLeft - axisWidth;
      if (x < -36 || x > xAxisWidth + 36) {
        continue;
      }
      xParts.push(
        `<div class="chart-axis-mark chart-axis-mark-x" style="left:${x}px">` +
        `<i aria-hidden="true"></i>` +
        `<span>${escapeXml(formatCompact(tick.value))}</span>` +
        `</div>`
      );
    }
    chartXAxis.innerHTML = xParts.join("");
    renderManualLinesOverlay();
  }

  function setLinePlacementMode(enabled) {
    linePlacementMode = Boolean(enabled && currentAxisModel);
    addHorizontalLineButton.classList.toggle("is-active", linePlacementMode);
    addHorizontalLineButton.setAttribute("aria-pressed", String(linePlacementMode));
    addHorizontalLineButton.textContent = linePlacementMode
      ? "Кликните по графику…"
      : "+ Горизонтальная линия";
    chartWrap.classList.toggle("is-line-placement", linePlacementMode);
  }

  function renderManualLinesOverlay() {
    if (!currentAxisModel || manualLines.length === 0) {
      manualLinesLayer.innerHTML = "";
      manualLinesLayer.hidden = true;
      return;
    }

    const {
      margin,
      minY,
      maxY,
      yRange,
      plotHeight
    } = currentAxisModel;
    const viewportHeight = chartViewport.clientHeight;
    const scrollbarWidth = Math.max(
      chartViewport.offsetWidth - chartViewport.clientWidth,
      0
    );
    const scrollbarHeight = Math.max(
      chartViewport.offsetHeight - chartViewport.clientHeight,
      0
    );
    const layerBottom = margin.bottom + scrollbarHeight;
    const layerHeight = Math.max(viewportHeight - layerBottom, 1);

    manualLinesLayer.style.left = `${margin.left}px`;
    manualLinesLayer.style.right = `${scrollbarWidth}px`;
    manualLinesLayer.style.top = "0";
    manualLinesLayer.style.bottom = `${layerBottom}px`;

    const rows = [];
    for (const line of manualLines) {
      const value = clamp(Number(line.value), minY, maxY);
      const contentY =
        margin.top + ((maxY - value) / yRange) * plotHeight;
      const viewportY = contentY - chartViewport.scrollTop;

      if (viewportY < -20 || viewportY > layerHeight + 20) {
        continue;
      }

      rows.push(
        `<div class="manual-line" data-line-id="${escapeXml(line.id)}" ` +
        `style="top:${viewportY}px">` +
        `<button class="manual-line-drag" type="button" ` +
        `aria-label="Переместить горизонтальную линию ${escapeXml(formatNumber(value))}">` +
        `<span class="manual-line-stroke" aria-hidden="true"></span>` +
        `</button>` +
        `<span class="manual-line-value">${escapeXml(formatNumber(value))}</span>` +
        `<button class="manual-line-delete" type="button" ` +
        `aria-label="Удалить горизонтальную линию">×</button>` +
        `</div>`
      );
    }

    manualLinesLayer.innerHTML = rows.join("");
    manualLinesLayer.hidden = rows.length === 0;
  }

  function handleManualLinePointerDown(event) {
    const dragControl = event.target.closest(".manual-line-drag");
    if (!dragControl) {
      return;
    }

    const row = dragControl.closest(".manual-line");
    if (!row) {
      return;
    }

    event.preventDefault();
    activeLineDragId = row.dataset.lineId || null;
    chartWrap.classList.add("is-dragging-line");
    updateDraggedManualLine(event.clientY);
  }

  function handleManualLinePointerMove(event) {
    if (!activeLineDragId) {
      return;
    }

    event.preventDefault();
    updateDraggedManualLine(event.clientY);
  }

  function stopManualLineDrag() {
    if (!activeLineDragId) {
      return;
    }

    activeLineDragId = null;
    chartWrap.classList.remove("is-dragging-line");
    saveInterfaceSettings();
  }

  function handleManualLineClick(event) {
    const deleteButton = event.target.closest(".manual-line-delete");
    if (!deleteButton) {
      return;
    }

    const row = deleteButton.closest(".manual-line");
    if (!row) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    manualLines = manualLines.filter((line) => line.id !== row.dataset.lineId);
    saveInterfaceSettings();

    if (latestResponse) {
      renderChart(latestResponse.points, { preserveScroll: true });
    } else {
      renderManualLinesOverlay();
    }
  }

  function updateDraggedManualLine(clientY) {
    const value = chartValueFromClientY(clientY);
    if (value === null) {
      return;
    }

    const line = manualLines.find((item) => item.id === activeLineDragId);
    if (!line) {
      return;
    }

    line.value = value;
    renderManualLinesOverlay();
  }

  function chartValueFromClientY(clientY) {
    if (!currentAxisModel) {
      return null;
    }

    const {
      margin,
      minY,
      maxY,
      yRange,
      plotHeight
    } = currentAxisModel;
    const viewportRect = chartViewport.getBoundingClientRect();
    const contentY =
      clientY - viewportRect.top + chartViewport.scrollTop;
    const plotPosition = clamp(
      (contentY - margin.top) / plotHeight,
      0,
      1
    );
    const value = maxY - plotPosition * yRange;
    return normalizeFloatingPoint(clamp(value, minY, maxY));
  }

  function createPresetId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `preset-${crypto.randomUUID()}`;
    }

    return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createManualLineId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function enableWheelNumberInput(input, { decimals, ctrlStep }) {
    input.addEventListener(
      "wheel",
      (event) => {
        // Колесо меняет значение только у активного поля и не прокручивает страницу.
        if (document.activeElement !== input || event.deltaY === 0) {
          return;
        }

        event.preventDefault();

        const normalizedValue = String(input.value).trim().replace(",", ".");
        const parsedValue = Number(normalizedValue);
        const min = input.min === "" ? Number.NEGATIVE_INFINITY : Number(input.min);
        const max = input.max === "" ? Number.POSITIVE_INFINITY : Number(input.max);
        const fallbackValue = Number.isFinite(min) ? min : 0;
        const currentValue = Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
        const direction = event.deltaY < 0 ? 1 : -1;
        const step = event.ctrlKey ? ctrlStep : 1.0;
        const nextValue = clamp(currentValue + direction * step, min, max);

        input.value = decimals > 0
          ? normalizeFloatingPoint(nextValue).toFixed(decimals)
          : String(Math.round(nextValue));

        // Используем обычные события, чтобы сохранились настройки и обновился график.
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      { passive: false }
    );
  }

  function restoreInterfaceSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const settings = JSON.parse(raw);
      if (typeof settings.threshold === "string") {
        thresholdInput.value = settings.threshold;
      }
      if (typeof settings.visibleResults === "string") {
        visibleResultsInput.value = settings.visibleResults;
      }
      if (typeof settings.visibleHeight === "string") {
        visibleHeightInput.value = settings.visibleHeight;
      }
      if (typeof settings.balanceTickStep === "string") {
        balanceTickStepInput.value = settings.balanceTickStep;
      }
      if (typeof settings.autoRefresh === "boolean") {
        autoRefreshEnabled = settings.autoRefresh;
      }
      if (typeof settings.crosshairEnabled === "boolean") {
        crosshairEnabled.checked = settings.crosshairEnabled;
      }
      if (Array.isArray(settings.presets)) {
        presets = settings.presets
          .slice(0, PRESETS_LIMIT)
          .map((preset) => ({
            id: typeof preset?.id === "string" ? preset.id : createPresetId(),
            name: typeof preset?.name === "string" ? preset.name.trim().slice(0, 60) : "",
            threshold: parseThreshold(preset?.threshold),
            visibleResults: parseIntegerInRange(preset?.visibleResults, 2, 10_000),
            visibleHeight: parseIntegerInRange(preset?.visibleHeight, 1, 1_000_000),
            balanceTickStep: parseBalanceTickStep(preset?.balanceTickStep ?? 0)
          }))
          .filter((preset) =>
            preset.name &&
            preset.threshold !== null &&
            preset.visibleResults !== null &&
            preset.visibleHeight !== null &&
            preset.balanceTickStep !== null
          );
      }
      if (Array.isArray(settings.manualLines)) {
        manualLines = settings.manualLines
          .slice(0, 50)
          .map((line) => ({
            id: typeof line?.id === "string" ? line.id : createManualLineId(),
            value: Number(line?.value)
          }))
          .filter((line) => Number.isFinite(line.value));
      }
    } catch (_error) {
      // Повреждённые или недоступные локальные настройки не мешают работе страницы.
    }
  }

  function saveInterfaceSettings() {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          threshold: thresholdInput.value,
          visibleResults: visibleResultsInput.value,
          visibleHeight: visibleHeightInput.value,
          balanceTickStep: balanceTickStepInput.value,
          autoRefresh: autoRefreshEnabled,
          crosshairEnabled: crosshairEnabled.checked,
          presets,
          manualLines
        })
      );
    } catch (_error) {
      // В приватном режиме localStorage может быть недоступен.
    }
  }

  function readChartOptions() {
    const visibleResults = parseIntegerInRange(
      visibleResultsInput.value,
      2,
      10_000
    );
    const visibleHeight = parseIntegerInRange(
      visibleHeightInput.value,
      1,
      1_000_000
    );
    const balanceTickStep = parseBalanceTickStep(balanceTickStepInput.value);

    if (
      visibleResults === null ||
      visibleHeight === null ||
      balanceTickStep === null
    ) {
      return null;
    }

    return { visibleResults, visibleHeight, balanceTickStep };
  }

  function normalizeChartInputs(options) {
    lastChartOptions = { ...options };
    visibleResultsInput.value = String(options.visibleResults);
    visibleHeightInput.value = String(options.visibleHeight);
    balanceTickStepInput.value = formatInputNumber(options.balanceTickStep);
    saveInterfaceSettings();
  }

  function findNearestPoint(points, targetIndex) {
    let low = 0;
    let high = points.length - 1;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (Number(points[middle].index) < targetIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    const right = points[low];
    const left = points[Math.max(low - 1, 0)];
    return Math.abs(Number(left.index) - targetIndex) <=
      Math.abs(Number(right.index) - targetIndex)
      ? left
      : right;
  }

  function parseThreshold(rawValue) {
    const normalized = String(rawValue).trim().replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 1 || value > 1_000_000) {
      return null;
    }
    return Math.round(value * 10000) / 10000;
  }

  function parseIntegerInRange(rawValue, min, max) {
    const value = Number(String(rawValue).trim());
    if (!Number.isInteger(value) || value < min || value > max) {
      return null;
    }
    return value;
  }

  function parseBalanceTickStep(rawValue) {
    const normalized = String(rawValue).trim().replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
      return null;
    }
    return Math.round(value * 10000) / 10000;
  }

  function calculateNiceIntegerStep(rawStep) {
    return Math.max(1, Math.round(calculateNiceStep(rawStep)));
  }

  function calculateNiceStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) {
      return 1;
    }

    const exponent = Math.floor(Math.log10(rawStep));
    const magnitude = 10 ** exponent;
    const fraction = rawStep / magnitude;
    let niceFraction;

    if (fraction <= 1) {
      niceFraction = 1;
    } else if (fraction <= 2) {
      niceFraction = 2;
    } else if (fraction <= 5) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }

    return niceFraction * magnitude;
  }

  function normalizeFloatingPoint(value) {
    return Number(Number(value).toPrecision(12));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setElementHidden(element, hidden) {
    if (!element) {
      return;
    }
    element.toggleAttribute("hidden", hidden);
  }

  function setConnection(isOnline) {
    connectionStatus.textContent = isOnline ? "API доступен" : "API недоступен";
    connectionStatus.classList.toggle("online", isOnline);
    connectionStatus.classList.toggle("offline", !isOnline);
  }

  function showError(message) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function formatPresetThreshold(value) {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  }

  function formatBalanceTickStep(value) {
    const numeric = Number(value);
    return numeric > 0 ? formatNumber(numeric) : "авто";
  }

  function formatInputNumber(value) {
    return String(normalizeFloatingPoint(Number(value) || 0));
  }

  function formatRecentMultiplier(value) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value));
  }

  function formatSigned(value, includePlus = true) {
    const numeric = Number(value);
    const prefix = includePlus && numeric > 0 ? "+" : "";
    return `${prefix}${formatNumber(numeric)}`;
  }

  function formatCompact(value) {
    const numeric = Number(value);
    if (Math.abs(numeric) >= 1_000_000) {
      return `${formatNumber(numeric / 1_000_000)}M`;
    }
    if (Math.abs(numeric) >= 10_000) {
      return `${formatNumber(numeric / 1_000)}k`;
    }
    return formatNumber(numeric);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Время неизвестно" : dateFormatter.format(date);
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
