import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The engine lives outside src/ and is imported directly by the app. Vite
// serves it fine from the project root; nothing here should transform it.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
});
