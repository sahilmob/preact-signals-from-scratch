# My Signals - Learning Signals by Rebuilding from Scratch

This project rebuilds the Preact Signals library from scratch to understand the core concepts and design patterns behind reactive state management.

## Learning Journey

Each phase focuses on specific concepts and gradually builds up the complete implementation:

### Phase 1: Basic Signal (01-basic-signal.js)
**Key Concepts:**
- Value containers with change notifications
- Observer pattern in reactive systems
- Property getter/setter patterns

**What we'll discover:**
- Why signals use `.value` instead of function calls
- How property access enables transparent reactivity
- Basic subscription and notification patterns

### Phase 2: Effect System (02-effects.js)
**Key Concepts:**
- Automatic dependency tracking
- Evaluation context for capturing dependencies
- Effect disposal and cleanup

**What we'll discover:**
- How effects "know" which signals they depend on
- The global evaluation context pattern
- Memory management for subscriptions

### Phase 3: Computed Signals (03-computed.js)
**Key Concepts:**
- Lazy evaluation and caching
- Derived state patterns
- Invalidation propagation

**What we'll discover:**
- Why lazy evaluation is crucial for performance
- How computed signals minimize recalculations
- Cache invalidation strategies

### Phase 4: Linked List Optimization (04-linked-lists.js)
**Key Concepts:**
- Memory-efficient dependency tracking
- Bidirectional relationships
- Node recycling patterns

**What we'll discover:**
- Why arrays aren't optimal for dependencies
- How linked lists enable efficient subscription management
- Memory optimization techniques

### Phase 5: Batching System (05-batching.js)
**Key Concepts:**
- Transaction-like updates
- Preventing update storms
- Deferred execution patterns

**What we'll discover:**
- Why synchronous updates can be inefficient
- How batching maintains consistency
- Nested batch handling

### Phase 6: Advanced Features (06-advanced.js)
**Key Concepts:**
- Cycle detection
- Error boundaries
- Global versioning optimizations

**What we'll discover:**
- How to detect and prevent infinite loops
- Error handling in reactive graphs
- Performance optimizations for unchanged dependencies

### Phase 7: Lifecycle Management (07-lifecycle.js)
**Key Concepts:**
- Subscription lifecycle callbacks
- Lazy subscriptions
- Garbage collection optimization

**What we'll discover:**
- When to start/stop expensive operations
- How to prevent memory leaks
- Automatic cleanup strategies

### Phase 8: Testing & Validation (tests/)
**Key Concepts:**
- Edge case handling
- Performance benchmarking
- Memory leak detection

**What we'll discover:**
- Common pitfalls in reactive systems
- How to test async/reactive behavior
- Performance characteristics

## Running the Code

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run benchmarks
npm run benchmark
```

## Key Patterns Discovered

1. **Push-Pull Hybrid**: Signals push change notifications but pull values when needed
2. **Lazy by Default**: Computations only execute when someone is listening
3. **Fine-grained Updates**: Only the minimum necessary updates occur
4. **Memory Efficiency**: Careful management of subscriptions and dependencies
5. **Synchronous Consistency**: State is always consistent within a single update cycle

## Architecture Insights

The signals architecture demonstrates several important patterns:

- **Inversion of Control**: Effects register themselves rather than being called
- **Dependency Injection**: Dependencies are discovered automatically during execution
- **Observer Pattern**: Signals notify observers of changes
- **Flyweight Pattern**: Node recycling minimizes memory allocation
- **Strategy Pattern**: Different types of signals (computed, effect) use different update strategies

## Performance Optimizations

Key optimizations we'll implement:

1. **Global Version Numbers**: Quick checks for unchanged dependencies
2. **Lazy Subscriptions**: Computed signals only subscribe when needed
3. **Node Recycling**: Reuse dependency nodes to minimize GC pressure
4. **Batch Processing**: Group updates to minimize thrashing
5. **Early Exit**: Stop processing when cycles are detected