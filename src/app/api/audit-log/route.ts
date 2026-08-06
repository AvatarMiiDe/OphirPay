import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: 5, timestamp: Math.floor(Date.now() / 1000) - 60, action: "payment_recorded", actor: "GABC1234...", target_id: 42, details: "Payment recorded" },
      { id: 4, timestamp: Math.floor(Date.now() / 1000) - 120, action: "escrow_created", actor: "GDEF5678...", target_id: 3, details: "Escrow created" },
      { id: 3, timestamp: Math.floor(Date.now() / 1000) - 300, action: "multisig_configured", actor: "GABC1234...", target_id: 0, details: "Multisig configured" },
      { id: 2, timestamp: Math.floor(Date.now() / 1000) - 600, action: "fee_config_set", actor: "GABC1234...", target_id: 0, details: "Fee configuration updated" },
      { id: 1, timestamp: Math.floor(Date.now() / 1000) - 900, action: "contract_unpaused", actor: "GABC1234...", target_id: 0, details: "Contract unpaused" },
    ],
  });
}
