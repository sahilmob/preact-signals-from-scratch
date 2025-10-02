import { linkedReactiveSignal, linkedEffect } from "./04-linked-lists";

const s = linkedReactiveSignal(42);
const s1 = linkedReactiveSignal(42);
linkedEffect(() => {
  console.log(s.value + s1.value);
});

console.log((s1 as any)._depsHead);
