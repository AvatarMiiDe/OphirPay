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
      NEXT_PUBLIC_CONTRACT_ID: "CAW7OORNGPRBRQJIXRXZOXEPZZO3Z5FKSCLBULGLBTVVPZYYVTK2UKIA",
      NEXT_PUBLIC_EMITTER_CONTRACT_ID: "CCMXLNRPBTHVTEH7UEBXQVZ4YJZB5NN7LXJBAL465A6YFXJPJGV2CYPX",
      NEXT_PUBLIC_CHAIN_READ_SOURCE: "GACNKEDGJYLLVQDXWYEEPB47Y3JEV5JNZ3RQANTJIVKKEOXX4NC4YWHU",
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
