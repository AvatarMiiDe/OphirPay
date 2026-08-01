/**
 * OphirPay Demo Video Generator
 *
 * Creates a 1-2 minute demo video by:
 * 1. Capturing screenshots of key app pages via Puppeteer
 * 2. Compiling frames into MP4 with FFmpeg
 */

const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const OUTPUT_DIR = path.join(__dirname, "..", "public");
const FRAMES_DIR = path.join(__dirname, "..", ".demo-frames");
const VIDEO_OUTPUT = path.join(OUTPUT_DIR, "demo.mp4");

// Demo slides - each is an HTML page that we scroll through
const DEMO_SLIDES = [
  {
    file: "mockups/wallet-options.html",
    label: "Wallet Options",
    description: "Connect Freighter wallet on Stellar Testnet",
  },
  {
    file: "mockups/dashboard.html",
    label: "Treasury Dashboard",
    description: "Real-time balance, stats, recent payments",
  },
  {
    file: "mockups/send-form.html",
    label: "Send Payment",
    description: "Send XLM with destination, amount, memo",
  },
  {
    file: "mockups/tx-success.html",
    label: "Transaction Success",
    description: "TX hash with Stellar Explorer link",
  },
  {
    file: "mockups/payments-list.html",
    label: "Payment History",
    description: "Search, filter, status badges",
  },
  {
    file: "mockups/mobile-responsive.html",
    label: "Mobile Responsive",
    description: "iPhone 375px viewport",
  },
  {
    file: "mockups/ci-pipeline.html",
    label: "CI/CD Pipeline",
    description: "GitHub Actions build, lint, test, deploy",
  },
  {
    file: "mockups/test-output.html",
    label: "Test Suite",
    description: "23 passing tests, 3 suites",
  },
];

async function captureFrames() {
  console.log("📸 Capturing demo frames...");

  // Clean up and recreate frames dir
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  let frameIndex = 0;

  for (const slide of DEMO_SLIDES) {
    const filePath = `file://${path.resolve(__dirname, slide.file)}`;
    console.log(`  Capturing: ${slide.label}`);

    // Capture 3 frames per slide with slight delays for natural feel
    const tab = await browser.newPage();
    const isMobile = slide.file.includes("mobile");

    await tab.setViewport({
      width: isMobile ? 375 : 1280,
      height: isMobile ? 812 : 720,
    });
    await tab.goto(filePath, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    // Frame 1: full page
    await tab.screenshot({
      path: path.join(FRAMES_DIR, `frame_${String(frameIndex).padStart(4, "0")}.png`),
    });
    frameIndex++;

    // Add overlay with slide label
    await tab.evaluate((label, desc) => {
      const overlay = document.createElement("div");
      overlay.id = "__demo_overlay";
      overlay.innerHTML = `
        <div style="position:fixed;bottom:24px;left:24px;right:24px;background:rgba(0,0,0,0.85);color:white;padding:16px 24px;border-radius:12px;z-index:9999;font-family:system-ui,sans-serif">
          <div style="font-size:20px;font-weight:700;margin-bottom:4px">${label}</div>
          <div style="font-size:14px;opacity:0.8">${desc}</div>
        </div>`;
      document.body.appendChild(overlay);
    }, slide.label, slide.description);

    await tab.screenshot({
      path: path.join(FRAMES_DIR, `frame_${String(frameIndex).padStart(4, "0")}.png`),
    });
    frameIndex++;

    await tab.close();
  }

  await browser.close();
  console.log(`  ✅ ${frameIndex} frames captured`);
}

function compileVideo() {
  console.log("🎬 Compiling video with FFmpeg...");

  // Create video: each frame = 0.5s, so ~1.5s per slide × 8 slides = ~12s total
  const framesPattern = path.join(FRAMES_DIR, "frame_%04d.png");

  execSync(
    `ffmpeg -y -framerate 2 -i ${framesPattern} -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -r 30 -preset ultrafast -movflags +faststart ${VIDEO_OUTPUT}`,
    { stdio: "inherit" }
  );

  const stats = fs.statSync(VIDEO_OUTPUT);
  console.log(`  ✅ Video created: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  📁 ${VIDEO_OUTPUT}`);
}

async function main() {
  console.log("🎥 OphirPay Demo Video Generator\n");
  await captureFrames();
  compileVideo();
  console.log("\n✅ Demo video complete!");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
