import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// ── Config ──────────────────────────────────────────────
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PRD_FILE = join(SCRIPT_DIR, "prd.json");
const PROGRESS_FILE = join(SCRIPT_DIR, "progress.txt");
const ARCHIVE_DIR = join(SCRIPT_DIR, "archive");
const LAST_BRANCH_FILE = join(SCRIPT_DIR, ".last-branch");

type Tool = "amp" | "claude" | "codex";

type ClaudeUsage = {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens?: number;
};

type CodexUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
};

type TokenSummary =
  | {
      tool: "claude";
      durationS: number;
      cost: number;
      usage: ClaudeUsage;
      contextPct: number;
      ctxLabel: string;
    }
  | {
      tool: "codex";
      durationS: number;
      usage: CodexUsage;
      turns: number;
    };

type RunResult = {
  output: string;
  tokenSummary: TokenSummary | null;
};

type ScoreMap = Record<string, number>;
type MetricMap = Record<string, string>;

type LighthouseProgressSummary = {
  storyLabel: string;
  beforeScores: ScoreMap;
  afterScores: ScoreMap;
  beforeMetrics: MetricMap;
  afterMetrics: MetricMap;
} | null;

// ── Colors ──────────────────────────────────────────────
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

// ── Parse arguments ─────────────────────────────────────
function parseArgs(): { tool: Tool; maxIterations: number } {
  const args = process.argv.slice(2);
  let tool: Tool = "claude";
  let maxIterations = 50;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--tool" && args[i + 1]) {
      tool = args[++i] as Tool;
    } else if (arg.startsWith("--tool=")) {
      tool = arg.split("=")[1] as Tool;
    } else if (/^\d+$/.test(arg)) {
      maxIterations = Number(arg);
    }
  }

  if (!["amp", "claude", "codex"].includes(tool)) {
    console.error(
      `Error: Invalid tool '${tool}'. Must be 'amp', 'claude', or 'codex'.`,
    );
    process.exit(1);
  }

  return { tool, maxIterations };
}

// ── Helpers ─────────────────────────────────────────────
function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function readText(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

function getPromptPath(): string {
  const promptMd = join(SCRIPT_DIR, "prompt.md");
  if (existsSync(promptMd)) return promptMd;
  return join(SCRIPT_DIR, "CLAUDE.md");
}

function initProgressFile() {
  writeFileSync(
    PROGRESS_FILE,
    `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n---\n`,
  );
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000)
    return `${Math.floor((tokens / 1_000_000) * 10) / 10}M`;
  if (tokens >= 1_000) return `${Math.floor(tokens / 1_000)}K`;
  return String(tokens);
}

function formatTokenCount(tokens: number | undefined): string {
  return (tokens ?? 0).toLocaleString("en-US");
}

function formatDuration(durationS: number): string {
  const totalSeconds = Math.max(0, Math.round(durationS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function padAnsi(value: string, width: number): string {
  const visibleWidth = stripAnsi(value).length;
  return `${value}${" ".repeat(Math.max(0, width - visibleWidth))}`;
}

function makeRow(label: string, value: string, width: number): string {
  const contentWidth = width - 4;
  const labelWidth = Math.min(
    24,
    Math.max(10, Math.floor(contentWidth * 0.32)),
  );
  const valueWidth = Math.max(0, contentWidth - labelWidth - 3);
  return `║ ${padAnsi(dim(label), labelWidth)} ${padAnsi(value, valueWidth)} ║`;
}

function makeTitleRow(value: string, width: number): string {
  return `║ ${padAnsi(bold(value), width - 4)} ║`;
}

function makeSeparator(width: number): string {
  return `╟${"─".repeat(width - 2)}╢`;
}

function buildBox(title: string, rows: string[], width = 78): string {
  const safeWidth = Math.max(width, stripAnsi(title).length + 6);
  return [
    `╔${"═".repeat(safeWidth - 2)}╗`,
    makeTitleRow(title, safeWidth),
    rows.length > 0 ? makeSeparator(safeWidth) : "",
    ...rows,
    `╚${"═".repeat(safeWidth - 2)}╝`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseNumericMap(input: string): ScoreMap {
  const matches = input.matchAll(/([A-Za-z ]+?) (\d+)(?=,|$)/g);
  const result: ScoreMap = {};

  for (const match of matches) {
    const label = match[1]?.trim();
    const value = Number(match[2]);
    if (!label || Number.isNaN(value)) continue;
    result[label] = value;
  }

  return result;
}

function parseMetricMap(input: string): MetricMap {
  const matches = input.matchAll(
    /([A-Za-z ]+?) ([0-9.]+(?:\s?[a-zA-Z%]+)?)(?=,|$)/g,
  );
  const result: MetricMap = {};

  for (const match of matches) {
    const label = match[1]?.trim();
    const value = match[2]?.trim();
    if (!label || !value) continue;
    result[label] = value;
  }

  return result;
}

function parseLatestLighthouseSummary(
  progressPath: string,
): LighthouseProgressSummary {
  const progress = readText(progressPath);
  const matches = [
    ...progress.matchAll(/^## (\d{4}-[^\n]+)\n([\s\S]*?)(?=^---$|^## |\Z)/gm),
  ];
  const latestEntry = matches.at(-1);
  if (!latestEntry) return null;

  const header = latestEntry[1]?.trim() ?? "";
  const body = latestEntry[2] ?? "";
  const beforeLine =
    /^- Lighthouse before: (.+?)\. Key metrics: (.+?)\.\s*$/m.exec(body);
  const afterLine =
    /^- Lighthouse after: (.+?)\. Key metrics: (.+?)\.\s*$/m.exec(body);

  if (!beforeLine || !afterLine) return null;

  return {
    storyLabel: header.split(" - ")[1] ?? header,
    beforeScores: parseNumericMap(beforeLine[1] ?? ""),
    afterScores: parseNumericMap(afterLine[1] ?? ""),
    beforeMetrics: parseMetricMap(beforeLine[2] ?? ""),
    afterMetrics: parseMetricMap(afterLine[2] ?? ""),
  };
}

function formatScoreDelta(before: number, after: number): string {
  const delta = after - before;
  const deltaLabel =
    delta > 0 ? green(`+${delta}`) : delta < 0 ? red(String(delta)) : dim("0");
  const arrow =
    after > before ? green("↗") : after < before ? red("↘") : dim("→");
  return `${String(before).padStart(3)} ${arrow} ${String(after).padStart(3)}  ${deltaLabel}`;
}

function formatMetricDelta(before?: string, after?: string): string {
  if (!before || !after) return dim("n/a");
  const arrow = before === after ? dim("→") : yellow("→");
  return `${before} ${arrow} ${after}`;
}

function buildIterationSummary(
  iteration: number,
  maxIterations: number,
  tokenSummary: TokenSummary | null,
  lighthouseSummary: LighthouseProgressSummary,
): string {
  const titleBits = [`✨ Iteration ${iteration}/${maxIterations}`];
  if (lighthouseSummary?.storyLabel)
    titleBits.push(lighthouseSummary.storyLabel);

  const rows: string[] = [];

  if (tokenSummary) {
    if (tokenSummary.tool === "codex") {
      const totalTokensUsed =
        tokenSummary.usage.input_tokens +
        tokenSummary.usage.cached_input_tokens +
        tokenSummary.usage.output_tokens;
      rows.push(
        makeRow("Duration", formatDuration(tokenSummary.durationS), 78),
      );
      rows.push(
        makeRow(
          "Tokens used this iteration",
          formatTokenCount(totalTokensUsed),
          78,
        ),
      );
    } else {
      const promptTotal =
        tokenSummary.usage.input_tokens +
        tokenSummary.usage.cache_creation_input_tokens +
        tokenSummary.usage.cache_read_input_tokens;
      const totalTokensUsed =
        promptTotal + (tokenSummary.usage.output_tokens ?? 0);
      rows.push(
        makeRow("Duration", formatDuration(tokenSummary.durationS), 78),
      );
      rows.push(makeRow("Cost", `$${tokenSummary.cost}`, 78));
      rows.push(
        makeRow(
          "Tokens used this iteration",
          formatTokenCount(totalTokensUsed),
          78,
        ),
      );
      rows.push(
        makeRow(
          "Context used",
          `${tokenSummary.contextPct}% of ${tokenSummary.ctxLabel}`,
          78,
        ),
      );
    }
  }

  if (lighthouseSummary) {
    if (rows.length > 0) rows.push(makeSeparator(78));
    rows.push(makeRow("📊 Lighthouse", bold("Before -> After"), 78));

    for (const category of [
      "Performance",
      "Accessibility",
      "Best Practices",
      "SEO",
    ]) {
      const before = lighthouseSummary.beforeScores[category];
      const after = lighthouseSummary.afterScores[category];
      if (before === undefined || after === undefined) continue;
      rows.push(makeRow(category, formatScoreDelta(before, after), 78));
    }

    rows.push(makeSeparator(78));
    rows.push(makeRow("⏱ Metrics", bold("Before -> After"), 78));
    for (const metric of ["LCP", "TBT", "CLS", "FCP", "Speed Index", "TTI"]) {
      rows.push(
        makeRow(
          metric,
          formatMetricDelta(
            lighthouseSummary.beforeMetrics[metric],
            lighthouseSummary.afterMetrics[metric],
          ),
          78,
        ),
      );
    }
  }

  return `\n${buildBox(titleBits.join("  •  "), rows, 78)}`;
}

// ── Archive previous run ────────────────────────────────
function archiveIfBranchChanged() {
  const prd = readJson(PRD_FILE);
  if (!prd || !existsSync(LAST_BRANCH_FILE)) return;

  const currentBranch = (prd.branchName as string) || "";
  const lastBranch = readText(LAST_BRANCH_FILE).trim();

  if (currentBranch && lastBranch && currentBranch !== lastBranch) {
    const date = new Date().toISOString().slice(0, 10);
    const folderName = lastBranch.replace(/^ralph\//, "");
    const archiveFolder = join(ARCHIVE_DIR, `${date}-${folderName}`);

    console.log(`Archiving previous run: ${lastBranch}`);
    mkdirSync(archiveFolder, { recursive: true });
    if (existsSync(PRD_FILE))
      copyFileSync(PRD_FILE, join(archiveFolder, "prd.json"));
    if (existsSync(PROGRESS_FILE))
      copyFileSync(PROGRESS_FILE, join(archiveFolder, "progress.txt"));
    console.log(`   Archived to: ${archiveFolder}`);

    initProgressFile();
  }
}

function trackBranch() {
  const prd = readJson(PRD_FILE);
  const branch = (prd?.branchName as string) || "";
  if (branch) writeFileSync(LAST_BRANCH_FILE, branch);
}

// ── Run tool ────────────────────────────────────────────
function runTool(tool: Tool): Promise<RunResult> {
  if (tool === "amp") return runAmp();
  if (tool === "codex") return runCodex();
  return runClaude();
}

function runAmp(): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn("amp", ["--dangerously-allow-all"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const promptFile = getPromptPath();
    const prompt = readFileSync(promptFile, "utf-8");
    child.stdin.write(prompt);
    child.stdin.end();

    let output = "";
    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      process.stderr.write(text);
      output += text;
    });
    child.stderr.on("data", (data: Buffer) => {
      process.stderr.write(data.toString());
    });
    child.on("close", () => resolve({ output, tokenSummary: null }));
  });
}

function runCodex(): Promise<RunResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const promptFile = getPromptPath();
    const prompt = [
      `Ralph workspace details:`,
      `- Your working directory is the repository root.`,
      `- The Ralph instruction file is at ${promptFile}.`,
      `- Read the PRD at ${PRD_FILE}.`,
      `- Read and append progress at ${PROGRESS_FILE}.`,
      ``,
      readFileSync(promptFile, "utf-8"),
    ].join("\n");
    const child = spawn(
      "codex",
      ["exec", "--json", "--dangerously-bypass-approvals-and-sandbox", prompt],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let output = "";
    let totalUsage: CodexUsage = {
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
    };
    let turnCount = 0;
    let tokenSummary: TokenSummary | null = null;
    const rl = createInterface({ input: child.stdout });

    rl.on("line", (line) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        process.stderr.write(`${line}\n`);
        return;
      }

      if (event.type === "item.completed") {
        const item = event.item as { type?: string; text?: string } | undefined;
        if (item?.type === "agent_message" && item.text) {
          console.log(item.text);
          output += item.text;
        }
      } else if (event.type === "turn.completed") {
        const usage = event.usage as CodexUsage | undefined;
        if (!usage) return;
        totalUsage = {
          input_tokens: totalUsage.input_tokens + usage.input_tokens,
          cached_input_tokens:
            totalUsage.cached_input_tokens + usage.cached_input_tokens,
          output_tokens: totalUsage.output_tokens + usage.output_tokens,
        };
        turnCount += 1;
        const durationS =
          Math.round(((Date.now() - startedAt) / 1000) * 10) / 10;
        tokenSummary = {
          tool: "codex",
          durationS,
          usage: totalUsage,
          turns: turnCount,
        };
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      process.stderr.write(data.toString());
    });
    child.on("close", () => resolve({ output, tokenSummary }));
  });
}

function runClaude(): Promise<RunResult> {
  return new Promise((resolve) => {
    const claudeMd = join(SCRIPT_DIR, "CLAUDE.md");
    const child = spawn(
      "claude",
      [
        "--dangerously-skip-permissions",
        "--print",
        "--verbose",
        "--output-format",
        "stream-json",
        "--max-turns",
        "50",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const prompt = readFileSync(claudeMd, "utf-8")
      .replace(/\{\{PRD_PATH\}\}/g, PRD_FILE)
      .replace(/\{\{PROGRESS_PATH\}\}/g, PROGRESS_FILE);
    child.stdin.write(prompt);
    child.stdin.end();

    let resultOutput = "";
    let tokenSummary: TokenSummary | null = null;
    const rl = createInterface({ input: child.stdout });

    rl.on("line", (line) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        return;
      }

      if (event.type === "assistant") {
        const message = event.message as {
          content: Array<Record<string, unknown>>;
        };
        for (const block of message.content) {
          if (block.type === "thinking") {
            console.log(dim(`[thinking] ${block.thinking as string}`));
          } else if (block.type === "text") {
            console.log(block.text as string);
          } else if (block.type === "tool_use") {
            const input = block.input as Record<string, unknown>;
            console.log(
              cyan(
                `[tool] ${block.name as string}(${Object.keys(input).join(", ")})`,
              ),
            );
          }
        }
      } else if (event.type === "result") {
        const durationS =
          Math.round(((event.duration_ms as number) / 1000) * 10) / 10;
        const cost = Math.round((event.total_cost_usd as number) * 100) / 100;

        // Context usage
        const usage = event.usage as ClaudeUsage;
        const totalTokens =
          usage.input_tokens +
          usage.cache_creation_input_tokens +
          usage.cache_read_input_tokens;

        const modelUsage = event.modelUsage as Record<
          string,
          { contextWindow: number }
        >;
        const firstModel = Object.values(modelUsage)[0];
        const contextWindow = firstModel?.contextWindow ?? 0;
        const contextPct =
          contextWindow > 0
            ? Math.round((totalTokens / contextWindow) * 1000) / 10
            : 0;
        const ctxLabel = formatContextWindow(contextWindow);

        tokenSummary = {
          tool: "claude",
          durationS,
          cost,
          usage,
          contextPct,
          ctxLabel,
        };
        resultOutput = (event.result as string) ?? "";
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      process.stderr.write(data.toString());
    });

    child.on("close", () => resolve({ output: resultOutput, tokenSummary }));
  });
}

// ── Escalation detection ────────────────────────────────
type Escalation = { category: string; subject: string; body: string };

function parseEscalations(progressPath: string): Escalation[] {
  const text = readText(progressPath);
  const lines = text.split("\n");
  const re = /\[ESCALATION:(\w+)\]\s*(.+?)\s*[—–-]\s*(.+)/;
  return lines
    .filter((l) => l.startsWith("- [ESCALATION:"))
    .map((raw) => {
      const match = re.exec(raw);
      if (!match) return null;
      return {
        category: match[1] ?? "",
        subject: match[2] ?? "",
        body: match[3] ?? "",
      };
    })
    .filter((e): e is Escalation => e !== null);
}

function buildEscalationSummary(escalations: Escalation[]): string {
  const rows: string[] = [];
  for (const esc of escalations) {
    rows.push(makeRow(`[${esc.category}]`, bold(esc.subject), 78));
    rows.push(makeRow("", esc.body, 78));
  }
  return buildBox(
    `⚠ ${escalations.length} Escalation${escalations.length > 1 ? "s" : ""} — Requires Human Decision`,
    rows,
    78,
  );
}

// ── Main ────────────────────────────────────────────────
async function main() {
  const { tool, maxIterations } = parseArgs();

  archiveIfBranchChanged();
  trackBranch();

  if (!existsSync(PROGRESS_FILE)) initProgressFile();

  console.log(
    bold(`Starting Ralph - Tool: ${tool} - Max iterations: ${maxIterations}`),
  );

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n${"=".repeat(63)}`);
    console.log(bold(`  Ralph Iteration ${i} of ${maxIterations} (${tool})`));
    console.log("=".repeat(63));

    const result = await runTool(tool);
    console.log(
      buildIterationSummary(
        i,
        maxIterations,
        result.tokenSummary,
        parseLatestLighthouseSummary(PROGRESS_FILE),
      ),
    );
    if (result.output.includes("<promise>COMPLETE</promise>")) {
      const escalations = parseEscalations(PROGRESS_FILE);
      if (escalations.length > 0) {
        console.log(`\n${buildEscalationSummary(escalations)}`);
      }
      console.log(
        green(
          bold(
            `\nRalph completed all tasks! (iteration ${i} of ${maxIterations})`,
          ),
        ),
      );
      process.exit(0);
    }

    console.log(dim(`Iteration ${i} complete. Continuing...`));
    await new Promise((r) => setTimeout(r, 2000));
  }

  const escalations = parseEscalations(PROGRESS_FILE);
  if (escalations.length > 0) {
    console.log(`\n${buildEscalationSummary(escalations)}`);
  }
  console.log(
    red(
      bold(
        `\nRalph reached max iterations (${maxIterations}) without completing all tasks.`,
      ),
    ),
  );
  console.log(`Check ${PROGRESS_FILE} for status.`);
  process.exit(1);
}

void main();
