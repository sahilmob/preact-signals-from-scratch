import { advancedSignal } from './src/06-advanced.ts';

const sig = advancedSignal(0);
let callback1Count = 0;
let callback2Count = 0;

const callback1 = (v) => {
  callback1Count++;
  console.log(`callback1 called (${callback1Count}):`, v);
};

const callback2 = (v) => {
  callback2Count++;
  console.log(`callback2 called (${callback2Count}):`, v);
};

console.log('Creating subscription 1...');
const dispose1 = sig.subscribe(callback1);

console.log('Creating subscription 2...');
const dispose2 = sig.subscribe(callback2);

console.log('\nSetting sig.value = 1...');
sig.value = 1;

console.log('\nFinal counts:');
console.log('callback1:', callback1Count, '(expected 2)');
console.log('callback2:', callback2Count, '(expected 2)');
