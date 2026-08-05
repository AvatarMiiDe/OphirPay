import type { BatchRecipient } from "@/types";

/**
 * Parse a CSV file into batch payment recipients.
 * Expected CSV format: address,amount,assetCode,memo
 * First row is treated as a header and skipped.
 */
export async function parseRecipientsCsv(file: File): Promise<{
  recipients: BatchRecipient[];
  errors: { row: number; message: string }[];
}> {
  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  const errors: { row: number; message: string }[] = [];
  const recipients: BatchRecipient[] = [];

  if (lines.length < 2) {
    errors.push({ row: 0, message: "CSV must have a header row and at least one data row." });
    return { recipients, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = i + 1;
    const cols = lines[i].split(",").map((c) => c.trim());

    if (cols.length < 2) {
      errors.push({ row, message: "Each row must have at least address and amount." });
      continue;
    }

    const [address, amountStr, assetCode = "XLM", memo] = cols;

    if (!/^G[A-Z0-9]{55}$/.test(address)) {
      errors.push({ row, message: `Invalid Stellar address at row ${row}.` });
      continue;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ row, message: `Invalid amount at row ${row}.` });
      continue;
    }

    recipients.push({
      address,
      amount,
      assetCode: assetCode || "XLM",
      memo: memo || undefined,
    });
  }

  return { recipients, errors };
}

/**
 * Generate a CSV template for batch payment imports.
 */
export function generateRecipientsCsvTemplate(): string {
  return "address,amount,assetCode,memo\nGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX,100,XLM,optional memo\n";
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
