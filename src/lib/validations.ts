// SPDX-License-Identifier: MIT

import { z } from "zod";

// ── Payment Schemas ────────────────────────────────────────────

export const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  assetCode: z.string().default("XLM"),
  assetIssuer: z.string().optional(),
  description: z.string().max(200).optional(),
  memo: z.string().max(28, "Memo must be 28 characters or fewer").optional(),
  sourceAccountId: z.string().min(1, "Source account is required"),
  destAddress: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address — must start with G and be 56 characters"),
});

export const createBatchSchema = z.object({
  name: z.string().min(1, "Batch name is required").max(100),
  description: z.string().max(500).optional(),
  recipients: z
    .array(
      z.object({
        address: z
          .string()
          .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address"),
        amount: z.number().positive("Amount must be greater than 0"),
        assetCode: z.string().default("XLM"),
        memo: z.string().max(28).optional(),
      })
    )
    .min(1, "At least one recipient is required")
    .max(100, "Maximum 100 recipients per batch"),
  sourceAccountId: z.string().min(1, "Source account is required"),
});

export const createRecurrenceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  amount: z.number().positive("Amount must be greater than 0"),
  assetCode: z.string().default("XLM"),
  destAddress: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address"),
  description: z.string().max(500).optional(),
  sourceAccountId: z.string().min(1, "Source account is required"),
});

export const createPaymentRequestSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  assetCode: z.string().default("XLM"),
  assetIssuer: z.string().optional(),
  description: z.string().max(500).optional(),
  recipientAddress: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address")
    .optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(z.string()).min(1, "At least one event type is required"),
  isActive: z.boolean().default(true),
});

// ── Pagination ─────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
