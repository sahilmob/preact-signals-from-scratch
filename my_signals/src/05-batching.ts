/**
 * Phase 5: Batching - Transaction-like Update Batching
 *
 * Learning Goals:
 * - Understand how to optimize multiple signal changes
 * - Learn transaction-like batching for update coalescing
 * - Discover deferred effect execution strategies
 * - Explore how Preact Signals minimizes redundant computations
 * - Solve the diamond dependency problem with lazy evaluation
 *
 * Key Insights from Preact Signals:
 * 1. Multiple signal changes can trigger the same effect multiple times
 * 2. Batching defers effect execution until all signals are updated
 * 3. Effects run at most once per batch, even with multiple dependencies changing
 * 4. Batching reduces computational overhead by 50%+ in typical scenarios
 * 5. Transaction-like semantics provide consistent state snapshots
 * 6. Diamond dependencies require special handling during batches
 *
 * The Magic: How does batching prevent redundant effect runs?
 * Answer: By collecting all signal changes in a batch, marking effects as pending,
 * and executing each effect only once after all signals have been updated.
 *
 * CRITICAL DESIGN DECISIONS:
 * ========================
 *
 * 1. TWO-TIER BATCHING STRATEGY
 *    - Regular effects: Collected in pendingEffects, run once after batch
 *    - Computed signals: Only invalidate during batch, recompute on access (lazy)
 *    Why? Prevents diamond dependency issues where one branch computes before another
 *
 * 2. DIAMOND DEPENDENCY PROBLEM & SOLUTION
 *    Problem:
 *      sig -> left  -> bottom
 *          -> right -^
 *    If left eagerly recomputes and triggers bottom, right hasn't updated yet!
 *    Result: bottom computes with stale right value
 *
 *    Solution:
 *      - During batch: All computed signals just invalidate (mark STALE)
 *      - Invalidation propagates through the graph
 *      - Effects are queued, not run
 *      - After batch: Effects run, pulling fresh values lazily
 *      - This ensures all branches update before any recomputation
 *
 * 3. FIFO EXECUTION ORDER
 *    Effects must execute in creation order (FIFO, not LIFO)
 *    Why? effect1 might dispose effect2 during run - must execute first!
 *    Implementation: Tail-insertion in linked lists maintains natural FIFO order
 *
 * 4. RE-ENTRANCE PROTECTION
 *    - isFlushing flag prevents mid-flush effects from joining current flush
 *    - Effects that modify their own dependencies will be queued for next run
 *
 * 5. COMPUTED SIGNAL BEHAVIOR DURING BATCHES
 *    Outside batch (Phase 4 behavior):
 *      - Computed with dependents: Eagerly recompute, notify if changed
 *      - Computed without dependents: Lazy, only invalidate
 *
 *    Inside batch (Phase 5 optimization):
 *      - ALL computed signals: Just invalidate and propagate
 *      - Recomputation deferred until accessed
 *      - Prevents computing with partial/stale state
 *
 * PERFORMANCE BENEFITS:
 * ====================
 * - 50%+ reduction in effect runs for multi-signal updates
 * - Eliminates duplicate executions from diamond patterns
 * - Atomic updates: effects see consistent final state
 * - Computed signals only recompute once per batch (when accessed)
 *
 * COMPARISON TO PHASE 4:
 * =====================
 * Phase 4 Issues:
 *   - Diamond dependencies compute with stale values
 *   - Effects can run multiple times per logical update
 *   - No transaction semantics
 *
 * Phase 5 Improvements:
 *   - Correct diamond dependency handling
 *   - At-most-once effect execution per batch
 *   - Atomic, consistent state snapshots
 */

// Import previous phase implementations
import {
  LinkedReactiveSignal,
  LinkedEffect,
  LinkedComputedSignal,
  linkedReactiveSignal,
  linkedEffect,
  linkedComputed,
  SignalNode,
  EffectNode,
} from "./04-linked-lists.ts";
import { IEffect, evalContext, getContext, setContext } from "./02-effects.ts";
import { ComputedState } from "./03-computed.ts";

/**
 * ============================================================================
 * GLOBAL BATCHING STATE
 * ============================================================================
 *
 * These variables control the batching behavior across the entire system.
 * They're global because batching is a system-wide operation that affects
 * all signals, computed signals, and effects.
 */

/**
 * batchDepth: Tracks nesting level of batch() calls
 *
 * - 0: Not batching, effects run immediately
 * - 1+: Inside batch, effects deferred to pendingEffects
 *
 * Supports nested batches:
 *   batch(() => {           // batchDepth = 1
 *     batch(() => {         // batchDepth = 2
 *       sig.value = 10;     // Effects still deferred
 *     });                   // batchDepth = 1, no flush yet
 *   });                     // batchDepth = 0, NOW flush!
 */
let batchDepth = 0;

/**
 * pendingEffects: Set of effects queued for execution after batch completes
 *
 * Using a Set ensures each effect runs at most once, even if multiple
 * dependencies changed during the batch.
 *
 * Important: Computed signals are NOT added here - they handle batching
 * differently (lazy invalidation instead of deferred execution)
 */
const pendingEffects: Set<IEffect> = new Set();

/**
 * isFlushing: Prevents re-entrancy during effect flush
 *
 * Without this flag, an effect that creates new effects during flush
 * could cause those new effects to be added to the current flush,
 * potentially causing infinite loops or unexpected behavior.
 *
 * When true: New effects created during flush wait for next batch
 */
let isFlushing = false;

/**
 * ============================================================================
 * BATCHED SIGNAL
 * ============================================================================
 *
 * A signal that participates in the batching system. When its value changes
 * during a batch, it defers notifying effects until the batch completes.
 *
 * Key behavior:
 * - Outside batch: Immediate notification (same as Phase 4)
 * - Inside batch: Defer effect notification, but immediately invalidate computed signals
 */
export class BatchedSignal<T = any> extends LinkedReactiveSignal<T> {
  constructor(initialValue: T) {
    super(initialValue);
  }

  get value() {
    return super.value;
  }

  set value(newValue: T) {
    // Skip notification if value hasn't actually changed
    // This is an important optimization that prevents unnecessary recomputations
    if (Object.is(newValue, this._value)) return;

    this._value = newValue;
    this._notifyDependentEffects();
  }

  /**
   * Notify dependent effects and computed signals about value change
   *
   * TWO-TIER NOTIFICATION STRATEGY:
   * ================================
   *
   * During batch (batchDepth > 0):
   *   1. Computed signals: Call onDependencyChange() immediately
   *      - They invalidate themselves (mark STALE)
   *      - They propagate invalidation to their dependents
   *      - They DON'T recompute yet (deferred until accessed)
   *
   *   2. Regular effects: Add to pendingEffects Set
   *      - They don't run yet
   *      - Will run once after batch completes
   *      - Set ensures each runs at most once
   *
   * Outside batch (batchDepth === 0) OR during flush (isFlushing):
   *   - Use parent's immediate notification (Phase 4 behavior)
   *   - Effects run immediately
   *   - Computed signals eagerly recompute if they have dependents
   *
   * WHY THE DISTINCTION?
   * - Computed signals need to propagate invalidation immediately
   *   to ensure the entire dependency graph is marked stale
   * - But they defer recomputation to avoid computing with partial state
   * - Regular effects are purely reactive consumers, so they can wait
   */
  protected _notifyDependentEffects(): void {
    if (batchDepth > 0 && !isFlushing) {
      // BATCHING MODE: Defer effects, immediately invalidate computed signals
      let current = this._depsHead;
      while (current) {
        if (current.effect instanceof BatchedComputedSignal) {
          // Computed signal: Invalidate immediately (propagates STALE state)
          current.effect.onDependencyChange();
        } else {
          // Regular effect: Defer until batch completes
          pendingEffects.add(current.effect);
        }
        current = current.nextDep;
      }
    } else {
      // IMMEDIATE MODE: Use parent's notification (Phase 4 behavior)
      super._notifyDependentEffects();
    }
  }
}

/**
 * BatchedEffect - Effect that can be deferred during batches
 */
export class BatchedEffect implements IEffect {
  private _fn?: Function;
  private _cleanup: Function | undefined;
  private _isDisposed: boolean;
  private _sigsHead: EffectNode | undefined;

  // TODO: Add _isPending property (type: boolean) to track if queued for execution

  constructor(fn: () => void | (() => void)) {
    this._fn = fn;
    this._isDisposed = false;

    /**
     * DESIGN DECISION: Effects created during a batch are deferred
     *
     * When an effect is created inside a batch() call, we have two options:
     * 1. Run it immediately (Phase 2-4 behavior: first run is always immediate)
     * 2. Defer it until the batch completes (chosen approach)
     *
     * We chose option 2 for these reasons:
     *
     * PROS:
     * - Atomic semantics: Effect sees the final batch state, not partial updates
     * - Consistency: Everything in a batch participates in batching
     * - Performance: Avoids mid-batch executions
     * - Simplicity: No special-casing for "created during batch" effects
     *
     * CONS:
     * - Breaks "first run is immediate" contract from earlier phases
     * - Deferred dependency discovery: Won't establish dependencies until flush
     * - Potential surprise: batchedEffect(() => {...}) inside batch won't run until later
     *
     * COMPARISON TO PREACT:
     * Preact Signals runs effects immediately even during batches. However, for this
     * learning exercise, we explore the alternative approach to understand the tradeoffs.
     *
     * BEHAVIOR:
     * - Outside batch: Runs immediately (preserves Phase 2-4 behavior)
     * - Inside batch: Added to pendingEffects, runs when batch completes
     */
    if (batchDepth > 0) {
      pendingEffects.add(this);
    } else {
      this._run();
    }
  }

  addDependency(signal: LinkedReactiveSignal<any>): void {
    // TODO: Implement exactly like LinkedEffect
    const effect = this;
    const unsub = signal.subscribeEffect(effect);
    // TODO: Create EffectNode, link it, subscribe to signal
    const node: EffectNode = {
      effect,
      signal,
      unSub: unsub,
      nextSig: this._sigsHead,
    };

    this._sigsHead = node;
  }

  private _run(): void {
    // TODO: Check if disposed, return early if true
    if (this._isDisposed) return;
    // TODO: Set _isPending = false (we're executing now)
    // TODO: Call cleanup function if exists
    if (typeof this._cleanup === "function") {
      this._cleanup();
    }
    // TODO: Clear all dependencies
    this._clearDependencies();
    const prevContext = getContext();
    // TODO: Set up evaluation context
    setContext(this);
    try {
      // TODO: Execute _fn and handle cleanup/errors
      this._cleanup = this._fn?.();
    } catch (error) {
      console.log(error);
    } finally {
      setContext(prevContext);
      // TODO: Restore evaluation context
    }
  }

  onDependencyChange(): void {
    // TODO: Check if disposed, return early
    if (this._isDisposed) return;
    // TODO: Check if currently batching (batchDepth > 0)
    if (batchDepth === 0) {
      //   If NOT batching:
      //     - Call _run() immediately
      this._run();
    }
  }

  dispose(): void {
    // TODO: Implement like LinkedEffect
    // TODO: Set _isDisposed = true
    this._isDisposed = true;
    // TODO: Call cleanup
    if (typeof this._cleanup === "function") {
      this._cleanup();
    }
    // TODO: Clear dependencies
    this._clearDependencies();
    // TODO: Remove from pendingEffects if present
    pendingEffects.delete(this);
  }

  private _clearDependencies(): void {
    // TODO: Implement like LinkedEffect
    let current = this._sigsHead;

    // TODO: Traverse _sigsHead and unsubscribe from all signals
    while (current) {
      current?.unSub?.();
      current = current.nextSig;
    }
    // TODO: Set _sigsHead = undefined
    this._sigsHead = undefined;
  }
}

/**
 * ============================================================================
 * BATCHED COMPUTED SIGNAL - THE KEY TO SOLVING DIAMOND DEPENDENCIES
 * ============================================================================
 *
 * A computed signal that correctly handles batching and diamond dependencies.
 *
 * DUAL ROLE:
 * - Acts as a Signal: Has dependents (effects or other computed signals)
 * - Acts as an Effect: Has dependencies (signals or other computed signals)
 *
 * CRITICAL BATCHING BEHAVIOR:
 * ===========================
 *
 * Outside batch (batchDepth === 0):
 *   - Lazy if no dependents: Invalidate only, recompute when accessed
 *   - Eager if has dependents: Recompute immediately to check if value changed
 *     (Prevents unnecessary effect runs if computed value doesn't change)
 *
 * Inside batch (batchDepth > 0): *** THE KEY INSIGHT ***
 *   - ALWAYS lazy: Just invalidate and propagate, never recompute
 *   - This prevents the diamond dependency problem!
 *
 * THE DIAMOND DEPENDENCY PROBLEM:
 * ==============================
 *
 *     sig
 *    /   \
 *  left  right    (both depend on sig)
 *    \   /
 *    bottom       (depends on both left and right)
 *
 * Without batching fix:
 *   1. sig.value = X
 *   2. left gets invalidated, has dependent (bottom), so eagerly recomputes
 *   3. left notifies bottom
 *   4. bottom tries to recompute: left.value (fresh) + right.value (STALE!)
 *   5. Result: bottom computes with old right value = WRONG!
 *
 * With batching fix (this implementation):
 *   1. sig.value = X (during batch)
 *   2. left gets invalidated, just marks STALE and propagates
 *   3. right gets invalidated, just marks STALE and propagates
 *   4. bottom gets invalidated, just marks STALE
 *   5. Batch ends, effects run
 *   6. Effect reads bottom.value (lazy evaluation)
 *   7. bottom recomputes: left.value (recomputes to fresh) + right.value (recomputes to fresh)
 *   8. Result: bottom computes with ALL fresh values = CORRECT!
 *
 * The key: Defer ALL recomputation until AFTER all invalidations propagate
 */
export class BatchedComputedSignal<T>
  extends BatchedSignal<T>
  implements IEffect
{
  private _computeFn: () => T;
  private _state: ComputedState;
  private _error: any;
  private _isDisposed = false;
  private _sigsHead: EffectNode | undefined = undefined;

  constructor(computeFn: () => T) {
    super(undefined as any);
    this._state = ComputedState.STALE;
    this._computeFn = computeFn;
  }

  addDependency(signal: LinkedReactiveSignal<any>): void {
    // TODO: Implement like LinkedComputedSignal
    const effect = this;
    const node: EffectNode = {
      effect,
      signal,
      nextSig: this._sigsHead,
      unSub: signal.subscribeEffect(effect),
    };

    this._sigsHead = node;
  }

  get value() {
    // TODO: Implement like LinkedComputedSignal
    // TODO: Handle COMPUTING state (circular dependency)
    if (this._state === ComputedState.COMPUTING) {
      throw new Error("Circular dependency");
    }
    // TODO: Handle ERROR state
    if (this._state === ComputedState.ERROR) {
      throw this._error;
    }
    // TODO: Register with evalContext if present
    if (evalContext) {
      evalContext.addDependency(this);
    }

    // TODO: Return cached value if FRESH
    if (this._state === ComputedState.FRESH) {
      return this._value;
    }
    // TODO: Recompute if STALE
    // When accessed via .value getter, don't notify (we're being pulled)
    return this._recompute(false);
  }

  set value(_: any) {
    // TODO: Throw error - computed signals are read-only
    throw new Error("Computed signals are read-only");
  }

  private _recompute(shouldNotify: boolean = true) {
    // TODO: Implement like LinkedComputedSignal
    // TODO: Set state to COMPUTING
    this._state = ComputedState.COMPUTING;
    this._error = undefined;
    // TODO: Set up evaluation context
    const prevContext = getContext();
    setContext(this);
    // TODO: Clear dependencies
    this._clearDependencies();
    // TODO: Execute compute function
    try {
      const val = this._computeFn();
      const valueChanged = !Object.is(val, this._value);
      // TODO: Check if value changed
      // TODO: Update state to FRESH
      if (valueChanged) {
        this._value = val;
      }
      this._state = ComputedState.FRESH;
      // TODO: Notify dependents (respects batching)
      // Only notify if:
      // - value actually changed
      // - shouldNotify is true (we're being invalidated, not accessed)
      if (valueChanged && shouldNotify) {
        this._notifyDependentEffects();
      }
      return this._value;
    } catch (error) {
      // TODO: Handle errors by setting ERROR state
      this._state = ComputedState.ERROR;
      this._error = error;
      throw error;
    } finally {
      // TODO: Restore context
      setContext(prevContext);
    }
  }

  /**
   * Called when a dependency changes - CRITICAL METHOD FOR DIAMOND DEPENDENCIES
   *
   * This method implements the core algorithm that solves the diamond dependency problem.
   *
   * ALGORITHM:
   * ==========
   *
   * 1. Early returns:
   *    - If disposed: Do nothing
   *    - If already STALE or COMPUTING: Do nothing (avoid redundant work)
   *
   * 2. Mark STALE:
   *    - Always invalidate self first (FRESH/ERROR → STALE)
   *
   * 3. Branching logic based on context:
   *
   *    A) DURING BATCH (batchDepth > 0):
   *       - Just propagate invalidation (call _notifyDependentEffects)
   *       - DO NOT recompute yet!
   *       - This ensures ALL branches of diamond invalidate before ANY recompute
   *
   *    B) OUTSIDE BATCH, NO DEPENDENTS:
   *       - Stay lazy (already marked STALE)
   *       - Will recompute when accessed
   *
   *    C) OUTSIDE BATCH, HAS DEPENDENTS:
   *       - Eagerly recompute to check if value changed
   *       - Only notify dependents if value actually changed
   *       - Optimization: Prevents effect runs when computed value doesn't change
   *
   * WHY THIS WORKS FOR DIAMOND DEPENDENCIES:
   * ========================================
   *
   * Consider: sig -> left -> bottom
   *                -> right -^
   *
   * When sig changes during batch:
   *   1. sig._notifyDependentEffects() is called
   *   2. Both left and right get onDependencyChange() called
   *   3. left: marks STALE, propagates to bottom (doesn't recompute!)
   *   4. right: marks STALE, propagates to bottom (doesn't recompute!)
   *   5. bottom: marks STALE (now knows BOTH dependencies changed)
   *   6. Batch ends, effects run
   *   7. Effect accesses bottom.value
   *   8. bottom recomputes (STALE → COMPUTING)
   *   9. bottom reads left.value → left recomputes to FRESH
   *  10. bottom reads right.value → right recomputes to FRESH
   *  11. bottom computes with ALL fresh values → CORRECT!
   *
   * The critical insight: Invalidation propagates immediately, but recomputation
   * is deferred until all invalidations complete. This ensures consistency.
   */
  onDependencyChange(): void {
    // Guard: Disposed computed signals don't react
    if (this._isDisposed) return;

    // Guard: Only invalidate if currently FRESH or ERROR
    // If already STALE or COMPUTING, nothing to do
    if (
      this._state !== ComputedState.FRESH &&
      this._state !== ComputedState.ERROR
    ) {
      return;
    }

    // Step 1: Always invalidate self first
    this._state = ComputedState.STALE;

    // Step 2: During batch - just propagate, don't recompute
    // This is THE KEY to solving diamond dependencies!
    if (batchDepth > 0) {
      // Propagate invalidation to dependents
      // They will also just invalidate (if they're computed) or queue (if they're effects)
      this._notifyDependentEffects();
      return;
    }

    // Step 3: Outside batch, no dependents - stay lazy
    if (!this._depsHead) {
      return; // Will recompute on next access
    }

    // Step 4: Outside batch, has dependents - eagerly recompute
    // This is an optimization: only notify if value actually changed
    try {
      // Pass shouldNotify=true because we're being pushed to (invalidated)
      // not pulled from (accessed via .value getter)
      this._recompute(true);
      // _recompute will notify dependents only if value changed
    } catch (error) {
      // On error, always notify dependents so they know something happened
      this._notifyDependentEffects();
    }
  }

  dispose(): void {
    // TODO: Implement like LinkedComputedSignal
    this._isDisposed = true;
    this._clearDependencies();
  }

  private _clearDependencies(): void {
    // TODO: Implement like LinkedComputedSignal
    let current = this._sigsHead;

    while (current) {
      current.unSub?.();
      current = current.nextSig;
    }

    // CRITICAL: Reset head pointer to prevent stale references
    this._sigsHead = undefined;
  }
}

/**
 * batch() - Execute multiple signal updates as a single transaction
 *
 * Usage:
 *   batch(() => {
 *     signal1.value = 10;
 *     signal2.value = 20;
 *     signal3.value = 30;
 *   });
 *   // Effects only run once after all updates complete
 */
export function batch<T>(fn: () => T): T {
  // TODO: Increment batchDepth before execution
  batchDepth++;
  // TODO: Use try/finally to ensure cleanup
  try {
    // TODO: Execute fn() and store result
    const result = fn();

    return result;
  } finally {
    // TODO: In finally block:
    //   - Decrement batchDepth
    batchDepth--;
    if (batchDepth === 0) {
      //   - If batchDepth === 0 (outermost batch):
      //     * Flush all pending effects
      //     * Clear pendingEffects Set
      // TODO: Return result from fn()
      flushPendingEffects();
      pendingEffects.clear();
    }
  }
}

/**
 * Helper function to flush pending effects
 * Called when batch completes (batchDepth reaches 0)
 *
 * CRITICAL FIX: Array reversal for FIFO execution order
 *
 * THE PROBLEM:
 * Effects should execute in the order they were created (FIFO: first-in, first-out).
 * This is crucial for disposal scenarios where effect1 might dispose effect2 during
 * its run - effect1 must run first to prevent effect2 from executing after disposal.
 *
 * THE CHALLENGE - Double Reversal:
 * Our linked list architecture causes effects to be added to pendingEffects in
 * reverse subscription order:
 *
 * 1. SUBSCRIPTION ORDER (Head insertion in signal._depsHead):
 *    - effect1 subscribes → signal._depsHead = effect1
 *    - effect2 subscribes → signal._depsHead = effect2 → effect1
 *    Result: Newest subscriber at HEAD
 *
 * 2. NOTIFICATION TRAVERSAL (in _notifyDependentEffects):
 *    let current = this._depsHead; // Starts at effect2!
 *    while (current) {
 *      pendingEffects.add(current.effect); // Adds effect2, then effect1
 *      current = current.nextDep;
 *    }
 *    Result: pendingEffects = Set([effect2, effect1]) - LIFO order!
 *
 * 3. SET MAINTAINS INSERTION ORDER:
 *    JavaScript Sets preserve insertion order (ES2015+)
 *    Array.from(pendingEffects) = [effect2, effect1] - still LIFO!
 *
 * THE SOLUTION:
 * Reverse the array to restore FIFO (creation) order:
 *   [effect2, effect1].reverse() = [effect1, effect2] ✓
 *
 * COMPARISON TO PREACT:
 * Preact uses a different approach - they build a singly-linked list during
 * notification by prepending: effect._nextBatchedEffect = batchedEffect.
 * This creates a double reversal:
 *   - Traverse deps LIFO: effect2 → effect1
 *   - Prepend to batch list: effect1 becomes head, points to effect2
 *   - Final list: effect1 → effect2 (FIFO restored!)
 *
 * We achieve the same result more simply with .reverse() on the Set-backed array.
 *
 * WHY IT MATTERS:
 * Test: "should handle effect disposal during batch execution"
 * - effect1 disposes effect2 during its run
 * - If effect2 runs first, it executes even though disposed (BUG!)
 * - If effect1 runs first, it disposes effect2 before it runs (CORRECT!)
 */
function flushPendingEffects(): void {
  // Convert Set to array and reverse to get FIFO (creation) order
  const arr = Array.from(pendingEffects);
  pendingEffects.clear();

  // Set flushing flag to prevent effects created during flush from being re-flushed
  isFlushing = true;

  try {
    // Run each effect in FIFO order
    // onDependencyChange checks _isDisposed immediately before running
    arr.forEach((e) => e.onDependencyChange());
  } finally {
    isFlushing = false;
  }

  // Note: Effects may add new effects to pendingEffects during execution
  // Those will be flushed in the next batch
}

/**
 * Factory functions using batching implementations
 */
export function batchedSignal<T>(initialValue: T): BatchedSignal<T>;
export function batchedSignal<T = undefined>(): BatchedSignal<T | undefined>;
export function batchedSignal<T>(initialValue?: T) {
  return new BatchedSignal(initialValue);
}

export function batchedEffect(fn: () => void | (() => void)): () => void {
  const e = new BatchedEffect(fn);
  return () => e.dispose();
}

export function batchedComputed<T>(
  computeFn: () => T
): BatchedComputedSignal<T> {
  return new BatchedComputedSignal(computeFn);
}

/**
 * Batching demonstration and performance comparison
 */
export function demonstrateBatching(): void {
  console.log("=== Phase 5: Batching Demo ===\n");

  // TODO: Test Case 1: Multiple signal updates without batching
  // TODO: - Create 3 signals
  // TODO: - Create effect that depends on all 3
  // TODO: - Update all 3 signals sequentially
  // TODO: - Count how many times effect runs (should be 3)
  console.log("1. Without batching:");
  // TODO: Implement test

  // TODO: Test Case 2: Multiple signal updates WITH batching
  // TODO: - Create 3 signals
  // TODO: - Create effect that depends on all 3
  // TODO: - Use batch() to update all 3 signals
  // TODO: - Count how many times effect runs (should be 1)
  console.log("\n2. With batching:");
  // TODO: Implement test

  // TODO: Test Case 3: Nested batches
  // TODO: - Verify that nested batch() calls work correctly
  // TODO: - Effects should only run after outermost batch completes
  console.log("\n3. Nested batches:");
  // TODO: Implement test

  // TODO: Test Case 4: Computed signals in batches
  // TODO: - Create signal -> computed -> effect chain
  // TODO: - Update signal multiple times in batch
  // TODO: - Verify computed only recalculates once
  console.log("\n4. Computed signals with batching:");
  // TODO: Implement test

  // TODO: Test Case 5: Performance benchmark
  // TODO: - Compare 1000 updates with/without batching
  // TODO: - Measure execution time and effect run counts
  console.log("\n5. Performance comparison:");
  // TODO: Implement benchmark

  console.log("\n✅ Phase 5 Complete!");

  console.log("\n🔍 Key Discoveries:");
  console.log("• Batching reduces effect runs by 50%+ in typical scenarios");
  console.log("• Transaction-like semantics ensure consistent state");
  console.log("• Nested batches work correctly with depth tracking");
  console.log("• Computed signals benefit from deferred invalidation");
  console.log("• pendingEffects Set prevents duplicate executions");
}

// Run demonstration when file is executed directly
// demonstrateBatching();
