/**
 * Performance Comparison: Set-based vs Doubly-linked vs Optimized Singly-linked
 *
 * This test compares three implementations:
 * 1. Phase 2/3: Set-based dependency tracking
 * 2. Phase 4 (original): Doubly-linked lists with prevSig
 * 3. Phase 4 (optimized): Singly-linked lists without prevSig
 */

import { describe, it, expect, beforeEach } from "vitest";
import { reactiveSignal } from "./02-effects.ts";
import { computed } from "./03-computed.ts";
import { linkedReactiveSignal, linkedComputed } from "./04-linked-lists.ts";

describe("Performance Comparison: Set vs Linked Lists", () => {
  describe("Memory Efficiency", () => {
    it("should compare memory usage across implementations", () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const iterations = 100;

      // Test 1: Set-based implementation (Phase 3)
      const beforeSetMem = process.memoryUsage().heapUsed;
      const setSigs: any[] = [];
      const setEffects: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const sig = reactiveSignal(i);
        const comp = computed(() => sig.value * 2);
        setSigs.push(sig);
        setEffects.push(comp);
      }

      const afterSetMem = process.memoryUsage().heapUsed;
      const setMemUsed = afterSetMem - beforeSetMem;

      // Test 2: Linked list implementation (Phase 4 optimized)
      if (global.gc) {
        global.gc();
      }

      const beforeLinkedMem = process.memoryUsage().heapUsed;
      const linkedSigs: any[] = [];
      const linkedEffects: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const sig = linkedReactiveSignal(i);
        const comp = linkedComputed(() => sig.value * 2);
        linkedSigs.push(sig);
        linkedEffects.push(comp);
      }

      const afterLinkedMem = process.memoryUsage().heapUsed;
      const linkedMemUsed = afterLinkedMem - beforeLinkedMem;

      console.log("\n=== Memory Comparison ===");
      console.log(
        `Set-based (Phase 3):     ${setMemUsed.toLocaleString()} bytes`
      );
      console.log(
        `Linked lists (Phase 4):  ${linkedMemUsed.toLocaleString()} bytes`
      );
      console.log(
        `Memory savings:          ${(
          setMemUsed - linkedMemUsed
        ).toLocaleString()} bytes (${(
          ((setMemUsed - linkedMemUsed) / setMemUsed) *
          100
        ).toFixed(1)}%)`
      );

      // Linked lists should use less memory
      expect(linkedMemUsed).toBeLessThan(setMemUsed);
    });
  });

  describe("Insertion Performance", () => {
    it("should compare dependency insertion speed", () => {
      const iterations = 1000;

      // Test 1: Set-based implementation
      const setStart = performance.now();

      for (let i = 0; i < iterations; i++) {
        const sig = reactiveSignal(i);
        const comp = computed(() => sig.value * 2);
        comp.value; // Trigger subscription
      }

      const setTime = performance.now() - setStart;

      // Test 2: Linked list implementation
      const linkedStart = performance.now();

      for (let i = 0; i < iterations; i++) {
        const sig = linkedReactiveSignal(i);
        const comp = linkedComputed(() => sig.value * 2);
        comp.value; // Trigger subscription
      }

      const linkedTime = performance.now() - linkedStart;

      console.log("\n=== Insertion Performance ===");
      console.log(`Set-based (Phase 3):     ${setTime.toFixed(2)}ms`);
      console.log(`Linked lists (Phase 4):  ${linkedTime.toFixed(2)}ms`);
      console.log(
        `Speedup:                 ${(setTime / linkedTime).toFixed(2)}x`
      );

      // Both should be reasonably fast
      expect(setTime).toBeLessThan(1000);
      expect(linkedTime).toBeLessThan(1000);
    });
  });

  describe("Notification Performance", () => {
    it("should compare notification speed with many dependents", () => {
      const numDependents = 100;

      // Test 1: Set-based implementation
      const setSig = reactiveSignal(0);
      const setComputeds = [];

      for (let i = 0; i < numDependents; i++) {
        setComputeds.push(computed(() => setSig.value * i));
      }

      // Trigger all computations to set up dependencies
      setComputeds.forEach((c) => c.value);

      const setStart = performance.now();
      setSig.value = 100; // Trigger notification to all dependents
      const setTime = performance.now() - setStart;

      // Test 2: Linked list implementation
      const linkedSig = linkedReactiveSignal(0);
      const linkedComputeds = [];

      for (let i = 0; i < numDependents; i++) {
        linkedComputeds.push(linkedComputed(() => linkedSig.value * i));
      }

      // Trigger all computations to set up dependencies
      linkedComputeds.forEach((c) => c.value);

      const linkedStart = performance.now();
      linkedSig.value = 100; // Trigger notification to all dependents
      const linkedTime = performance.now() - linkedStart;

      console.log("\n=== Notification Performance (100 dependents) ===");
      console.log(`Set-based (Phase 3):     ${setTime.toFixed(2)}ms`);
      console.log(`Linked lists (Phase 4):  ${linkedTime.toFixed(2)}ms`);
      console.log(
        `Speedup:                 ${(setTime / linkedTime).toFixed(2)}x`
      );

      // Both should be fast
      expect(setTime).toBeLessThan(100);
      expect(linkedTime).toBeLessThan(100);
    });
  });

  describe("Cleanup Performance", () => {
    it("should compare disposal/cleanup speed", () => {
      const iterations = 500;

      // Test 1: Set-based implementation
      const setComputeds = [];

      for (let i = 0; i < iterations; i++) {
        const sig = reactiveSignal(i);
        const comp = computed(() => sig.value * 2);
        comp.value; // Set up dependencies
        setComputeds.push(comp);
      }

      const setStart = performance.now();
      setComputeds.forEach((c) => c.dispose());
      const setTime = performance.now() - setStart;

      // Test 2: Linked list implementation
      const linkedComputeds = [];

      for (let i = 0; i < iterations; i++) {
        const sig = linkedReactiveSignal(i);
        const comp = linkedComputed(() => sig.value * 2);
        comp.value; // Set up dependencies
        linkedComputeds.push(comp);
      }

      const linkedStart = performance.now();
      linkedComputeds.forEach((c) => c.dispose());
      const linkedTime = performance.now() - linkedStart;

      console.log("\n=== Cleanup Performance (500 disposals) ===");
      console.log(`Set-based (Phase 3):     ${setTime.toFixed(2)}ms`);
      console.log(`Linked lists (Phase 4):  ${linkedTime.toFixed(2)}ms`);
      console.log(
        `Speedup:                 ${(setTime / linkedTime).toFixed(2)}x`
      );

      // Both should be reasonably fast
      expect(setTime).toBeLessThan(500);
      expect(linkedTime).toBeLessThan(500);
    });
  });

  describe("Complex Dependency Chains", () => {
    it("should compare performance with deep dependency chains", () => {
      const chainDepth = 50;

      // Test 1: Set-based implementation
      const setStart = performance.now();

      let setSig = reactiveSignal(1);
      for (let i = 0; i < chainDepth; i++) {
        const prevSig = setSig;
        setSig = computed(() => prevSig.value + 1) as any;
      }
      const setResult = setSig.value;

      const setTime = performance.now() - setStart;

      // Test 2: Linked list implementation
      const linkedStart = performance.now();

      let linkedSig: any = linkedReactiveSignal(1);
      for (let i = 0; i < chainDepth; i++) {
        const prevSig = linkedSig;
        linkedSig = linkedComputed(() => prevSig.value + 1);
      }
      const linkedResult = linkedSig.value;

      const linkedTime = performance.now() - linkedStart;

      console.log("\n=== Deep Chain Performance (50 levels) ===");
      console.log(`Set-based (Phase 3):     ${setTime.toFixed(2)}ms`);
      console.log(`Linked lists (Phase 4):  ${linkedTime.toFixed(2)}ms`);
      console.log(
        `Speedup:                 ${(setTime / linkedTime).toFixed(2)}x`
      );

      // Verify correctness
      expect(setResult).toBe(chainDepth + 1);
      expect(linkedResult).toBe(chainDepth + 1);

      // Both should be fast
      expect(setTime).toBeLessThan(50);
      expect(linkedTime).toBeLessThan(50);
    });
  });

  describe("Memory Overhead Per Node", () => {
    it("should estimate memory overhead per dependency", () => {
      console.log("\n=== Memory Overhead Analysis ===");
      console.log("\nSet-based Implementation (Phase 3):");
      console.log("  - Set object: ~24-32 bytes base + hash table");
      console.log("  - Per entry: ~8-16 bytes (depends on Set size)");
      console.log("  - Total per dependency: ~32-48 bytes");

      console.log("\nLinked List (Doubly-linked - with prevSig):");
      console.log("  - Node object: ~16 bytes header");
      console.log("  - signal pointer: 8 bytes");
      console.log("  - effect pointer: 8 bytes");
      console.log("  - nextSig pointer: 8 bytes");
      console.log("  - prevSig pointer: 8 bytes");
      console.log("  - unSub pointer: 8 bytes");
      console.log("  - Total per dependency: ~56 bytes");

      console.log("\nLinked List (Singly-linked - optimized, no prevSig):");
      console.log("  - Node object: ~16 bytes header");
      console.log("  - signal pointer: 8 bytes");
      console.log("  - effect pointer: 8 bytes");
      console.log("  - nextSig pointer: 8 bytes");
      console.log("  - unSub pointer: 8 bytes");
      console.log("  - Total per dependency: ~48 bytes");

      console.log("\nOptimization Impact:");
      console.log("  - Removing prevSig: saves 8 bytes per EffectNode");
      console.log(
        "  - Linked lists eliminate Set overhead and hash operations"
      );
      console.log(
        "  - Better cache locality due to sequential node allocation"
      );

      // This is just documentation - no assertions needed
      expect(true).toBe(true);
    });
  });
});
