import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding OphirPay database...");

  // Create a default user
  const user = await prisma.user.upsert({
    where: { id: "seed-user-1" },
    update: {},
    create: {
      id: "seed-user-1",
      name: "OphirPay Demo",
      stellarAddress: "GACZ7ZELCUC5YGJ6JHIVLEZNR3XKYKOVUWD6H3IRFPRZMALNUYJZQM2U",
    },
  });

  // Create sample payment records
  const payments = [
    { amount: 500, description: "Monthly subscription payment", status: "COMPLETED" as const },
    { amount: 250, description: "Freelance invoice #42", status: "COMPLETED" as const },
    { amount: 1500, description: "Vendor payment — cloud hosting", status: "COMPLETED" as const },
    { amount: 100, description: "Test payment", status: "PENDING" as const },
    { amount: 75, description: "Coffee fund contribution", status: "FAILED" as const },
  ];

  for (const p of payments) {
    await prisma.payment.create({
      data: {
        amount: p.amount,
        assetCode: "XLM",
        description: p.description,
        status: p.status,
        userId: user.id,
        transactionHash: "seed-tx-hash",
      },
    });
  }

  // Create a sample batch
  await prisma.batch.create({
    data: {
      name: "Demo Batch — Monthly Payroll",
      description: "Sample batch payment for demo purposes",
      userId: user.id,
      status: "COMPLETED",
    },
  });

  // Create sample refunds
  const refunds = [
    { paymentId: 1, amount: 500, reason: "Product arrived defective", reasonCode: 0, status: "Processed" as const },
    { paymentId: 2, amount: 250, reason: "Never received the service", reasonCode: 1, status: "Approved" as const },
    { paymentId: 3, amount: 1500, reason: "Charged twice by mistake", reasonCode: 2, status: "Requested" as const },
    { paymentId: 4, amount: 100, reason: "Unauthorized transaction", reasonCode: 3, status: "Rejected" as const },
  ];

  for (const r of refunds) {
    await prisma.refund.create({
      data: {
        userId: user.id,
        paymentId: r.paymentId,
        amount: BigInt(r.amount),
        reason: r.reason,
        reasonCode: r.reasonCode,
        status: r.status,
        asset: "native",
        resolvedAt: r.status === "Processed" || r.status === "Rejected" ? new Date() : null,
      },
    });
  }

  // Create sample notification hooks
  const hooks = [
    { eventType: "payment_recorded", webhookUrl: "https://example.com/webhooks/payments" },
    { eventType: "refund_processed", webhookUrl: "https://example.com/webhooks/refunds" },
    { eventType: "escrow_created", webhookUrl: "https://example.com/webhooks/escrows" },
  ];

  for (const h of hooks) {
    await prisma.notificationHook.create({
      data: {
        userId: user.id,
        eventType: h.eventType,
        webhookUrl: h.webhookUrl,
        active: true,
      },
    });
  }

  console.log(`Seeded: 1 user, ${payments.length} payments, 1 batch, ${refunds.length} refunds, ${hooks.length} hooks`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
