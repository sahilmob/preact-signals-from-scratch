/**
 * Phase 1: Basic Signal Implementation
 *
 * Learning Goals:
 * - Understand value containers and change notification
 * - Learn the observer pattern in reactive systems
 * - Discover why signals use `.value` property access
 *
 * Key Insights from Preact Signals:
 * 1. Signals are value containers that notify observers when changed
 * 2. Using .value property allows transparent reactivity in frameworks
 * 3. Simple observer pattern with subscriber arrays
 */

// TODO: Define Signal class with generic type parameter T
export class Signal<T = any> {
  // TODO: Add private _value property to store the actual value
  public _value: T;
  // TODO: Add private _subscribers array to store callback functions
  protected _subscribers: Set<(v: T) => void>;

  constructor(initialValue: T) {
    // TODO: Initialize _value with initialValue
    this._subscribers = new Set();
    this._value = initialValue;
    // TODO: Initialize _subscribers as empty array
  }

  get value(): T {
    // TODO: Return the current _value
    return this._value;
    // Note: Later phases will add dependency tracking here
  }

  set value(newValue: T) {
    // TODO: Check if newValue is different from _value (use Object.is for NaN/+0/-0 handling)
    if (Object.is(this._value, newValue)) return;
    // TODO: If different, update _value
    this._value = newValue;
    // TODO: Notify all subscribers by calling each callback with newValue
    // TODO: Wrap subscriber calls in try-catch to prevent one error from breaking others
    this._subscribers.forEach((callback) => {
      try {
        callback(this._value);
      } catch (err) {
        console.log(err);
      }
    });
  }

  /**
   * Subscribe to changes in this signal
   * Returns an unsubscribe function
   */
  subscribe(callback: (value: T) => void): () => void {
    // TODO: Add callback to _subscribers array
    this._subscribers.add(callback);
    // TODO: Immediately call callback with current value (matches Preact behavior)
    try {
      callback(this._value);
      return () => this._subscribers.delete(callback);
    } catch (e) {
      console.log(e);
      return () => null;
    }
    // TODO: Return function that removes callback from _subscribers array
  }

  /**
   * Get current value without subscribing (peek)
   * This will be important later for avoiding unwanted dependencies
   */
  peek(): T {
    // TODO: Return _value directly without any side effects
    return this.value;
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    // TODO: Convert _value to string
    return String(this.value);
  }

  /**
   * JSON serialization
   */
  toJSON(): T {
    // TODO: Return _value for JSON.stringify
    return this._value;
  }

  /**
   * Value coercion for arithmetic operations
   */
  valueOf(): T {
    // TODO: Return _value for primitive coercion
    return this._value;
  }
}

/**
 * Factory function to create signals (matches Preact API)
 */
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T = undefined>(): Signal<T | undefined>;
export function signal<T>(initialValue?: T) {
  // TODO: Return new Signal instance with initialValue
  return new Signal(initialValue);
}

/**
 * Demo function to test basic signal functionality
 * Call this to verify your implementation works correctly
 */
export function demonstrateBasicSignal(): void {
  console.log("=== Phase 1: Basic Signal Demo ===");

  // Test cases to verify:
  // 1. Basic value storage and access
  const s1 = signal(1);
  // 2. Change notification to subscribers
  const unsubscribe = s1.subscribe((v) => console.log(v)); // should print 1
  s1.value = 2;
  // 2 should be printed
  // 3. No notification when value doesn't change
  s1.value = 2;
  // nothing should be printed
  // 4. Unsubscription works correctly
  unsubscribe();
  s1.value = 3;
  // nothing should be printed
  // 5. Multiple subscribers all get notified
  s1.subscribe((v) => console.log(v));
  s1.subscribe((v) => console.log(v));
  // 3 should be printed twice
  // 6. peek() works without side effects
  s1.peek();
  //   nothing should be printed
  // 7. toString(), toJSON(), valueOf() work correctly
  console.log(s1.toString()); // 3 should be printed
  console.log(s1.toJSON()); // 3 should be printed
  console.log(s1.valueOf()); // 3 should be printed

  // TODO: Implement test cases here to verify your Signal class
  // This will help you validate that your implementation is correct
}

demonstrateBasicSignal();
