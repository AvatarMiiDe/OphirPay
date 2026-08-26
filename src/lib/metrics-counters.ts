// SPDX-License-Identifier: MIT

/**
 * Shared Prometheus counter state.
 * Imported by both the metrics API route (for scraping) and by lib/route
 * handlers (for incrementing).
 *
 * These are in-process counters — resets on deploy. For persistent metrics,
 * swap to a Redis-backed counter store.
 */

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

export type MetricName = keyof typeof counters;
export type DeliveryType = "webhook" | "batch";
export type DeliveryFinalOutcome = "success" | "failure";

export interface DeliveryAttemptMetric {
  delivery_type: DeliveryType;
  attempt_number: number;
  count: number;
}

export interface DeliveryFinalOutcomeMetric extends DeliveryAttemptMetric {
  final_outcome: DeliveryFinalOutcome;
}

const deliveryAttempts = new Map<string, DeliveryAttemptMetric>();
const deliveryFinalOutcomes = new Map<string, DeliveryFinalOutcomeMetric>();

function assertAttemptNumber(attemptNumber: number): void {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("attemptNumber must be a positive integer");
  }
}

function attemptKey(deliveryType: DeliveryType, attemptNumber: number): string {
  return `${deliveryType}:${attemptNumber}`;
}

function finalOutcomeKey(
  deliveryType: DeliveryType,
  attemptNumber: number,
  finalOutcome: DeliveryFinalOutcome
): string {
  return `${deliveryType}:${attemptNumber}:${finalOutcome}`;
}

/** Increment a named counter. */
export function incMetric(name: MetricName, delta = 1): void {
  counters[name] += delta;
}

/** Count one delivery attempt for a webhook or batch delivery path. */
export function incDeliveryAttempt(
  deliveryType: DeliveryType,
  attemptNumber: number
): void {
  assertAttemptNumber(attemptNumber);
  const key = attemptKey(deliveryType, attemptNumber);
  const current = deliveryAttempts.get(key);

  deliveryAttempts.set(key, {
    delivery_type: deliveryType,
    attempt_number: attemptNumber,
    count: (current?.count ?? 0) + 1,
  });
}

/** Count the terminal delivery outcome, labelled by final attempt number. */
export function incDeliveryFinalOutcome(
  deliveryType: DeliveryType,
  attemptNumber: number,
  finalOutcome: DeliveryFinalOutcome
): void {
  assertAttemptNumber(attemptNumber);
  const key = finalOutcomeKey(deliveryType, attemptNumber, finalOutcome);
  const current = deliveryFinalOutcomes.get(key);

  deliveryFinalOutcomes.set(key, {
    delivery_type: deliveryType,
    attempt_number: attemptNumber,
    final_outcome: finalOutcome,
    count: (current?.count ?? 0) + 1,
  });
}

/** Record a duration observation in seconds. */
export function observeDbQuery(durationSeconds: number): void {
  counters.db_query_duration_seconds_sum += durationSeconds;
  counters.db_query_duration_seconds_count += 1;
}

/** Read current counter values (for scraping). */
export function getMetricsSnapshot(): typeof counters & {
  delivery_attempts: DeliveryAttemptMetric[];
  delivery_final_outcomes: DeliveryFinalOutcomeMetric[];
} {
  return {
    ...counters,
    delivery_attempts: [...deliveryAttempts.values()].sort(
      (a, b) =>
        a.delivery_type.localeCompare(b.delivery_type) ||
        a.attempt_number - b.attempt_number
    ),
    delivery_final_outcomes: [...deliveryFinalOutcomes.values()].sort(
      (a, b) =>
        a.delivery_type.localeCompare(b.delivery_type) ||
        a.attempt_number - b.attempt_number ||
        a.final_outcome.localeCompare(b.final_outcome)
    ),
  };
}

export function resetMetricsForTest(): void {
  for (const key of Object.keys(counters) as MetricName[]) {
    counters[key] = 0;
  }
  deliveryAttempts.clear();
  deliveryFinalOutcomes.clear();
}
