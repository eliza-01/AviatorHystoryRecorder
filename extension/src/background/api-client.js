import { getSettings } from "./settings-service.js";

async function request(path, options = {}) {
  const settings = await getSettings();
  const response = await fetch(`${settings.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

export function testApiConnection() {
  return request("/api/v1/health", { method: "GET" });
}

export function sendResultBatch(results) {
  return request("/api/v1/results/batch", {
    method: "POST",
    body: JSON.stringify({ results })
  });
}

export function sendSampleBatch(samples) {
  return request("/api/v1/diagnostics/samples/batch", {
    method: "POST",
    body: JSON.stringify({ samples })
  });
}
