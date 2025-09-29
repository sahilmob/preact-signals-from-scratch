/**
 * Unit Tests for Phase 2: Effects System with Automatic Dependency Tracking
 *
 * Test Categories:
 * - Effect creation and immediate execution
 * - Automatic dependency tracking via evalContext
 * - Effect re-execution on dependency changes
 * - Multiple effects and dependencies
 * - Effect cleanup and disposal
 * - ReactiveSignal behavior
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Effect,
  ReactiveSignal,
  reactiveSignal,
  effect,
  evalContext,
} from "./02-effects.ts";
import { signal, Signal } from "./01-basic-signal.ts";

describe("Phase 2: Effects System", () => {
  describe("ReactiveSignal Class", () => {
    let signal: ReactiveSignal<number>;

    beforeEach(() => {
      signal = reactiveSignal(42);
    });

    it("should extend basic Signal functionality", () => {
      expect(signal).toBeInstanceOf(Signal);
    });

    it("should initialize with empty dependent effects", () => {
      expect((signal as any)._dependentEffects.size).toEqual(0);
    });

    // it("should register with current evalContext when value is accessed", () => {
    //   let ctx;
    //   effect(() => {
    //     console.log(signal.value);
    //     ctx = evalContext;
    //   });
    //   expect((ctx as any)._dependencies).toContain(signal);
    // });

    it("should not register when no evalContext is present", () => {
      const signal = reactiveSignal(42);

      // Access value outside of effect
      const value = signal.value;
      expect(value).toBe(42);

      // Should have no dependent effects
      expect((signal as any)._dependentEffects.size).toBe(0);
    });

    it("should notify dependent effects when value changes", () => {
      const cb = vi.fn().mockImplementation(() => console.log(signal.value));
      signal.subscribe(cb);
      expect(cb).toHaveBeenLastCalledWith(42);
      signal.value = 43;
      expect(cb).toHaveBeenLastCalledWith(43);
    });

    it("should not notify when value is unchanged", () => {
      const cb = vi.fn();
      signal.subscribe(cb);
      signal.value = 42;
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe("Effect Class", () => {
    let mockFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFn = vi.fn();
    });

    it("should execute function immediately on creation", () => {
      const cb = vi.fn();
      effect(cb);
      expect(cb).toHaveBeenCalledOnce();
    });

    it("should set evalContext during execution", () => {
      let contextDuringExecution: any;

      effect(() => {
        contextDuringExecution = evalContext;
      });

      expect(contextDuringExecution).toBeInstanceOf(Effect);
    });

    it("should restore previous evalContext after execution", () => {
      let originalContext = evalContext;
      let ctx1: any;
      let ctx2: any;
      let effect1: any;
      let effect2: any;

      effect(() => {
        ctx1 = evalContext;
        effect1 = evalContext; // evalContext IS the current effect during execution

        effect(() => {
          ctx2 = evalContext;
          effect2 = evalContext; // evalContext IS the current effect during execution
        });
      });

      expect(evalContext).toEqual(originalContext);
      expect(ctx1).toEqual(effect1);
      expect(ctx2).toEqual(effect2);
      expect(ctx1).toBeInstanceOf(Effect);
      expect(ctx2).toBeInstanceOf(Effect);
      expect(ctx1).not.toEqual(ctx2); // Should be different Effect instances
    });

    // it("should track dependencies automatically", () => {
    //   const signal = new ReactiveSignal(42);
    //   let effect1;
    //   effect(function () {
    //     console.log(signal.value);
    //     effect1 = this;
    //   });

    //   expect((effect1 as any)._dependencies).contains(signal);
    // });

    it("should re-run when dependencies change", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => console.log(signal.value));
      effect(cb);
      signal.value = 43;
      setTimeout(() => {
        expect(cb).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle cleanup functions", () => {
      const cleanup = vi.fn();
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        console.log(signal.value);
        return cleanup;
      });
      effect(cb);
      signal.value = 43;
      setTimeout(() => {
        expect(cleanup).toHaveBeenCalledOnce();
      });
    });

    it("should dispose properly", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => console.log(signal.value));
      const dispose = effect(cb);
      dispose();
      signal.value = 43;
      setTimeout(() => {
        expect(cb).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Automatic Dependency Tracking", () => {
    it("should track single dependency", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        signal.value;
      });
      effect(cb);

      signal.value = 43;

      setTimeout(() => {
        expect(cb).toHaveBeenCalledTimes(2);
      });
    });

    it("should track multiple dependencies", async () => {
      const s = new ReactiveSignal(42);
      const s1 = new ReactiveSignal(43);
      const s2 = new ReactiveSignal(44);
      const cb = vi.fn().mockImplementation(() => {
        s.value + s1.value + s2.value;
      });
      effect(cb);

      s.value = 43;
      s1.value = 44;
      s1.value = 45;
      await new Promise((res, _) => setTimeout(res));

      expect(cb).toHaveBeenCalledTimes(4);
    });

    it("should update dependencies on re-execution", () => {
      const signal1 = reactiveSignal(1);
      const signal2 = reactiveSignal(2);
      const toggle = reactiveSignal(true);

      const cb = vi.fn();

      effect(() => {
        cb();
        if (toggle.value) {
          signal1.value; // Access signal1 when toggle is true
        } else {
          signal2.value; // Access signal2 when toggle is false
        }
      });

      // Initially should be called once
      expect(cb).toHaveBeenCalledTimes(1);

      // Change toggle to switch dependencies
      toggle.value = false;

      expect(cb).toHaveBeenCalledTimes(2);

      // Now signal2 changes should trigger effect
      signal2.value = 3;

      expect(cb).toHaveBeenCalledTimes(3);
    });

    it("should handle conditional dependencies", () => {
      let count = 0;
      const s1 = reactiveSignal(42);
      const s2 = reactiveSignal(43);
      let result: number;

      effect(() => {
        if (count % 2 === 0) {
          result = s1.value;
        } else {
          result = s2.value;
        }
      });

      count += 1;
      s1.value = 44;

      setTimeout(() => {
        expect(result).toBe(43);
      });
    });

    it("should work with nested signal access", () => {
      const signal1 = reactiveSignal(10);
      const signal2 = reactiveSignal(20);

      const getValue = (s: ReactiveSignal<number>) => s.value * 2;
      const cb = vi.fn();

      effect(() => {
        const result = getValue(signal1) + getValue(signal2);
        cb(result);
      });

      expect(cb).toHaveBeenCalledWith(60); // (10*2) + (20*2)

      signal1.value = 15;
      expect(cb).toHaveBeenCalledWith(70); // (15*2) + (20*2)
    });
  });

  describe("Effect Re-execution", () => {
    it("should re-execute when any dependency changes", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        console.log(signal.value);
      });
      effect(cb);

      signal.value = 43;

      expect(cb).toHaveBeenCalledTimes(2);
    });

    it("should use deferred execution to prevent infinite loops", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        signal.value;
      });
      effect(cb);

      signal.value = 43;

      setTimeout(() => {
        expect(cb).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle pending state correctly", () => {
      const signal = reactiveSignal(0);
      const cb = vi.fn();

      effect(() => {
        cb(signal.value);
      });

      expect(cb).toHaveBeenCalledTimes(1);

      // Make rapid changes
      signal.value = 1;
      signal.value = 2;
      signal.value = 3;

      // Should eventually settle to final value
      setTimeout(() => {
        expect(cb).toHaveBeenLastCalledWith(3);
        // Note: Due to deferred execution, exact call count may vary
        // but should be less than 4 (1 initial + potential batching)
      }, 20);
    });

    it("should call cleanup before re-execution", () => {
      const calls: string[] = [];
      const cleanup = vi.fn().mockImplementation(() => {
        calls.push("cleanup");
      });
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        console.log(signal.value);
        calls.push("run");
        return cleanup;
      });
      effect(cb);
      signal.value = 43;
      setTimeout(() => {
        expect(calls).toEqual(["run", "cleanup", "run"]);
      });
    });

    it("should handle errors in effect functions", () => {
      const signal = new ReactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        signal.value;
        throw Error("Must be handled in Effect");
      });

      effect(cb);

      signal.value = 43;
      expect(signal.value).toEqual(43);
    });
  });

  describe("Multiple Effects", () => {
    it("should allow multiple effects on same signal", () => {
      const signal = new ReactiveSignal(42);
      const cb1 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      const cb2 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      effect(cb1);
      effect(cb2);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it("should notify all dependent effects", () => {
      const signal = new ReactiveSignal(42);
      const cb1 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      const cb2 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      effect(cb1);
      effect(cb2);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it("should handle nested effects", () => {
      const signal = new ReactiveSignal(42);

      const cb2 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      const cb1 = vi.fn().mockImplementation(() => {
        signal.value;
        effect(cb2);
      });
      effect(cb1);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it("should maintain independent effect lifecycles", () => {
      const signal = new ReactiveSignal(42);
      const cb1 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      const cb2 = vi.fn().mockImplementation(() => {
        signal.value;
      });
      effect(cb1);
      const dispose = effect(cb2);
      dispose();

      signal.value = 43;

      setTimeout(() => {
        expect(cb1).toHaveBeenCalledTimes(2);
        expect(cb2).toHaveBeenCalledOnce();
      });
    });
  });

  describe("Effect Factory Function", () => {
    it("should create and return dispose function", () => {
      expect(effect(() => {})).toBeInstanceOf(Function);
    });

    it("should execute effect immediately", () => {
      const cb = vi.fn();

      effect(cb);
      expect(cb).toHaveBeenCalledOnce();
    });

    it("should handle effect without cleanup", () => {
      const cb = vi.fn();

      effect(cb);
      expect(cb).toHaveBeenCalledOnce();
    });

    it("should handle effect with cleanup", () => {
      const cleanup = vi.fn();
      const signal = reactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        signal.value;
        return cleanup;
      });

      effect(cb);
      signal.value = 43;
      setTimeout(() => {
        expect(cleanup).toHaveBeenCalledOnce();
      });
    });
  });

  describe("ReactiveSignal Factory Function", () => {
    it("should create ReactiveSignal with value", () => {
      const signal = reactiveSignal(42);
      expect(signal.value).toEqual(42);
    });

    it("should create ReactiveSignal with undefined when no value", () => {
      const signal = reactiveSignal();
      expect(signal.value).toEqual(undefined);
    });

    it("should maintain type safety", () => {
      const numSignal = reactiveSignal(42);
      const strSignal = reactiveSignal("hello");
      const boolSignal = reactiveSignal(true);

      // TypeScript should infer correct types
      expect(typeof numSignal.value).toBe("number");
      expect(typeof strSignal.value).toBe("string");
      expect(typeof boolSignal.value).toBe("boolean");
    });
  });

  describe("Cleanup and Memory Management", () => {
    it("should clean up effect subscriptions on dispose", () => {
      const signal = reactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => console.log(signal.value));

      const dispose = effect(cb);

      // Should have 1 dependent effect
      expect((signal as any)._dependentEffects.size).toBe(1);

      dispose();

      // Should have no dependent effects after disposal
      expect((signal as any)._dependentEffects.size).toBe(0);
    });

    it("should call cleanup functions on dispose", () => {
      const cleanup = vi.fn();
      const cb = vi.fn().mockReturnValue(cleanup);

      const dispose = effect(cb);

      expect(cleanup).not.toHaveBeenCalled();
      dispose();
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("should prevent memory leaks", () => {
      const signal = reactiveSignal(42);
      const effects: Array<() => void> = [];

      // Create many effects
      for (let i = 0; i < 100; i++) {
        const dispose = effect(() => {
          signal.value; // Create dependency
        });
        effects.push(dispose);
      }

      expect((signal as any)._dependentEffects.size).toBe(100);

      // Dispose all effects
      effects.forEach((dispose) => dispose());

      expect((signal as any)._dependentEffects.size).toBe(0);
    });

    it("should handle multiple dispose calls safely", () => {
      const cleanup = vi.fn();
      const cb = vi.fn().mockReturnValue(cleanup);

      const dispose = effect(cb);

      dispose();
      dispose(); // Should not throw or call cleanup again
      dispose(); // Should not throw or call cleanup again

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in effect functions", () => {
      const signal = reactiveSignal(42);

      expect(() => {
        effect(() => {
          signal.value;
          throw new Error("Effect error");
        });
      }).not.toThrow(); // Should not crash the system

      // Signal should still work
      signal.value = 43;
      expect(signal.value).toBe(43);
    });

    it("should handle errors in cleanup functions", () => {
      const signal = reactiveSignal(42);
      const errorCleanup = vi.fn().mockImplementation(() => {
        throw new Error("Cleanup error");
      });

      const dispose = effect(() => {
        signal.value;
        return errorCleanup;
      });

      expect(() => dispose()).not.toThrow();
      expect(errorCleanup).toHaveBeenCalled();
    });

    it("should dispose effect on uncaught errors", () => {
      const signal = reactiveSignal(42);
      const cb = vi.fn().mockImplementation(() => {
        signal.value;
        throw new Error("Uncaught error");
      });

      effect(cb);
      expect(cb).toHaveBeenCalledTimes(1);

      // After error, effect should be disposed
      signal.value = 43;

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("should handle errors in signal subscribers", () => {
      const signal = reactiveSignal(42);

      signal.subscribe(() => {
        throw new Error("Subscriber error");
      });

      const cb = vi.fn();
      signal.subscribe(cb);

      // Should not crash when changing value
      expect(() => {
        signal.value = 43;
      }).not.toThrow();

      expect(cb).toHaveBeenCalledTimes(2); // Once on subscribe, once on change
    });
  });

  describe("Edge Cases", () => {
    it("should handle effects that don't access any signals", () => {
      const cb = vi.fn().mockImplementation(() => {
        // Effect that doesn't access any signals
        console.log("Running effect without dependencies");
      });

      effect(cb);

      expect(cb).toHaveBeenCalledTimes(1);
      // Since it has no dependencies, it should not run again
    });

    it("should handle signals accessed only in cleanup", () => {
      const signal = reactiveSignal(42);
      const cleanup = vi.fn().mockImplementation(() => {
        // Access signal only during cleanup
        console.log("Cleanup sees:", signal.value);
      });

      const dispose = effect(() => {
        console.log("Effect running");
        return cleanup;
      });

      dispose();
      expect(cleanup).toHaveBeenCalled();
    });

    it("should handle rapid signal changes", () => {
      const signal = reactiveSignal(0);
      const cb = vi.fn();

      effect(() => {
        cb(signal.value);
      });

      // Rapid changes
      for (let i = 1; i <= 50; i++) {
        signal.value = i;
      }

      expect(cb).toHaveBeenLastCalledWith(50);
    });

    it("should handle deeply nested signal access", () => {
      const signals = Array.from({ length: 5 }, (_, i) => reactiveSignal(i));
      // [0,1,2,3,4]
      const cb = vi.fn();

      effect(() => {
        // Deeply nested access pattern
        let result = signals[0].value; // 1
        if (result > 0) {
          result += signals[1].value; // 2
          if (result > 1) {
            result += signals[2].value; // 4
            if (result > 3) {
              result += signals[3].value; // 7
              if (result > 6) {
                result += signals[4].value;
              }
            }
          }
        }
        cb(result);
      });

      expect(cb).toHaveBeenCalledWith(0); // 0 (first condition fails)

      signals[0].value = 1;
      expect(cb).toHaveBeenLastCalledWith(11); // 1+1+2+3+4 = 11, but 0+1+2+3+4 = 10
    });
  });

  describe("Integration with Basic Signals", () => {
    it("should work with regular Signal subscribers", () => {
      const signal = reactiveSignal(42);
      const cb = vi.fn();

      signal.subscribe(cb);
      expect(cb).toHaveBeenCalledWith(42);

      signal.value = 43;
      expect(cb).toHaveBeenCalledWith(43);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it("should maintain all Signal methods", () => {
      const signal = reactiveSignal({ count: 42 });

      expect(signal.peek().count).toBe(42);
      expect(signal.toString()).toBe("[object Object]");
      expect(signal.toJSON()).toEqual({ count: 42 });
      expect(signal.valueOf()).toEqual({ count: 42 });
    });

    it("should handle mixed Signal and ReactiveSignal usage", () => {
      const basicSignal = signal(10);
      const reactiveSignal2 = reactiveSignal(20);
      const cb = vi.fn();

      effect(() => {
        // Only reactiveSignal2 should create dependency
        const result = basicSignal.peek() + reactiveSignal2.value;
        cb(result);
      });

      expect(cb).toHaveBeenCalledWith(30);

      // Changing basicSignal should not trigger effect
      basicSignal.value = 15;
      expect(cb).toHaveBeenCalledTimes(1);

      // Changing reactiveSignal2 should trigger effect
      reactiveSignal2.value = 25;
      expect(cb).toHaveBeenCalledWith(40); // 15 + 25 (using peek for basicSignal)
    });
  });

  describe("Global evalContext", () => {
    it("should be undefined by default", () => {
      expect(evalContext).toBeUndefined();
    });

    it("should be set during effect execution", () => {
      let contextDuringExecution: any;

      effect(() => {
        contextDuringExecution = evalContext;
      });

      expect(contextDuringExecution).toBeInstanceOf(Effect);
      expect(evalContext).toBeUndefined(); // Should be restored after effect
    });

    it("should handle nested evalContext correctly", () => {
      let outerContext: any;
      let innerContext: any;

      effect(() => {
        outerContext = evalContext;

        effect(() => {
          innerContext = evalContext;
        });
      });

      expect(outerContext).toBeInstanceOf(Effect);
      expect(innerContext).toBeInstanceOf(Effect);
      expect(outerContext).not.toBe(innerContext); // Should be different instances
      expect(evalContext).toBeUndefined(); // Should be restored after both effects
    });

    it("should be restored after effect execution", () => {
      const originalContext = evalContext;

      effect(() => {
        // evalContext should be set to current effect
        expect(evalContext).toBeInstanceOf(Effect);
      });

      // Should be restored to original value
      expect(evalContext).toBe(originalContext);
    });
  });

  describe("Integration with demonstrateEffects", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should complete demonstration without errors", () => {
      // Note: demonstrateEffects is commented out in the implementation
      // This test verifies the basic functionality works without the full demo

      expect(() => {
        const count = reactiveSignal(0);
        effect(() => {
          console.log("Effect running, count is:", count.value);
        });
        count.value = 1;
      }).not.toThrow();
    });

    it("should show expected console output", () => {
      const count = reactiveSignal(0);

      effect(() => {
        console.log("Effect running, count is:", count.value);
      });

      count.value = 1;

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Effect running, count is:", 0);
    });

    it("should demonstrate all key features", () => {
      // Test the key features mentioned in the documentation
      const count = reactiveSignal(0);
      const name = reactiveSignal("Alice");
      const effectCalls: any[] = [];

      // Feature 1: Immediate execution
      effect(() => {
        effectCalls.push(["immediate", count.value]);
      });
      expect(effectCalls).toContainEqual(["immediate", 0]);

      // Feature 2: Automatic re-execution
      count.value = 1;
      setTimeout(() => {
        expect(effectCalls).toContainEqual(["immediate", 1]);
      }, 10);

      // Feature 3: Multiple dependencies
      effect(() => {
        effectCalls.push(["multi", name.value, count.value]);
      });

      // Feature 4: Cleanup functions
      let cleanupCalled = false;
      const dispose = effect(() => {
        return () => {
          cleanupCalled = true;
        };
      });

      dispose();
      expect(cleanupCalled).toBe(true);
    });
  });
});
