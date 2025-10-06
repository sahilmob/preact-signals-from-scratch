/**
 * Phase 6: Advanced APIs Tests
 *
 * Comprehensive test suite for advanced utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  untracked,
  advancedSignal,
  advancedComputed,
  effect,
  batch,
  AdvancedSignal,
  AdvancedComputedSignal,
} from "./06-advanced.ts";

describe("Phase 6: Advanced APIs", () => {
  describe("untracked()", () => {
    it("should execute function without tracking dependencies", () => {
      const sig = advancedSignal(0);
      let runCount = 0;

      effect(() => {
        runCount++;
        // This creates a dependency
        const tracked = sig.value;
        // This should NOT create a dependency
        const untracked_value = untracked(() => sig.value);
        expect(tracked).toBe(untracked_value);
      });

      expect(runCount).toBe(1);

      sig.value = 1;
      expect(runCount).toBe(2); // Re-runs because of tracked dependency
    });

    it("should not track nested signal reads", () => {
      const sig1 = advancedSignal(1);
      const sig2 = advancedSignal(2);
      let runCount = 0;

      effect(() => {
        sig1.value; // Tracked
        untracked(() => {
          sig2.value; // NOT tracked
        });
        runCount++;
      });

      expect(runCount).toBe(1);

      sig2.value = 10;
      expect(runCount).toBe(1); // Should not re-run (sig2 not tracked)

      sig1.value = 10;
      expect(runCount).toBe(2); // Should re-run (sig1 is tracked)
    });

    it("should return the function result", () => {
      const result = untracked(() => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should work with nested untracked calls", () => {
      const sig = advancedSignal(5);
      let runCount = 0;

      effect(() => {
        runCount++;
        untracked(() => {
          sig.value;
          untracked(() => {
            sig.value;
          });
        });
      });

      expect(runCount).toBe(1);

      sig.value = 10;
      expect(runCount).toBe(1); // No dependency created
    });

    it("should restore previous context after execution", () => {
      const sig1 = advancedSignal(1);
      const sig2 = advancedSignal(2);
      let runCount = 0;

      effect(() => {
        sig1.value; // Tracked
        untracked(() => {
          sig2.value; // NOT tracked
        });
        sig1.value; // Still tracked
        runCount++;
      });

      expect(runCount).toBe(1);

      sig1.value = 10;
      expect(runCount).toBe(2); // Tracked before and after untracked
    });

    it("should handle errors and still restore context", () => {
      const sig = advancedSignal(0);
      let runCount = 0;

      effect(() => {
        runCount++;
        sig.value; // Tracked

        try {
          untracked(() => {
            throw new Error("Test error");
          });
        } catch (e) {
          // Error caught
        }

        // Context should be restored, so this should still be tracked
      });

      expect(runCount).toBe(1);

      sig.value = 1;
      expect(runCount).toBe(2); // Should still track after error
    });
  });

  describe("AdvancedSignal.peek()", () => {
    it("should read value without creating dependency", () => {
      const sig = advancedSignal(5);
      let runCount = 0;

      effect(() => {
        runCount++;
        const value = sig.peek(); // Should not track
        expect(value).toBe(sig.peek());
      });

      expect(runCount).toBe(1);

      sig.value = 10;
      expect(runCount).toBe(1); // Should not re-run (no dependency)
      expect(sig.peek()).toBe(10);
    });

    it("should return current value", () => {
      const sig = advancedSignal(42);
      expect(sig.peek()).toBe(42);

      sig.value = 100;
      expect(sig.peek()).toBe(100);
    });

    it("should work outside of effects", () => {
      const sig = advancedSignal(7);
      const value = sig.peek();
      expect(value).toBe(7);
    });

    it("should differ from .value getter inside effects", () => {
      const sig = advancedSignal(0);
      let peekCount = 0;
      let valueCount = 0;

      const dispose1 = effect(() => {
        sig.peek();
        peekCount++;
      });

      const dispose2 = effect(() => {
        sig.value;
        valueCount++;
      });

      expect(peekCount).toBe(1);
      expect(valueCount).toBe(1);

      sig.value = 1;

      expect(peekCount).toBe(1); // peek doesn't track
      expect(valueCount).toBe(2); // .value tracks

      dispose1();
      dispose2();
    });
  });

  describe("AdvancedSignal.subscribe()", () => {
    it("should call callback when signal changes", () => {
      const sig = advancedSignal(0);
      const callback = vi.fn();

      const dispose = sig.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0);

      sig.value = 1;
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(1);

      sig.value = 2;
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(2);

      dispose();
    });

    it("should stop calling callback after dispose", () => {
      const sig = advancedSignal(0);
      const callback = vi.fn();

      const dispose = sig.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);

      sig.value = 1;
      expect(callback).toHaveBeenCalledTimes(2);

      dispose();

      sig.value = 2;
      expect(callback).toHaveBeenCalledTimes(2); // No additional calls
    });

    it("should work with multiple subscribers", () => {
      const sig = advancedSignal(0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const dispose1 = sig.subscribe(callback1);
      const dispose2 = sig.subscribe(callback2);

      sig.value = 1;

      expect(callback1).toHaveBeenCalledTimes(2); // Initial + update
      expect(callback2).toHaveBeenCalledTimes(2);

      dispose1();

      sig.value = 2;

      expect(callback1).toHaveBeenCalledTimes(2); // Stopped
      expect(callback2).toHaveBeenCalledTimes(3); // Still running

      dispose2();
    });

    it("should not track dependencies in callback", () => {
      const sig1 = advancedSignal(0);
      const sig2 = advancedSignal(0);
      const callback = vi.fn(() => {
        // Reading sig2 inside callback should not create dependency
        sig2.value;
      });

      const dispose = sig1.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);

      sig2.value = 10;
      expect(callback).toHaveBeenCalledTimes(1); // Should not trigger

      sig1.value = 10;
      expect(callback).toHaveBeenCalledTimes(2); // Should trigger

      dispose();
    });

    it("should work with batching", () => {
      const sig = advancedSignal(0);
      const callback = vi.fn();

      const dispose = sig.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(1);

      batch(() => {
        sig.value = 1;
        sig.value = 2;
        sig.value = 3;
      });

      expect(callback).toHaveBeenCalledTimes(2); // Initial + one batched update
      expect(callback).toHaveBeenLastCalledWith(3);

      dispose();
    });
  });

  describe("AdvancedComputedSignal.peek()", () => {
    it("should read computed value without creating dependency", () => {
      const sig = advancedSignal(5);
      const computed = advancedComputed(() => sig.value * 2);
      let runCount = 0;

      effect(() => {
        runCount++;
        const value = computed.peek(); // Should not track
        expect(value).toBe(10);
      });

      expect(runCount).toBe(1);

      sig.value = 10;
      expect(runCount).toBe(1); // Should not re-run
      expect(computed.peek()).toBe(20);
    });

    it("should trigger recomputation if stale", () => {
      const sig = advancedSignal(5);
      let computeCount = 0;
      const computed = advancedComputed(() => {
        computeCount++;
        return sig.value * 2;
      });

      expect(computeCount).toBe(0); // Lazy

      const value1 = computed.peek();
      expect(value1).toBe(10);
      expect(computeCount).toBe(1);

      sig.value = 10;

      const value2 = computed.peek();
      expect(value2).toBe(20);
      expect(computeCount).toBe(2); // Recomputed
    });

    it("should not create dependency on computed signal", () => {
      const sig = advancedSignal(5);
      const computed = advancedComputed(() => sig.value * 2);
      let effectCount = 0;

      effect(() => {
        effectCount++;
        computed.peek(); // Should not track computed
      });

      expect(effectCount).toBe(1);

      sig.value = 10; // Computed will be invalidated
      expect(effectCount).toBe(1); // But effect should not re-run
    });
  });

  describe("AdvancedComputedSignal.subscribe()", () => {
    it("should call callback when computed value changes", () => {
      const sig = advancedSignal(5);
      const computed = advancedComputed(() => sig.value * 2);
      const callback = vi.fn();

      const dispose = computed.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(10);

      sig.value = 10;
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(20);

      dispose();
    });

    it("should not call callback if computed value doesn't change", () => {
      const sig = advancedSignal(5);
      const computed = advancedComputed(() => Math.floor(sig.value / 10));
      const callback = vi.fn();

      const dispose = computed.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0);

      sig.value = 6; // Still floors to 0
      expect(callback).toHaveBeenCalledTimes(1); // No change

      sig.value = 15; // Floors to 1
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(1);

      dispose();
    });
  });

  describe("Lifecycle Hooks", () => {
    it("should call watched hook when signal gains first subscriber", () => {
      const watchedFn = vi.fn();
      const sig = advancedSignal(0, { watched: watchedFn });

      expect(watchedFn).not.toHaveBeenCalled();

      const dispose = effect(() => {
        sig.value;
      });

      expect(watchedFn).toHaveBeenCalledTimes(1);

      dispose();
    });

    it("should call unwatched hook when signal loses last subscriber", () => {
      const unwatchedFn = vi.fn();
      const sig = advancedSignal(0, { unwatched: unwatchedFn });

      const dispose = effect(() => {
        sig.value;
      });

      expect(unwatchedFn).not.toHaveBeenCalled();

      dispose();

      expect(unwatchedFn).toHaveBeenCalledTimes(1);
    });

    it("should call watched only once for multiple subscribers", () => {
      const watchedFn = vi.fn();
      const sig = advancedSignal(0, { watched: watchedFn });

      const dispose1 = effect(() => sig.value);
      expect(watchedFn).toHaveBeenCalledTimes(1);

      const dispose2 = effect(() => sig.value);
      expect(watchedFn).toHaveBeenCalledTimes(1); // Still 1

      dispose1();
      dispose2();
    });

    it("should call unwatched only when all subscribers are gone", () => {
      const unwatchedFn = vi.fn();
      const sig = advancedSignal(0, { unwatched: unwatchedFn });

      const dispose1 = effect(() => sig.value);
      const dispose2 = effect(() => sig.value);

      dispose1();
      expect(unwatchedFn).not.toHaveBeenCalled(); // Still has dispose2

      dispose2();
      expect(unwatchedFn).toHaveBeenCalledTimes(1); // Now called
    });

    it("should not track dependencies in lifecycle hooks", () => {
      const sig1 = advancedSignal(0);
      const sig2 = advancedSignal(0);
      let watchedCalls = 0;

      const watched = () => {
        watchedCalls++;
        // This should not create a dependency
        sig2.value;
      };

      const sig = advancedSignal(0, { watched });

      const dispose = effect(() => {
        sig.value;
      });

      expect(watchedCalls).toBe(1);

      sig2.value = 10;
      expect(watchedCalls).toBe(1); // Should not trigger

      dispose();
    });

    it("should work with computed signals", () => {
      const sig = advancedSignal(5);
      const watchedFn = vi.fn();
      const unwatchedFn = vi.fn();

      const computed = advancedComputed(() => sig.value * 2, {
        watched: watchedFn,
        unwatched: unwatchedFn,
      });

      const dispose = effect(() => {
        computed.value;
      });

      expect(watchedFn).toHaveBeenCalledTimes(1);
      expect(unwatchedFn).not.toHaveBeenCalled();

      dispose();

      expect(unwatchedFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration", () => {
    it("should combine untracked, peek, and subscribe", () => {
      const sig = advancedSignal(0);
      const callback = vi.fn();

      const dispose = sig.subscribe((value) => {
        // Inside subscribe callback, we're in untracked context
        const peeked = sig.peek();
        expect(peeked).toBe(value);
        callback(value);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      sig.value = 5;
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(5);

      dispose();
    });

    it("should work with batching and computed signals", () => {
      const sig = advancedSignal(1);
      const computed = advancedComputed(() => sig.value * 2);
      const callback = vi.fn();

      const dispose = computed.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(2);

      batch(() => {
        sig.value = 2;
        sig.value = 3;
        sig.value = 4;
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(8);

      dispose();
    });

    it("should handle complex dependency chains with untracked", () => {
      const sig1 = advancedSignal(1);
      const sig2 = advancedSignal(2);
      const sig3 = advancedSignal(3);

      const computed = advancedComputed(() => {
        const a = sig1.value;
        const b = untracked(() => sig2.value); // Not tracked
        const c = sig3.value;
        return a + b + c;
      });

      let runCount = 0;
      effect(() => {
        computed.value;
        runCount++;
      });

      expect(runCount).toBe(1);
      expect(computed.value).toBe(6);

      sig2.value = 10; // Should not trigger (untracked)
      expect(runCount).toBe(1);

      sig1.value = 10; // Should trigger
      expect(runCount).toBe(2);
      expect(computed.value).toBe(23); // 10 + 10 + 3
    });
  });
});
