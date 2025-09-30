/**
 * Unit Tests for Phase 3: Computed Signals - Lazy Evaluation and Derived State
 *
 * Test Categories:
 * - ComputedSignal creation and basic functionality
 * - Lazy evaluation behavior
 * - Caching and invalidation
 * - Dependency tracking and fine-grained reactivity
 * - Computed signal chains (computed depending on computed)
 * - Integration with effects
 * - Error handling and recovery
 * - Cycle detection
 * - Performance characteristics
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ComputedSignal,
  computed,
  ComputedState,
  demonstrateComputed,
} from "./03-computed.ts";
import {
  reactiveSignal,
  effect,
  Effect,
  ReactiveSignal,
} from "./02-effects.ts";

describe("Phase 3: Computed Signals", () => {
  describe("ComputedSignal Class", () => {
    let source: ReactiveSignal<number>;
    let computeFn: ReturnType<typeof vi.fn>;
    let computedSig: ComputedSignal<number>;

    beforeEach(() => {
      // TODO: Set up basic computed signal for testing
      source = reactiveSignal<number>(42);
      computeFn = vi.fn().mockImplementation(() => source.value + 2);
      computedSig = computed(computeFn);
    });

    it("should create computed signal with computation function", () => {
      expect(computedSig.value).toEqual(44);
    });

    it("should extend ReactiveSignal", () => {
      expect(computedSig).toBeInstanceOf(ReactiveSignal);
    });

    it("should be read-only (throw error on direct assignment)", () => {
      expect(() => (computedSig.value = 12)).toThrow();
    });

    it("should initially be in STALE state", () => {
      expect(computedSig.isStale()).toBeTruthy();
    });
  });

  describe("Lazy Evaluation", () => {
    let source: ReactiveSignal<string>;
    let computeFn: ReturnType<typeof vi.fn>;
    let computedSig: ComputedSignal<string>;

    beforeEach(() => {
      source = reactiveSignal<string>("hello");
      computeFn = vi.fn().mockImplementation(() => source.value + " world");
      computedSig = computed(computeFn);
    });

    it("should not compute until value is accessed", () => {
      expect((computedSig as any)._value).toEqual(undefined);
    });

    it("should compute when value is first accessed", () => {
      expect(computedSig.value).toEqual("hello world");
    });

    it("should return computed value correctly", () => {
      expect(computedSig.value).toEqual("hello world");
      expect(computedSig.value).toEqual("hello world");
    });

    it("should cache result after first computation", () => {
      expect(computedSig.value).toEqual("hello world");
      expect((computedSig as any)._value).toEqual("hello world");
    });

    it("should use cached value for multiple accesses", () => {
      // First access should compute
      expect(computedSig.value).toEqual("hello world");
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Subsequent accesses should use cache
      expect(computedSig.value).toEqual("hello world");
      expect(computedSig.value).toEqual("hello world");
      expect(computedSig.value).toEqual("hello world");
      expect(computeFn).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe("Invalidation and Recomputation", () => {
    let source: ReactiveSignal<string>;
    let computeFn: ReturnType<typeof vi.fn>;
    let computedSig: ComputedSignal<string>;

    beforeEach(() => {
      source = reactiveSignal<string>("hello");
      computeFn = vi.fn().mockImplementation(() => source.value + " world");
      computedSig = computed(computeFn);
    });

    it("should invalidate when dependency changes", () => {
      computedSig.value; // Access to make it fresh first
      source.value = "foo";
      expect(computedSig.isStale()).toBeTruthy();
    });

    it("should recompute when accessed after invalidation", () => {
      source.value = "foo";
      expect(computedSig.value).toEqual("foo world");
    });

    it("should update cached value after recomputation", () => {
      source.value = "foo";
      computedSig.value;
      expect((computedSig as any)._value).toEqual("foo world");
    });

    it("should handle multiple dependency changes efficiently", () => {
      const rc1 = reactiveSignal("hi");
      const rc2 = reactiveSignal("hello");
      const comp = computed(() => rc1.value + rc2.value + " world");

      expect(comp.value).toEqual("hihello world");
      rc1.value = "foo";
      expect(comp.value).toEqual("foohello world");
      rc2.value = "bar";
      expect(comp.value).toEqual("foobar world");
    });

    it("should only recompute when actually accessed", () => {
      expect((computedSig as any)._value).toEqual(undefined);
      expect(computedSig.value).toEqual("hello world");
      expect((computedSig as any)._value).toEqual("hello world");
    });
  });

  describe("Dependency Tracking", () => {
    let source: ReactiveSignal<string>;
    let computeFn: ReturnType<typeof vi.fn>;
    let computedSig: ComputedSignal<string>;

    beforeEach(() => {
      source = reactiveSignal<string>("hello");
      computeFn = vi.fn().mockImplementation(() => source.value + " world");
      computedSig = computed(computeFn);
    });
    it("should track single dependency", () => {
      expect((computedSig as any)._value).toEqual(undefined);
      expect(computedSig.value).toEqual("hello world");
      source.value = "foo";
      expect(computedSig.value).toEqual("foo world");
    });

    it("should track multiple dependencies", () => {
      const source1 = reactiveSignal<string>("hello");
      const source2 = reactiveSignal<string>("world");
      const computedFn = vi
        .fn()
        .mockImplementation(() => `${source1.value} ${source2.value}`);
      const multiComputed = computed(computedFn);

      expect(multiComputed.value).toEqual("hello world");

      // Change first dependency
      source1.value = "hi";
      expect(multiComputed.value).toEqual("hi world");

      // Change second dependency
      source2.value = "universe";
      expect(multiComputed.value).toEqual("hi universe");
    });

    it("should update dependencies on recomputation", () => {
      const source1 = reactiveSignal<string>("hello");
      const source2 = reactiveSignal<string>("world");
      const toggle = reactiveSignal<boolean>(true);

      const computedFn = vi.fn().mockImplementation(() => {
        if (toggle.value as boolean) {
          return source1.value as string;
        } else {
          return source2.value as string;
        }
      });

      const conditionalComputed = computed(computedFn);

      // Initially should depend on toggle and source1
      expect(conditionalComputed.value).toEqual("hello");

      // Changing source2 should not affect it yet
      source2.value = "universe";
      expect(conditionalComputed.value).toEqual("hello"); // Still hello

      // Toggle to use source2
      toggle.value = false;
      expect(conditionalComputed.value).toEqual("universe");

      // Now changing source1 should not affect it
      source1.value = "hi";
      expect(conditionalComputed.value).toEqual("universe"); // Still universe
    });

    it("should handle conditional dependencies", () => {
      const condition = reactiveSignal<boolean>(true);
      const valueA = reactiveSignal<string>("A");
      const valueB = reactiveSignal<string>("B");

      const conditionalComputed = computed(() => {
        return condition.value ? valueA.value : valueB.value;
      });

      expect(conditionalComputed.value).toEqual("A");

      // Change unused dependency - should not trigger recomputation
      valueB.value = "B2";
      expect(conditionalComputed.value).toEqual("A");

      // Change used dependency - should trigger recomputation
      valueA.value = "A2";
      expect(conditionalComputed.value).toEqual("A2");

      // Switch condition
      condition.value = false;
      expect(conditionalComputed.value).toEqual("B2");
    });

    it("should unsubscribe from old dependencies", () => {
      const source1 = reactiveSignal<string>("hello");
      const source2 = reactiveSignal<string>("world");
      const toggle = reactiveSignal<boolean>(true);

      const conditionalComputed = computed(() => {
        return toggle.value ? source1.value : source2.value;
      });

      // Access to establish dependencies
      expect(conditionalComputed.value).toEqual("hello");

      // Check that source1 has the computed as a dependent
      expect((source1 as any)._dependentEffects.size).toBe(1);
      expect((source2 as any)._dependentEffects.size).toBe(0);

      // Switch to source2
      toggle.value = false;
      expect(conditionalComputed.value).toEqual("world");

      // Now source2 should have the dependent, source1 should not
      expect((source1 as any)._dependentEffects.size).toBe(0);
      expect((source2 as any)._dependentEffects.size).toBe(1);
    });
  });

  describe("Fine-Grained Reactivity", () => {
    let firstName: ReactiveSignal<string>;
    let lastName: ReactiveSignal<string>;
    let age: ReactiveSignal<number>;
    let fullName: ComputedSignal<string>;

    beforeEach(() => {
      firstName = reactiveSignal<string>("John");
      lastName = reactiveSignal<string>("Doe");
      age = reactiveSignal<number>(25);

      fullName = computed(() => `${firstName.value} ${lastName.value}`);
    });

    it("should only recompute when relevant dependencies change", () => {
      const greetingFn = vi
        .fn()
        .mockImplementation(() => `Hello, ${fullName.value}!`);
      const testGreeting = computed(greetingFn);

      // Initial access
      expect(testGreeting.value).toEqual("Hello, John Doe!");
      expect(greetingFn).toHaveBeenCalledTimes(1);

      // Change irrelevant signal
      age.value = 26;
      expect(testGreeting.value).toEqual("Hello, John Doe!");
      expect(greetingFn).toHaveBeenCalledTimes(1); // Should not recompute

      // Change relevant signal
      firstName.value = "Jane";
      expect(fullName.value).toEqual("Jane Doe");
      expect(testGreeting.value).toEqual("Hello, Jane Doe!");
      expect(greetingFn).toHaveBeenCalledTimes(2); // Should recompute
    });

    it("should propagate changes through dependency chains", () => {
      const fullNameFn = vi
        .fn()
        .mockImplementation(() => `${firstName.value} ${lastName.value}`);
      const greetingFn = vi
        .fn()
        .mockImplementation(() => `Hello, ${fullName.value}!`);

      const chainedFullName = computed(fullNameFn);
      const chainedGreeting = computed(greetingFn);

      // Initial access
      expect(chainedFullName.value).toEqual("John Doe");
      expect(chainedGreeting.value).toEqual("Hello, John Doe!");

      // Change should propagate through chain
      firstName.value = "Alice";
      expect(chainedFullName.value).toEqual("Alice Doe");
      expect(chainedGreeting.value).toEqual("Hello, Alice Doe!");

      // Both functions should have been called twice (initial + change)
      expect(fullNameFn).toHaveBeenCalledTimes(2);
      expect(greetingFn).toHaveBeenCalledTimes(2);
    });

    it("should minimize unnecessary computations", () => {
      const expensiveCompute = vi.fn().mockImplementation((x: number) => {
        // Simulate expensive computation
        return (x as number) * 2;
      });

      const source = reactiveSignal<number>(5);
      const expensive = computed(() => expensiveCompute(source.value));
      const dependent = computed(() => expensive.value + 1);

      expect(dependent.value).toBe(11); // 5 * 2 + 1
      expect(expensiveCompute).toHaveBeenCalledTimes(1);

      // Access dependent again - should use cached expensive value
      expect(dependent.value).toBe(11);
      expect(expensiveCompute).toHaveBeenCalledTimes(1);

      // Change source - both should recompute
      source.value = 10;
      expect(dependent.value).toBe(21); // 10 * 2 + 1
      expect(expensiveCompute).toHaveBeenCalledTimes(2);
    });

    it("should handle diamond dependency patterns", () => {
      const source = reactiveSignal<number>(10);
      const left = computed(() => source.value + 1); // 11
      const right = computed(() => source.value * 2); // 20
      const bottom = computed(() => left.value + right.value); // 31

      expect(bottom.value).toBe(31);

      // Change source should propagate to both paths
      source.value = 5;
      expect(left.value).toBe(6);
      expect(right.value).toBe(10);
      expect(bottom.value).toBe(16);
    });
  });

  describe("Computed Signal Chains", () => {
    let source: ReactiveSignal<number>;
    let firstLevel: ComputedSignal<number>;
    let secondLevel: ComputedSignal<number>;
    let thirdLevel: ComputedSignal<number>;

    beforeEach(() => {
      source = reactiveSignal<number>(10);
      firstLevel = computed(() => (source.value as number) * 2);
      secondLevel = computed(() => (firstLevel.value as number) + 5);
      thirdLevel = computed(() => (secondLevel.value as number) / 5);
    });

    it("should support computed signals depending on other computed signals", () => {
      expect(firstLevel.value).toBe(20);
      expect(secondLevel.value).toBe(25);
      expect(thirdLevel.value).toBe(5);
    });

    it("should propagate changes through entire chain", () => {
      source.value = 5;

      expect(firstLevel.value).toBe(10);
      expect(secondLevel.value).toBe(15);
      expect(thirdLevel.value).toBe(3);
    });

    it("should maintain correct evaluation order", () => {
      const computeOrder: string[] = [];

      const first = computed(() => {
        computeOrder.push("first");
        return (source.value as number) * 2;
      });

      const second = computed(() => {
        computeOrder.push("second");
        return (first.value as number) + 1;
      });

      const third = computed(() => {
        computeOrder.push("third");
        return (second.value as number) * 3;
      });

      // Access the final computed
      expect(third.value).toBe(63); // ((10 * 2) + 1) * 3
      expect(computeOrder).toEqual(["third", "second", "first"]);
    });

    it("should cache at each level of the chain", () => {
      const firstFn = vi.fn().mockImplementation(() => source.value * 2);
      const secondFn = vi.fn().mockImplementation(() => firstLevel.value + 5);

      const cachedFirst = computed(firstFn);
      const cachedSecond = computed(secondFn);

      // First access
      expect(cachedFirst.value).toBe(20);
      expect(cachedSecond.value).toBe(25);
      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(secondFn).toHaveBeenCalledTimes(1);

      // Second access - should use cache
      expect(cachedSecond.value).toBe(25);
      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(secondFn).toHaveBeenCalledTimes(1);
    });

    it("should handle branching dependency trees", () => {
      const root = reactiveSignal<number>(10);

      const branchA = computed(() => root.value + 1); // 11
      const branchB = computed(() => root.value * 2); // 20

      const leafA1 = computed(() => branchA.value + 10); // 21
      const leafA2 = computed(() => branchA.value * 10); // 110
      const leafB1 = computed(() => branchB.value - 5); // 15

      const final = computed(() => leafA1.value + leafA2.value + leafB1.value); // 21 + 110 + 15

      expect(final.value).toBe(146); // (11+10) + (11*10) + (20-5) = 21 + 110 + 15

      root.value = 5;
      expect(final.value).toBe(81); // (6+10) + (6*10) + (10-5) = 16 + 60 + 5
    });
  });

  describe("Integration with Effects", () => {
    let source: ReactiveSignal<number>;
    let computedSig: ComputedSignal<string>;
    let effectFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      source = reactiveSignal<number>(10);
      computedSig = computed(() => `Value: ${source.value}`);
      effectFn = vi.fn();
    });

    it("should trigger effects when computed value changes", () => {
      effect(() => {
        effectFn(computedSig.value);
      });

      expect(effectFn).toHaveBeenCalledWith("Value: 10");
      expect(effectFn).toHaveBeenCalledTimes(2);

      source.value = 20;
      expect(effectFn).toHaveBeenCalledWith("Value: 20");
      expect(effectFn).toHaveBeenCalledTimes(4);
    });

    it("should not trigger effects when computed value stays same", () => {
      const alwaysSame = computed(() => "constant");

      effect(() => {
        effectFn(alwaysSame.value);
      });

      expect(effectFn).toHaveBeenCalledTimes(2);

      // Change source but computed returns same value
      source.value = 20;
      source.value = 30;

      expect(effectFn).toHaveBeenCalledTimes(2); // Should not trigger again
    });

    it("should work with effects that depend on multiple computed signals", () => {
      const doubled = computed(() => source.value * 2);
      const tripled = computed(() => source.value * 3);

      effect(() => {
        effectFn(doubled.value + tripled.value);
      });

      expect(effectFn).toHaveBeenCalledWith(50); // (10*2) + (10*3)
      expect(effectFn).toHaveBeenCalledTimes(3);

      source.value = 5;
      expect(effectFn).toHaveBeenCalledWith(25); // (5*2) + (5*3)
      expect(effectFn).toHaveBeenCalledTimes(7);
    });

    it("should handle effect cleanup with computed signals", () => {
      const dispose = effect(() => {
        effectFn(computedSig.value);
      });

      expect(effectFn).toHaveBeenCalledTimes(2);

      dispose();

      source.value = 99;
      expect(effectFn).toHaveBeenCalledTimes(2); // Should not trigger after disposal
    });
  });

  describe("Error Handling", () => {
    let source: ReactiveSignal<number>;
    let errorComputeFn: ReturnType<typeof vi.fn>;
    let errorComputedSig: ComputedSignal<any>;

    beforeEach(() => {
      source = reactiveSignal<number>(10);
      errorComputeFn = vi.fn().mockImplementation(() => {
        if ((source.value as number) < 0) {
          throw new Error("Value cannot be negative");
        }
        return (source.value as number) * 2;
      });
      errorComputedSig = computed(errorComputeFn);
    });

    it("should throw error when computation function throws", () => {
      expect(errorComputedSig.value).toBe(20);

      source.value = -5;
      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");
    });

    it("should enter ERROR state when computation throws", () => {
      expect(errorComputedSig.value).toBe(20);

      source.value = -5;
      try {
        errorComputedSig.value;
      } catch (e) {
        // Expected error
      }

      expect((errorComputedSig as any)._state).toBe(3); // ComputedState.ERROR
    });

    it("should re-throw stored error on subsequent accesses", () => {
      source.value = -5;

      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");
      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");
      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");

      // Should only compute once (throw once, then re-throw stored error)
      expect(errorComputeFn).toHaveBeenCalledTimes(1);
    });

    it("should recover from error state when dependencies change", () => {
      source.value = -5;
      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");

      // Fix the source value
      source.value = 15;
      expect(errorComputedSig.value).toBe(30); // Should recover and compute normally

      expect(errorComputeFn).toHaveBeenCalledTimes(2); // Error attempt + recovery
    });

    it("should handle errors in dependency chain", () => {
      const errorInChain = computed(() => {
        if ((source.value as number) < 0) {
          throw new Error("Chain error");
        }
        return (source.value as number) + 1;
      });

      const dependent = computed(() => (errorInChain.value as number) * 2);

      expect(dependent.value).toBe(22); // (10 + 1) * 2

      source.value = -1;
      expect(() => dependent.value).toThrow("Chain error");
    });

    it("should not break other computed signals when one errors", () => {
      const goodComputed = computed(() => (source.value as number) + 100);

      expect(errorComputedSig.value).toBe(20);
      expect(goodComputed.value).toBe(110);

      source.value = -5;

      expect(() => errorComputedSig.value).toThrow("Value cannot be negative");
      expect(goodComputed.value).toBe(95); // Should still work fine
    });
  });

  describe("Cycle Detection", () => {
    it("should detect simple cycles", () => {
      // Create a computed that tries to read itself
      let selfReferencing: ComputedSignal<number>;
      selfReferencing = computed((): number => {
        return selfReferencing.value + 1; // Direct self-reference
      });

      expect(() => selfReferencing.value).toThrow("Circular dependency");
    });

    it("should detect complex cycles", () => {
      // Create an indirect cycle: A -> B -> C -> A
      let computedA: ComputedSignal<number>;
      let computedB: ComputedSignal<number>;
      let computedC: ComputedSignal<number>;

      computedA = computed((): number => computedC.value + 1);
      computedB = computed((): number => computedA.value + 1);
      computedC = computed((): number => computedB.value + 1);

      expect(() => computedA.value).toThrow("Circular dependency");
      expect(() => computedB.value).toThrow("Circular dependency");
      expect(() => computedC.value).toThrow("Circular dependency");
    });

    it("should throw appropriate error for cycles", () => {
      let cyclic: ComputedSignal<number>;
      cyclic = computed((): number => cyclic.value);

      let error: Error | null = null;
      try {
        cyclic.value;
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Circular dependency");
    });

    it("should enter COMPUTING state during evaluation", () => {
      const source = reactiveSignal<number>(5);
      let stateObserved: number | null = null;

      const testComputed = computed(() => {
        // Check if we can observe the COMPUTING state
        if ((testComputed as any)._state === 2) {
          // COMPUTING = 2
          stateObserved = 2;
        }
        return source.value * 2;
      });

      testComputed.value;

      // The state should have been COMPUTING during computation
      expect(stateObserved).toBe(2);
    });

    it("should handle cycles in mixed computed/effect scenarios", () => {
      const source = reactiveSignal<number>(1);

      let problematicComputed: ComputedSignal<number>;
      problematicComputed = computed((): number => {
        // This creates a direct cycle
        return problematicComputed.value + source.value;
      });

      // This should throw immediately when accessing the computed
      expect(() => {
        problematicComputed.value;
      }).toThrow("Circular dependency");
    });
  });

  describe("Performance Characteristics", () => {
    it("should avoid unnecessary recomputations", () => {
      const source = reactiveSignal<number>(1);
      let computationCount = 0;

      const expensiveComputed = computed(() => {
        computationCount++;
        return source.value * 2;
      });

      // First access should compute
      expect(expensiveComputed.value).toBe(2);
      expect(computationCount).toBe(1);

      // Multiple accesses without changes should not recompute
      expensiveComputed.value;
      expensiveComputed.value;
      expensiveComputed.value;
      expect(computationCount).toBe(1);

      // Setting same value should not trigger recomputation
      source.value = 1;
      expensiveComputed.value;
      expect(computationCount).toBe(1);

      // Only actual changes trigger recomputation
      source.value = 2;
      expensiveComputed.value;
      expect(computationCount).toBe(2);
    });

    it("should handle large dependency graphs efficiently", () => {
      // Create a diamond dependency graph: many sources -> one computed
      const sources = Array.from({ length: 100 }, (_, i) =>
        reactiveSignal<number>(i)
      );
      let computationCount = 0;

      const aggregated = computed(() => {
        computationCount++;
        return sources.reduce((sum, signal) => sum + signal.value, 0);
      });

      // Should compute once on first access
      const result = aggregated.value;
      expect(result).toBe(4950); // Sum of 0..99
      expect(computationCount).toBe(1);

      // Changing one source should recompute only once
      sources[0].value = 100;
      const newResult = aggregated.value;
      expect(newResult).toBe(5050); // 4950 + 100
      expect(computationCount).toBe(2);
    });

    it("should cache results effectively", () => {
      const source = reactiveSignal<string>("test");
      let computationCount = 0;

      const cached = computed(() => {
        computationCount++;
        return source.value.toUpperCase();
      });

      // Multiple consumers should use cached result
      expect(cached.value).toBe("TEST");
      expect(cached.value).toBe("TEST");
      expect(cached.peek()).toBe("TEST");
      expect(computationCount).toBe(1);

      // Effects should also use cached results
      let effectResult = "";
      effect(() => {
        effectResult = cached.value;
      });

      expect(effectResult).toBe("TEST");
      expect(computationCount).toBe(1); // Still only computed once
    });

    it("should minimize memory usage", () => {
      // Test that dependencies are properly cleaned up
      const source = reactiveSignal<number>(1);
      const computed1 = computed(() => source.value * 2);

      // Access to establish dependency
      computed1.value;

      // Check that signal has dependency
      expect((source as any)._dependentEffects.size).toBe(1);

      // Test cleanup doesn't happen until all references are gone
      // (This is implicit - we can't easily test GC behavior)
      computed1.value; // Keep reference alive

      expect((source as any)._dependentEffects.size).toBe(1);
    });

    it("should handle rapid successive changes efficiently", () => {
      const source = reactiveSignal<number>(0);
      let computationCount = 0;

      const debounced = computed(() => {
        computationCount++;
        return source.value;
      });

      // Rapid changes before first access
      for (let i = 0; i < 10; i++) {
        source.value = i;
      }

      // Should only compute once when accessed
      expect(debounced.value).toBe(9);
      expect(computationCount).toBe(1);

      // Multiple rapid changes after being fresh
      debounced.value; // Make it fresh
      for (let i = 10; i < 20; i++) {
        source.value = i;
      }

      // Should compute once per access
      expect(debounced.value).toBe(19);
      expect(computationCount).toBe(2);
    });
  });

  describe("State Management", () => {
    let source: ReturnType<typeof reactiveSignal>;
    let computedSig: ComputedSignal<number>;

    beforeEach(() => {
      source = reactiveSignal<number>(10);
      computedSig = computed(() => source.value * 2);
    });

    it("should transition states correctly", () => {
      // Initially STALE (not computed yet)
      expect(computedSig.isStale()).toBe(true);
      expect(computedSig.isFresh()).toBe(false);

      // After computation, should be FRESH
      computedSig.value;
      expect(computedSig.isFresh()).toBe(true);
      expect(computedSig.isStale()).toBe(false);

      // After dependency change, should be STALE again
      source.value = 20;
      expect(computedSig.isStale()).toBe(true);
      expect(computedSig.isFresh()).toBe(false);

      // After recomputation, should be FRESH again
      computedSig.value;
      expect(computedSig.isFresh()).toBe(true);
      expect(computedSig.isStale()).toBe(false);
    });

    it("should report correct freshness status", () => {
      // Fresh after computation
      computedSig.value;
      expect(computedSig.isFresh()).toBe(true);

      // Not fresh after dependency change
      source.value = 15;
      expect(computedSig.isFresh()).toBe(false);

      // Fresh again after recomputation
      computedSig.value;
      expect(computedSig.isFresh()).toBe(true);
    });

    it("should report correct staleness status", () => {
      // Stale initially
      expect(computedSig.isStale()).toBe(true);

      // Not stale after computation
      computedSig.value;
      expect(computedSig.isStale()).toBe(false);

      // Stale again after dependency change
      source.value = 25;
      expect(computedSig.isStale()).toBe(true);

      // Not stale after recomputation
      computedSig.value;
      expect(computedSig.isStale()).toBe(false);
    });

    it("should support manual invalidation", () => {
      // Make it fresh
      computedSig.value;
      expect(computedSig.isFresh()).toBe(true);

      // Manual invalidation should make it stale
      computedSig.invalidate();
      expect(computedSig.isStale()).toBe(true);
      expect(computedSig.isFresh()).toBe(false);

      // Should recompute on next access
      let computationCount = 0;
      const testComputed = computed(() => {
        computationCount++;
        return source.value;
      });

      testComputed.value; // Make fresh
      expect(computationCount).toBe(1);

      testComputed.invalidate(); // Manually invalidate
      testComputed.value; // Should recompute
      expect(computationCount).toBe(2);
    });
  });

  describe("Peek Method", () => {
    let source: ReturnType<typeof reactiveSignal>;
    let computedSig: ComputedSignal<string>;

    beforeEach(() => {
      source = reactiveSignal<string>("test");
      computedSig = computed(() => source.value.toUpperCase());
    });

    it("should return value without creating dependencies", () => {
      let effectRunCount = 0;

      // Create an effect that peeks at the computed
      effect(() => {
        effectRunCount++;
        computedSig.peek(); // Using peek should not create dependency
      });

      expect(effectRunCount).toBe(1);

      // Changing the source should not re-run the effect since peek was used
      source.value = "changed";
      expect(effectRunCount).toBe(1); // Effect should not run again

      // But normal access would create dependency
      let normalEffectRunCount = 0;
      effect(() => {
        normalEffectRunCount++;
        computedSig.value; // Normal access creates dependency
      });

      expect(normalEffectRunCount).toBe(2);

      // This time the effect should re-run
      source.value = "changed again";
      expect(normalEffectRunCount).toBe(4);
    });

    it("should trigger computation if stale", () => {
      let computationCount = 0;
      const testComputed = computed(() => {
        computationCount++;
        return source.value.toLowerCase();
      });

      // First peek should compute
      expect(testComputed.peek()).toBe("test");
      expect(computationCount).toBe(1);

      // Make it stale
      source.value = "HELLO";

      // Peek on stale computed should recompute
      expect(testComputed.peek()).toBe("hello");
      expect(computationCount).toBe(2);
    });

    it("should return cached value if fresh", () => {
      let computationCount = 0;
      const testComputed = computed(() => {
        computationCount++;
        return source.value.repeat(2);
      });

      // Make it fresh
      expect(testComputed.value).toBe("testtest");
      expect(computationCount).toBe(1);

      // Peek should use cached value
      expect(testComputed.peek()).toBe("testtest");
      expect(computationCount).toBe(1); // No additional computation

      // Multiple peeks should continue using cache
      testComputed.peek();
      testComputed.peek();
      expect(computationCount).toBe(1);
    });
  });

  describe("Computed Factory Function", () => {
    it("should create ComputedSignal instance", () => {
      const source = reactiveSignal<number>(42);
      const computedSig = computed(() => source.value * 2);

      expect(computedSig).toBeInstanceOf(ComputedSignal);
      expect(computedSig.value).toBe(84);
    });

    it("should accept computation function", () => {
      const source = reactiveSignal<string>("hello");

      // Simple function
      const simple = computed(() => source.value.length);
      expect(simple.value).toBe(5);

      // Complex function
      const complex = computed(() => {
        const val = source.value;
        if (val.length > 3) {
          return val.toUpperCase();
        }
        return val.toLowerCase();
      });
      expect(complex.value).toBe("HELLO");

      // Function with multiple dependencies
      const count = reactiveSignal<number>(3);
      const combined = computed(() => `${source.value}-${count.value}`);
      expect(combined.value).toBe("hello-3");
    });

    it("should maintain type safety", () => {
      const numSignal = reactiveSignal<number>(10);
      const strSignal = reactiveSignal<string>("test");

      // Type should be inferred correctly
      const numComputed = computed(() => numSignal.value * 2);
      const strComputed = computed(() => strSignal.value.toUpperCase());
      const boolComputed = computed(() => numSignal.value > 5);

      // TypeScript should enforce correct types
      expect(typeof numComputed.value).toBe("number");
      expect(typeof strComputed.value).toBe("string");
      expect(typeof boolComputed.value).toBe("boolean");

      expect(numComputed.value).toBe(20);
      expect(strComputed.value).toBe("TEST");
      expect(boolComputed.value).toBe(true);
    });

    it("should create independent computed instances", () => {
      const source = reactiveSignal<number>(5);

      const computed1 = computed(() => source.value * 2);
      const computed2 = computed(() => source.value * 3);

      // Each should have its own computation
      expect(computed1.value).toBe(10);
      expect(computed2.value).toBe(15);

      // Each should track dependencies independently
      let comp1Runs = 0;
      let comp2Runs = 0;

      const tracked1 = computed(() => {
        comp1Runs++;
        return source.value + 1;
      });

      const tracked2 = computed(() => {
        comp2Runs++;
        return source.value + 2;
      });

      tracked1.value;
      tracked2.value;
      expect(comp1Runs).toBe(1);
      expect(comp2Runs).toBe(1);

      // Changing source should trigger both
      source.value = 10;
      tracked1.value;
      tracked2.value;
      expect(comp1Runs).toBe(2);
      expect(comp2Runs).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle computations that return undefined", () => {
      const source = reactiveSignal<boolean>(true);
      const undefinedComputed = computed(() => {
        return source.value ? undefined : "defined";
      });

      expect(undefinedComputed.value).toBeUndefined();

      source.value = false;
      expect(undefinedComputed.value).toBe("defined");

      source.value = true;
      expect(undefinedComputed.value).toBeUndefined();
    });

    it("should handle computations that return null", () => {
      const source = reactiveSignal<string>("test");
      const nullComputed = computed(() => {
        return source.value === "null" ? null : source.value;
      });

      expect(nullComputed.value).toBe("test");

      source.value = "null";
      expect(nullComputed.value).toBeNull();

      source.value = "back";
      expect(nullComputed.value).toBe("back");
    });

    it("should handle computations that return objects", () => {
      const source = reactiveSignal<number>(1);
      let computationCount = 0;

      const objComputed = computed(() => {
        computationCount++;
        return { id: source.value, name: `item-${source.value}` };
      });

      const obj1 = objComputed.value;
      expect(obj1).toEqual({ id: 1, name: "item-1" });
      expect(computationCount).toBe(1);

      // Same value should not recompute
      const obj2 = objComputed.value;
      expect(obj2).toBe(obj1); // Same reference
      expect(computationCount).toBe(1);

      // Different value should recompute and create new object
      source.value = 2;
      const obj3 = objComputed.value;
      expect(obj3).not.toBe(obj1); // Different reference
      expect(obj3).toEqual({ id: 2, name: "item-2" });
      expect(computationCount).toBe(2);
    });

    it("should handle very deep dependency chains", () => {
      const source = reactiveSignal<number>(1);

      // Create a chain of 50 computed signals
      let current: ReactiveSignal<number> | ComputedSignal<number> = source;
      const computedChain: ComputedSignal<number>[] = [];

      for (let i = 0; i < 50; i++) {
        const prevCurrent: ReactiveSignal<number> | ComputedSignal<number> = current; // Capture current in closure
        const nextComputed: ComputedSignal<number> = computed(() => prevCurrent.value + 1);
        computedChain.push(nextComputed);
        current = nextComputed;
      }

      // Final computed should have value 51 (1 + 50)
      const finalComputed = computedChain[computedChain.length - 1];
      expect(finalComputed.value).toBe(51);

      // Changing source should propagate through entire chain
      source.value = 10;
      expect(finalComputed.value).toBe(60); // 10 + 50
    });

    it("should handle computations that don't access any signals", () => {
      let computationCount = 0;
      const constantComputed = computed(() => {
        computationCount++;
        return 42; // No signal dependencies
      });

      expect(constantComputed.value).toBe(42);
      expect(computationCount).toBe(1);

      // Should still cache even with no dependencies
      expect(constantComputed.value).toBe(42);
      expect(computationCount).toBe(1);

      // Manual invalidation should work
      constantComputed.invalidate();
      expect(constantComputed.value).toBe(42);
      expect(computationCount).toBe(2);
    });

    it("should handle rapid creation and disposal", () => {
      // This tests memory management under stress
      const source = reactiveSignal<number>(0);

      for (let i = 0; i < 1000; i++) {
        const tempComputed = computed(() => source.value * i);
        tempComputed.value; // Access once to establish dependency

        // Computed should be eligible for GC after this iteration
        // We can't easily test GC, but we can check it doesn't crash
      }

      // Change source to trigger notifications to any remaining computeds
      source.value = 1;

      // Should not crash or cause memory issues
      expect(source.value).toBe(1);
    });
  });

  describe("Integration with Basic Signals", () => {
    it("should work with regular reactive signals", () => {
      const basicSignal = reactiveSignal<number>(10);
      const computedFromBasic = computed(() => basicSignal.value * 2);

      expect(computedFromBasic.value).toBe(20);

      basicSignal.value = 15;
      expect(computedFromBasic.value).toBe(30);

      // Should work in both directions
      const anotherBasic = reactiveSignal<string>("hello");
      const combinedComputed = computed(
        () => `${anotherBasic.value}-${basicSignal.value}`
      );

      expect(combinedComputed.value).toBe("hello-15");

      anotherBasic.value = "world";
      expect(combinedComputed.value).toBe("world-15");
    });

    it("should maintain all Signal interface methods", () => {
      const source = reactiveSignal<number>(42);
      const computedSig = computed(() => source.value * 2);

      // Make sure it has computed the value first
      computedSig.value;

      // toString()
      expect(computedSig.toString()).toBe("84");

      // toJSON()
      expect(computedSig.toJSON()).toBe(84);
      expect(JSON.stringify({ computed: computedSig })).toBe('{"computed":84}');

      // valueOf()
      expect(computedSig.valueOf()).toBe(84);
      expect(Number(computedSig)).toBe(84);

      // peek()
      expect(computedSig.peek()).toBe(84);
    });

    it("should support subscribe method through effects", () => {
      const source = reactiveSignal<string>("initial");
      const computedSig = computed(() => source.value.toUpperCase());

      let subscriptionValue = "";
      let subscriptionCallCount = 0;

      // Subscribe using effects
      const unsubscribe = effect(() => {
        subscriptionCallCount++;
        subscriptionValue = computedSig.value;
      });

      expect(subscriptionValue).toBe("INITIAL");
      expect(subscriptionCallCount).toBe(2);

      // Change should trigger subscription
      source.value = "changed";
      expect(subscriptionValue).toBe("CHANGED");
      expect(subscriptionCallCount).toBe(4);

      // Unsubscribe should stop notifications
      unsubscribe();
      source.value = "final";
      expect(subscriptionValue).toBe("CHANGED"); // Should not change
      expect(subscriptionCallCount).toBe(4);
    });

    it("should work with mixed signal types", () => {
      const regularSignal = reactiveSignal<number>(5);
      const computed1 = computed(() => regularSignal.value * 2);
      const computed2 = computed(() => computed1.value + 10);

      expect(computed2.value).toBe(20); // (5 * 2) + 10

      // All should update together
      regularSignal.value = 10;
      expect(computed1.value).toBe(20); // 10 * 2
      expect(computed2.value).toBe(30); // 20 + 10

      // Effects should work with mixed types
      let effectValue = "";
      effect(() => {
        effectValue = `regular: ${regularSignal.value}, computed1: ${computed1.value}, computed2: ${computed2.value}`;
      });

      expect(effectValue).toBe("regular: 10, computed1: 20, computed2: 30");

      regularSignal.value = 3;
      expect(effectValue).toBe("regular: 3, computed1: 6, computed2: 16");
    });
  });

  describe.skip("Integration with demonstrateComputed", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should complete demonstration without errors", () => {
      expect(() => demonstrateComputed()).not.toThrow();

      // Should have called console.log multiple times
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should demonstrate lazy evaluation", () => {
      // Run the demo and check for lazy evaluation messages
      demonstrateComputed();

      const logCalls = consoleSpy.mock.calls.flat();

      // Should show computation messages when values are accessed
      expect(
        logCalls.some((call: string) => call.includes("Computing fullName"))
      ).toBe(true);
      expect(
        logCalls.some((call: string) => call.includes("Computing greeting"))
      ).toBe(true);
    });

    it("should demonstrate caching behavior", () => {
      // This would be evident from the demo not recomputing unnecessarily
      demonstrateComputed();

      const logCalls = consoleSpy.mock.calls.flat();

      // Should demonstrate that computations only happen when needed
      expect(logCalls.some((call: string) => call.includes("💭"))).toBe(true);
    });

    it("should demonstrate fine-grained reactivity", () => {
      demonstrateComputed();

      const logCalls = consoleSpy.mock.calls.flat();

      // Should show effects reacting to computed changes
      expect(logCalls.some((call: string) => call.includes("🎬 Effect:"))).toBe(
        true
      );
    });

    it.skip("should show all key features working", () => {
      demonstrateComputed();

      const logCalls = consoleSpy.mock.calls.flat();
      const allLogs = logCalls.join(" ");

      // Should demonstrate key concepts
      expect(allLogs).toContain("lazy");
      expect(allLogs).toContain("cache");
      expect(allLogs).toContain("reactivity");
      expect(allLogs).toContain("chains");
      expect(allLogs).toContain("effects");
      expect(allLogs).toContain("error handling");

      // Should show phase completion
      expect(allLogs).toContain("Phase 3 Complete");
    });
  });
});
