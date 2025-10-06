import { advancedSignal } from "./src/06-advanced.ts";

const sig = advancedSignal(0);
let callback1Count = 0;
let callback2Count = 0;

const callback1 = (v: number) => {
  callback1Count++;
  console.log(`callback1 called (${callback1Count}):`, v);
};

const callback2 = (v: number) => {
  callback2Count++;
  console.log(`callback2 called (${callback2Count}):`, v);
};

console.log('Creating subscription 1...');
const dispose1 = sig.subscribe(callback1);
console.log(`After subscribe1: callback1Count = ${callback1Count}\n`);

console.log('Creating subscription 2...');
const dispose2 = sig.subscribe(callback2);
console.log(`After subscribe2: callback2Count = ${callback2Count}\n`);

console.log('Setting sig.value = 1...\n');
sig.value = 1;

console.log('\n=== Final counts ===');
console.log(`callback1: ${callback1Count} (expected 2)`);
console.log(`callback2: ${callback2Count} (expected 2)`);

if (callback1Count === 2 && callback2Count === 2) {
  console.log('\n✅ TEST PASSED');
} else {
  console.log('\n❌ TEST FAILED');
}
