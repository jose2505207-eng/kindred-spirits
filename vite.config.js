import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// A build with no Supabase variables used to succeed and then serve an app with
// no auth gate at all, which is indistinguishable from demo mode to anyone
// looking at it. It fails here instead, before anything is deployed.
//
// Demo mode is the one way to build without a backend, and it has to be asked
// for explicitly: VITE_DEMO_MODE=true.
const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

// A copied .env.example is not configuration.
const PLACEHOLDER = /your-project-ref|replace_me/i;
const unset = (v) => !v || !String(v).trim() || PLACEHOLDER.test(String(v));

export default defineConfig(({ command, mode }) => {
  // loadEnv reads the .env files; Vercel and CI put their variables in the
  // process environment instead, so both are consulted.
  const fromFiles = loadEnv(mode, process.cwd(), "VITE_");
  const read = (name) => process.env[name] ?? fromFiles[name];

  if (command === "build" && read("VITE_DEMO_MODE") !== "true") {
    const missing = REQUIRED.filter((name) => unset(read(name)));
    if (missing.length) {
      const them = missing.length > 1 ? "them" : "it";
      throw new Error(
        `\n\nKindred Spirits cannot build: missing ${missing.join(" and ")}.\n\n`
        + `Set ${them} for this environment and build again, or set `
        + "VITE_DEMO_MODE=true to build the\nseeded review build on purpose.\n\n"
        + "On Vercel these must be set for BOTH Production and Preview, and "
        + "changing them\nneeds a redeploy with the build cache turned off.\n",
      );
    }
  }

  // The engine lives outside src/ and is imported directly by the app. Vite
  // serves it fine from the project root; nothing here should transform it.
  return {
    plugins: [react()],
    server: { host: true },
  };
});
