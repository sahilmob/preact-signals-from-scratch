/**
 * Unit Tests for Phase 1: Basic Signal Implementation
 *
 * Test Categories:
 * - Value storage and access
 * - Change notifications
 * - Subscription management
 * - Type safety and edge cases
 * - Signal factory functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Signal, signal } from "./01-basic-signal.js";

describe("Phase 1: Basic Signal Implementation", () => {
  describe("Signal Class Constructor", () => {
    it("should create signal with initial value", () => {
      const s = signal(42);
      expect(s.value).toBe(42);
    });

    it("should work with different data types", () => {
      const sString = signal("hello");
      const sNumber = signal(42);
      const sBool = signal(true);
      const sObj = signal({ someVal: 42 });
      const sArr = signal([1, 2, 3, 42]);
      const sNull = signal(null);
      const sUndefined = signal(undefined);

      expect(sString.value).toEqual("hello");
      expect(sNumber.value).toEqual(42);
      expect(sBool.value).toEqual(true);
      expect(sObj.value).toEqual({ someVal: 42 });
      expect(sArr.value).toEqual([1, 2, 3, 42]);
      expect(sNull.value).toEqual(null);
      expect(sUndefined.value).toEqual(undefined);
    });
  });

  describe("Value Property Access", () => {
    it("should return current value when accessed", () => {
      const s = signal(42);
      expect(s.value).toBe(42);
    });

    it("should update value when set", () => {
      const s = signal(42);
      s.value = 43;
      expect(s.value).toBe(43);
    });

    it("should not trigger notifications for same value", () => {
      const cb = vi.fn();
      const s = signal(42);
      s.subscribe(cb);
      s.value = 42;

      expect(cb).toHaveBeenCalledOnce();
    });

    it("should handle NaN and zero comparison correctly", () => {
      const cb = vi.fn();
      const s = signal(NaN);
      s.subscribe(cb);
      s.value = NaN;
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe("Subscription System", () => {
    let testSignal: Signal<number>;
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      testSignal = signal(42);
      mockCallback = vi.fn();
    });

    it("should call callback immediately on subscription", () => {
      testSignal.subscribe(mockCallback);
      expect(mockCallback).toHaveBeenCalledOnce();
    });

    it("should call callback when value changes", () => {
      testSignal.subscribe(mockCallback);
      testSignal.value = 43;
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it("should call all subscribers when value changes", () => {
      const subs = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
      subs.forEach((v) => testSignal.subscribe(v));
      subs.forEach((s) => expect(s).toHaveBeenCalledOnce());
    });

    it("should return unsubscribe function", () => {
      const unsub = testSignal.subscribe(mockCallback);
      expect(unsub).toBeInstanceOf(Function);
    });

    it("should stop calling callback after unsubscribe", () => {
      const unsub = testSignal.subscribe(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(42);
      unsub();
      testSignal.value = 43;
      expect(mockCallback).toHaveBeenCalledOnce();
    });

    it("should handle subscriber errors gracefully", () => {
      testSignal.subscribe((_) => {
        throw Error("Unexpected error.");
      });
      testSignal.subscribe(mockCallback);
      testSignal.value = 43;
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple unsubscribes safely", () => {
      const subs = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
      testSignal.subscribe(mockCallback);
      let unsubs = subs.map((v) => testSignal.subscribe(v));
      testSignal.value = 43;
      unsubs.forEach((u) => u());
      testSignal.value = 44;
      expect(mockCallback).toHaveBeenLastCalledWith(44);
    });
  });

  describe("Peek Method", () => {
    let testSignal: Signal<number>;
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      testSignal = signal(42);
      mockCallback = vi.fn();
    });

    it("should return current value without side effects", () => {
      testSignal.subscribe(mockCallback);
      testSignal.peek();
      expect(mockCallback).toHaveBeenCalledOnce();
    });

    it("should return same value as .value getter", () => {
      expect(testSignal.value).toEqual(testSignal.peek());
    });
  });

  describe("Serialization Methods", () => {
    let testSignal: Signal<number>;
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      testSignal = signal(42);
      mockCallback = vi.fn();
    });

    it("should convert to string correctly", () => {
      expect(testSignal.toString()).toEqual("42");
    });

    it("should serialize to JSON correctly", () => {
      expect(testSignal.toJSON()).toEqual(42);
    });

    it("should provide correct value coercion", () => {
      expect(testSignal.valueOf()).toEqual(42);
      // Note: TypeScript doesn't allow implicit coercion, but JavaScript would
      expect(Number(testSignal) + 1).toEqual(43);
    });
  });

  describe("Signal Factory Function", () => {
    it("should create Signal instance with value", () => {
      const s = signal(42);
      expect(s).toBeInstanceOf(Signal);
    });

    it("should create Signal with undefined when no value provided", () => {
      expect(signal().value).toEqual(undefined);
    });

    it("should maintain type safety", () => {
      // TODO: Test TypeScript type inference works correctly
    });

    it("should create independent signal instances", () => {
      const s1 = signal(42);
      const s2 = signal(42);
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      s1.subscribe(cb1);
      s2.subscribe(cb2);

      s1.value = 43;
      s2.value = 43;
      expect(cb1).toHaveBeenCalledTimes(2);
      expect(cb2).toHaveBeenCalledTimes(2);
    });
  });

  describe.skip("Edge Cases and Error Handling", () => {
    it("should handle circular references in objects", () => {
      // TODO: Test with objects that have circular references
    });

    it("should handle very large numbers", () => {
      // TODO: Test with Number.MAX_VALUE, Number.MIN_VALUE, Infinity
    });

    it("should handle special string values", () => {
      // TODO: Test with empty string, whitespace, unicode characters
    });

    it("should work with complex nested objects", () => {
      // TODO: Test with deeply nested objects and arrays
    });
  });

  describe("Performance and Memory", () => {
    it("should not leak memory when subscribers are removed", () => {
      const s = signal(1);
      const callbacks: Array<() => void> = [];

      // Add many subscribers
      for (let i = 0; i < 100; i++) {
        const unsub = s.subscribe(() => {});
        callbacks.push(unsub);
      }

      // Remove all subscribers
      callbacks.forEach((unsub) => unsub());

      // Signal should have no subscribers
      expect((s as any)._subscribers.size).toBe(0);
    });

    it("should handle many subscribers efficiently", () => {
      const s = signal(1);
      const callbacks = [];

      // Add 1000 subscribers
      for (let i = 0; i < 1000; i++) {
        callbacks.push(vi.fn());
        s.subscribe(callbacks[i]);
      }

      // Change value and verify all were called
      s.value = 2;
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledTimes(2); // Once on subscribe, once on change
      });
    });

    it("should handle rapid value changes", () => {
      const s = signal(0);
      const callback = vi.fn();
      s.subscribe(callback);

      // Rapid changes
      for (let i = 1; i <= 100; i++) {
        s.value = i;
      }

      expect(callback).toHaveBeenCalledTimes(101); // Initial + 100 changes
      expect(callback).toHaveBeenLastCalledWith(100);
    });
  });

  describe("Integration with demonstrateBasicSignal", () => {
    it("should pass all demonstration test cases", () => {
      let consoleSpy = vi.spyOn(console, "log");

      // Import and run the demonstration
      const { demonstrateBasicSignal } = require("./01-basic-signal.ts");

      expect(() => demonstrateBasicSignal()).not.toThrow();

      // Verify some expected console output
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
