---
name: perf-load-check
description: Checks whether backend code is optimized and whether the running API can actually sustain a target request rate (e.g. 100 requests/sec) with acceptable latency and no errors. Combines a static code review for performance anti-patterns (blocking/synchronous I/O on the request path, N+1 data access, unbounded/unpaginated payloads, repeated full-collection scans, missing caching, Angular change-detection issues) with a real open-loop load test against the running server using a bundled dependency-free script. Use this whenever the user asks if their code/API is "optimized" or "performant", whether it "can handle load" or "can handle N requests per second / req/s / rps", asks for a "load test", "stress test", "performance review", or "benchmark", or gives a specific throughput target. Produces a pass/fail report with concrete findings and real numbers, not just a code read-through.
---

# Performance & load check

This skill answers two different questions that people conflate under "is
this optimized": (1) does the code have structural problems that will get
worse under concurrent load, and (2) does the running server *actually*
sustain the target rate right now, with real numbers. Do both — a clean
static review can still fail under load (e.g. GC pauses, connection limits),
and a load test that happens to pass today can be one data-growth step away
from falling over because of a static issue that hasn't been triggered yet.

Read [references/static-review-checklist.md](references/static-review-checklist.md)
before doing the static review — it explains *why* each pattern matters at a
given request rate, not just a list to pattern-match against. Don't apply it
mechanically; the goal is to reason about which findings would actually bite
at the target rate for this specific codebase.

## Workflow

1. **Scope it.** Identify the server entry point, the routes/handlers, and
   the data-access layer (ORM, flat file, in-memory store, etc.). If the
   target request rate wasn't given, assume 100 req/sec (the common default)
   and say so in the report rather than asking — it's easy to re-run at a
   different number later.

2. **Static review.** Read the entry point, the data-access layer, and each
   route handler in scope. Use the checklist reference for what to look for,
   but report only things that would plausibly matter at the target rate —
   don't pad the report with micro-optimizations that don't move throughput
   or latency. For each finding, capture: file:line, the mechanism (why it
   degrades under concurrent load), and a concrete fix.

3. **Get the server running.** Probe a health/root endpoint on the expected
   base URL (default `http://localhost:3000` — adjust to what the project's
   entry point actually listens on). If it's not up, start it the way the
   project defines (e.g. `npm run dev`/`npm start` in the server directory)
   in the background and wait for the health check to succeed before
   load testing. If you can't tell how to start it, ask.

4. **Pick endpoints to load test.** Prefer safe, idempotent GET endpoints —
   hammering a mutating endpoint (POST/PUT/DELETE) at 100 req/sec will either
   flood a real dataset with junk or fail non-idempotently, and that failure
   is not a signal about the server's read-path performance. Only include
   mutating endpoints if the data store is clearly disposable/reseedable
   (check for a reset/seed script) and say so in the report.

5. **Run the load test** with the bundled script — no dependencies, no
   network install required:

   ```bash
   node .claude/skills/perf-load-check/scripts/load_test.js \
     --url http://localhost:3000 \
     --rate 100 \
     --duration 10 \
     --paths /api/health,/api/donors,/api/inventory,/api/donations,/api/requests,/api/dashboard
   ```

   This is an *open-loop* tester: it schedules requests at the target rate
   for the duration (plus an untimed warmup) regardless of how fast the
   server responds, which is what real traffic does. That's the right model
   for answering "can this sustain X req/sec" — a closed-loop tool that just
   saturates N connections answers a different question ("what's the max
   throughput of N workers"). If results look borderline, rerun with a
   longer `--duration` (20-30s) before concluding either way — a short run
   can look fine right up until a slow leak or GC pressure catches up.

6. **Write the report** using the template below. Don't just dump the raw
   JSON — synthesize it.

## Report template

```markdown
# Performance & Load Check — <project/service name>

**Target:** <N> req/sec sustained, <base URL>

## Static review

| Severity | Location | Issue | Why it matters at <N> req/sec | Fix |
|---|---|---|---|---|
| High/Med/Low | file.js:line | ... | ... | ... |

(If nothing worth flagging: say so plainly — don't invent findings.)

## Load test results

| Endpoint | Target rate | Achieved rate | Avg latency | p95 | p99 | Errors |
|---|---|---|---|---|---|---|
| GET /api/x | 100/s | ... | ...ms | ...ms | ...ms | ... |

## Verdict: PASS / FAIL / PASS WITH CAVEATS

<1-3 sentences: the deciding factors. If it's a FAIL, lead with the
highest-severity static finding or the worst-performing endpoint — whichever
is the actual blocker — and name the fix that would flip it to PASS.>
```

### How to judge pass/fail

- An endpoint **fails** if achieved throughput is meaningfully below target
  (rule of thumb: <95% of target) or if errors/timeouts appear at all during
  the measured window — occasional errors under open-loop load mean the
  server is shedding load, not just running slow.
- Latency thresholds are context-dependent (a health check and a report
  aggregation endpoint don't have the same bar) — call out p99 numbers that
  look bad relative to what the endpoint does, rather than applying one
  fixed cutoff everywhere.
- A **High-severity static finding on the hot path** (e.g. synchronous file
  I/O in a handler that's also being load tested) should push the overall
  verdict to FAIL or "PASS WITH CAVEATS" even if the load test happened to
  pass — a short synthetic run may not yet have hit the data size or
  concurrency level where that finding actually bites, and it's the kind of
  thing that fails suddenly and badly in production rather than gracefully.
