/**
 * Phase 2: Effect System with Automatic Dependency Tracking
 *
 * Learning Goals:
 * - Understand automatic dependency tracking
 * - Learn how effects subscribe to signals
 * - Discover the evaluation context pattern
 *
 * Key Insights from Preact Signals:
 * 1. Effects automatically track which signals they depend on
 * 2. Global evaluation context captures dependencies during execution
 * 3. Effects re-run when their dependencies change
 * 4. Cleanup functions handle resource management
 *
 * The Magic: How does an effect "know" which signals it uses?
 * Answer: Global evaluation context! When a signal's .value is accessed,
 * it checks if there's a current effect running and registers itself as a dependency.
 */

// Import Signal from previous phase
import { Signal } from "./01-basic-signal.ts";

// Global variable to track current evaluation context
// This is the "magic" that makes automatic dependency tracking work!
// When an effect runs, this gets set to that effect
// When a signal's .value is read, it checks this variable

export interface IEffect {
  addDependency(signal: ReactiveSignal<any>): void;
  onDependencyChange(): void;
}

export interface IUnsubscribe {
  _unsubscribeFunctions: Set<() => void>;
}

type CTX = IEffect | undefined;
let evalContext: CTX = undefined;

export const getContext = () => evalContext;
export const setContext = (ctx: CTX) => (evalContext = ctx);

// TODO: Define Effect class
export class Effect implements IEffect, IUnsubscribe {
  // TODO: Add private _fn property to store the effect callback function
  private _fn?: Function;
  // TODO: Add private _cleanup property to store optional cleanup function returned by _fn
  private _cleanup?: Function;
  // TODO: Add private _dependencies property to store Set of signals this effect depends on
  // private _dependencies: Set<Signal<any>>;
  // TODO: Add private _isDisposed property to track if effect is disposed
  private _isDisposed: boolean;
  _unsubscribeFunctions: Set<() => void>;
  // private _isPending: boolean;

  constructor(fn: () => void | (() => void)) {
    // TODO: Store fn in _fn property
    this._fn = fn;
    // TODO: Initialize _cleanup as undefined
    this._cleanup = undefined;
    // TODO: Initialize _dependencies as empty Set<Signal<any>>
    // this._dependencies = new Set();
    // TODO: Initialize _isDisposed as false
    this._isDisposed = false;
    this._unsubscribeFunctions = new Set();
    // this._isPending = false;
    // TODO: Call _run() to execute the effect immediately and establish initial dependencies
    this._run();
  }

  private _run(): void {
    // TODO: Check if effect is disposed, return early if so (guard clause)
    if (this._isDisposed) {
      return;
    }
    // TODO: Clean up previous run:
    // - Call _cleanup function if it exists, then set to undefined
    try {
      this._cleanup?.();
      this._cleanup = undefined;
    } catch (error) {
      console.log(error);
    }

    this._unsubscribeFunctions.forEach((unsub) => unsub());
    this._unsubscribeFunctions.clear();
    // - Clear the _dependencies Set
    // this._dependencies.clear();
    // TODO: Set up new run:
    // - Store the previous evalContext (could be another effect)
    const prevContext = evalContext;
    // - Set global evalContext to this effect (so signals know to register with us)
    evalContext = this;
    // TODO: Execute the effect function:
    // - Try to call this._fn()
    try {
      // - If it returns a function, store it as this._cleanup
      this._cleanup = this._fn?.();
    } catch (error) {
      // - Catch any errors and handle appropriately
      // NO IDEA: what does handling error appropriately means?
      console.log(error);
      this._isDisposed = true;
    } finally {
      // - Always restore the previous evalContext in finally block
      evalContext = prevContext;
    }
  }

  onDependencyChange(): void {
    if (this._isDisposed) {
      return;
    }

    // Run effects immediately for now - optimization can be added later
    this._run();
  }

  addDependency(signal: ReactiveSignal<any>): void {
    // this._dependencies.add(signal);
    // Subscribe to the signal and store the unsubscribe function
    const unsubscribe = signal.subscribeEffect(this);
    this._unsubscribeFunctions.add(unsubscribe);
  }

  dispose(): void {
    // TODO: Set _isDisposed to true
    this._isDisposed = true;
    // this._isPending = false;
    // TODO: Call _cleanup function if it exists
    try {
      this._cleanup?.();
    } catch (error) {
      console.log(error);
    }
    // TODO: Unsubscribe from all dependencies
    this._unsubscribeFunctions.forEach((unsub) => unsub());
    this._unsubscribeFunctions.clear();
    // TODO: Clear _dependencies Set
    // this._dependencies.clear();
    // TODO: Set _fn and _cleanup to undefined to free memory
    this._fn = undefined;
    this._cleanup = undefined;
  }
}

// TODO: Extend Signal class to support automatic dependency tracking
// This is where the magic happens - signals register themselves with the current effect
export class ReactiveSignal<T = any> extends Signal<T> {
  // TODO: Add private _dependentEffects property to store Set of effects that depend on this signal
  protected _dependentEffects: Set<IEffect>;

  constructor(initialValue: T) {
    // TODO: Call parent constructor
    super(initialValue);
    // TODO: Initialize _dependentEffects as empty Set<Effect>
    this._dependentEffects = new Set();
  }

  get value(): T {
    // TODO: Check if there's a current evalContext (an effect is running)
    if (evalContext) {
      // TODO: If yes, register this signal as a dependency:
      //   - Add this signal to the effect's _dependencies
      const ctx = evalContext;
      evalContext.addDependency(this);
      //   - Add the effect to this signal's _dependentEffects
      //   - Subscribe the effect to changes on this signal
    }

    // TODO: Return the actual value (call parent getter or access _value)
    return this._value;
  }

  set value(newValue: T) {
    const oldValue = this._value;
    // TODO: If the value actually changed, notify all dependent effects:
    if (Object.is(newValue, oldValue)) return;

    // Set the value directly
    this._value = newValue;

    // // Notify regular subscribers from parent class
    this._subscribers.forEach((callback) => {
      try {
        callback(newValue);
      } catch (err) {
        console.log(err);
      }
    });

    [...this._dependentEffects].forEach((effect) =>
      effect.onDependencyChange()
    );
  }

  // TODO: Add method to subscribe an effect to this signal
  subscribeEffect(effect: IEffect): () => void {
    // TODO: Add effect to _dependentEffects Set
    this._dependentEffects.add(effect);
    // TODO: Return unsubscribe function that removes effect from _dependentEffects
    return () => {
      this._dependentEffects.delete(effect);
    };
  }

  // // TODO: Override subscribe method to handle both regular subscribers AND effects
  // subscribe(callback: (value: T) => void): () => void {
  //   // TODO: Call parent subscribe method
  //   return super.subscribe(callback);
  //   // TODO: Return the unsubscribe function from parent
  // }
}

/**
 * Factory function to create reactive signals that work with effects
 */
export function reactiveSignal<T>(initialValue: T): ReactiveSignal<T>;
export function reactiveSignal<T = undefined>(): ReactiveSignal<T | undefined>;
export function reactiveSignal<T>(initialValue?: T) {
  // TODO: Return new ReactiveSignal instance
  return new ReactiveSignal(initialValue);
}

/**
 * Create an effect that automatically tracks its dependencies
 * This is the main API users will call
 */
export function effect(fn: () => void | (() => void)): () => void {
  // TODO: Create new Effect instance with fn
  const e = new Effect(fn);
  // TODO: Return the effect's dispose function so users can clean up
  return () => e.dispose();
}

/**
 * Demo function to test effect system
 * This will help you verify your implementation works correctly
 */
// export function demonstrateEffects(): void {
//   console.log("=== Phase 2: Effects Demo ===");

//   // Test cases to verify:
//   // 1. Effects run immediately when created
//   const count = reactiveSignal(0);
//   console.log("Creating effect...");

//   effect(() => {
//     console.log("Effect running, count is:", count.value);
//   }); // Should print: "Effect running, count is: 0"

//   // 2. Effects automatically track signal dependencies and re-run when they change
//   console.log("Changing count to 1...");
//   count.value = 1; // Should print: "Effect running, count is: 1"

//   // 3. Effects can depend on multiple signals
//   const name = reactiveSignal("Alice");
//   effect(() => {
//     console.log(`Hello ${name.value}, count is ${count.value}`);
//   }); // Should print: "Hello Alice, count is 1"

//   console.log("Changing name to Bob...");
//   name.value = "Bob"; // Should print: "Hello Bob, count is 1"

//   console.log("Changing count to 2...");
//   count.value = 2; // Should print both effects

//   // 4. Multiple effects can depend on the same signal
//   effect(() => {
//     console.log("Second effect sees count:", count.value);
//   }); // Should print: "Second effect sees count: 2"

//   console.log("Changing count to 3...");
//   count.value = 3; // Should trigger all effects that depend on count

//   // 5. Effects can return cleanup functions
//   let cleanupCalled = false;
//   const dispose = effect(() => {
//     console.log("Effect with cleanup, count:", count.value);
//     return () => {
//       cleanupCalled = true;
//       console.log("Cleanup called!");
//     };
//   });

//   console.log("Changing count to 4 (should call cleanup then re-run)...");
//   count.value = 4; // Should call cleanup, then run effect

//   // 6. Disposed effects don't run anymore
//   console.log("Disposing effect...");
//   dispose();
//   console.log("Cleanup called?", cleanupCalled);

//   console.log("Changing count to 5 (disposed effect should not run)...");
//   count.value = 5; // Disposed effect should not run

//   console.log("Phase 2 Complete!\n");

//   console.log("🔍 Key Discoveries:");
//   console.log("• Effects automatically track dependencies via global context");
//   console.log("• Signals register with the current running effect");
//   console.log("• Effects re-run when ANY dependency changes");
//   console.log("• Cleanup functions handle resource management");
//   console.log("• Disposed effects stop reacting to changes\n");
// }

// TODO: Export the global evalContext for debugging/testing (optional)
export { evalContext };

// Run the demonstration when this file is executed directly
// demonstrateEffects();
