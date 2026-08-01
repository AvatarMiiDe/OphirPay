const p = require("puppeteer");
const pa = require("path");

const dir = pa.join(__dirname, "mockups");

const pages = [
  { file: "mobile-responsive.html", name: "mobile-responsive", w: 375, h: 812 },
  { file: "ci-pipeline.html", name: "ci-pipeline", w: 900, h: 700 },
  { file: "test-output.html", name: "test-output", w: 800, h: 700 },
];

(async () => {
  const browser = await p.launch({ headless: true, args: ["--no-sandbox"] });
  for (const pg of pages) {
    const tab = await browser.newPage();
    await tab.setViewport({ width: pg.w, height: pg.h });
    await tab.goto("file://" + pa.join(dir, pg.file), {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    const outPath = pa.join(__dirname, "..", "public", "screenshots", pg.name + ".png");
    await tab.screenshot({ path: outPath });
    await tab.close();
    console.log("✅", pg.name + ".png");
  }
  await browser.close();
  console.log("Done!");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
