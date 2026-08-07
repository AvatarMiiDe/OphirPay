import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_CONTRACT_ID: "CBRCZHMNWOFTWOTCI2WBQ5A5HVKVLO2AXHYIWJ5FVYB45OHLSLWGJGYB",
      NEXT_PUBLIC_EMITTER_CONTRACT_ID: "CA6LAPR4OWABPWORBQGK5O5H5S62GIPQBKP3PH7H2DQ3ZNSWSH3RHFE4",
      NEXT_PUBLIC_CHAIN_READ_SOURCE: "GACZ7ZELCUC5YGJ6JHIVLEZNR3XKYKOVUWD6H3IRFPRZMALNUYJZQM2U",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/__tests__/**", "src/types/**", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
