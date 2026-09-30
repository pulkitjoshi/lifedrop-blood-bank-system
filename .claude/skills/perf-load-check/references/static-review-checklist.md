# Static performance review checklist

Read this when doing the static half of a perf-load-check. Don't run through it
mechanically as a box-ticking exercise — the point of each item is explained so
you can judge whether it actually matters *for this codebase* at the target
request rate. A pattern that's harmless at 5 req/sec can be the entire
bottleneck at 100 req/sec, because the request rate starts to compete with
however long each blocking operation takes.

## Why request rate changes what matters

Node.js (and most single-threaded event-loop runtimes) can have many requests
"in flight" at once, but only because most of that time is spent waiting on
I/O, not computing. Anything that blocks the event loop — a synchronous
filesystem call, a large synchronous JSON.parse/stringify, a tight CPU-bound
loop — stalls *every other in-flight request* for its duration. At low
request rates this is invisible. At 100 req/sec, a 10ms blocking call per
request alone caps you at 100 req/sec best-case with zero concurrency headroom,
and anything slower than that means requests start queueing and latency climbs
without bound. This is why static review and load testing are both necessary:
static review finds the blocking operations that a short load test might not
yet have pushed hard enough to expose, and the load test confirms whether they
actually matter in practice.

## Backend (Node/Express or similar)

- **Synchronous I/O on the request path.** `fs.readFileSync`, `fs.writeFileSync`,
  `execSync`, synchronous crypto, etc. called inside a route handler or
  anything it calls. This is the single most common way a small demo app
  falls over under load — a JSON-file-as-database pattern that does
  `readFileSync` + `JSON.parse` on every GET and `JSON.stringify` +
  `writeFileSync` on every write is a classic instance: fine for one user
  clicking around, but it serializes every request in the process behind
  full-file disk I/O, so throughput drops as the file grows and as
  concurrent requests pile up waiting for the event loop.
- **N+1 data access.** A loop that fetches or filters related data once per
  item instead of once per request (e.g. looping over N records and querying/
  filtering the full dataset for each one instead of doing it once and
  indexing in memory).
- **Repeated full-collection scans.** Multiple `.filter()`/`.find()`/`.map()`
  passes over the same array within one handler when they could be combined
  into a single pass, especially if the collection is unbounded in size.
- **Unbounded response payloads / missing pagination.** Endpoints that return
  an entire collection with no `limit`/`offset`/cursor — fine at demo scale,
  but both a latency and memory-pressure risk as data grows, and it means
  every request pays full serialization cost regardless of what the client
  actually needed.
- **Missing caching for expensive-but-repeated work.** Recomputing the same
  derived value (aggregates, joins, formatted views) from scratch on every
  request when the underlying data changes far less often than it's read.
- **Middleware ordering / global overhead.** Heavy middleware (body parsers
  with no size limit, logging that does synchronous I/O, CORS reflecting
  every origin) running on every request including ones that don't need it.
- **No connection reuse / pooling** for outbound calls to a DB or other
  service (a new connection per request instead of a pool) — irrelevant for
  an in-memory or flat-file store, but worth checking if a real DB is
  involved.
- **Unhandled backpressure.** Handlers that don't await/handle errors from
  async work, so failures pile up as unhandled rejections instead of failing
  fast with a clean error response.

## Frontend (Angular or similar SPA)

These don't affect server req/sec directly, but they're "is this optimized"
territory and often surface in the same review, so check them when the
frontend is in scope:

- **`*ngFor` without `trackBy`** on lists that re-render, causing Angular to
  destroy/recreate DOM nodes instead of diffing by identity.
- **Change detection strategy.** Components with frequent updates or large
  subtrees that don't use `OnPush` where the inputs are otherwise immutable —
  default change detection re-checks the whole tree on every event.
- **Subscriptions without cleanup.** `.subscribe()` calls not paired with
  `async` pipe, `takeUntil`, or explicit `unsubscribe()` in `ngOnDestroy` —
  leaks that compound over the session's lifetime.
- **API calls inside loops or templates** (e.g. a pipe or getter that makes
  an HTTP call, or calling a service method from inside `*ngFor`) — these
  re-fire on every change detection cycle, not once.
- **Missing debounce on high-frequency inputs** (search-as-you-type hitting
  the API on every keystroke instead of debounced).

## How to report a finding

For each issue, name the *mechanism* (why it gets worse under concurrent
load, not just that it "looks slow"), point at file:line, and give a
concrete fix — not "optimize this" but the actual change (e.g. "switch
`getDB()`/`saveDB()` to an in-memory cache written through to disk
asynchronously, or to `fs.promises` + a write queue, so route handlers never
block the event loop").
