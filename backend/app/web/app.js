(() => {
  "use strict";

  const input = document.getElementById("threshold-input");
  const calculateButton = document.getElementById("calculate-button");
  const autoRefresh = document.getElementById("auto-refresh");
  const connectionStatus = document.getElementById("connection-status");
  const lastUpdate = document.getElementById("last-update");
  const chartCaption = document.getElementById("chart-caption");
  const chartWrap = document.getElementById("chart-wrap");
  const chart = document.getElementById("result-chart");
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
    chartResult: document.getElementById("stat-chart-result"),
    chartResultCard: document.getElementById("chart-result-card")
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

  let latestResponse = null;
  let activeController = null;
  let autoRefreshTimer = null;
  let resizeTimer = null;

  calculateButton.addEventListener("click", () => loadAnalysis());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadAnalysis();
    }
  });
  autoRefresh.addEventListener("change", configureAutoRefresh);
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (latestResponse) {
        renderChart(latestResponse.points);
      }
    }, 120);
  });

  configureAutoRefresh();
  loadAnalysis();

  function configureAutoRefresh() {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;

    if (autoRefresh.checked) {
      autoRefreshTimer = setInterval(() => loadAnalysis({ quiet: true }), 5000);
    }
  }

  async function loadAnalysis({ quiet = false } = {}) {
    const threshold = parseThreshold(input.value);
    if (threshold === null) {
      showError("Введите корректное значение x: число не меньше 1.");
      input.focus();
      return;
    }

    input.value = threshold.toFixed(2);
    activeController?.abort();
    activeController = new AbortController();

    if (!quiet) {
      calculateButton.disabled = true;
      calculateButton.textContent = "Расчёт…";
    }
    hideError();

    try {
      const query = new URLSearchParams({
        x: String(threshold),
        max_points: "5000"
      });
      const response = await fetch(`/api/v1/analysis?${query}`, {
        signal: activeController.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`API вернул HTTP ${response.status}`);
      }

      latestResponse = await response.json();
      render(latestResponse);
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

  function render(data) {
    renderStats(data.stats);
    renderChart(data.points);

    if (data.stats.total === 0) {
      chartCaption.textContent = "В базе пока нет результатов.";
    } else if (data.stats.points_returned < data.stats.total) {
      chartCaption.textContent =
        `Показано ${formatNumber(data.stats.points_returned)} из ` +
        `${formatNumber(data.stats.total)} точек. Статистика рассчитана по всем результатам.`;
    } else {
      chartCaption.textContent = `Показаны все ${formatNumber(data.stats.total)} результатов.`;
    }
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

    fields.requestedResult.classList.toggle(
      "value-positive",
      stats.requested_result > 0
    );
    fields.requestedResult.classList.toggle(
      "value-negative",
      stats.requested_result < 0
    );
    fields.chartResult.classList.toggle("value-positive", stats.chart_result > 0);
    fields.chartResult.classList.toggle("value-negative", stats.chart_result < 0);
  }

  function renderChart(points) {
    tooltip.hidden = true;
    chart.innerHTML = "";

    if (!Array.isArray(points) || points.length === 0) {
      chartEmpty.hidden = false;
      return;
    }
    chartEmpty.hidden = true;

    const width = Math.max(chartWrap.clientWidth, 320);
    const height = window.innerWidth <= 640 ? 340 : 430;
    const margin = {
      top: 22,
      right: 22,
      bottom: 48,
      left: width < 520 ? 52 : 68
    };
    const plotWidth = Math.max(width - margin.left - margin.right, 1);
    const plotHeight = Math.max(height - margin.top - margin.bottom, 1);

    const balances = points.map((point) => Number(point.balance));
    const dataMinY = Math.min(0, ...balances);
    const dataMaxY = Math.max(0, ...balances);
    const rawRange = Math.max(dataMaxY - dataMinY, 1);
    const tickStep = calculateNiceStep(rawRange / 5);
    let minY = Math.floor(dataMinY / tickStep) * tickStep;
    let maxY = Math.ceil(dataMaxY / tickStep) * tickStep;
    if (minY === maxY) {
      minY -= tickStep;
      maxY += tickStep;
    }

    const minX = Number(points[0].index);
    const maxX = Number(points[points.length - 1].index);
    const xRange = Math.max(maxX - minX, 1);
    const yRange = Math.max(maxY - minY, 1);

    const xScale = (value) =>
      margin.left + ((Number(value) - minX) / xRange) * plotWidth;
    const yScale = (value) =>
      margin.top + ((maxY - Number(value)) / yRange) * plotHeight;

    chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    chart.setAttribute("width", String(width));
    chart.setAttribute("height", String(height));

    const svgParts = [];
    const yTickCount = Math.round((maxY - minY) / tickStep);
    for (let tick = 0; tick <= yTickCount; tick += 1) {
      const value = normalizeFloatingPoint(maxY - tick * tickStep);
      const y = yScale(value);
      svgParts.push(
        `<line class="chart-grid-line" x1="${margin.left}" y1="${y}" ` +
        `x2="${width - margin.right}" y2="${y}"></line>`
      );
      svgParts.push(
        `<text class="chart-axis-text" x="${margin.left - 9}" y="${y + 4}" ` +
        `text-anchor="end">${escapeXml(formatCompact(value))}</text>`
      );
    }

    const xTicks = Math.min(6, points.length);
    for (let tick = 0; tick < xTicks; tick += 1) {
      const ratio = xTicks === 1 ? 0 : tick / (xTicks - 1);
      const value = Math.round(minX + ratio * xRange);
      const x = xScale(value);
      svgParts.push(
        `<text class="chart-axis-text" x="${x}" y="${height - 17}" ` +
        `text-anchor="middle">${escapeXml(formatCompact(value))}</text>`
      );
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

    const overlay = chart.querySelector("#chart-overlay");
    const hoverLine = chart.querySelector("#hover-line");
    const hoverDot = chart.querySelector("#hover-dot");

    overlay.addEventListener("pointermove", (event) => {
      const rect = chart.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width) * width;
      const targetIndex = minX + ((localX - margin.left) / plotWidth) * xRange;
      const point = findNearestPoint(points, targetIndex);
      const px = xScale(point.index);
      const py = yScale(point.balance);

      hoverLine.hidden = false;
      hoverLine.setAttribute("x1", px);
      hoverLine.setAttribute("x2", px);
      hoverLine.setAttribute("y1", margin.top);
      hoverLine.setAttribute("y2", height - margin.bottom);

      hoverDot.hidden = false;
      hoverDot.setAttribute("cx", px);
      hoverDot.setAttribute("cy", py);

      tooltip.hidden = false;
      tooltip.innerHTML =
        `<strong>Раунд ${formatNumber(point.index)}</strong>` +
        `Multiplier: ${formatNumber(point.multiplier)}x<br>` +
        `Изменение: ${formatSigned(point.delta)}<br>` +
        `Баланс: ${formatSigned(point.balance)}<br>` +
        `${escapeXml(formatDate(point.occurred_at))}`;

      const tooltipWidth = tooltip.offsetWidth || 190;
      const tooltipHeight = tooltip.offsetHeight || 110;
      let left = (px / width) * rect.width + 12;
      let top = (py / height) * rect.height - tooltipHeight / 2;
      if (left + tooltipWidth > rect.width - 8) {
        left = (px / width) * rect.width - tooltipWidth - 12;
      }
      top = Math.max(8, Math.min(top, rect.height - tooltipHeight - 8));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    overlay.addEventListener("pointerleave", () => {
      hoverLine.hidden = true;
      hoverDot.hidden = true;
      tooltip.hidden = true;
    });
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
