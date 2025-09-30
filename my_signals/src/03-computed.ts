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

import {
  ReactiveSignal,
  Effect,
  evalContext,
  effect,
  reactiveSignal,
  getContext,
  setContext,
  IEffect,
} from "./02-effects.ts";

// TODO: Define an enum called ComputedState with four states:
// - FRESH: computed value is up to date
// - STALE: one or more dependencies have changed, needs recomputation
// - COMPUTING: currently being computed (prevents infinite recursion)
// - ERROR: computation threw an error
const ComputedState = {
  FRESH: 0,
  STALE: 1,
  COMPUTING: 2,
  ERROR: 3,
} as const;

type ComputedState = (typeof ComputedState)[keyof typeof ComputedState];

/**
 * ComputedSignal extends ReactiveSignal to add lazy evaluation
 *
 * Key Differences from Regular Signals:
 * 1. Value is computed from other signals, not set directly
 * 2. Computation is lazy (only when .value is accessed)
 * 3. Results are cached until dependencies change
 * 4. Cannot be written to (read-only)
 */
export class ComputedSignal<T> extends ReactiveSignal<T> implements IEffect {
  // TODO: Add private _computeFn property to store the computation function (type: () => T)

  private _computeFn: () => T;

  // TODO: Add private _state property to track computation state (type: ComputedState)
  private _state: ComputedState;

  // TODO: Add private _error property to store computation errors (type: any, optional)
  private _error: any;

  // TODO: Add private _isComputed flag set to true to distinguish from regular signals
  private _isComputed = true;

  _unsubscribeFunctions: Set<() => void>;

  constructor(computeFn: () => T) {
    // TODO: Call parent constructor with undefined as any (since we don't have initial value yet)
    super(undefined as any);
    // TODO: Store the compute function in _computeFn
    this._computeFn = computeFn;
    // TODO: Initialize _state as STALE (needs first computation)
    this._state = ComputedState.STALE;
    // TODO: Initialize _error as undefined
    this._error = undefined;
    this._unsubscribeFunctions = new Set();
  }

  addDependency(signal: ReactiveSignal<any>): void {
    const unsub = signal.subscribeEffect(this);
    this._unsubscribeFunctions.add(unsub);
  }

  // TODO: Override the value getter to implement lazy evaluation:
  get value(): T {
    // 1. Add console.log to show state when getter is called

    if (this._state === ComputedState.COMPUTING) {
      // 2. Check if state is COMPUTING - if so, throw error for circular dependency
      throw new Error("Circular dependency");
    }

    if (this._state === ComputedState.ERROR) {
      // 3. Check if state is ERROR - if so, re-throw the stored error
      throw this._error;
    }

    // 4. Check if state is FRESH:
    if (evalContext) {
      evalContext.addDependency(this);
    }

    if (this._state === ComputedState.FRESH) {
      return this._value;
    }

    // 5. Otherwise, value is STALE - return result of _recompute()
    return this._recompute();
  }

  // TODO: Override the value setter to prevent direct assignment:
  // - Throw error: "Cannot set value of computed signal directly. Computed signals are read-only."
  set value(v: any) {
    throw new Error(
      "Cannot set value of computed signal directly. Computed signals are read-only."
    );
  }
  // TODO: Add private _recompute method that returns T:
  private _recompute(): T {
    // 1. Add console.log to show recomputation starting
    // console.log("ComputedSignal recomputing");
    // 2. Set state to COMPUTING to detect cycles
    this._state = ComputedState.COMPUTING;
    // 3. Clear any previous error (set _error to undefined)
    this._error = undefined;
    // 4. Set up evaluation context:
    //    - Save current evalContext to prevContext
    const prevContext = getContext();
    //    - Set evalContext to this (cast as any since ComputedSignals can be evalContext)
    setContext(this);
    // 5. Clear previous dependencies by calling _unsubscribeFromDependencies()
    this._unsubscribeFromDependencies();
    // 6. Use try-catch-finally:
    //    try:
    try {
      //      - Execute _computeFn() and store result in newValue
      const newVal = this._computeFn();

      //      - Check if value changed using Object.is(_value, newValue)
      // console.log({ newVal, value: this._value });
      const valueChanged = !Object.is(newVal, this._value);
      if (valueChanged) {
        //      - If changed:
        //        * Update _value to newValue
        this._value = newVal;
      }
      //      - Set _state to FRESH
      this._state = ComputedState.FRESH;

      // Only notify if value actually changed
      if (valueChanged) {
        //        * Call _notifyDependentEffects()
        this._notifyDependentEffects();
      }

      //      - Return _value
      return this._value;
    } catch (error) {
      //    catch (error):
      //      - Store error in _error
      //      - Set _state to ERROR
      //      - Re-throw error
      this._error = error;
      this._state = ComputedState.ERROR;
      throw error;
    } finally {
      //    finally:
      //      - Restore evalContext from prevContext
      setContext(prevContext);
    }
  }

  // TODO: Add onDependencyChange method (called when input signals change):
  onDependencyChange() {
    // 1. Add console.log to show dependency change
    // console.log("ComputedSignal dependency changed");
    // 2. Check if _state is FRESH or ERROR
    if (this._state === ComputedState.FRESH || this._state === ComputedState.ERROR) {
      // 3. If fresh or error:
      //    - Mark as STALE
      this._state = ComputedState.STALE;
      //    - Notify effects so they know to recompute
      //    - But avoid double notification by checking if we're already notifying
      this._notifyDependentEffects();
    }
  }

  // TODO: Add private _unsubscribeFromDependencies method:
  private _unsubscribeFromDependencies() {
    // - Loop through _unsubscribeFunctions and call each unsubscribe function
    this._unsubscribeFunctions.forEach((unsub) => unsub());
    // - Clear _unsubscribeFunctions set
    this._unsubscribeFunctions.clear();
  }

  private _notifyDependentEffects() {
    // TODO: Add private _notifyDependentEffects method:
    // - Convert _dependentEffects to array and forEach, calling effect.onDependencyChange()
    [...this._dependentEffects].forEach((e) => e.onDependencyChange());
  }
  // TODO: Add isFresh method that returns boolean:
  // - Return true if _state is FRESH
  isFresh(): boolean {
    return this._state === ComputedState.FRESH;
  }

  // TODO: Add isStale method that returns boolean:
  // - Return true if _state is STALE
  isStale(): boolean {
    return this._state === ComputedState.STALE;
  }

  // TODO: Add invalidate method to force recomputation:
  // - If _state is FRESH, set it to STALE
  invalidate() {
    if (this._state === ComputedState.FRESH) {
      this._state = ComputedState.STALE;
    }
  }

  // TODO: Override peek() method for computed signals:
  peek(): T | undefined {
    // - For computed signals, peek should return cached value if fresh,
    if (this._state === ComputedState.FRESH) {
      return this._value;
    }

    //   or trigger computation if stale, but without registering dependencies
    // - Save current evalContext, set to undefined, try to access value, finally restore context
    const prevContext = getContext();
    setContext(undefined);
    try {
      return this.value; // This will trigger _recompute() without registering dependencies
    } finally {
      setContext(prevContext);
    }
  }
}

/**
 * Factory function to create computed signals (matches Preact API)
 */
export function computed<T>(computeFn: () => T): ComputedSignal<T> {
  const s = new ComputedSignal(computeFn);
  return s;
}

/**
 * Demo function to test computed signal functionality
 * This demonstrates lazy evaluation, caching, and fine-grained reactivity
 */
export function demonstrateComputed(): void {
  console.log("=== Phase 3: Computed Signals Demo ===");

  // TODO: Import effect and reactiveSignal from previous phases

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
    console.log("Caught error:", (error as Error).message);
  }

  // 8. Cycle detection
  console.log("\n8. Cycle detection:");
  // TODO: This will be tested once we implement the feature

  console.log("\nPhase 3 Complete!\n");

  console.log("🔍 Key Discoveries:");
  console.log("• Computed signals are lazy - they only compute when needed");
  console.log("• They cache results until dependencies change");
  console.log(
    "• They enable fine-grained reactivity in complex dependency graphs"
  );
  console.log("• They can depend on other computed signals forming chains");
  console.log("• Effects can depend on computed signals for efficient updates");
  console.log("• Error handling preserves reactive behavior\n");
}

// Export ComputedState enum for debugging
export { ComputedState };

// Run demonstration when this file is executed directly
// demonstrateComputed();
