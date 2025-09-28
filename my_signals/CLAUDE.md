# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational project that rebuilds the Preact Signals reactive state management library from scratch. The goal is to understand the core concepts and design patterns behind reactive systems through incremental implementation.

## Development Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run performance benchmarks
npm run benchmark

# Run individual phase demos
node src/01-basic-signal.ts
node src/02-effects.ts
# etc.
```

## Architecture

### Incremental Learning Approach
The codebase is organized into 8 sequential phases, each building upon the previous:

1. **01-basic-signal.ts** - Value containers with observer pattern
2. **02-effects.ts** - Automatic dependency tracking via global evaluation context
3. **03-computed.ts** - Lazy evaluation and derived state
4. **04-linked-lists.ts** - Memory-efficient dependency tracking with linked lists
5. **05-batching.ts** - Transaction-like update batching
6. **06-advanced.ts** - Cycle detection and error handling
7. **07-lifecycle.ts** - Subscription lifecycle and memory management
8. **08-testing.ts** - Comprehensive testing and validation

### Core Reactive Pattern
The fundamental architecture relies on:

- **Global Evaluation Context**: `evalContext` variable that tracks the currently executing effect
- **Automatic Dependency Discovery**: Signals register themselves with the current effect when their `.value` is accessed
- **Bidirectional Relationships**: Effects track their dependencies, signals track their dependents
- **Push-Pull Hybrid**: Signals push change notifications but values are pulled when needed

### Key Classes Evolution

**Signal** → **ReactiveSignal** → **ComputedSignal**
- Basic value container → Dependency tracking → Lazy computation

**Effect** → **BatchedEffect**
- Immediate execution → Deferred batched execution

### File Dependencies
Each phase imports and extends the previous phase's implementation. Later phases may completely replace earlier implementations while maintaining the same API.

## TypeScript Patterns

- Uses ES modules (`"type": "module"` in package.json)
- Factory functions with overloads for optional generics
- Classes with private properties prefixed with `_`
- Generic types for type-safe signal values

## Testing Strategy

Each phase includes a `demonstrate*()` function that serves as both documentation and basic testing. These functions show expected behavior and can be run directly to verify implementations.

## Reference Implementation

The `signals/` directory contains the original Preact Signals implementation for comparison. Key files to reference:
- `signals/packages/core/src/index.ts` - Complete implementation
- `signals/packages/core/test/` - Comprehensive test suite

## Development Workflow

1. Implement phase skeleton with TODO comments
2. Fill in implementation following the TODO guidance
3. Run the demonstration function to verify behavior
4. Compare behavior against reference implementation
5. Move to next phase

The project prioritizes learning and understanding over production readiness.

## IMPORTANT: Code Assistance Guidelines

**FOR LEARNING PURPOSES ONLY**:
- **DO NOT** write implementation code directly
- **DO** provide TODO comments indicating where code needs to be written
- **DO** explain concepts, patterns, and architecture
- **DO** help debug issues and provide guidance
- **DO** help understand reference implementations

This ensures the learner writes the code themselves while getting appropriate guidance.

## Current Progress

### ✅ Phase 1: Basic Signal Implementation (COMPLETE)
- Value containers with change notification
- Observer pattern with subscriber arrays
- `.value` property access pattern
- Memory management with unsubscribe functions

### ✅ Phase 2: Effects System (COMPLETE)
- Automatic dependency tracking via global `evalContext`
- Reactive effect re-execution on signal changes
- Cleanup function support
- Infinite loop prevention with deferred execution
- Memory management and disposal

**Key Issues Resolved in Phase 2**:
- Fixed infinite loop caused by effects re-subscribing during signal updates
- Implemented deferred execution using `setTimeout` to break synchronous cycles
- Added pending flag to prevent multiple queued executions
- Proper cleanup of subscriptions and dependencies

### 🔄 Next: Phase 3: Computed Signals
Ready to implement lazy evaluation and derived state computations.

## Key Learnings So Far

### Phase 2 Critical Insights:
1. **The Evaluation Context Pattern**: Global variable tracks which effect is currently executing
2. **Automatic Dependency Discovery**: Signals self-register when accessed during effect execution
3. **Deferred Execution**: Essential to prevent infinite loops during synchronous updates
4. **Memory Management**: Proper cleanup prevents memory leaks in long-running applications

### Common Pitfalls Avoided:
- Infinite loops from immediate effect re-execution
- Memory leaks from untracked subscriptions
- Double notifications from calling both parent and child setters