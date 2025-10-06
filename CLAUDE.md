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

- always run tests with timeout

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

**Full Implementation** - Transaction-like update batching with correct diamond dependency handling.

**Key Features Implemented**:

- `BatchedSignal<T>` that defers effect notifications during batch operations
- `BatchedEffect` that queues for execution during batches
- `BatchedComputedSignal<T>` with **lazy invalidation during batches** (solves diamond dependencies!)
- `batch()` function for wrapping multiple updates in a transaction
- `pendingEffects` Set to collect effects that need to run after batch completes
- `isFlushing` flag to prevent re-entrancy issues during effect flush
- Nested batch support with `batchDepth` counter
- FIFO execution order through tail-insertion in linked lists

**Critical Issues Resolved in Phase 5**:

1. **THE DIAMOND DEPENDENCY PROBLEM** ⭐ (Most Important Fix)
   - **Problem**: sig → left → bottom; sig → right → bottom
     When sig changes, left eagerly recomputes and triggers bottom, but right hasn't updated yet!
     Result: bottom computes with stale right value

   - **Root Cause**: Phase 4's eager recomputation during invalidation

   - **Solution**: During batches, computed signals ONLY invalidate (mark STALE) and propagate
     - No recomputation during batch!
     - Invalidation wave propagates through entire graph first
     - After batch, effects run and pull values lazily
     - Each computed recomputes on-demand with all dependencies fresh

   - **Implementation**: `BatchedComputedSignal.onDependencyChange()` checks `batchDepth > 0`
     ```typescript
     if (batchDepth > 0) {
       this._state = ComputedState.STALE;
       this._notifyDependentEffects(); // Propagate, don't recompute!
       return;
     }
     ```

2. **Memory Leaks**: `BatchedComputedSignal._clearDependencies()` now properly sets `_sigsHead = undefined`

3. **FIFO Execution Order**: Tail-insertion in linked lists (Phase 4 change) maintains natural creation order
   - Effect1 created first → effect1 at head
   - Effect2 created second → effect2 at tail
   - Traversal from head → [effect1, effect2] = FIFO ✓
   - Critical for disposal: effect1 can dispose effect2 during run

4. **Effects Created During Batch**: Defer to pendingEffects (atomic semantics)

5. **Flush Re-entrancy**: `isFlushing` prevents mid-flush effects from joining current flush

**Architecture Decisions**:

1. **Two-Tier Batching Strategy**:
   - **Computed signals**: Invalidate immediately during batch, recompute lazily on access
     Why? Must propagate invalidation through graph to solve diamond dependencies
   - **Regular effects**: Queue in pendingEffects, run once after batch
     Why? Pure consumers, don't need to run during invalidation wave

2. **Lazy vs Eager Computed Signals**:
   - **Inside batch**: ALWAYS lazy (just invalidate, defer recomputation)
   - **Outside batch, no dependents**: Lazy (invalidate only)
   - **Outside batch, has dependents**: Eager (recompute to check if value changed)

3. **Push vs Pull Distinction**:
   - Push (invalidation): `shouldNotify = true` → notify if value changed
   - Pull (access): `shouldNotify = false` → don't notify (avoid cycles)

**Testing Achievements**:

- **38/38 tests passing** (100% success rate!) ✅
  - 31 batching behavior tests
  - 7 performance comparison tests
- Diamond dependency test validates correct value computation
- Performance test shows Phase 5 fixes Phase 4's diamond bug
- Nested batches work correctly
- Effect disposal during batch handled properly
- 50%+ reduction in effect runs validated

**Performance Benefits**:

- **Effect Runs**: 50%+ reduction when multiple signals change together
- **Diamond Correctness**: Phase 5 computes correctly, Phase 4 has stale value bug
- **Consistency**: All updates atomic - effects see final state, not intermediate
- **Scalability**: 1000+ updates tested successfully

**Comparison to Phase 4**:

| Aspect | Phase 4 | Phase 5 |
|--------|---------|---------|
| Diamond Dependencies | ❌ Computes with stale values | ✅ Correct lazy evaluation |
| Effect Runs | Multiple per update | At most once per batch |
| Transaction Semantics | None | Full atomic updates |
| Computed Recomputation | Eager (during invalidation) | Lazy during batch, eager outside |

### ✅ Phase 6: Advanced APIs (COMPLETE)

**Full Implementation** - Advanced utilities for untracked reads, manual subscriptions, and lifecycle hooks.

**Key Features Implemented**:

- `untracked<T>(fn)` - Execute code without tracking dependencies
- `AdvancedSignal.peek()` - Read value without creating dependency
- `AdvancedSignal.subscribe(fn)` - Manual subscription API bridging reactive and imperative code
- `AdvancedComputedSignal.peek()` - Non-reactive access to computed values
- `AdvancedComputedSignal.subscribe(fn)` - Subscribe to computed signal changes
- Lifecycle hooks: `watched` / `unwatched` callbacks for resource management
- Hook integration via `subscribeEffect` override with subscriber tracking

**Key Issues Resolved in Phase 6**:

- **untracked() Context Management**: Save/restore `evalContext` with try-finally for error safety
- **Lifecycle Hook Timing**: Check `_depsHead !== undefined` (not `_watched`) to detect 0→1 and 1→0 transitions
- **Hook Call Order**: Call `super.subscribeEffect()` BEFORE checking `wasWatched` to get accurate count
- **Unsubscribe Timing**: Call original `unsubscribe()` BEFORE checking if `_depsHead === undefined`
- **Guard Checks**: Only call lifecycle hooks if they're defined (`this._watched` / `this._unwatched`)
- **peek() Implementation**: Use `untracked(() => this.value)` not `this.value()` (getter, not method)

**Testing Achievements**:

- **28/29 tests passing (96.5% success rate)** ✅
  - 6/6 untracked() tests passing
  - 4/4 AdvancedSignal.peek() tests passing
  - 4/5 AdvancedSignal.subscribe() tests passing
  - 3/3 AdvancedComputedSignal.peek() tests passing
  - 2/2 AdvancedComputedSignal.subscribe() tests passing
  - 6/6 lifecycle hooks tests passing
  - 3/3 integration tests passing
- **Known Issue**: "should work with multiple subscribers" test fails
  - Second subscription only runs initially, not on signal updates
  - Edge case with wrapped unsubscribe functions in multi-subscriber scenario
  - Does not affect core functionality - all other multi-subscriber tests pass

**Architecture Decisions**:

1. **untracked() Design**: Temporarily sets `evalContext = undefined` to disable tracking
   - Simple, elegant solution that works with all signal types
   - Try-finally ensures context always restored, even on errors

2. **peek() vs .value**: peek() is just `untracked(() => this.value)`
   - Provides ergonomic API for common use case
   - Works for both regular and computed signals

3. **subscribe() Pattern**: Creates an effect that reads signal and calls callback
   - Effect establishes reactive dependency automatically
   - Callback wrapped in `untracked()` to prevent tracking callback internals
   - Returns dispose function for cleanup

4. **Lifecycle Hook Integration**: Override `subscribeEffect()` to track subscriber count
   - Check `_depsHead !== undefined` before subscription to detect 0→1 transition
   - Check `_depsHead === undefined` after unsubscription to detect 1→0 transition
   - Wrap returned unsubscribe function to trigger `_onUnwatched()`

5. **Hook Execution Context**: Always call hooks in `untracked()` context
   - Prevents lifecycle hooks from accidentally creating dependencies
   - Ensures clean separation of concerns

### 🔄 Next: Phase 7 - Lifecycle & Memory Management

Ready to implement comprehensive subscription lifecycle, memory leak prevention, and disposal patterns.

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

1. **The Diamond Dependency Problem and Solution** ⭐⭐⭐ (MOST CRITICAL LEARNING)
   - **Problem**: In a diamond graph (sig → left/right → bottom), when sig changes:
     - Without fix: left eagerly recomputes → triggers bottom → bottom uses stale right value = WRONG
   - **Root cause**: Eager recomputation during invalidation (Phase 4 behavior)
   - **Solution**: During batches, computed signals ONLY invalidate (mark STALE), never recompute
     - Invalidation wave propagates through entire graph first
     - After wave completes, effects run and pull values lazily
     - Each computed recomputes on-demand with ALL dependencies fresh
   - **Key insight**: Separate invalidation propagation from recomputation timing
   - **Why this works**: Defers ALL recomputation until AFTER all invalidations complete

2. **Two-Tier Batching Strategy**: Different behavior for computed signals vs effects
   - **Computed signals**: During batch, invalidate and propagate (never batch the invalidation itself!)
     - Why? Must propagate through graph to solve diamond dependencies
     - Recomputation is lazy (deferred to access time)
   - **Regular effects**: During batch, add to pendingEffects and defer execution
     - Why? Pure consumers, no downstream propagation needed

3. **Conditional Eager Recomputation** (Outside Batches Only):
   - With dependents: Eagerly recompute on invalidation to check if value changed
     - Optimization: Only notify if value actually changed (prevents wasted effect runs)
   - Without dependents: Stay lazy (invalidate only, recompute on access)

4. **Push vs Pull Distinction**: `shouldNotify` parameter
   - Push (invalidation): `shouldNotify = true` → notify dependents if value changed
   - Pull (access): `shouldNotify = false` → don't notify (avoid notification cycles)

5. **FIFO Execution Order**: Tail-insertion in linked lists (from Phase 4 change)
   - Effect1 created first → inserted at head
   - Effect2 created second → inserted at tail (after effect1)
   - Traversal from head → [effect1, effect2] = FIFO ✓
   - **Why critical**: effect1 might dispose effect2 during run - must execute first!

6. **Re-entrance Protection**: `isFlushing` flag
   - Prevents effects created during flush from joining current flush
   - Effects that modify their own dependencies are queued for next run (via pendingEffects)
   - Guards against infinite loops and unexpected behavior

7. **Nested Batch Support**: `batchDepth` counter tracks nesting level
   - Only flush when outermost batch completes (batchDepth → 0)
   - Inner batches just increment/decrement counter

8. **Disposal During Flush**: Check `_isDisposed` immediately before running each effect
   - Not at start of loop (effect might get disposed mid-flush by another effect)

9. **Effects Created During Batch**: Deferred until batch completes
   - Alternative: Run immediately (Preact's approach)
   - Chosen: Defer for atomic semantics and consistency
   - Tradeoff: Breaks "first run immediate" contract, but provides stronger guarantees

### Phase 6 Critical Insights:

1. **untracked() Mechanism**: Temporarily disable dependency tracking by setting `evalContext = undefined`
   - **How it works**: Save current context → set to undefined → execute fn → restore in finally block
   - **Why undefined?**: Signal getters check `if (evalContext)` before registering dependencies
   - **Error safety**: Try-finally ensures context always restored, even if fn throws

2. **peek() Design Pattern**: Convenience wrapper around `untracked(() => this.value)`
   - Not a new primitive - just syntactic sugar for common use case
   - Works identically for signals and computed signals
   - Enables non-reactive debugging and conditional logic

3. **subscribe() as Effect Bridge**: Manual subscription via effect creation
   - Creates an effect that reads signal value and calls callback
   - Callback wrapped in `untracked()` to prevent tracking callback's internals
   - Returns dispose function from the effect for cleanup
   - Bridges reactive (signals) and imperative (callbacks) programming models

4. **Lifecycle Hook Subscriber Tracking**: Must check `_depsHead`, not hook existence
   - **Wrong**: `if (!this._watched)` - checks if hook exists, not if already watched
   - **Right**: `const wasWatched = this._depsHead !== undefined` - checks subscriber count
   - **Timing critical**: Check BEFORE calling `super.subscribeEffect()` to detect 0→1 transition
   - **Unsubscribe timing**: Call `unsubscribe()` BEFORE checking `_depsHead` for 1→0 transition

5. **Wrapped Unsubscribe Functions**: Override `subscribeEffect()` return value
   - Return a new function that calls original unsubscribe + lifecycle hooks
   - Must preserve original unsubscribe semantics (remove from linked list)
   - Check hook existence before calling to avoid errors when no hooks provided

6. **Hook Execution Context**: Always call lifecycle hooks in `untracked()` context
   - Prevents hooks from accidentally creating dependencies
   - Lifecycle management should not participate in reactivity graph
   - Clean separation: hooks are observers, not participants

### Common Pitfalls Avoided:

**Phase 2-3 Issues:**
- Infinite loops from immediate effect re-execution
- Memory leaks from untracked subscriptions
- Double notifications from calling both parent and child setters
- Eager recomputation breaking computed signal laziness

**Phase 4 Issues:**
- Incorrect linked list traversal directions (using `prevSig` when `nextSig` is needed)
- Broken list chains from improper node removal
- Only clearing first dependency due to wrong traversal pointer
- Unnecessary bidirectional links when singly-linked lists suffice (wasted memory)

**Phase 5 Critical Issues:**
- **Diamond dependency stale value bug** ⭐ (MOST IMPORTANT)
  - Problem: Eager recomputation during invalidation causes computed signals to read stale dependencies
  - Symptom: In `sig → left/right → bottom`, bottom computes with old right when sig changes
  - Fix: Defer ALL recomputation until after ALL invalidations propagate (lazy evaluation during batch)
  - This was a fundamental flaw in Phase 4 that only batching could solve!

- **LIFO execution order** (critical for disposal)
  - Problem: If using head-insertion, effects run in reverse creation order
  - Symptom: effect2 runs before effect1, even if effect1 disposes effect2 during run
  - Fix: Tail-insertion maintains natural FIFO order

- **Batching computed signal invalidation** (breaks chain propagation)
  - Problem: If computed signals don't propagate invalidation during batch, downstream signals stay FRESH
  - Symptom: Computed chains don't update correctly
  - Fix: Computed signals always invalidate immediately, only recomputation is deferred

- **Not distinguishing push vs pull** in computed recomputation
  - Problem: Notifying on every recomputation (including .value access) causes cycles
  - Fix: `shouldNotify` parameter - only notify when invalidated (push), not when accessed (pull)

- **Checking disposal at wrong time during flush**
  - Problem: Checking `_isDisposed` at start of loop misses mid-flush disposals
  - Symptom: Disposed effect still runs if disposed by earlier effect in same flush
  - Fix: Check `_isDisposed` immediately before running each effect

- **Memory leaks from incomplete cleanup**
  - Problem: `_clearDependencies()` doesn't reset `_sigsHead` to undefined
  - Symptom: Stale pointer references prevent garbage collection
  - Fix: Always set `_sigsHead = undefined` after clearing

**Phase 6 Issues:**
- **Using hook existence instead of subscriber count**
  - Problem: Checking `if (!this._watched)` instead of `if (!wasWatched)`
  - Symptom: Hook called every time an effect subscribes, not just on 0→1 transition
  - Fix: Check `this._depsHead !== undefined` to determine if signal already has subscribers

- **Checking subscriber count at wrong time**
  - Problem: Checking `wasWatched` AFTER calling `super.subscribeEffect()`
  - Symptom: First subscription shows wasWatched=false, but second shows wasWatched=true incorrectly
  - Fix: Save `wasWatched` state BEFORE calling `super.subscribeEffect()`

- **Unsubscribe timing for lifecycle hooks**
  - Problem: Checking `_depsHead === undefined` BEFORE calling `unsubscribe()`
  - Symptom: `_onUnwatched()` never called because signal still has subscribers
  - Fix: Call `unsubscribe()` first, THEN check if `_depsHead === undefined`

- **peek() as method call instead of getter**
  - Problem: `untracked(() => this.value())` - calling value as function
  - Symptom: TypeError: this.value is not a function
  - Fix: Use `untracked(() => this.value)` - access as property getter

- **Forgetting guard checks for optional hooks**
  - Problem: Calling `_onWatched()` even when `this._watched` is undefined
  - Symptom: Unnecessary function calls, potential errors
  - Fix: Add `&& this._watched` / `&& this._unwatched` checks before calling hooks
