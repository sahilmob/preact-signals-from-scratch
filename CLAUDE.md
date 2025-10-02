# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational project that **incrementally replicates the Preact Signals reactive state management library from scratch** for learning purposes. We are NOT the authors of Preact Signals - this is a learning exercise to understand the core concepts and design patterns behind reactive systems by rebuilding them step-by-step.

**Important**: This project studies and replicates the open-source Preact Signals library (MIT licensed) for educational purposes. All credit for the original design and implementation goes to the Preact team.

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

**Signal** → **ReactiveSignal** → **ComputedSignal** → **LinkedComputedSignal** → **BatchedSignal**
- Basic value container → Dependency tracking → Lazy computation → Memory-efficient linked lists → Batched updates

**Effect** → **LinkedEffect** → **BatchedEffect**
- Immediate execution → Linked list dependencies → Deferred batched execution

**Computed** → **LinkedComputedSignal** → **BatchedComputedSignal**
- Lazy evaluation → Linked list dependencies → Eager-when-observed recomputation

**Performance Evolution**:
- Phase 1-2: Functional but basic Set-based dependencies
- Phase 3: Added computed signals with proper caching and lazy evaluation
- Phase 4: Memory optimization with linked lists (3-4% memory reduction)
- Phase 5: Batching optimization (50%+ fewer effect runs, atomic updates)

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

The `signals/` directory contains the **original Preact Signals implementation** (added as a Git submodule) that we use as our learning reference. This is the actual production code we're studying and replicating for educational purposes.

Key files to reference:
- `signals/packages/core/src/index.ts` - Complete production implementation
- `signals/packages/core/test/` - Comprehensive test suite
- Compare our learning implementations in `my_signals/src/` against the reference

**Note**: To access the reference implementation after cloning:
```bash
git submodule update --init --recursive
```

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
- Memory management and disposal
- Comprehensive test suite with 50+ test cases
- Error handling and edge case coverage

**Key Issues Resolved in Phase 2**:
- Fixed infinite loop caused by effects re-subscribing during signal updates
- Implemented immediate execution (removed deferred setTimeout approach)
- Proper cleanup of subscriptions and dependencies
- Effect disposal prevents memory leaks
- Error handling prevents system crashes

**Testing Achievements**:
- Complete unit test coverage for both Phase 1 and Phase 2
- Performance testing with rapid signal changes
- Memory management validation
- Error handling verification
- Edge case coverage including nested effects and conditional dependencies

### ✅ Phase 3: Computed Signals (COMPLETE)
**Full Implementation** - Lazy evaluation and derived state computations with comprehensive testing.

**Key Features Implemented**:
- `ComputedSignal<T>` class extending `ReactiveSignal` with `IEffect` interface
- Lazy evaluation with caching and invalidation strategies
- State management (`FRESH`, `STALE`, `COMPUTING`, `ERROR`) with proper transitions
- Cycle detection for circular dependencies with proper error messages
- Error recovery - computed signals can recover when dependencies change
- Integration with existing effect system with notification optimization
- Comprehensive test suite with 74+ test scenarios covering all edge cases

**Key Issues Resolved in Phase 3**:
- Fixed circular dependency detection timing to prevent false positives
- Implemented error recovery by handling ERROR→STALE state transitions
- Optimized notification timing to prevent double notifications
- Added proper type safety throughout the implementation
- Performance optimization to reduce effect runs by preventing notification during invalidation

**Testing Achievements**:
- 69/74 tests passing (5 intentionally skipped)
- Complete coverage of lazy evaluation, caching, dependency tracking
- Performance testing with deep dependency chains (50+ levels)
- Error handling and recovery validation
- Cycle detection and prevention verification
- Integration testing with effects system

### ✅ Phase 4: Linked Lists (COMPLETE)
**Full Implementation** - Memory-efficient dependency tracking using bidirectional linked lists instead of Sets.

**Key Features Implemented**:
- `LinkedReactiveSignal<T>` using doubly-linked list instead of `Set<Effect>`
- `LinkedEffect` using doubly-linked list instead of `Set<() => void>`
- `LinkedComputedSignal<T>` combining both optimizations with lazy evaluation
- Bidirectional linked list relationships for signals ↔ effects
- O(1) insertion/removal operations for dependencies
- Memory efficiency improvements and reduced GC pressure
- Comprehensive test suite with 22 test scenarios validating performance and functionality

**Key Issues Resolved in Phase 4**:
- Fixed bidirectional pointer management during linked list insertion
- Proper node removal maintaining list integrity when unsubscribing
- LinkedComputedSignal remains lazy - only invalidates on dependency changes
- Correct traversal direction using `nextDep`/`nextSig` pointers
- Memory testing configuration using Node.js `process.memoryUsage()` API
- **Critical Bug Fix**: Corrected `_clearDependencies()` to use `nextSig` instead of `prevSig` for proper traversal
  - Bug: Using `prevSig` only cleared the head node (since head.prevSig = undefined)
  - Fix: Use `nextSig` to traverse entire list from head to tail
  - Impact: Prevents memory leaks when computed signals have multiple dependencies
- **Optimization**: Removed redundant `prevSig` pointer from `EffectNode` interface
  - Effects use "clear all and rebuild" pattern, never selectively removing individual dependencies
  - Only need forward traversal via `nextSig` for bulk clearing
  - Saves 8 bytes per dependency compared to doubly-linked implementation

**Performance Benefits**:
- **Memory**: 3-4% memory reduction in typical scenarios (100 signal+computed pairs)
  - Set-based: 117,704 bytes vs Linked lists: 113,416 bytes
  - Savings: 4,288 bytes (eliminates Set overhead and hash table allocations)
- **Speed**: Comparable performance to Set-based implementation
  - Insertion: 0.67ms (Set) vs 0.70ms (Linked) - similar
  - Notification (100 deps): 0.03ms both - identical
  - Cleanup (500 disposals): 0.07ms both - identical
- **Cache**: Better memory locality for dependency traversal
- **GC**: Reduced garbage collection pressure from fewer objects
- **Tradeoffs**: Deep chains slightly slower (0.05ms vs 0.14ms for 50 levels) due to pointer chasing

**Testing Achievements**:
- 25/25 tests passing with full coverage
- Performance benchmarking for insertion and notification
- Memory usage tracking with proper Node.js API configuration
- Complete compatibility with Phase 3 computed signal functionality
- Unsubscription and cleanup validation
- **New Tests Added**:
  - Multiple dependency clearing during recomputation
  - Complete disposal cleanup verification (all signals unsubscribed)
  - Dynamic/conditional dependencies with proper cleanup
- **Performance Comparison Tests**:
  - Head-to-head comparison with Set-based implementation across 6 metrics
  - Memory efficiency, insertion speed, notification speed, cleanup speed
  - Deep dependency chains, per-node memory overhead analysis

### ✅ Phase 5: Batching (COMPLETE)
**Full Implementation** - Transaction-like update batching to coalesce multiple signal changes and minimize redundant effect executions.

**Key Features Implemented**:
- `BatchedSignal<T>` that defers notifications during batch operations
- `BatchedEffect` that queues for execution instead of running immediately during batches
- `BatchedComputedSignal<T>` with eager recomputation when dependencies change
- `batch()` function for wrapping multiple updates in a transaction
- `pendingEffects` Set to collect effects that need to run after batch completes
- `isFlushing` flag to prevent re-entrancy issues during effect flush
- Nested batch support with `batchDepth` counter

**Key Issues Resolved in Phase 5**:
- **Computed Signal Notification**: Computed signals eagerly recompute when invalidated if they have dependents, checking if value actually changed before notifying
- **Lazy vs Eager Balance**: Computed signals with no dependents stay lazy, but with dependents they eagerly recompute to avoid unnecessary effect runs
- **shouldNotify Parameter**: Added to `_recompute()` to distinguish between pull (getter access) and push (invalidation) scenarios
- **Computed Chain Propagation**: Computed signals are never batched - they immediately invalidate and notify during batch, allowing chains to propagate correctly
- **Effect Disposal During Flush**: Effects check `_isDisposed` before running during flush to handle mid-flush disposal
- **Flush Re-entrancy**: `isFlushing` flag ensures effects created/modified during flush don't interfere with current flush

**Architecture Decisions**:
1. **Two-Tier Batching**:
   - Computed signals: NEVER batched, always invalidate immediately to propagate through chains
   - Regular effects: Batched, collected in `pendingEffects` and run once after batch completes
2. **Eager Computed Recomputation**: When computed signals have dependents, they eagerly recompute on invalidation to check if notification is needed (prevents wasted effect runs)
3. **Notification Strategy**: Computed signals use `shouldNotify` parameter to only notify when being invalidated (push), not when accessed (pull)

**Testing Achievements**:
- 29/31 tests passing (94% success rate)
- Full coverage of basic batching, nested batches, computed signal optimization
- Diamond dependency patterns handled correctly
- Deep dependency chains work properly
- Performance optimization validated (50%+ reduction in effect runs)
- 2 edge case failures related to complex effect lifecycle scenarios during batches (known limitations for learning exercise)

**Performance Benefits**:
- **Effect Runs**: 50%+ reduction when multiple signals change together
- **Consistency**: All updates appear atomic - effects see final state, not intermediate states
- **Scalability**: Handles large numbers of updates efficiently (1000+ updates tested)

### 🔄 Next: Phase 6 - Advanced Features
Ready to implement cycle detection, error handling, and other advanced reactive patterns.

## Key Learnings So Far

### Phase 2 Critical Insights:
1. **The Evaluation Context Pattern**: Global variable tracks which effect is currently executing
2. **Automatic Dependency Discovery**: Signals self-register when accessed during effect execution
3. **Deferred Execution**: Essential to prevent infinite loops during synchronous updates
4. **Memory Management**: Proper cleanup prevents memory leaks in long-running applications

### Phase 3 Critical Insights:
1. **Lazy Evaluation**: Computed signals only recompute when accessed, not when invalidated
2. **State Machine**: FRESH/STALE/COMPUTING/ERROR states prevent redundant computations
3. **Dual Role**: Computed signals act as both signals (have dependents) and effects (have dependencies)
4. **Notification Optimization**: Only notify dependents when computed value actually changes

### Phase 4 Critical Insights:
1. **Linked List Structure**: Bidirectional pointers eliminate Set overhead while maintaining O(1) operations
2. **Insertion at Head**: New nodes inserted at list head with proper prev/next pointer management
3. **Traversal Direction**: Forward traversal via `nextDep`/`nextSig` from head to tail
4. **Unsubscription**: Proper pointer rewiring maintains list integrity when removing middle nodes
5. **Memory Efficiency**: Intrusive linked lists reduce allocations and improve cache locality
6. **Asymmetric Link Design** (CRITICAL):
   - **`SignalNode` (Signal→Effects)**: Doubly-linked with `prevDep`/`nextDep` - needed for O(1) removal when individual effects dispose
   - **`EffectNode` (Effect→Signals)**: Singly-linked with only `nextSig` - `prevSig` is redundant because effects use "clear all and rebuild" pattern
   - **Why the difference?**: When an effect disposes, the signal must remove just that one effect from its dependents list (selective removal). But effects always clear ALL dependencies at once during re-run (bulk clear), never removing individual signals
   - **Memory savings**: Removing unused `prevSig` pointer saves 8 bytes per dependency
7. **Clear and Rebuild Pattern**: Effects never selectively remove dependencies - they clear everything and re-subscribe on each run, making backward pointers unnecessary

### Phase 5 Critical Insights:
1. **Two-Tier Batching Strategy**: Computed signals are never batched (always invalidate immediately), only regular effects are batched
2. **Eager-When-Observed Pattern**: Computed signals without dependents stay lazy, but with dependents they eagerly recompute to check if notification is needed
3. **Push vs Pull Distinction**: Computed signals use `shouldNotify` parameter to distinguish invalidation (push, should notify) from access (pull, should not notify)
4. **Flush Re-entrancy Protection**: `isFlushing` flag prevents effects created during flush from being added to current flush
5. **Disposal During Flush**: Effects must check `_isDisposed` immediately before running, not at start of flush loop
6. **Nested Batch Support**: `batchDepth` counter allows batches within batches, only flushing when outermost batch completes
7. **Computed Chain Propagation**: Not batching computed signals ensures dependency chains (sig → computed1 → computed2 → effect) propagate correctly during batches

### Common Pitfalls Avoided:
- Infinite loops from immediate effect re-execution
- Memory leaks from untracked subscriptions
- Double notifications from calling both parent and child setters
- Eager recomputation breaking computed signal laziness
- Incorrect linked list traversal directions (using `prevSig` when `nextSig` is needed)
- Broken list chains from improper node removal
- Only clearing first dependency due to wrong traversal pointer
- Unnecessary bidirectional links when singly-linked lists suffice (wasted memory)
- Batching computed signals (breaks chain propagation)
- Not distinguishing push vs pull in computed recomputation (causes notification at wrong times)
- Checking disposal at start of flush instead of immediately before running (disposed effects still execute)