/**
 * Phase 4: Linked Lists - Memory-Efficient Dependency Tracking
 *
 * Learning Goals:
 * - Understand memory-efficient data structures in reactive systems
 * - Learn bidirectional linked lists for signal-effect relationships
 * - Discover optimization techniques for dependency management
 * - Explore how Preact Signals minimizes memory overhead
 *
 * Key Insights from Preact Signals:
 * 1. Sets/Arrays for dependencies create memory overhead and GC pressure
 * 2. Linked lists provide O(1) insertion/removal and better memory locality
 * 3. Bidirectional links allow efficient traversal in both directions
 * 4. Intrusive data structures minimize object allocations
 * 5. Node recycling reduces garbage collection pressure
 *
 * The Magic: How do linked lists improve performance?
 * Answer: Instead of storing arrays/sets of dependencies, each signal/effect
 * becomes a node in a linked list, eliminating the need for separate collection objects.
 */

// Import previous phase implementations
import {
  ComputedSignal,
  computed,
  demonstrateComputed,
  ComputedState,
} from "./03-computed.ts";
import {
  ReactiveSignal,
  Effect,
  effect,
  evalContext,
  getContext,
  setContext,
  IEffect,
} from "./02-effects.ts";

// TODO: Define linked list node interfaces for memory-efficient tracking

/**
 * Node representing a dependency relationship from Signal -> Effect
 * This creates a linked list of effects that depend on a signal
 */
interface SignalNode {
  // TODO: Add effect property that this node points to (type: IEffect)
  effect: IEffect;
  // TODO: Add nextDep property for next effect in the dependency chain (type: SignalNode | undefined)
  nextDep: SignalNode | undefined;
  // TODO: Add prevDep property for previous effect in the dependency chain (type: SignalNode | undefined)
  prevDep: SignalNode | undefined;
  // TODO: Add signal property pointing back to the signal (type: LinkedReactiveSignal<any>)
  signal: LinkedReactiveSignal<any>;
}

/**
 * Node representing a dependency relationship from Effect -> Signal
 * This creates a linked list of signals that an effect depends on
 */
interface EffectNode {
  // TODO: Add signal property that this node points to (type: LinkedReactiveSignal<any>)
  signal: LinkedReactiveSignal<any>;
  // TODO: Add nextSig property for next signal in the dependency chain (type: EffectNode | undefined)
  nextSig: EffectNode | undefined;
  // TODO: Add prevSig property for previous signal in the dependency chain (type: EffectNode | undefined)
  prevSig: EffectNode | undefined;
  // TODO: Add effect property pointing back to the effect (type: LinkedEffect)
  effect: LinkedEffect;
  unSub?: () => void;
}

// TODO: Create LinkedReactiveSignal that uses linked lists instead of Sets
export class LinkedReactiveSignal<T = any> extends ReactiveSignal<T> {
  // TODO: Replace _dependentEffects Set with linked list head
  // TODO: Add _depsHead property (type: SignalNode | undefined) - head of effects that depend on this signal
  protected _depsHead?: SignalNode;

  constructor(initialValue: T) {
    // TODO: Call parent constructor
    super(initialValue);
    // TODO: Initialize _depsHead as undefined
    this._depsHead = undefined;
  }

  // TODO: Override subscribeEffect to use linked list insertion
  subscribeEffect(effect: IEffect): () => void {
    // TODO: Create new SignalNode
    const signal = this;
    // TODO: Set node.effect = effect
    // TODO: Set node.signal = this
    const node: SignalNode = {
      effect,
      signal,
      prevDep: undefined,
      nextDep: this._depsHead,
    };

    // TODO: Insert at head of linked list:
    //   - If _depsHead exists, set its prevDep to new node
    //   - Set new node's nextDep to current _depsHead
    // if (this._depsHead) {
    //   this._depsHead.nextDep = node;
    // }
    //   - Set _depsHead to new node
    this._depsHead = node;
    // TODO: Return unsubscribe function that removes this node from the linked list:
    return () => {
      if (node.prevDep) {
        //   - If node has prevDep, set prevDep.nextDep = node.nextDep
        node.prevDep.nextDep = node.nextDep;
      }

      if (node.nextDep) {
        //   - If node has nextDep, set nextDep.prevDep = node.prevDep
        node.nextDep.prevDep = node.prevDep;
      }

      //   - If node is head (_depsHead), set _depsHead = node.nextDep
      if (this._depsHead === node) {
        this._depsHead = node.nextDep;
      }
    };
  }

  get value() {
    return super.value;
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

    this._notifyDependentEffects();
  }

  // TODO: Override _notifyDependentEffects to traverse linked list
  protected _notifyDependentEffects() {
    // TODO: Start from _depsHead and traverse the linked list
    let current = this._depsHead;
    while (current) {
      // TODO: For each SignalNode, call node.effect.onDependencyChange()
      current.effect.onDependencyChange();
      // TODO: Move to node.nextDep until reaching end (undefined)
      current = current.nextDep;
    }
  }
}

// TODO: Create LinkedEffect that uses linked lists for dependency tracking
export class LinkedEffect implements IEffect {
  // TODO: Add private _fn property (type: Function)
  private _fn?: Function;
  // TODO: Add private _cleanup property (type: Function | undefined)
  private _cleanup: Function | undefined;
  // TODO: Add private _isDisposed property (type: boolean)
  private _isDisposed: boolean;

  // TODO: Replace _unsubscribeFunctions Set with linked list
  // TODO: Add _sigsHead property (type: EffectNode | undefined) - head of signals this effect depends on
  private _sigsHead: EffectNode | undefined;

  constructor(fn: () => void | (() => void)) {
    // TODO: Initialize _fn, _cleanup, _isDisposed
    this._fn = fn;
    this._cleanup = undefined;
    this._isDisposed = false;
    // TODO: Initialize _sigsHead as undefined
    this._sigsHead = undefined;
    // TODO: Call _run() to execute immediately
    this._run();
  }

  // TODO: Implement addDependency using linked list insertion
  addDependency(signal: LinkedReactiveSignal<any>): void {
    // TODO: Create new EffectNode
    const effect = this;
    const node: EffectNode = {
      // TODO: Set node.signal = signal
      signal,
      // TODO: Set node.effect = this
      effect,
      // TODO: Insert at head of signals linked list:
      nextSig: undefined,
      prevSig: undefined,
      unSub: undefined,
    };
    if (this._sigsHead) {
      //   - If _sigsHead exists, set its prevSig to new node
      this._sigsHead.prevSig = node;
    }

    //   - Set new node's nextSig to current _sigsHead
    node.nextSig = this._sigsHead;
    //   - Set _sigsHead to new node
    this._sigsHead = node;
    // TODO: Subscribe to the signal (this will create the reverse SignalNode)
    const unsub = signal.subscribeEffect(this);
    // TODO: Store unsubscribe function in the node for cleanup
    node.unSub = unsub;
  }

  // TODO: Implement _run method with linked list cleanup
  private _run(): void {
    // TODO: Check if disposed
    if (this._isDisposed) {
      return;
    }

    // TODO: Call cleanup function if exists
    if (typeof this._cleanup === "function") {
      this._cleanup?.();
    }
    // TODO: Unsubscribe from all dependencies by traversing _sigsHead linked list
    this._clearDependencies();
    // TODO: Set up new evaluation context
    const prevCtx = getContext();
    setContext(this);
    try {
      // TODO: Execute _fn and handle cleanup/errors
      this._cleanup = this._fn?.();
    } catch (error) {
      console.log(error);
    } finally {
      // TODO: Restore evaluation context
      setContext(prevCtx);
    }
  }

  // TODO: Implement onDependencyChange
  onDependencyChange(): void {
    // TODO: Check if disposed
    if (this._isDisposed) return;
    // TODO: Call _run()
    this._run();
  }

  // TODO: Implement dispose with linked list cleanup
  dispose(): void {
    // TODO: Set _isDisposed = true
    this._isDisposed = true;
    // TODO: Call cleanup function
    if (typeof this._cleanup === "function") {
      this._cleanup?.();
    }
    // TODO: Traverse _sigsHead and unsubscribe from all signals
    // TODO: Clear _sigsHead
    this._clearDependencies();
    // TODO: Clear _fn and _cleanup
    this._fn = undefined;
    this._cleanup = undefined;
  }

  // TODO: Implement _clearDependencies helper
  private _clearDependencies(): void {
    // TODO: Traverse _sigsHead linked list
    let current = this._sigsHead;
    // TODO: For each EffectNode, call stored unsubscribe function
    while (current) {
      current.unSub?.();
      current = current.prevSig;
    }
    // TODO: Set _sigsHead = undefined
    this._sigsHead = undefined;
  }
}

// TODO: Create LinkedComputedSignal that combines linked lists with computed functionality
export class LinkedComputedSignal<T>
  extends LinkedReactiveSignal<T>
  implements IEffect
{
  // TODO: Add all computed signal properties from Phase 3
  private _computeFn: () => T;
  private _state: ComputedState;
  private _error: any;
  private _isComputed = true;
  private _cleanup: Function | undefined;
  // TODO: Add linked list properties for tracking dependencies as an effect
  private _isDisposed = false;
  private _sigsHead: EffectNode | undefined = undefined;

  constructor(computeFn: () => T) {
    // TODO: Initialize like ComputedSignal but with linked list base
    super(undefined as any);
    this._computeFn = computeFn;
    this._state = ComputedState.STALE;
    this._error = undefined;
  }

  addDependency(signal: LinkedReactiveSignal<any>): void {
    // TODO: Create new EffectNode
    const effect = this;
    const node: EffectNode = {
      // TODO: Set node.signal = signal
      signal,
      // TODO: Set node.effect = this
      effect,
      // TODO: Insert at head of signals linked list:
      nextSig: undefined,
      prevSig: undefined,
      unSub: undefined,
    };

    if (this._sigsHead) {
      //   - If _sigsHead exists, set its prevSig to new node
      this._sigsHead.prevSig = node;
    }

    //   - Set new node's nextSig to current _sigsHead
    node.nextSig = this._sigsHead;
    //   - Set _sigsHead to new node
    this._sigsHead = node;
    // TODO: Subscribe to the signal (this will create the reverse SignalNode)
    const unsub = signal.subscribeEffect(this);
    // TODO: Store unsubscribe function in the node for cleanup
    node.unSub = unsub;
  }

  get value() {
    if (this._state === ComputedState.COMPUTING) {
      // 2. Check if state is COMPUTING - if so, throw error for circular dependency
      throw new Error("Circular dependency");
    }

    if (this._state === ComputedState.ERROR) {
      // 3. Check if state is ERROR - if so, re-throw the stored error
      throw this._error;
    }

    if (evalContext) {
      evalContext.addDependency(this);
    }

    if (this._state === ComputedState.FRESH) {
      return this._value;
    }

    return this._recompute();
  }

  set value(_: any) {
    throw new Error(
      "Cannot set value of computed signal directly. Computed signals are read-only."
    );
  }

  isStale() {
    return this._state === ComputedState.STALE;
  }

  isFresh() {
    return this._state === ComputedState.FRESH;
  }

  private _recompute() {
    this._state = ComputedState.COMPUTING;
    this._error = undefined;
    const prevContext = getContext();
    setContext(this);
    this._clearDependencies();

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

  onDependencyChange(): void {
    // TODO: Check if disposed
    if (this._isDisposed) return;
    this._state = ComputedState.STALE;
    this._notifyDependentEffects();
  }

  dispose(): void {
    // TODO: Set _isDisposed = true
    this._isDisposed = true;
    // TODO: Call cleanup function
    this?._cleanup?.();
    // TODO: Traverse _sigsHead and unsubscribe from all signals
    // TODO: Clear _sigsHead
    this._clearDependencies();
    // TODO: Clear _fn and _cleanup
    this._cleanup = undefined;
  }

  // TODO: Implement all methods from ComputedSignal
  // TODO: Use LinkedReactiveSignal base for efficient dependent effect tracking
  // TODO: Use LinkedEffect-style dependency tracking for input signals

  private _clearDependencies(): void {
    // TODO: Traverse _sigsHead linked list
    let current = this._sigsHead;
    // TODO: For each EffectNode, call stored unsubscribe function
    while (current) {
      current.unSub?.();
      current = current.prevSig;
    }
    this._sigsHead = undefined;
    // TODO: Set _sigsHead = undefined
  }
}

/**
 * Factory functions using linked list implementations
 */
export function linkedReactiveSignal<T>(
  initialValue: T
): LinkedReactiveSignal<T>;
export function linkedReactiveSignal<T = undefined>(): LinkedReactiveSignal<
  T | undefined
>;
export function linkedReactiveSignal<T>(initialValue?: T) {
  return new LinkedReactiveSignal(initialValue);
}

export function linkedEffect(fn: () => void | (() => void)): () => void {
  const e = new LinkedEffect(fn);

  return () => e.dispose();
}

export function linkedComputed<T>(computeFn: () => T): LinkedComputedSignal<T> {
  // TODO: Return new LinkedComputedSignal
  return new LinkedComputedSignal(computeFn);
}

/**
 * Performance comparison demo
 */
export function demonstrateLinkedLists(): void {
  console.log("=== Phase 4: Linked Lists Demo ===");

  // TODO: Create performance comparison between Set-based and linked list implementations

  // TODO: Test cases to verify:
  // 1. Memory efficiency - create many signals/effects and measure overhead
  // 2. Performance - benchmark dependency addition/removal
  // 3. Functionality - ensure all Phase 3 features still work
  // 4. Cleanup efficiency - test proper node removal and GC

  console.log("Phase 4 Complete!");

  console.log("🔍 Key Discoveries:");
  console.log("• Linked lists eliminate collection object overhead");
  console.log("• O(1) insertion/removal for dependencies");
  console.log("• Better memory locality and cache performance");
  console.log("• Reduced garbage collection pressure");
  console.log("• Bidirectional traversal enables efficient algorithms");
}

// Export linked list node interfaces for advanced usage
export type { SignalNode, EffectNode };

// Run demonstration when file is executed directly
// demonstrateLinkedLists();
