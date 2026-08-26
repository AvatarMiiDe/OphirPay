// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/lib/metrics-counters";
import { withRequestLogging } from "@/lib/request-logging";

function labels(labels: Record<string, string | number>): string {
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(",");
}

function buildMetrics(): string {
  const c = getMetricsSnapshot();

  const lines: string[] = [
    "# HELP ophirpay_http_requests_total Total HTTP requests served",
    "# TYPE ophirpay_http_requests_total counter",
    `ophirpay_http_requests_total ${c.http_requests_total}`,
    "",
    "# HELP ophirpay_payments_created_total Total payments created",
    "# TYPE ophirpay_payments_created_total counter",
    `ophirpay_payments_created_total ${c.payments_created_total}`,
    "",
    "# HELP ophirpay_payments_failed_total Total failed payment attempts",
    "# TYPE ophirpay_payments_failed_total counter",
    `ophirpay_payments_failed_total ${c.payments_failed_total}`,
    "",
    "# HELP ophirpay_batches_processed_total Total batch payments processed",
    "# TYPE ophirpay_batches_processed_total counter",
    `ophirpay_batches_processed_total ${c.batches_processed_total}`,
    "",
    "# HELP ophirpay_webhooks_delivered_total Total webhooks delivered",
    "# TYPE ophirpay_webhooks_delivered_total counter",
    `ophirpay_webhooks_delivered_total ${c.webhooks_delivered_total}`,
    "",
    "# HELP ophirpay_webhooks_failed_total Total webhooks that failed delivery",
    "# TYPE ophirpay_webhooks_failed_total counter",
    `ophirpay_webhooks_failed_total ${c.webhooks_failed_total}`,
    "",
    "# HELP ophirpay_delivery_attempts_total Total delivery attempts by delivery type and attempt number",
    "# TYPE ophirpay_delivery_attempts_total counter",
    ...c.delivery_attempts.map(
      (metric) =>
        `ophirpay_delivery_attempts_total{${labels({
          delivery_type: metric.delivery_type,
          attempt_number: metric.attempt_number,
        })}} ${metric.count}`
    ),
    "",
    "# HELP ophirpay_delivery_final_outcomes_total Total terminal delivery outcomes by delivery type, final attempt number, and outcome",
    "# TYPE ophirpay_delivery_final_outcomes_total counter",
    ...c.delivery_final_outcomes.map(
      (metric) =>
        `ophirpay_delivery_final_outcomes_total{${labels({
          delivery_type: metric.delivery_type,
          attempt_number: metric.attempt_number,
          final_outcome: metric.final_outcome,
        })}} ${metric.count}`
    ),
    "",
    "# HELP ophirpay_db_query_duration_seconds_sum Database query duration sum",
    "# TYPE ophirpay_db_query_duration_seconds_sum summary",
    `ophirpay_db_query_duration_seconds_sum ${c.db_query_duration_seconds_sum}`,
    `ophirpay_db_query_duration_seconds_count ${c.db_query_duration_seconds_count}`,
    "",
    "# HELP ophirpay_info OphirPay build information",
    "# TYPE ophirpay_info gauge",
    "ophirpay_info{version=\"1.0.0\"} 1",
  ];

  return lines.join("\n") + "\n";
}

export const GET = withRequestLogging(async function GET() {
  return new NextResponse(buildMetrics(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
