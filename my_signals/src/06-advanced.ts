/**
 * Phase 6: Advanced APIs & Utilities
 *
 * Learning Goals:
 * - Understand how to read signals without creating dependencies (untracked)
 * - Learn manual subscription APIs for imperative code
 * - Discover lifecycle hooks for resource management
 * - Explore utility methods like peek() for debugging
 *
 * Key Insights from Preact Signals:
 * 1. untracked() allows reading signals without subscribing - crucial for logging/debugging
 * 2. peek() provides non-reactive access to current value
 * 3. subscribe() bridges reactive and imperative code
 * 4. Lifecycle hooks (_watched/_unwatched) enable resource cleanup when signals become unused
 * 5. These utilities make signals more ergonomic in real-world applications
 *
 * The Magic: How does untracked() prevent dependency tracking?
 * Answer: By temporarily setting evalContext to undefined, signal reads don't register dependencies.
 */

// Import previous phase implementations
import {
  BatchedSignal,
  BatchedEffect,
  BatchedComputedSignal,
  batchedSignal,
  batchedEffect,
  batchedComputed,
  batch,
} from "./05-batching.ts";
import { evalContext, getContext, IEffect, setContext } from "./02-effects.ts";

/**
 * untracked() - Execute code without tracking dependencies
 *
 * Use cases:
 * - Logging/debugging signal values inside effects without creating dependencies
 * - Reading signals for comparison/validation without subscribing
 * - Breaking circular dependencies by reading upstream without tracking
 *
 * Example:
 *   effect(() => {
 *     console.log(signal.value); // Creates dependency
 *     untracked(() => {
 *       console.log(signal.value); // No dependency!
 *     });
 *   });
 */
export function untracked<T>(fn: () => T): T {
  // TODO: Save current evalContext
  const prevContext = getContext();
  // TODO: Set evalContext to undefined (disables tracking)
  setContext(undefined);
  // TODO: Execute fn() inside try block
  try {
    const result = fn();
    // TODO: Return fn() result
    return result;
  } finally {
    // TODO: Restore previous evalContext in finally block
    setContext(prevContext);
  }
}

/**
 * AdvancedSignal - Signal with peek() and subscribe() methods
 */
export class AdvancedSignal<T = any> extends BatchedSignal<T> {
  // Lifecycle hooks (optional)
  private _watched?: () => void;
  private _unwatched?: () => void;

  constructor(initialValue: T, options?: SignalOptions<T>) {
    super(initialValue);
    // TODO: Store lifecycle hooks from options
    this._watched = options?.watched;
    this._unwatched = options?.unwatched;
  }

  /**
   * peek() - Get current value without subscribing
   *
   * Unlike .value getter, peek() doesn't create a dependency even if called
   * inside an effect. Useful for:
   * - Debugging (logging value without tracking)
   * - Conditional logic that shouldn't create dependencies
   * - Performance optimization (avoid unnecessary subscriptions)
   */
  peek(): T {
    // TODO: Use untracked() to read this.value without creating dependency
    // TODO: Return the value
    return untracked(() => this.value);
  }
  subscribeEffect(effect: IEffect): () => void {
    const wasWatched = this._depsHead !== undefined;
    const unsubscribe = super.subscribeEffect(effect);

    if (!wasWatched && this._watched) {
      this._onWatched();
    }

    return () => {
      unsubscribe();

      if (this._depsHead === undefined && this._unwatched) {
        this._onUnwatched();
      }
    };
  }

  /**
   * subscribe() - Manual subscription API
   *
   * Bridges reactive signals with imperative code. Creates an effect that:
   * 1. Reads the signal value
   * 2. Calls the callback with the new value
   * 3. Returns a dispose function
   *
   * Example:
   *   const dispose = signal.subscribe(value => {
   *     console.log('Signal changed to:', value);
   *   });
   *   // Later: dispose() to unsubscribe
   */
  subscribe(fn: (value: T) => void): () => void {
    // Create an effect using batchedEffect()
    return batchedEffect(() => {
      // Read this.value to establish dependency
      const v = this.value;
      // Call fn(value) in untracked context (to avoid tracking fn's internals)
      untracked(() => fn(v));
    });
  }

  /**
   * Lifecycle hook called when signal gains its first subscriber
   * Override in BatchedSignal._notifyDependentEffects or subscribeEffect
   */
  protected _onWatched(): void {
    if (this._watched) {
      untracked(() => this._watched?.());
      // TODO: Call _watched() hook in untracked context
      // Why untracked? Lifecycle hooks shouldn't create dependencies
    }
  }

  /**
   * Lifecycle hook called when signal loses its last subscriber
   */
  protected _onUnwatched(): void {
    if (this._unwatched) {
      untracked(() => this?._unwatched?.());
      // TODO: Call _unwatched() hook in untracked context
    }
  }
}

export interface SignalOptions<T> {
  watched?: () => void;
  unwatched?: () => void;
}

/**
 * AdvancedComputedSignal - Computed with peek() and lifecycle hooks
 */
export class AdvancedComputedSignal<T>
  extends BatchedComputedSignal<T>
  implements IComputedSignal<T>
{
  private _watched?: () => void;
  private _unwatched?: () => void;

  constructor(computeFn: () => T, options?: SignalOptions<T>) {
    super(computeFn);
    this._watched = options?.watched;
    this._unwatched = options?.unwatched;
  }

  /**
   * peek() - Get computed value without subscribing
   */
  peek(): T {
    // TODO: Use untracked() to access this.value
    return untracked(() => this.value);
    // TODO: This will trigger recomputation if stale, but won't create dependency
  }

  subscribeEffect(effect: IEffect): () => void {
    const wasWatched = this._depsHead !== undefined;
    const unsubscribe = super.subscribeEffect(effect);

    if (!wasWatched && this._watched) {
      this._onWatched();
    }

    return () => {
      unsubscribe();
      if (this._depsHead === undefined && this._unwatched) {
        this._onUnwatched();
      }
    };
  }

  /**
   * subscribe() - Manual subscription to computed signal changes
   */
  subscribe(fn: (value: T) => void): () => void {
    // TODO: Create an effect using batchedEffect()
    const e = batchedEffect(() => {
      //   - Read this.value to establish dependency
      const v = this.value;
      //   - Call fn(value) in untracked context (to avoid tracking fn's internals)
      untracked(() => fn(v));
    });

    return e;
  }

  protected _onWatched(): void {
    if (this._watched) {
      // TODO: Call hook in untracked context
      untracked(() => this._watched?.());
    }
  }

  protected _onUnwatched(): void {
    if (this._unwatched) {
      // TODO: Call hook in untracked context
      untracked(() => this._unwatched?.());
    }
  }
}

export interface IComputedSignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

/**
 * Factory functions
 */
export function advancedSignal<T>(
  initialValue: T,
  options?: SignalOptions<T>
): AdvancedSignal<T>;
export function advancedSignal<T = undefined>(): AdvancedSignal<T | undefined>;
export function advancedSignal<T>(
  initialValue?: T,
  options?: SignalOptions<T>
) {
  return new AdvancedSignal(initialValue, options);
}

export function advancedComputed<T>(
  computeFn: () => T,
  options?: SignalOptions<T>
): AdvancedComputedSignal<T> {
  return new AdvancedComputedSignal(computeFn, options);
}

// Re-export batch and effect from previous phase
export { batch, batchedEffect as effect };

/**
 * Demonstration of advanced APIs
 */
export function demonstrateAdvancedAPIs(): void {
  console.log("=== Phase 6: Advanced APIs Demo ===\n");

  // TODO: Test Case 1: untracked() prevents dependency tracking
  // TODO: - Create signal
  // TODO: - Create effect that reads signal normally (creates dependency)
  // TODO: - Read same signal with untracked() (no dependency)
  // TODO: - Update signal and verify effect runs
  // TODO: - Show that untracked read didn't create dependency
  console.log("1. untracked() usage:");
  // TODO: Implement test

  // TODO: Test Case 2: peek() for non-reactive access
  // TODO: - Create signal
  // TODO: - Use peek() to read value without subscribing
  // TODO: - Show difference between .value and .peek() inside effect
  console.log("\n2. peek() vs .value:");
  // TODO: Implement test

  // TODO: Test Case 3: subscribe() for manual subscriptions
  // TODO: - Create signal
  // TODO: - Use subscribe() to set up imperative callback
  // TODO: - Update signal and show callback runs
  // TODO: - Call dispose() to unsubscribe
  // TODO: - Update signal again and show callback doesn't run
  console.log("\n3. subscribe() API:");
  // TODO: Implement test

  // TODO: Test Case 4: Lifecycle hooks
  // TODO: - Create signal with watched/unwatched hooks
  // TODO: - Create effect that depends on signal (triggers watched)
  // TODO: - Dispose effect (triggers unwatched)
  // TODO: - Show hooks are called at appropriate times
  console.log("\n4. Lifecycle hooks:");
  // TODO: Implement test

  // TODO: Test Case 5: Computed signal with peek()
  // TODO: - Create computed signal
  // TODO: - Use peek() to read value without triggering effect subscription
  // TODO: - Show lazy evaluation still works
  console.log("\n5. Computed peek():");
  // TODO: Implement test

  console.log("\n✅ Phase 6 Complete!");

  console.log("\n🔍 Key Discoveries:");
  console.log("• untracked() disables dependency tracking temporarily");
  console.log("• peek() reads current value without subscribing");
  console.log("• subscribe() bridges reactive and imperative code");
  console.log("• Lifecycle hooks enable resource management");
  console.log("• These utilities make signals more practical for real apps");
}

// Run demonstration when file is executed directly
// demonstrateAdvancedAPIs();
