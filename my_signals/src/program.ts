import { effect, reactiveSignal } from "./02-effects.ts";

const signal = reactiveSignal(42);
effect(() => {
  signal.value;
});

signal.value = 43;
signal.value = 44;
