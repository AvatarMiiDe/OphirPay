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

  console.log(`Seeded: 1 user, ${payments.length} payments, 1 batch`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
