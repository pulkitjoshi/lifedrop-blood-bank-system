#!/usr/bin/env node
'use strict';
/**
 * Dependency-free open-loop HTTP load tester.
 *
 * Fires GET requests at a fixed target rate (req/sec) for a fixed duration
 * against one or more paths, and reports achieved throughput, latency
 * percentiles, and errors. Open-loop (schedule-based) rather than
 * closed-loop (N workers looping) because it directly answers "can this
 * sustain X req/sec" instead of "what's the max throughput of N workers" —
 * under real traffic, requests keep arriving at the target rate whether or
 * not the server has caught up, and that's what queues/timeouts expose.
 *
 * Usage:
 *   node load_test.js --url http://localhost:3000 --rate 100 --duration 10 \
 *     --paths /api/health,/api/donors,/api/inventory
 *
 * Flags:
 *   --url          base URL of the running server (default http://localhost:3000)
 *   --rate         target requests/sec per path (default 100)
 *   --duration     seconds to sustain the rate, per path (default 10)
 *   --concurrency  max sockets kept open per path (default 50)
 *   --warmup       seconds of untimed warmup traffic before measuring (default 2)
 *   --paths        comma-separated list of paths to test (default /api/health)
 *   --method       HTTP method for all paths (default GET)
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:3000',
    rate: 100,
    duration: 10,
    concurrency: 50,
    warmup: 2,
    paths: ['/api/health'],
    method: 'GET',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--rate') args.rate = Number(argv[++i]);
    else if (a === '--duration') args.duration = Number(argv[++i]);
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--warmup') args.warmup = Number(argv[++i]);
    else if (a === '--paths') args.paths = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--method') args.method = argv[++i].toUpperCase();
  }
  return args;
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

function runOne({ baseUrl, path, method, rate, durationSec, warmupSec, concurrency }) {
  return new Promise((resolve) => {
    const target = new URL(path, baseUrl);
    const isHttps = target.protocol === 'https:';
    const mod = isHttps ? https : http;
    const agent = new mod.Agent({ keepAlive: true, maxSockets: concurrency });

    const latencies = [];
    let sent = 0;
    let completed = 0;
    let errors = 0;
    const statusCounts = {};
    let measuring = false;
    let measureStart = 0;

    function fire() {
      sent++;
      const reqStart = Date.now();
      const req = mod.request(
        {
          hostname: target.hostname,
          port: target.port || (isHttps ? 443 : 80),
          path: target.pathname + target.search,
          method,
          agent,
          timeout: 5000,
        },
        (res) => {
          res.resume();
          res.on('end', () => {
            if (measuring) {
              latencies.push(Date.now() - reqStart);
              completed++;
              statusCounts[res.statusCode] = (statusCounts[res.statusCode] || 0) + 1;
            }
          });
        }
      );
      req.on('error', () => {
        if (measuring) errors++;
      });
      req.on('timeout', () => {
        req.destroy();
        if (measuring) errors++;
      });
      req.end();
    }

    const intervalMs = 1000 / rate;
    const totalMs = (warmupSec + durationSec) * 1000;
    const startedAt = Date.now();
    // Tick at a small fixed cadence and fire however many requests are needed to catch
    // up to the target cumulative count. A naive "one request per setInterval tick" only
    // works if the OS can actually fire the timer that often — on Windows, setInterval is
    // commonly quantized to ~15.6ms regardless of the requested interval, which silently
    // caps throughput (e.g. a 100/s target degrades to ~60/s) with no error or signal.
    // Batching per tick makes the achieved rate correct regardless of timer granularity.
    const tickMs = Math.max(5, Math.min(20, intervalMs));

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (!measuring && elapsed >= warmupSec * 1000) {
        measuring = true;
        measureStart = Date.now();
      }
      if (elapsed >= totalMs) {
        clearInterval(timer);
        // grace period so in-flight requests can complete/timeout before we report
        setTimeout(finish, 3000);
        return;
      }
      const expectedSent = Math.floor((elapsed / 1000) * rate);
      // Cap the catch-up burst so a stalled tick can't dump a huge spike all at once.
      const toFire = Math.max(0, Math.min(expectedSent - sent, Math.ceil(rate / 10) + 1));
      for (let i = 0; i < toFire; i++) fire();
    }, tickMs);

    function finish() {
      const sorted = latencies.slice().sort((a, b) => a - b);
      const elapsedMeasuredSec = Math.max(0.001, (Date.now() - measureStart - 3000) / 1000);
      resolve({
        path,
        method,
        targetRate: rate,
        durationSec,
        completed,
        errors,
        achievedRate: +(completed / elapsedMeasuredSec).toFixed(1),
        errorRatePct: sent > 0 ? +((errors / (completed + errors || 1)) * 100).toFixed(2) : 0,
        avgLatencyMs: sorted.length ? +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1) : null,
        p50Ms: percentile(sorted, 50),
        p95Ms: percentile(sorted, 95),
        p99Ms: percentile(sorted, 99),
        maxMs: sorted.length ? sorted[sorted.length - 1] : null,
        statusCounts,
      });
    }
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `Load testing ${args.url} — target ${args.rate} req/sec for ${args.duration}s per path (+${args.warmup}s warmup)\n`
  );
  const results = [];
  for (const p of args.paths) {
    process.stdout.write(`  -> ${args.method} ${p} ... `);
    // eslint-disable-next-line no-await-in-loop
    const r = await runOne({
      baseUrl: args.url,
      path: p,
      method: args.method,
      rate: args.rate,
      durationSec: args.duration,
      warmupSec: args.warmup,
      concurrency: args.concurrency,
    });
    results.push(r);
    console.log(`${r.completed} ok, ${r.errors} errors, ${r.achievedRate} req/s achieved, p99 ${r.p99Ms}ms`);
  }
  console.log('\n--- JSON ---');
  console.log(JSON.stringify(results, null, 2));
}

main();
