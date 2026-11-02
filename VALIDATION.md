# Validation notes

Checked on 2026-11-02 with Node.js 24.22.1 and npm 11.9.0. Dependencies installed using `npm ci --ignore-scripts`.

```bash
cd my_signals
npm test -- --poolOptions.forks.singleFork
```

Latest run: 249 passed, 2 failed, 5 skipped. Baseline: 250 passed, 1 failed, 5 skipped. The advanced multiple-subscriber test fails; an additional performance assertion failed in the later run. Performance thresholds are environment-sensitive, so these tests should not be treated as stable benchmarks.

No signal runtime behavior was changed by this cleanup. Existing failures have not been skipped or hidden. Test pass counts are not code-coverage measurements. Historical comparison documents are retained with an explicit warning rather than treated as validated results.
