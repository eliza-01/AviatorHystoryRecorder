(() => {
  "use strict";

  const thresholdInput = document.getElementById("threshold-input");
  const visibleResultsInput = document.getElementById("visible-results-input");
  const visibleHeightInput = document.getElementById("visible-height-input");
  const calculateButton = document.getElementById("calculate-button");
  const autoRefresh = document.getElementById("auto-refresh");
  const connectionStatus = document.getElementById("connection-status");
  const lastUpdate = document.getElementById("last-update");
  const chartCaption = document.getElementById("chart-caption");
  const chartWrap = document.getElementById("chart-wrap");
  const chartViewport = document.getElementById("chart-viewport");
  const chartCanvas = document.getElementById("chart-canvas");
  const chart = document.getElementById("result-chart");
  const chartYAxis = document.getElementById("chart-y-axis");
  const chartXAxis = document.getElementById("chart-x-axis");
  const chartAxisCorner = document.getElementById("chart-axis-corner");
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

  let latestResponse = null;
  let activeController = null;
  let autoRefreshTimer = null;
  let resizeTimer = null;
  let chartControlTimer = null;
  let chartHasRendered = false;
  let currentAxisModel = null;
  let axisRenderFrame = null;
  let lastChartOptions = {
    visibleResults: 100,
    visibleHeight: 50
  };

  restoreInterfaceSettings();

  calculateButton.addEventListener("click", () => {
    saveInterfaceSettings();
    loadAnalysis();
  });
  thresholdInput.addEventListener("keydown", handleCalculateOnEnter);
  thresholdInput.addEventListener("input", saveInterfaceSettings);
  visibleResultsInput.addEventListener("keydown", handleChartControlOnEnter);
  visibleHeightInput.addEventListener("keydown", handleChartControlOnEnter);
  visibleResultsInput.addEventListener("input", () => {
    saveInterfaceSettings();
    scheduleLocalChartRender();
  });
  visibleHeightInput.addEventListener("input", () => {
    saveInterfaceSettings();
    scheduleLocalChartRender();
  });
  autoRefresh.addEventListener("change", () => {
    saveInterfaceSettings();
    configureAutoRefresh();
  });
  chartViewport.addEventListener("scroll", () => {
    tooltip.hidden = true;
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

  function configureAutoRefresh() {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;

    if (autoRefresh.checked) {
      autoRefreshTimer = setInterval(() => loadAnalysis({ quiet: true }), 5000);
    }
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
      showError("Количество результатов должно быть не меньше 2, высота — не меньше 1.");
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
    tooltip.hidden = true;
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
    const dataMinY = Math.min(0, ...balances);
    const dataMaxY = Math.max(0, ...balances);
    const yTickStep = calculateNiceStep(options.visibleHeight / 5);
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
      xTicks
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
    height,
    margin,
    xScale,
    yScale
  }) {
    const overlay = chart.querySelector("#chart-overlay");
    const hoverLine = chart.querySelector("#hover-line");
    const hoverDot = chart.querySelector("#hover-dot");

    overlay.addEventListener("pointermove", (event) => {
      const svgRect = chart.getBoundingClientRect();
      const localX = event.clientX - svgRect.left;
      const targetIndex = minX + ((localX - margin.left) / plotWidth) * xRange;
      const point = findNearestPoint(points, targetIndex);
      const px = xScale(point.index);
      const py = yScale(point.balance);

      setElementHidden(hoverLine, false);
      hoverLine.setAttribute("x1", px);
      hoverLine.setAttribute("x2", px);
      hoverLine.setAttribute("y1", margin.top);
      hoverLine.setAttribute("y2", height - margin.bottom);

      setElementHidden(hoverDot, false);
      hoverDot.setAttribute("cx", px);
      hoverDot.setAttribute("cy", py);

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
    });

    overlay.addEventListener("pointerleave", () => {
      setElementHidden(hoverLine, true);
      setElementHidden(hoverDot, true);
      tooltip.hidden = true;
    });
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
      if (typeof settings.autoRefresh === "boolean") {
        autoRefresh.checked = settings.autoRefresh;
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
          autoRefresh: autoRefresh.checked
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

    if (visibleResults === null || visibleHeight === null) {
      return null;
    }

    return { visibleResults, visibleHeight };
  }

  function normalizeChartInputs(options) {
    lastChartOptions = { ...options };
    visibleResultsInput.value = String(options.visibleResults);
    visibleHeightInput.value = String(options.visibleHeight);
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
