// SPDX-License-Identifier: MIT

import type { BatchRecipient } from "@/types";

export interface CsvParseError {
  row: number;
  message: string;
}

export interface CsvParseResult {
  recipients: BatchRecipient[];
  errors: CsvParseError[];
}

/**
 * Split a CSV row into fields, correctly handling quoted fields, commas inside quotes,
 * and escaped quotes ("").
 */
export function splitCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      i++;
      continue;
    }

    current += char;
    i++;
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse CSV text or string into batch payment recipients.
 * Handles UTF-8 BOM, CRLF/LF line endings, quoted fields, custom/extra columns, and validates fields.
 */
export function parseRecipientsCsvText(raw: string): CsvParseResult {
  const errors: CsvParseError[] = [];
  const recipients: BatchRecipient[] = [];

  try {
    if (!raw || typeof raw !== "string") {
      errors.push({ row: 0, message: "CSV content is empty." });
      return { recipients, errors };
    }

    // Strip UTF-8 BOM (U+FEFF) and normalize line endings
    const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      errors.push({ row: 0, message: "CSV content is empty." });
      return { recipients, errors };
    }

    if (lines.length < 2) {
      errors.push({ row: 0, message: "CSV must have a header row and at least one data row." });
      return { recipients, errors };
    }

    // Check header row
    const headerCols = splitCsvRow(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ""));
    const addressIdx = headerCols.findIndex((h) => h === "address" || h === "recipient" || h === "account");
    const amountIdx = headerCols.findIndex((h) => h === "amount" || h === "value");
    const assetIdx = headerCols.findIndex((h) => h === "assetcode" || h === "asset" || h === "currency" || h === "token");
    const memoIdx = headerCols.findIndex((h) => h === "memo" || h === "note" || h === "message");

    // Standard header check or fallback to position-based if valid columns
    const hasNamedHeaders = addressIdx !== -1 && amountIdx !== -1;

    for (let i = 1; i < lines.length; i++) {
      const row = i + 1;
      try {
        const cols = splitCsvRow(lines[i]);

        if (cols.length < 2) {
          errors.push({ row, message: `Row ${row}: Each row must have at least address and amount.` });
          continue;
        }

        let address = "";
        let amountStr = "";
        let assetCode = "XLM";
        let memo: string | undefined = undefined;

        if (hasNamedHeaders) {
          address = cols[addressIdx] || "";
          amountStr = cols[amountIdx] || "";
          if (assetIdx !== -1 && cols[assetIdx]) {
            assetCode = cols[assetIdx];
          }
          if (memoIdx !== -1 && cols[memoIdx]) {
            memo = cols[memoIdx];
          }
        } else {
          // Positional fallback: 0: address, 1: amount, 2: assetCode, 3: memo
          address = cols[0] || "";
          amountStr = cols[1] || "";
          if (cols.length > 2 && cols[2]) {
            assetCode = cols[2];
          }
          if (cols.length > 3 && cols[3]) {
            memo = cols[3];
          }
        }

        address = address.trim();
        amountStr = amountStr.trim();
        assetCode = assetCode.trim();
        if (memo !== undefined) {
          memo = memo.trim();
        }

        if (!address) {
          errors.push({ row, message: `Row ${row}: Missing address.` });
          continue;
        }

        if (!/^G[A-Z0-9]{55}$/.test(address)) {
          errors.push({ row, message: `Row ${row}: Invalid Stellar address "${address}".` });
          continue;
        }

        if (!amountStr) {
          errors.push({ row, message: `Row ${row}: Missing amount.` });
          continue;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          errors.push({ row, message: `Row ${row}: Invalid amount "${amountStr}". Must be a positive number.` });
          continue;
        }

        recipients.push({
          address,
          amount,
          assetCode: assetCode || "XLM",
          memo: memo || undefined,
        });
      } catch (rowErr) {
        errors.push({
          row,
          message: `Row ${row}: Failed to parse row due to unexpected formatting error (${rowErr instanceof Error ? rowErr.message : String(rowErr)}).`,
        });
      }
    }
  } catch (err) {
    errors.push({
      row: 0,
      message: `Failed to parse CSV file (${err instanceof Error ? err.message : String(err)}).`,
    });
  }

  return { recipients, errors };
}

/**
 * Parse a CSV file into batch payment recipients.
 * Expected CSV format: address,amount,assetCode,memo
 * First row is treated as a header.
 */
export async function parseRecipientsCsv(file: File): Promise<CsvParseResult> {
  try {
    if (!file) {
      return { recipients: [], errors: [{ row: 0, message: "No file provided." }] };
    }
    const raw = await file.text();
    return parseRecipientsCsvText(raw);
  } catch (err) {
    return {
      recipients: [],
      errors: [{ row: 0, message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` }],
    };
  }
}

/**
 * Generate a CSV template for batch payment imports.
 */
export function generateRecipientsCsvTemplate(): string {
  return "address,amount,assetCode,memo\nGBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5,100,XLM,payroll\n";
}

/**
 * Download the CSV template file.
 */
export function downloadCsvTemplate(): void {
  const csv = generateRecipientsCsvTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ophirpay-batch-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
