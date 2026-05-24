// `demath skill` — print the bundled SKILL.md to stdout.
//
// Lets an AI agent acquire the protocol's agent-facing intro with
// nothing more than `npm install -g @demath-ai/cli && demath skill`.
// The content is embedded at build time (see scripts/embed-skill.mjs),
// so the binary is self-contained — no filesystem lookup, no network,
// no separate doc to ship.

import { SKILL_MD_CONTENT } from "../skillContent.generated.js";

export function runSkill(): number {
  process.stdout.write(SKILL_MD_CONTENT);
  if (!SKILL_MD_CONTENT.endsWith("\n")) process.stdout.write("\n");
  return 0;
}
