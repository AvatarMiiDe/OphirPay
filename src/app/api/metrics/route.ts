// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";

// In-memory counters for Prometheus scraping
const counters = {
  http_requests_total: 0,
  payments_created_total: 0,
  payments_failed_total: 0,
  batches_processed_total: 0,
  webhooks_delivered_total: 0,
  webhooks_failed_total: 0,
  db_query_duration_seconds_sum: 0,
  db_query_duration_seconds_count: 0,
};

/** Increment a named counter (called from middleware or API routes) */
export function incMetric(name: keyof typeof counters, delta = 1) {
  counters[name] += delta;
}

/** Record a duration observation (in seconds) */
export function observeDbQuery(durationSeconds: number) {
  counters.db_query_duration_seconds_sum += durationSeconds;
  counters.db_query_duration_seconds_count += 1;
}

function buildMetrics(): string {
  const lines: string[] = [
    "# HELP ophirpay_http_requests_total Total HTTP requests served",
    "# TYPE ophirpay_http_requests_total counter",
    `ophirpay_http_requests_total ${counters.http_requests_total}`,
    "",
    "# HELP ophirpay_payments_created_total Total payments recorded on-chain",
    "# TYPE ophirpay_payments_created_total counter",
    `ophirpay_payments_created_total ${counters.payments_created_total}`,
    "",
    "# HELP ophirpay_payments_failed_total Total failed payment attempts",
    "# TYPE ophirpay_payments_failed_total counter",
    `ophirpay_payments_failed_total ${counters.payments_failed_total}`,
    "",
    "# HELP ophirpay_batches_processed_total Total batch payments processed",
    "# TYPE ophirpay_batches_processed_total counter",
    `ophirpay_batches_processed_total ${counters.batches_processed_total}`,
    "",
    "# HELP ophirpay_webhooks_delivered_total Total webhooks successfully delivered",
    "# TYPE ophirpay_webhooks_delivered_total counter",
    `ophirpay_webhooks_delivered_total ${counters.webhooks_delivered_total}`,
    "",
    "# HELP ophirpay_webhooks_failed_total Total webhooks that failed delivery",
    "# TYPE ophirpay_webhooks_failed_total counter",
    `ophirpay_webhooks_failed_total ${counters.webhooks_failed_total}`,
    "",
    "# HELP ophirpay_db_query_duration_seconds Database query duration histogram",
    "# TYPE ophirpay_db_query_duration_seconds summary",
    `ophirpay_db_query_duration_seconds_sum ${counters.db_query_duration_seconds_sum}`,
    `ophirpay_db_query_duration_seconds_count ${counters.db_query_duration_seconds_count}`,
    "",
    "# HELP ophirpay_info OphirPay build information",
    "# TYPE ophirpay_info gauge",
    "ophirpay_info{version=\"1.0.0\"} 1",
  ];
  return lines.join("\n") + "\n";
}

export async function GET() {
  incMetric("http_requests_total");
  return new NextResponse(buildMetrics(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
