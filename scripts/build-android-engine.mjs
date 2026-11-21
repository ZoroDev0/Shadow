/* Bundle src/detection (engine + rules.json) into one self-contained script the
   Android app evaluates with QuickJS. Run: npm run build:android-engine */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildSync } from "esbuild";
import { ENGINE_ASSET, engineBuildOptions } from "./android-engine.mjs";

const result = buildSync(engineBuildOptions());
const js = result.outputFiles[0].text;

mkdirSync(dirname(ENGINE_ASSET), { recursive: true });
writeFileSync(ENGINE_ASSET, js);

console.log(`android engine asset: ${ENGINE_ASSET} (${(js.length / 1024).toFixed(1)} kb)`);
