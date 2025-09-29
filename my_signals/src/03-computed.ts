/**
 * Phase 3: Computed Signals - Lazy Evaluation and Derived State
 *
 * Learning Goals:
 * - Understand lazy evaluation in reactive systems
 * - Learn how computed signals derive values from other signals
 * - Discover caching and invalidation strategies
 * - Explore the difference between "push" and "pull" reactivity
 *
 * Key Insights from Preact Signals:
 * 1. Computed signals are lazy - they only recalculate when needed
 * 2. They cache their results to avoid unnecessary computation
 * 3. They invalidate (mark dirty) when dependencies change
 * 4. They support both "push" (immediate notification) and "pull" (lazy evaluation)
 * 5. They form dependency graphs for fine-grained updates
 *
 * The Magic: How does a computed signal know when to recalculate?
 * Answer: It tracks its dependencies like effects do, but only recomputes when:
 * 1. Its .value is accessed AND
 * 2. One or more of its dependencies has changed since last computation
 */

// Import previous phase implementations
import { ReactiveSignal, Effect, evalContext } from "./02-effects.ts";

// TODO: Define the state of a computed signal
enum ComputedState {
  // TODO: FRESH - computed value is up to date
  FRESH = "fresh",
  // TODO: STALE - one or more dependencies have changed, needs recomputation
  STALE = "stale",
  // TODO: COMPUTING - currently being computed (prevents infinite recursion)
  COMPUTING = "computing",
  // TODO: ERROR - computation threw an error
  ERROR = "error"
}

/**
 * ComputedSignal extends ReactiveSignal to add lazy evaluation
 *
 * Key Differences from Regular Signals:
 * 1. Value is computed from other signals, not set directly
 * 2. Computation is lazy (only when .value is accessed)
 * 3. Results are cached until dependencies change
 * 4. Cannot be written to (read-only)
 */
export class ComputedSignal<T> extends ReactiveSignal<T> {
  // TODO: Add private _computeFn property to store the computation function
  private _computeFn: () => T;
  // TODO: Add private _state property to track computation state
  private _state: ComputedState;
  // TODO: Add private _error property to store computation errors
  private _error?: any;
  // TODO: Add private _isComputed flag to distinguish from regular signals
  private _isComputed: boolean = true;

  constructor(computeFn: () => T) {
    // TODO: Call parent constructor with undefined initial value
    super(undefined as any);
    // TODO: Store the compute function
    this._computeFn = computeFn;
    // TODO: Initialize state as STALE (needs first computation)
    this._state = ComputedState.STALE;
    // TODO: Initialize error as undefined
    this._error = undefined;
  }

  // TODO: Override the value getter to implement lazy evaluation
  get value(): T {
    console.log("🔍 ComputedSignal.value getter called, state:", this._state);

    // TODO: Check if we're already computing (cycle detection)
    if (this._state === ComputedState.COMPUTING) {
      // TODO: Throw error for circular dependency
      throw new Error("Circular dependency detected in computed signal");
    }

    // TODO: Check if we're in ERROR state
    if (this._state === ComputedState.ERROR) {
      // TODO: Re-throw the stored error
      throw this._error;
    }

    // TODO: Check if value is FRESH (no recomputation needed)
    if (this._state === ComputedState.FRESH) {
      // TODO: Register with current evalContext if it exists
      if (evalContext) {
        evalContext.addDependency(this);
      }
      // TODO: Return cached value
      return this._value;
    }

    // TODO: Value is STALE, needs recomputation
    return this._recompute();
  }

  // TODO: Override the value setter to prevent direct assignment
  set value(_: T) {
    // TODO: Throw error - computed signals are read-only
    throw new Error("Cannot set value of computed signal directly. Computed signals are read-only.");
  }

  // TODO: Add private _recompute method for lazy evaluation
  private _recompute(): T {
    console.log("🔄 ComputedSignal._recompute() starting");

    // TODO: Set state to COMPUTING to detect cycles
    this._state = ComputedState.COMPUTING;

    // TODO: Clear any previous error
    this._error = undefined;

    // TODO: Set up evaluation context (similar to Effect._run)
    const prevContext = evalContext;
    evalContext = this as any; // ComputedSignals can also be evalContext

    // TODO: Clear previous dependencies (unsubscribe from old signals)
    this._unsubscribeFromDependencies();

    try {
      // TODO: Execute the compute function
      const newValue = this._computeFn();

      // TODO: Check if value actually changed
      if (!Object.is(this._value, newValue)) {
        // TODO: Update the cached value
        this._value = newValue;
        // TODO: Notify any effects that depend on this computed signal
        this._notifyDependentEffects();
      }

      // TODO: Mark state as FRESH
      this._state = ComputedState.FRESH;

      // TODO: Return the computed value
      return this._value;

    } catch (error) {
      // TODO: Store error and mark state as ERROR
      this._error = error;
      this._state = ComputedState.ERROR;
      // TODO: Re-throw the error
      throw error;

    } finally {
      // TODO: Restore previous evaluation context
      evalContext = prevContext;
    }
  }

  // TODO: Add method to handle dependency changes (when input signals change)
  onDependencyChange(): void {
    console.log("🔔 ComputedSignal.onDependencyChange() - marking as STALE");

    // TODO: Only mark as stale if we're currently fresh
    if (this._state === ComputedState.FRESH) {
      // TODO: Mark as stale (needs recomputation)
      this._state = ComputedState.STALE;

      // TODO: Notify any effects that depend on this computed signal
      // Note: We don't recompute immediately - that's the "lazy" part!
      this._notifyDependentEffects();
    }
  }

  // TODO: Add private method to unsubscribe from previous dependencies
  private _unsubscribeFromDependencies(): void {
    // TODO: Unsubscribe from all current dependencies
    this._unsubscribeFunctions.forEach(unsub => unsub());
    this._unsubscribeFunctions.clear();
  }

  // TODO: Add private method to notify dependent effects
  private _notifyDependentEffects(): void {
    // TODO: Notify all effects that depend on this computed signal
    [...this._dependentEffects].forEach(effect => effect.onDependencyChange());
  }

  // TODO: Add method to check if the computed signal is fresh
  isFresh(): boolean {
    // TODO: Return true if state is FRESH
    return this._state === ComputedState.FRESH;
  }

  // TODO: Add method to check if the computed signal is stale
  isStale(): boolean {
    // TODO: Return true if state is STALE
    return this._state === ComputedState.STALE;
  }

  // TODO: Add method to force recomputation (useful for debugging)
  invalidate(): void {
    // TODO: Mark as stale to force recomputation on next access
    if (this._state === ComputedState.FRESH) {
      this._state = ComputedState.STALE;
    }
  }

  // TODO: Override peek() method for computed signals
  peek(): T {
    // TODO: For computed signals, peek should return cached value if fresh,
    // or trigger computation if stale, but without registering dependencies
    const prevContext = evalContext;
    evalContext = undefined;
    try {
      return this.value;
    } finally {
      evalContext = prevContext;
    }
  }
}

/**
 * Factory function to create computed signals (matches Preact API)
 */
export function computed<T>(computeFn: () => T): ComputedSignal<T> {
  // TODO: Return new ComputedSignal instance
  return new ComputedSignal(computeFn);
}

/**
 * Demo function to test computed signal functionality
 * This demonstrates lazy evaluation, caching, and fine-grained reactivity
 */
export function demonstrateComputed(): void {
  console.log("=== Phase 3: Computed Signals Demo ===");

  // TODO: Import effect and reactiveSignal from previous phases
  const { effect, reactiveSignal } = require("./02-effects.ts");

  // Test cases to verify:

  // 1. Basic computed signal creation and lazy evaluation
  console.log("\n1. Basic computed signal:");
  const firstName = reactiveSignal("John");
  const lastName = reactiveSignal("Doe");

  const fullName = computed(() => {
    console.log("  💭 Computing fullName...");
    return `${firstName.value} ${lastName.value}`;
  });

  console.log("Created computed signal (should not compute yet)");

  // 2. Lazy evaluation - computation only happens when value is accessed
  console.log("\n2. Lazy evaluation:");
  console.log("Accessing fullName.value:", fullName.value);
  console.log("Accessing fullName.value again:", fullName.value); // Should use cached value

  // 3. Invalidation and recomputation
  console.log("\n3. Invalidation and recomputation:");
  firstName.value = "Jane"; // Should mark fullName as stale
  console.log("Changed firstName, fullName.value:", fullName.value); // Should recompute

  // 4. Fine-grained reactivity - only recomputes when dependencies change
  console.log("\n4. Fine-grained reactivity:");
  const age = reactiveSignal(25);
  const greeting = computed(() => {
    console.log("  💭 Computing greeting...");
    return `Hello, ${fullName.value}!`;
  });

  console.log("Created greeting computed:", greeting.value);
  age.value = 26; // Should NOT trigger greeting recomputation
  lastName.value = "Smith"; // SHOULD trigger both fullName and greeting
  console.log("After changes, greeting:", greeting.value);

  // 5. Computed signals can depend on other computed signals
  console.log("\n5. Computed chains:");
  const nameLength = computed(() => {
    console.log("  💭 Computing nameLength...");
    return fullName.value.length;
  });

  console.log("Name length:", nameLength.value);
  firstName.value = "Alexander"; // Should recompute fullName AND nameLength
  console.log("After name change, length:", nameLength.value);

  // 6. Effects can depend on computed signals
  console.log("\n6. Effects with computed signals:");
  effect(() => {
    console.log(`  🎬 Effect: ${greeting.value} (${nameLength.value} chars)`);
  });

  lastName.value = "Johnson"; // Should trigger effect through computed chain

  // 7. Error handling in computed signals
  console.log("\n7. Error handling:");
  const errorProne = computed(() => {
    if (age.value < 0) {
      throw new Error("Age cannot be negative");
    }
    return `Age: ${age.value}`;
  });

  console.log("Normal case:", errorProne.value);

  try {
    age.value = -5;
    console.log("This should throw:", errorProne.value);
  } catch (error) {
    console.log("Caught error:", error.message);
  }

  // 8. Cycle detection
  console.log("\n8. Cycle detection:");
  // TODO: This will be tested once we implement the feature

  console.log("\nPhase 3 Complete!\n");

  console.log("🔍 Key Discoveries:");
  console.log("• Computed signals are lazy - they only compute when needed");
  console.log("• They cache results until dependencies change");
  console.log("• They enable fine-grained reactivity in complex dependency graphs");
  console.log("• They can depend on other computed signals forming chains");
  console.log("• Effects can depend on computed signals for efficient updates");
  console.log("• Error handling preserves reactive behavior\n");
}

// TODO: Export evalContext and other utilities for debugging
export { ComputedState };

// Run demonstration when this file is executed directly
// TODO: Uncomment after implementation
// demonstrateComputed();