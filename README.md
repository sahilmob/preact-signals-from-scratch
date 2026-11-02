# Preact Signals from scratch

An AI-assisted learning project exploring fine-grained reactivity in TypeScript. The implementation is organized into successive exercises rather than a single published library.

## What is here

The [my_signals/src](my_signals/src) directory contains basic signals, dependency-tracked effects, computed values with caching, linked-list dependency tracking, batching, and advanced API experiments. Tests exercise cleanup, conditional dependencies, nested batches, and diamond-shaped dependency graphs without a React render loop.

The `signals` submodule is upstream Preact Signals reference code, not my implementation.

## Status and limitations

This is an educational implementation, not production-ready software or a verified drop-in replacement. The advanced multiple-subscriber test currently fails; additional tests are skipped. Some demo functions still contain unfinished exercises.

## Run

With Node.js and npm installed:

```bash
cd my_signals
npm ci
npm test
npm run test:watch
```
