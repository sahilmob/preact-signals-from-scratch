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
    if (batchDepth > 0) {
      //     - Traverse _depsHead linked list
      let current = this._depsHead;
      while (current) {
        //     - Add each effect to pendingEffects Set
        pendingEffects.add(current.effect);
        current = current.nextDep;
        //     - DO NOT call effect.onDependencyChange() yet
      }
    } else {
      //   If NOT batching:
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
  private _isPending: boolean;

  // TODO: Add _isPending property (type: boolean) to track if queued for execution

  constructor(fn: () => void | (() => void)) {
    // TODO: Initialize all properties
    this._fn = fn;
    this._isDisposed = false;
    this._isPending = false;
    // TODO: Call _run() to execute immediately (first run is not batched)
    this._run();
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
    this._isPending = false;
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
    if (batchDepth > 0) {
      this._isPending = true;
      //   If batching:
      //     - Set _isPending = true
      //     - Add this effect to pendingEffects Set
      pendingEffects.add(this);
      //     - DO NOT call _run() yet
    } else {
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
  private _isPending = false;

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
    console.log("acccessed");
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
    return this._recompute();
  }

  set value(_: any) {
    // TODO: Throw error - computed signals are read-only
    throw new Error("Computed signals are read-only");
  }

  private _recompute() {
    // TODO: Implement like LinkedComputedSignal
    // TODO: Set state to COMPUTING
    this._state = ComputedState.COMPUTING;
    // TODO: Set up evaluation context
    const prevContext = getContext();
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
      if (valueChanged) {
        this._notifyDependentEffects();
      }
      return this._value;
    } catch (error) {
      // TODO: Handle errors by setting ERROR state
      this._state = ComputedState.ERROR;
      this._error = error;
    } finally {
      // TODO: Restore context
      setContext(prevContext);
    }
  }

  onDependencyChange(): void {
    // TODO: Check if disposed
    if (this._isDisposed) return;
    // TODO: Check if currently batching
    //     - Set state to STALE
    this._state = ComputedState.STALE;
    if (batchDepth > 0) {
      //   If batching:
      //     - Set _isPending = true
      this._isPending = true;
      //     - Add to pendingEffects
      pendingEffects.add(this);
      //     - DO NOT notify dependents yet
    } else {
      //   If NOT batching:
      //     - Set state to STALE
      //     - Notify dependents immediately
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
 */
function flushPendingEffects(): void {
  // TODO: Create array from pendingEffects Set
  const arr = Array.from(pendingEffects);
  // TODO: Clear pendingEffects Set
  pendingEffects.clear();
  // TODO: Iterate through array and call each effect's onDependencyChange()
  arr.forEach((e) => e.onDependencyChange());
  // TODO: Note: Effects may add new effects to pendingEffects during execution
  //       This is okay - those will be flushed in the next batch
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
