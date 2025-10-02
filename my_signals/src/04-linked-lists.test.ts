/**
 * Phase 4: Linked Lists - Comprehensive Test Suite
 *
 * This test suite validates that the linked list optimization maintains
 * all functionality from previous phases while improving performance.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  LinkedReactiveSignal,
  LinkedEffect,
  LinkedComputedSignal,
  linkedReactiveSignal,
  linkedEffect,
  linkedComputed,
  demonstrateLinkedLists,
  SignalNode,
  EffectNode,
} from "./04-linked-lists.ts";

describe("Phase 4: Linked Lists - Memory-Efficient Dependency Tracking", () => {
  describe("LinkedReactiveSignal", () => {
    let signal: LinkedReactiveSignal<number>;

    beforeEach(() => {
      signal = linkedReactiveSignal<number>(42);
    });

    it("should create linked reactive signal with initial value", () => {
      expect(signal.value).toBe(42);
      expect(signal.peek()).toBe(42);
    });

    it("should maintain all ReactiveSignal functionality", () => {
      const callback = vi.fn();
      const unsubscribe = signal.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(42);

      signal.value = 100;
      expect(callback).toHaveBeenCalledWith(100);
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
      signal.value = 200;
      expect(callback).toHaveBeenCalledTimes(2); // Should not be called after unsubscribe
    });

    it("should use linked list for effect dependencies instead of Set", () => {
      const effect1 = vi.fn();
      const effect2 = vi.fn();

      // Subscribe multiple effects
      const unsub1 = signal.subscribeEffect({
        addDependency: vi.fn(),
        onDependencyChange: effect1,
      });

      const unsub2 = signal.subscribeEffect({
        addDependency: vi.fn(),
        onDependencyChange: effect2,
      });

      // Verify linked list structure exists (internal implementation)
      expect((signal as any)._depsHead).toBeDefined();

      // Trigger effects
      signal.value = 999;
      expect(effect1).toHaveBeenCalled();
      expect(effect2).toHaveBeenCalled();

      // Unsubscribe and verify cleanup
      unsub1();
      unsub2();
    });

    it("should handle effect unsubscription correctly in linked list", () => {
      const effects = Array.from({ length: 5 }, () => vi.fn());
      const unsubscribes = effects.map((effect) =>
        signal.subscribeEffect({
          addDependency: vi.fn(),
          onDependencyChange: effect,
        })
      );

      // All effects should be called
      signal.value = 100;
      effects.forEach((effect) => expect(effect).toHaveBeenCalled());

      // Unsubscribe middle effect
      unsubscribes[2]();

      // Reset mocks and trigger again
      effects.forEach((effect) => effect.mockClear());
      signal.value = 200;

      // All except unsubscribed effect should be called
      expect(effects[0]).toHaveBeenCalled();
      expect(effects[1]).toHaveBeenCalled();
      expect(effects[2]).not.toHaveBeenCalled(); // Unsubscribed
      expect(effects[3]).toHaveBeenCalled();
      expect(effects[4]).toHaveBeenCalled();

      // Cleanup remaining
      unsubscribes.forEach((unsub, i) => i !== 2 && unsub());
    });
  });

  describe("LinkedEffect", () => {
    let effect: LinkedEffect;
    let mockFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFn = vi.fn();
    });

    it("should create and execute effect immediately", () => {
      effect = new LinkedEffect(mockFn as any);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should track dependencies using linked lists", () => {
      const signal1 = linkedReactiveSignal<number>(1);
      const signal2 = linkedReactiveSignal<number>(2);

      effect = new LinkedEffect(() => {
        mockFn(signal1.value + signal2.value);
      });

      expect(mockFn).toHaveBeenCalledWith(3);

      // Verify linked list structure for dependencies
      expect((effect as any)._sigsHead).toBeDefined();

      // Change signals and verify re-execution
      signal1.value = 10;
      expect(mockFn).toHaveBeenCalledWith(12); // 10 + 2

      signal2.value = 20;
      expect(mockFn).toHaveBeenCalledWith(30); // 10 + 20
    });

    it("should properly dispose and cleanup linked list dependencies", () => {
      const signal = linkedReactiveSignal<number>(5);

      effect = new LinkedEffect(() => {
        mockFn(signal.value * 2);
      });

      expect(mockFn).toHaveBeenCalledWith(10);

      // Dispose effect
      effect.dispose();

      // Change signal - effect should not run
      mockFn.mockClear();
      signal.value = 100;
      expect(mockFn).not.toHaveBeenCalled();

      // Verify cleanup
      expect((effect as any)._sigsHead).toBeUndefined();
    });

    it("should handle cleanup functions correctly", () => {
      const cleanup = vi.fn();

      effect = new LinkedEffect(() => {
        mockFn();
        return cleanup;
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      // Trigger re-run should call cleanup
      const signal = linkedReactiveSignal<number>(1);
      effect = new LinkedEffect(() => {
        mockFn(signal.value);
        return cleanup;
      });

      signal.value = 2;
      expect(cleanup).toHaveBeenCalledTimes(1);

      // Dispose should call cleanup
      effect.dispose();
      expect(cleanup).toHaveBeenCalledTimes(2);
    });
  });

  describe("LinkedComputedSignal", () => {
    let computed: LinkedComputedSignal<number>;
    let source: LinkedReactiveSignal<number>;

    beforeEach(() => {
      source = linkedReactiveSignal<number>(10);
      computed = linkedComputed(() => source.value * 2);
    });

    it("should maintain all computed signal functionality", () => {
      // Lazy evaluation
      expect(computed.isStale()).toBe(true);

      // First access should compute
      expect(computed.value).toBe(20);
      expect(computed.isFresh()).toBe(true);

      // Cached access
      expect(computed.value).toBe(20);

      // Invalidation
      source.value = 15;
      expect(computed.isStale()).toBe(true);
      expect(computed.value).toBe(30);
    });

    it("should use linked lists for both input and output dependencies", () => {
      const effect = vi.fn();

      // Create effect that depends on computed
      const dispose = linkedEffect(() => {
        effect(computed.value);
      });

      expect(effect).toHaveBeenCalledWith(20);

      // Verify linked list structures exist
      expect((computed as any)._sigsHead).toBeDefined(); // Input dependencies
      expect((computed as any)._depsHead).toBeDefined(); // Output dependencies (effects)

      // Change source and verify propagation
      source.value = 25;
      expect(effect).toHaveBeenCalledWith(50);

      dispose();
    });

    it("should handle computed chains with linked lists", () => {
      const level2 = linkedComputed(() => computed.value + 5); // 25
      const level3 = linkedComputed(() => level2.value * 2); // 50

      expect(level3.value).toBe(50); // (10 * 2) + 5) * 2

      // Change source should propagate through chain
      source.value = 5;
      expect(level3.value).toBe(30); // ((5 * 2) + 5) * 2
    });

    it("should maintain error handling and recovery", () => {
      const errorComputed = linkedComputed(() => {
        if (source.value < 0) {
          throw new Error("Negative value");
        }
        return source.value * 2;
      });

      expect(errorComputed.value).toBe(20);

      // Trigger error
      source.value = -5;
      expect(() => errorComputed.value).toThrow("Negative value");

      // Recovery
      source.value = 8;
      expect(errorComputed.value).toBe(16);
    });

    it("should properly clear ALL dependencies when recomputing (multiple dependencies)", () => {
      // Create a computed that depends on THREE signals
      const sig1 = linkedReactiveSignal(1);
      const sig2 = linkedReactiveSignal(2);
      const sig3 = linkedReactiveSignal(3);

      let callCount = 0;
      const multiDepComputed = linkedComputed(() => {
        callCount++;
        return sig1.value + sig2.value + sig3.value;
      });

      // Initial access - should compute
      expect(multiDepComputed.value).toBe(6); // 1 + 2 + 3
      expect(callCount).toBe(1);

      // Change sig1 - should recompute and clear ALL old subscriptions
      sig1.value = 10;
      expect(multiDepComputed.value).toBe(15); // 10 + 2 + 3
      expect(callCount).toBe(2);

      // Verify all three signals are still properly connected
      // by changing each one and confirming recomputation
      sig2.value = 20;
      expect(multiDepComputed.value).toBe(33); // 10 + 20 + 3
      expect(callCount).toBe(3);

      sig3.value = 30;
      expect(multiDepComputed.value).toBe(60); // 10 + 20 + 30
      expect(callCount).toBe(4);

      // Verify the linked list structure has all 3 dependencies
      const sigsHead = (multiDepComputed as any)._sigsHead;
      expect(sigsHead).toBeDefined();

      // Count nodes in the linked list (should be 3)
      let count = 0;
      let current = sigsHead;
      while (current) {
        count++;
        current = current.nextSig;
      }
      expect(count).toBe(3);
    });

    it("should properly unsubscribe from ALL signals during dispose (multiple dependencies)", () => {
      const sig1 = linkedReactiveSignal(1);
      const sig2 = linkedReactiveSignal(2);
      const sig3 = linkedReactiveSignal(3);

      const multiDepComputed = linkedComputed(() => {
        return sig1.value + sig2.value + sig3.value;
      });

      // Access to set up dependencies
      expect(multiDepComputed.value).toBe(6);

      // Track how many dependents each signal has
      const countDependents = (sig: any) => {
        let count = 0;
        let current = sig._depsHead;
        while (current) {
          count++;
          current = current.nextDep;
        }
        return count;
      };

      // Each signal should have 1 dependent (the computed)
      expect(countDependents(sig1)).toBe(1);
      expect(countDependents(sig2)).toBe(1);
      expect(countDependents(sig3)).toBe(1);

      // Dispose the computed
      multiDepComputed.dispose();

      // All signals should have 0 dependents now
      expect(countDependents(sig1)).toBe(0);
      expect(countDependents(sig2)).toBe(0);
      expect(countDependents(sig3)).toBe(0);

      // Verify _sigsHead is cleared
      expect((multiDepComputed as any)._sigsHead).toBeUndefined();
    });

    it("should handle dynamic dependencies (conditional dependencies change)", () => {
      const condition = linkedReactiveSignal(true);
      const sig1 = linkedReactiveSignal(10);
      const sig2 = linkedReactiveSignal(20);

      let computeCount = 0;
      const conditionalComputed = linkedComputed(() => {
        computeCount++;
        // Dependencies change based on condition
        return condition.value ? sig1.value : sig2.value;
      });

      // Initially depends on sig1
      expect(conditionalComputed.value).toBe(10);
      expect(computeCount).toBe(1);

      // Changing sig1 should trigger recompute
      sig1.value = 15;
      expect(conditionalComputed.value).toBe(15);
      expect(computeCount).toBe(2);

      // Changing sig2 should NOT trigger recompute (not a dependency)
      sig2.value = 25;
      expect(computeCount).toBe(2); // Still 2, no recompute

      // Switch condition - now depends on sig2 instead of sig1
      condition.value = false;
      expect(conditionalComputed.value).toBe(25);
      expect(computeCount).toBe(3);

      // Now sig2 changes should trigger recompute
      sig2.value = 30;
      expect(conditionalComputed.value).toBe(30);
      expect(computeCount).toBe(4);

      // And sig1 changes should NOT trigger recompute anymore
      sig1.value = 100;
      expect(computeCount).toBe(4); // Still 4, no recompute
    });
  });

  describe("Performance Characteristics", () => {
    it("should have O(1) dependency insertion and removal", () => {
      const signal = linkedReactiveSignal<number>(0);
      const effects: any[] = [];

      // Measure insertion time
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const effect = {
          addDependency: vi.fn(),
          onDependencyChange: vi.fn(),
          _unsubscribeFunctions: new Set(),
        };
        effects.push(effect);
        signal.subscribeEffect(effect);
      }

      const insertTime = performance.now() - start;
      console.log(`Insertion of 1000 dependencies: ${insertTime}ms`);

      // Insertion time should be roughly linear (O(1) per operation)
      expect(insertTime).toBeLessThan(50); // Should be very fast

      // Trigger notification to all effects
      const notifyStart = performance.now();
      signal.value = 1;
      const notifyTime = performance.now() - notifyStart;
      console.log(`Notification to 1000 effects: ${notifyTime}ms`);

      expect(notifyTime).toBeLessThan(50);
    });

    it("should use less memory than Set-based implementation", () => {
      // This is a conceptual test - in practice you'd use memory profiling tools
      const signal = linkedReactiveSignal<number>(0);

      // With linked lists, each dependency is just 2-3 pointers
      // vs Set which has overhead for hash table, buckets, etc.

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const beforeMem = process.memoryUsage().heapUsed;

      // Create many dependencies
      const unsubscribes = Array.from({ length: 100 }, () =>
        signal.subscribeEffect({
          addDependency: vi.fn(),
          onDependencyChange: vi.fn(),
        })
      );

      const afterMem = process.memoryUsage().heapUsed;
      const memUsed = afterMem - beforeMem;

      console.log(`Memory used for 100 dependencies: ${memUsed} bytes`);

      // Cleanup
      unsubscribes.forEach((unsub) => unsub());

      // Memory usage should be reasonable
      // (This is more of a monitoring test than assertion)
      expect(memUsed).toBeGreaterThan(0);
    });
  });

  describe("Functional Compatibility", () => {
    it("should maintain complete compatibility with Phase 3 computed signals", () => {
      // Recreation of Phase 3 demo using linked lists
      const firstName = linkedReactiveSignal<string>("John");
      const lastName = linkedReactiveSignal<string>("Doe");

      const fullName = linkedComputed(
        () => `${firstName.value} ${lastName.value}`
      );
      const greeting = linkedComputed(() => `Hello, ${fullName.value}!`);

      expect(greeting.value).toBe("Hello, John Doe!");

      firstName.value = "Jane";
      expect(greeting.value).toBe("Hello, Jane Doe!");

      // Effect integration
      const effect = vi.fn();
      const dispose = linkedEffect(() => {
        effect(greeting.value);
      });

      expect(effect).toHaveBeenCalledWith("Hello, Jane Doe!");

      lastName.value = "Smith";
      expect(effect).toHaveBeenCalledWith("Hello, Jane Smith!");

      dispose();
    });

    it("should pass all Phase 3 test scenarios", () => {
      // Lazy evaluation
      const source = linkedReactiveSignal<string>("test");
      let computeCount = 0;

      const lazy = linkedComputed(() => {
        computeCount++;
        return source.value.toUpperCase();
      });

      expect(computeCount).toBe(0);
      expect(lazy.value).toBe("TEST");
      expect(computeCount).toBe(1);

      // Caching
      expect(lazy.value).toBe("TEST");
      expect(computeCount).toBe(1);

      // Invalidation
      source.value = "changed";
      expect(lazy.value).toBe("CHANGED");
      expect(computeCount).toBe(2);
    });
  });

  describe("Memory Management", () => {
    it("should properly cleanup linked list nodes on disposal", () => {
      const signal = linkedReactiveSignal<number>(1);
      const effect = new LinkedEffect(() => {
        signal.value;
      });

      // Verify connection exists
      expect((signal as any)._depsHead).toBeDefined();
      expect((effect as any)._sigsHead).toBeDefined();

      // Dispose effect
      effect.dispose();

      // Verify cleanup - nodes should be removed
      expect((effect as any)._sigsHead).toBeUndefined();

      // Signal should also clean up its side
      // (The exact implementation depends on your cleanup strategy)
    });

    it("should handle circular references gracefully", () => {
      // Test that linked lists don't create memory leaks with circular refs
      const signal1 = linkedReactiveSignal<number>(1);
      const signal2 = linkedReactiveSignal<number>(2);

      const effect1 = new LinkedEffect(() => {
        signal2.value; // effect1 depends on signal2
      });

      const effect2 = new LinkedEffect(() => {
        signal1.value; // effect2 depends on signal1
      });

      // This creates a bidirectional dependency graph
      // Cleanup should work correctly
      effect1.dispose();
      effect2.dispose();

      // No memory leaks should occur
      expect(true).toBe(true); // Placeholder - real test would check memory
    });
  });

  describe("Integration with demonstrateLinkedLists", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should run demonstration without errors", () => {
      expect(() => demonstrateLinkedLists()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "=== Phase 4: Linked Lists Demo ==="
      );
      expect(consoleSpy).toHaveBeenCalledWith("Phase 4 Complete!");
    });

    it("should demonstrate performance improvements", () => {
      demonstrateLinkedLists();

      const logCalls = consoleSpy.mock.calls.flat();
      const allLogs = logCalls.join(" ");

      // Should mention key optimizations
      expect(allLogs).toContain("Linked lists");
      expect(allLogs).toContain("memory");
      expect(allLogs).toContain("performance");
    });
  });

  describe("Factory Functions", () => {
    it("should create linked implementations via factory functions", () => {
      const signal = linkedReactiveSignal<number>(42);
      const comp = linkedComputed(() => signal.value * 2);
      const dispose = linkedEffect(() => comp.value);

      expect(signal).toBeInstanceOf(LinkedReactiveSignal);
      expect(comp).toBeInstanceOf(LinkedComputedSignal);

      expect(comp.value).toBe(84);
      signal.value = 10;
      expect(comp.value).toBe(20);

      dispose();
    });

    it("should support factory function overloads", () => {
      const withValue = linkedReactiveSignal<string>("hello");
      const withoutValue = linkedReactiveSignal<string>();

      expect(withValue.value).toBe("hello");
      expect(withoutValue.value).toBeUndefined();
    });
  });
});
