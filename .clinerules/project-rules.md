# ZeroClaw Development & Debugging Guide

> **📌 Note**: This file complements `../../Cline/Rules/global-rules.md`. Global rules (MCP tools, generic debugging, code guidelines) are defined there. This file contains only ZeroClaw-specific content.

---

## 🚀 Running ZeroClaw in Development

### Quick Start (Recommended)

The daemon includes the gateway and all other components, so you typically only need to run one command:

```bash
cd /Users/alaingaldemas/Documents/agentic/zeroclaw
set -a && source .env && set +a
RUST_LOG=debug cargo run --bin zeroclaw -- daemon 2>&1 | tee -a logs/zeroclaw-daemon.log &
```

This starts everything:
- ✅ Gateway on http://127.0.0.1:42617
- ✅ Channel supervisor
- ✅ Heartbeat
- ✅ Scheduler
- ✅ Logs redirected to `./logs/zeroclaw-daemon.log`

**Important**: Use `set -a && source .env && set +a` to export all variables from `.env` to subprocesses.

To follow logs in real-time:
```bash
tail -f logs/zeroclaw-daemon.log
```

### Gateway Only (Advanced)

If you only need the gateway without daemon features:

```bash
cd /Users/alaingaldemas/Documents/agentic/zeroclaw
source .env
RUST_LOG=debug cargo run --bin zeroclaw -- gateway
```

### Environment Variables

ZeroClaw-specific environment variables:

| Variable | Usage | Required For |
|----------|-------|--------------|
| `GEMINI_API_KEY` | Google Gemini API key | Gemini provider |
| `ZEROCLAW_API_KEY` | Generic API key override | All providers (detected by `zeroclaw doctor`) |
| `API_KEY` | Fallback generic key | All providers |
| `PROVIDER` | Default provider | Setting default provider |

### Port Management

If you get "Address already in use" error:

```bash
# Find the process using the port
lsof -i :42617

# Kill it
lsof -ti :42617 | xargs kill -9
```

### Health Check

Run `zeroclaw doctor` to verify everything is working:

```bash
source .env && cargo run --bin zeroclaw -- doctor
```

Expected output should show:
- ✅ config file
- ✅ provider valid
- ✅ daemon running (heartbeat fresh)
- ✅ scheduler healthy

### Common Warnings

| Warning | Explanation | Action |
|---------|-------------|--------|
| `⚠️ no api_key set` | Doctor checks config.toml only, not env vars | Ignore if using GEMINI_API_KEY in .env, or add ZEROCLAW_API_KEY |
| `⚠️ no channels configured` | No messaging channels set up | Run `zeroclaw onboard` if needed |
| `❌ state file not found` | Daemon not running | Start with `zeroclaw daemon` |

---

## 🔧 Development Workflow

### Testing Configuration Changes

When modifying config.toml or testing fixes, follow this workflow:

#### 1. Kill existing daemon
```bash
lsof -ti :42617 | xargs kill -9
```

#### 2. Start daemon in background with logs
```bash
cd /Users/alaingaldemas/Documents/agentic/zeroclaw
set -a && source .env && set +a
RUST_LOG=debug cargo run --bin zeroclaw -- daemon 2>&1 | tee -a logs/zeroclaw-daemon.log &
```

#### 3. Verify daemon started successfully
Look for these indicators in the logs:
- ✅ Config loaded
- ✅ ZeroClaw daemon started
- ✅ Gateway listening on http://127.0.0.1:42617

#### 4. Follow logs in real-time
```bash
tail -f logs/zeroclaw-daemon.log
```

### Code Change Workflow (Mandatory)

After ANY source code modification (`.rs` files) OR config file modification (`config.toml`), you MUST follow this workflow:

#### 1. Build the project (for code changes only)
```bash
cargo build --bin zeroclaw
```

#### 2. Restart the daemon
```bash
lsof -ti :42617 | xargs kill -9 2>/dev/null
sleep 1

cd /Users/alaingaldemas/Documents/agentic/zeroclaw
set -a && source .env && set +a
RUST_LOG=debug cargo run --bin zeroclaw -- daemon 2>&1 | tee -a logs/zeroclaw-daemon.log &
```

#### 3. Verify daemon started
- ✅ Config loaded
- ✅ ZeroClaw daemon started
- ✅ Gateway listening on http://127.0.0.1:42617

**Why this is mandatory:**
- **Code changes**: ZeroClaw is a compiled Rust binary. Modifying source code does NOT automatically update the running process.
- **Config changes**: The daemon reads config.toml at startup. Modifications require a restart to take effect.

**Exception:** If the user explicitly states "don't restart", then skip the restart step.

### Anti-Pattern: Build-Only Without Restart

❌ **WRONG**: "Build succeeded, code change complete!"

✅ **CORRECT**: "Build succeeded, daemon restarted on port 42617, changes are now active."

Always complete the full workflow — build + restart + verify.

---

## 🐛 Debugging ZeroClaw

### Debugging Rule #0: Use qmd MCP First

When debugging issues or searching for solutions, ALWAYS use the `qmd` MCP tool first before searching through code or reading files.

The qmd knowledge base contains accumulated solutions, past issues, and architectural decisions. This is faster and more reliable than reading source code.

```json
{
  "collections": ["zeroclaw"],
  "searches": [
    {"type": "lex", "query": "your search terms"},
    {"type": "vec", "query": "natural language question about the issue"}
  ]
}
```

**This is MANDATORY for all debugging tasks.**

### Debugging Rule #1: Check Config First

Before modifying ANY code to fix an issue, ALWAYS check if the behavior is configurable first.

ZeroClaw has extensive configuration options in `config.toml`. Many behaviors that seem like bugs can be solved by config changes instead of code changes.

#### How to Apply

1. **Check the actual config** - Review the user's config file:
   ```
   /Users/alaingaldemas/.zeroclaw/config.toml
   ```

2. **Search the config schema** - Look at `src/config/schema.rs` for available options:
   ```bash
   grep -n "outbound_leak_guard\|sensitivity\|guard" src/config/schema.rs
   ```

3. **Check the docs** - ZeroClaw has rich documentation in `docs/`:
   - `docs/config-reference.md` - Full config reference
   - `docs/troubleshooting.md` - Common issues
   - `docs/channels-reference.md` - Channel-specific config
   - `docs/commands-reference.md` - CLI commands

4. **Only then consider code changes** - If no config option exists, THEN consider a code fix.

#### Recent Example (What NOT To Do)

**Problem:** Image generation output was being redacted by security guardrail.

❌ **Wrong approach**: Modify `src/security/leak_detector.rs` to change behavior.

✅ **Correct approach**: Set in config.toml:
```toml
[security.outbound_leak_guard]
enabled = false
```

#### Common Configurable Behaviors

- `security.outbound_leak_guard.sensitivity` - Controls credential leak detection (0.0-1.0)
- `security.semantic_guard` - Controls AI safety filtering
- `autonomy.level` - Controls agent autonomy (read_only, supervised, full)
- `[channel].stream_mode` - Controls message streaming
- `security.perplexity_filter.enable_perplexity_filter` - Adversarial prompt filtering

### Debugging Rule #2: Check The Docs

ZeroClaw has extensive documentation. BEFORE proposing any fix or claiming something doesn't exist, search the docs.

#### Required Doc Searches

When debugging an issue, you MUST check:

1. **Config reference** - `docs/config-reference.md`
   - Search for keywords related to the issue
   - Check if the feature has config options

2. **Troubleshooting** - `docs/troubleshooting.md`
   - Common failure modes are documented
   - Look for similar symptoms

3. **Channels/Providers reference** - `docs/channels-reference.md`, `docs/providers-reference.md`
   - Channel-specific configuration
   - Provider quirks and requirements

4. **Commands reference** - `docs/commands-reference.md`
   - CLI options that might solve the problem

#### Key Docs Files to Know

| Doc | Purpose |
|-----|----------|
| `docs/config-reference.md` | All config keys with defaults |
| `docs/troubleshooting.md` | Common issues and solutions |
| `docs/commands-reference.md` | CLI command reference |
| `docs/channels-reference.md` | Channel setup guides |
| `docs/providers-reference.md` | Provider configuration |
| `docs/operations-runbook.md` | Day-2 operations |

### Anti-Pattern: "Let me check the code first"

This is PROHIBITED unless:
1. Config option doesn't exist AND
2. Documentation confirms it doesn't exist AND
3. User explicitly requests a code change

Always config-first, code-second.

---

## 📚 Architecture & Planning

**When creating plans, technical documents, or architectural proposals, you MUST consult and follow the relevant protocol files.**

### Priority Order:

1. **`AGENTS.md`** - Primary protocol for coding agents (Codex/Cline)
   - Section 0: Session targets and clean worktree requirements
   - Section 6: Agent workflow and validation
   - Section 6.1: Branch/PR flow
   - Section 6.2: Worktree workflow
   - Section 8: Validation matrix

2. **`CLAUDE.md`** - Architecture and engineering principles
   - Section 3: Engineering Principles (KISS, YAGNI, SRP, etc.)
   - Section 6.4: Architecture Boundary Contract
   - Section 7: Change Playbooks (how to properly add providers, channels, tools)

3. **`CONTRIBUTING.md`** - Contribution guidelines and PR requirements

### Key Rules Before Proposing Any Plan

1. **Always use a clean worktree** - Create a new git worktree for each task (see AGENTS.md Section 0.1)
2. **Run `search_files`** - Verify the feature doesn't already exist
3. **Check trait definitions** - Inspect `src/providers/traits.rs`, `src/channels/traits.rs`, `src/tools/traits.rs`
4. **Use generic references** - Say "Any Configured Provider" not "OpenAI"
5. **One concern per PR** - Avoid mixed feature+refactor+infra patches
6. **Validate by risk tier** - Follow validation matrix in AGENTS.md Section 8
7. **Document impact** - Include behavior changes, risks, and rollback plan

### Documentation System Rules

When modifying docs, follow `docs/i18n-guide.md`:
- Keep multilingual entry-point parity (en, zh-CN, ja, ru, fr, vi, el)
- Update all locale hubs when changing navigation
- Follow the i18n completion checklist before merge

---

## 🔐 Security

### Secure API Key Storage

For production, use ZeroClaw's encrypted SecretStore:

1. The secret is encrypted with ChaCha20-Poly1305
2. Encryption key stored in `~/.zeroclaw/.secret_key` (permissions 0600)
3. Config stores only ciphertext (format: `enc2:...`)

Enable in config.toml:
```toml
[secrets]
encrypt = true
```

Then set your API key — it will be automatically encrypted:
```bash
zeroclaw config set api_key "your-gemini-key"
```

### Understanding the "no api_key set" Warning

The `zeroclaw doctor` command checks only `config.api_key` in config.toml — it does NOT check environment variables.

**However, your API key will still work!** The provider (e.g., Gemini) reads `GEMINI_API_KEY` directly at runtime via `std::env::var()`.

This is a false positive. To make the warning disappear:

1. Add `api_key` to config.toml (with encryption):
   ```bash
   zeroclaw config set api_key "your-key"
   ```

2. Or add `ZEROCLAW_API_KEY` to your .env (this IS detected by doctor):
   ```
   ZEROCLAW_API_KEY=your-key
   ```

### Log Files

Debug logs are redirected to `./logs/zeroclaw-daemon.log` when running the daemon with `tee`. For other processes, check:
- Terminal output where you started the command
- `zeroclaw_agent.log` in the workspace directory
