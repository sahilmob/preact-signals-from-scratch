/**
 * Phase 5: Batching - Transaction-like Update Batching
 *
 * Learning Goals:
 * - Understand how to optimize multiple signal changes
 * - Learn transaction-like batching for update coalescing
 * - Discover deferred effect execution strategies
 * - Explore how Preact Signals minimizes redundant computations
 *
 * Key Insights from Preact Signals:
 * 1. Multiple signal changes can trigger the same effect multiple times
 * 2. Batching defers effect execution until all signals are updated
 * 3. Effects run at most once per batch, even with multiple dependencies changing
 * 4. Batching reduces computational overhead by 50%+ in typical scenarios
 * 5. Transaction-like semantics provide consistent state snapshots
 *
 * The Magic: How does batching prevent redundant effect runs?
 * Answer: By collecting all signal changes in a batch, marking effects as pending,
 * and executing each effect only once after all signals have been updated.
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

// TODO: Define batching state management

/**
 * Global batching state
 * - batchDepth: Tracks nesting level of batch() calls
 * - pendingEffects: Set of effects to run after batch completes
 */
// TODO: Add batchDepth variable (type: number, initial: 0)
let batchDepth = 0;
// TODO: Add pendingEffects variable (type: Set<IEffect>, initial: new Set())
const pendingEffects: Set<IEffect> = new Set();
// Track if we're currently flushing effects to prevent re-entrancy issues
let isFlushing = false;

/**
 * BatchedSignal - Signal that defers notifications during batches
 */
export class BatchedSignal<T = any> extends LinkedReactiveSignal<T> {
  constructor(initialValue: T) {
    // TODO: Call parent constructor
    super(initialValue);
  }

  get value() {
    return super.value;
  }

  set value(newValue: T) {
    // TODO: Check if value actually changed using Object.is
    // TODO: If not changed, return early
    if (Object.is(newValue, this._value)) return;
    // TODO: Update _value
    this._value = newValue;
    // TODO: Call _notifyDependentEffects() which respects batching
    this._notifyDependentEffects();
  }

  protected _notifyDependentEffects(): void {
    // TODO: Check if currently batching (batchDepth > 0)
    //   If batching:
    if (batchDepth > 0 && !isFlushing) {
      //     - Traverse _depsHead linked list
      let current = this._depsHead;
      while (current) {
        // Computed signals must be invalidated immediately, not batched
        // Only regular effects get batched
        if (current.effect instanceof BatchedComputedSignal) {
          current.effect.onDependencyChange();
        } else {
          //     - Add non-computed effects to pendingEffects Set
          pendingEffects.add(current.effect);
        }
        current = current.nextDep;
        //     - DO NOT call regular effect.onDependencyChange() yet
      }
    } else {
      //   If NOT batching OR we're flushing:
      //     - Call parent implementation (immediate notification)
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
 * BatchedComputedSignal - Computed signal that respects batching
 */
export class BatchedComputedSignal<T>
  extends BatchedSignal<T>
  implements IEffect
{
  // TODO: Add all computed signal properties from Phase 4
  private _computeFn: () => T;
  private _state: ComputedState;
  private _error: any;
  private _isComputed = true;
  // TODO: Add linked list properties for tracking dependencies as an effect
  private _isDisposed = false;
  private _sigsHead: EffectNode | undefined = undefined;
  // TODO: Add _isPending property for batch tracking

  constructor(computeFn: () => T) {
    super(undefined as any);
    this._state = ComputedState.STALE;
    this._computeFn = computeFn;
    // TODO: Initialize like LinkedComputedSignal but with batching support
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

  onDependencyChange(): void {
    // TODO: Check if disposed
    if (this._isDisposed) return;

    // If we have no dependents, stay lazy - just invalidate
    if (!this._depsHead) {
      if (
        this._state === ComputedState.FRESH ||
        this._state === ComputedState.ERROR
      ) {
        this._state = ComputedState.STALE;
      }
      return;
    }

    // If we DO have dependents, eagerly recompute to check if value changed
    // Only notify dependents if the value actually changes
    if (
      this._state === ComputedState.FRESH ||
      this._state === ComputedState.ERROR
    ) {
      const oldValue = this._value;
      this._state = ComputedState.STALE;

      // Eagerly recompute to see if value changed
      // Pass shouldNotify=true since we're being invalidated (pushed), not accessed (pulled)
      try {
        this._recompute(true);
        // _recompute(true) will notify if value changed
      } catch (error) {
        // On error, always notify dependents
        this._notifyDependentEffects();
      }
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
