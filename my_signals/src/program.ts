import { signal } from "./01-basic-signal.ts";
import { effect, reactiveSignal } from "./02-effects.ts";

const s = reactiveSignal(42);
effect(() => {
  s.value;
});

s.value = 43;
s.value = 43;
