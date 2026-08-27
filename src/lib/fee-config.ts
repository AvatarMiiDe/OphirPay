// SPDX-License-Identifier: MIT

export const MAX_FEE_BPS = 1000; // 10%

export function validateFeeBps(fee: number): boolean {
  return Number.isInteger(fee) && fee >= 0 && fee <= MAX_FEE_BPS;
}

export function validateFeeConfig(
  paymentFee: number,
  escrowFee: number,
  streamFee: number,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validateFeeBps(paymentFee)) {
    errors.push(`Payment fee must be an integer between 0 and ${MAX_FEE_BPS} bps`);
  }
  
  if (!validateFeeBps(escrowFee)) {
    errors.push(`Escrow fee must be an integer between 0 and ${MAX_FEE_BPS} bps`);
  }
  
  if (!validateFeeBps(streamFee)) {
    errors.push(`Stream fee must be an integer between 0 and ${MAX_FEE_BPS} bps`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}