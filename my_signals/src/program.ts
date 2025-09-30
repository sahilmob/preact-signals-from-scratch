import { effect, reactiveSignal } from "./02-effects.ts";
import { computed } from "./03-computed.ts";

const s = reactiveSignal(42);
const c = computed(() => s.value + 2);

s.value = 44;

console.log(c.value);
console.log(c.value);
