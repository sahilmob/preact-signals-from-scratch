/**
 * Phase 5: Batching Tests
 *
 * Comprehensive test suite for batching functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BatchedSignal,
  BatchedEffect,
  BatchedComputedSignal,
  batchedSignal,
  batchedEffect,
  batchedComputed,
  batch,
  // __resetBatchingState,
} from "./05-batching.ts";

describe("Phase 5: Batching", () => {
  // beforeEach(() => {
  //   // Reset global batching state before each test
  //   __resetBatchingState();
  // });
  describe("BatchedSignal", () => {
    it("should update value immediately when not batching", () => {
      const sig = batchedSignal(0);
      sig.value = 1;
      expect(sig.value).toBe(1);
    });

    it("should trigger effect immediately when not batching", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1); // Initial run

      sig.value = 1;
      expect(runCount).toBe(2); // Immediate run
    });

    it("should not trigger multiple effects during batch", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1); // Initial run

      batch(() => {
        sig.value = 1;
        sig.value = 2;
        sig.value = 3;
        expect(runCount).toBe(1); // Still only initial run during batch
      });

      expect(runCount).toBe(2); // Single run after batch
    });

    it("should skip update if value hasn't changed", () => {
      const sig = batchedSignal(5);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      sig.value = 5; // Same value
      expect(runCount).toBe(1); // Should not trigger
    });
  });

  describe("BatchedEffect", () => {
    it("should run immediately on creation", () => {
      let runCount = 0;
      batchedEffect(() => {
        runCount++;
      });
      expect(runCount).toBe(1);
    });

    it("should track dependencies automatically", () => {
      const sig1 = batchedSignal(1);
      const sig2 = batchedSignal(2);
      let runCount = 0;

      batchedEffect(() => {
        sig1.value;
        sig2.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      sig1.value = 10;
      expect(runCount).toBe(2);

      sig2.value = 20;
      expect(runCount).toBe(3);
    });

    it("should run only once when multiple dependencies change in batch", () => {
      const sig1 = batchedSignal(1);
      const sig2 = batchedSignal(2);
      const sig3 = batchedSignal(3);
      let runCount = 0;

      batchedEffect(() => {
        sig1.value;
        sig2.value;
        sig3.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      batch(() => {
        sig1.value = 10;
        sig2.value = 20;
        sig3.value = 30;
      });

      expect(runCount).toBe(2); // Only one additional run
    });

    it("should handle cleanup functions", () => {
      const sig = batchedSignal(0);
      let cleanupCount = 0;

      const dispose = batchedEffect(() => {
        sig.value;
        return () => {
          cleanupCount++;
        };
      });

      expect(cleanupCount).toBe(0);

      sig.value = 1;
      expect(cleanupCount).toBe(1); // Cleanup called before re-run

      dispose();
      expect(cleanupCount).toBe(2); // Cleanup called on dispose
    });

    it("should not run after disposal", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      const dispose = batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      dispose();

      sig.value = 1;
      expect(runCount).toBe(1); // Should not run after disposal
    });

    it("should handle conditional dependencies", () => {
      const condition = batchedSignal(true);
      const sig1 = batchedSignal(1);
      const sig2 = batchedSignal(2);
      let runCount = 0;

      batchedEffect(() => {
        if (condition.value) {
          sig1.value;
        } else {
          sig2.value;
        }
        runCount++;
      });

      expect(runCount).toBe(1);

      sig1.value = 10;
      expect(runCount).toBe(2); // sig1 is tracked

      sig2.value = 20;
      expect(runCount).toBe(2); // sig2 is not tracked

      condition.value = false;
      expect(runCount).toBe(3); // Re-runs, now tracks sig2

      sig2.value = 30;
      expect(runCount).toBe(4); // sig2 now tracked

      sig1.value = 40;
      expect(runCount).toBe(4); // sig1 no longer tracked
    });
  });

  describe("BatchedComputedSignal", () => {
    it("should compute value lazily", () => {
      const sig = batchedSignal(5);
      let computeCount = 0;

      const computed = batchedComputed(() => {
        computeCount++;
        return sig.value * 2;
      });

      expect(computeCount).toBe(0); // Not computed yet

      const value = computed.value;
      expect(value).toBe(10);
      expect(computeCount).toBe(1); // Computed on access
    });

    it("should cache computed values", () => {
      const sig = batchedSignal(5);
      let computeCount = 0;

      const computed = batchedComputed(() => {
        computeCount++;
        return sig.value * 2;
      });

      const value1 = computed.value;
      const value2 = computed.value;
      const value3 = computed.value;

      expect(computeCount).toBe(1); // Only computed once
      expect(value1).toBe(10);
      expect(value2).toBe(10);
      expect(value3).toBe(10);
    });

    it("should invalidate when dependency changes", () => {
      const sig = batchedSignal(5);
      let computeCount = 0;

      const computed = batchedComputed(() => {
        computeCount++;
        return sig.value * 2;
      });

      computed.value;
      expect(computeCount).toBe(1);

      sig.value = 10;

      computed.value;
      expect(computeCount).toBe(2); // Recomputed after invalidation
      expect(computed.value).toBe(20);
    });

    it("should work with batched updates", () => {
      const sig1 = batchedSignal(2);
      const sig2 = batchedSignal(3);
      let computeCount = 0;

      const computed = batchedComputed(() => {
        computeCount++;
        return sig1.value + sig2.value;
      });

      computed.value;
      expect(computeCount).toBe(1);
      expect(computed.value).toBe(5);

      batch(() => {
        sig1.value = 10;
        sig2.value = 20;
      });

      computed.value;
      expect(computeCount).toBe(2); // Only recomputed once despite 2 changes
      expect(computed.value).toBe(30);
    });

    it("should not notify dependents if computed value doesn't change", () => {
      const sig = batchedSignal(5);
      const computed = batchedComputed(() => Math.floor(sig.value / 10));
      let effectCount = 0;

      batchedEffect(() => {
        computed.value;
        effectCount++;
      });

      expect(effectCount).toBe(1);
      expect(computed.value).toBe(0);

      sig.value = 6; // Still floors to 0
      expect(effectCount).toBe(1); // Should not trigger effect

      sig.value = 15; // Now floors to 1
      expect(effectCount).toBe(2); // Should trigger effect
    });

    it("should detect circular dependencies", () => {
      const computed1 = batchedComputed(() => {
        return computed2.value + 1;
      });

      const computed2 = batchedComputed(() => {
        return computed1.value + 1;
      });

      expect(() => computed1.value).toThrow("Circular dependency");
    });

    it("should handle errors in compute function", () => {
      const sig = batchedSignal(5);
      const computed = batchedComputed(() => {
        if (sig.value < 0) {
          throw new Error("Negative value");
        }
        return sig.value * 2;
      });

      expect(computed.value).toBe(10);

      sig.value = -1;
      expect(() => computed.value).toThrow("Negative value");

      // Should recover when dependency changes
      sig.value = 3;
      expect(computed.value).toBe(6);
    });

    it("should throw error when trying to set computed signal", () => {
      const computed = batchedComputed(() => 42);
      expect(() => {
        computed.value = 100;
      }).toThrow("read-only");
    });
  });

  describe("batch()", () => {
    it("should defer effect execution until batch completes", () => {
      const sig1 = batchedSignal(1);
      const sig2 = batchedSignal(2);
      let runCount = 0;
      let observedValues: number[] = [];

      batchedEffect(() => {
        runCount++;
        observedValues.push(sig1.value + sig2.value);
      });

      expect(runCount).toBe(1);
      expect(observedValues).toEqual([3]);

      batch(() => {
        sig1.value = 10;
        expect(runCount).toBe(1); // Still 1 during batch
        sig2.value = 20;
        expect(runCount).toBe(1); // Still 1 during batch
      });

      expect(runCount).toBe(2); // Runs once after batch
      expect(observedValues).toEqual([3, 30]);
    });

    it("should handle nested batches", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      batch(() => {
        sig.value = 1;
        batch(() => {
          sig.value = 2;
          batch(() => {
            sig.value = 3;
            expect(runCount).toBe(1); // Still initial run
          });
          expect(runCount).toBe(1); // Still initial run
        });
        expect(runCount).toBe(1); // Still initial run
      });

      expect(runCount).toBe(2); // Runs once after all batches complete
    });

    it("should return value from batched function", () => {
      const sig = batchedSignal(5);

      const result = batch(() => {
        sig.value = 10;
        sig.value = 20;
        return sig.value * 2;
      });

      expect(result).toBe(40);
    });

    it("should flush effects even if batch throws error", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      try {
        batch(() => {
          sig.value = 1;
          throw new Error("Test error");
        });
      } catch (e) {
        // Expected error
      }

      expect(runCount).toBe(2); // Effect should still run
    });

    it("should handle multiple independent batches", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      batch(() => {
        sig.value = 1;
        sig.value = 2;
      });

      expect(runCount).toBe(2);

      batch(() => {
        sig.value = 3;
        sig.value = 4;
      });

      expect(runCount).toBe(3);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle deep dependency chains in batch", () => {
      const sig = batchedSignal(1);
      const computed1 = batchedComputed(() => sig.value * 2);
      const computed2 = batchedComputed(() => computed1.value * 2);
      const computed3 = batchedComputed(() => computed2.value * 2);

      let effectCount = 0;
      batchedEffect(() => {
        computed3.value;
        effectCount++;
      });

      expect(effectCount).toBe(1);
      expect(computed3.value).toBe(8);

      batch(() => {
        sig.value = 2;
        sig.value = 3;
        sig.value = 4;
      });

      expect(effectCount).toBe(2); // Only runs once after batch
      expect(computed3.value).toBe(32); // 4 * 2 * 2 * 2
    });

    it("should handle diamond dependency pattern in batch", () => {
      const sig = batchedSignal(1);
      const left = batchedComputed(() => sig.value + 1);
      const right = batchedComputed(() => sig.value + 2);
      const bottom = batchedComputed(() => left.value + right.value);

      let effectCount = 0;
      batchedEffect(() => {
        bottom.value;
        effectCount++;
      });

      expect(effectCount).toBe(1);
      expect(bottom.value).toBe(5); // (1+1) + (1+2)

      batch(() => {
        sig.value = 5;
      });

      expect(effectCount).toBe(2); // Runs once despite diamond pattern
      expect(bottom.value).toBe(13); // (5+1) + (5+2)
    });

    it("should handle effects created during batch", () => {
      const sig1 = batchedSignal(1);
      const sig2 = batchedSignal(2);
      let effect1 = vi.fn().mockImplementation(() => {
        sig1.value;
      });
      let effect2 = vi.fn().mockImplementation(() => {
        sig2.value;
      });

      batchedEffect(effect1);

      batch(() => {
        sig1.value = 10;

        // Create new effect during batch
        batchedEffect(effect2);

        sig2.value = 20;
      });

      expect(effect1).toHaveBeenCalledTimes(2); // Initial + batch
      expect(effect2).toHaveBeenCalledOnce(); // Only initial (created during batch)
    });

    it("should handle signals created during batch", () => {
      let effectCount = 0;

      const result = batch(() => {
        const sig = batchedSignal(5);

        batchedEffect(() => {
          sig.value;
          effectCount++;
        });

        sig.value = 10;
        sig.value = 20;

        return sig.value;
      });

      expect(result).toBe(20);
      expect(effectCount).toBe(1); // Initial + one batched update
    });
  });

  describe("Performance", () => {
    it("should reduce effect runs with batching", () => {
      const signals = Array.from({ length: 10 }, () => batchedSignal(0));
      let effectCount = 0;

      batchedEffect(() => {
        signals.forEach((sig) => sig.value);
        effectCount++;
      });

      expect(effectCount).toBe(1);

      // Without batching
      signals.forEach((sig, i) => {
        sig.value = i + 1;
      });

      const countWithoutBatch = effectCount;
      expect(countWithoutBatch).toBe(11); // Initial + 10 updates

      // Reset
      effectCount = 1;

      // With batching
      batch(() => {
        signals.forEach((sig, i) => {
          sig.value = i + 100;
        });
      });

      expect(effectCount).toBe(2); // Initial + 1 batched update
    });

    it("should handle large number of updates efficiently", () => {
      const sig = batchedSignal(0);
      let effectCount = 0;

      batchedEffect(() => {
        sig.value;
        effectCount++;
      });

      const startTime = Date.now();

      batch(() => {
        for (let i = 0; i < 1000; i++) {
          sig.value = i;
        }
      });

      const endTime = Date.now();

      expect(effectCount).toBe(2); // Initial + 1 batched
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe("Memory Management", () => {
    it("should clean up disposed effects from pending queue", () => {
      const sig = batchedSignal(0);
      let runCount = 0;

      const dispose = batchedEffect(() => {
        sig.value;
        runCount++;
      });

      expect(runCount).toBe(1);

      batch(() => {
        sig.value = 1;
        dispose(); // Dispose during batch
      });

      expect(runCount).toBe(1); // Should not run after disposal
    });

    it("should handle effect disposal during batch execution", () => {
      const sig = batchedSignal(0);
      let effect1Count = 0;
      let effect2Count = 0;
      let disposeEffect2: (() => void) | null = null;

      batchedEffect(() => {
        sig.value;
        effect1Count++;
        if (effect1Count === 2 && disposeEffect2) {
          disposeEffect2();
        }
      });

      disposeEffect2 = batchedEffect(() => {
        sig.value;
        effect2Count++;
      });

      expect(effect1Count).toBe(1);
      expect(effect2Count).toBe(1);

      batch(() => {
        sig.value = 1;
      });

      // effect1 runs and disposes effect2
      expect(effect1Count).toBe(2);
      expect(effect2Count).toBe(1); // Disposed before it could run
    });
  });
});
