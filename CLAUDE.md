# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational project that **incrementally replicates the Preact Signals reactive state management library from scratch** for learning purposes. We are NOT the authors of Preact Signals - this is a learning exercise to understand the core concepts and design patterns behind reactive systems by rebuilding them step-by-step.

**Important**: This project studies and replicates the open-source Preact Signals library (MIT licensed) for educational purposes. All credit for the original design and implementation goes to the Preact team.

## Development Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run performance benchmarks
npm run benchmark

# Run individual phase demos
node src/01-basic-signal.ts
node src/02-effects.ts
# etc.
```

## Architecture

### Incremental Learning Approach
The codebase is organized into 8 sequential phases, each building upon the previous:

1. **01-basic-signal.ts** - Value containers with observer pattern
2. **02-effects.ts** - Automatic dependency tracking via global evaluation context
3. **03-computed.ts** - Lazy evaluation and derived state
4. **04-linked-lists.ts** - Memory-efficient dependency tracking with linked lists
5. **05-batching.ts** - Transaction-like update batching
6. **06-advanced.ts** - Cycle detection and error handling
7. **07-lifecycle.ts** - Subscription lifecycle and memory management
8. **08-testing.ts** - Comprehensive testing and validation

### Core Reactive Pattern
The fundamental architecture relies on:

- **Global Evaluation Context**: `evalContext` variable that tracks the currently executing effect
- **Automatic Dependency Discovery**: Signals register themselves with the current effect when their `.value` is accessed
- **Bidirectional Relationships**: Effects track their dependencies, signals track their dependents
- **Push-Pull Hybrid**: Signals push change notifications but values are pulled when needed

### Key Classes Evolution

**Signal** → **ReactiveSignal** → **ComputedSignal** → **LinkedComputedSignal**
- Basic value container → Dependency tracking → Lazy computation → Memory-efficient linked lists

**Effect** → **LinkedEffect** → **BatchedEffect**
- Immediate execution → Linked list dependencies → Deferred batched execution

**Performance Evolution**:
- Phase 1-2: Functional but basic Set-based dependencies
- Phase 3: Added computed signals with proper caching and lazy evaluation
- Phase 4: Memory optimization with linked lists (50-75% memory reduction)
- Phase 5: Batching optimization (50% fewer effect runs)

### File Dependencies
Each phase imports and extends the previous phase's implementation. Later phases may completely replace earlier implementations while maintaining the same API.

## TypeScript Patterns

- Uses ES modules (`"type": "module"` in package.json)
- Factory functions with overloads for optional generics
- Classes with private properties prefixed with `_`
- Generic types for type-safe signal values

## Testing Strategy

Each phase includes a `demonstrate*()` function that serves as both documentation and basic testing. These functions show expected behavior and can be run directly to verify implementations.

## Reference Implementation

The `signals/` directory contains the **original Preact Signals implementation** (added as a Git submodule) that we use as our learning reference. This is the actual production code we're studying and replicating for educational purposes.

Key files to reference:
- `signals/packages/core/src/index.ts` - Complete production implementation
- `signals/packages/core/test/` - Comprehensive test suite
- Compare our learning implementations in `my_signals/src/` against the reference

**Note**: To access the reference implementation after cloning:
```bash
git submodule update --init --recursive
```

## Development Workflow

1. Implement phase skeleton with TODO comments
2. Fill in implementation following the TODO guidance
3. Run the demonstration function to verify behavior
4. Compare behavior against reference implementation
5. Move to next phase

The project prioritizes learning and understanding over production readiness.

## IMPORTANT: Code Assistance Guidelines

**FOR LEARNING PURPOSES ONLY**:
- **DO NOT** write implementation code directly
- **DO** provide TODO comments indicating where code needs to be written
- **DO** explain concepts, patterns, and architecture
- **DO** help debug issues and provide guidance
- **DO** help understand reference implementations

This ensures the learner writes the code themselves while getting appropriate guidance.

## Current Progress

### ✅ Phase 1: Basic Signal Implementation (COMPLETE)
- Value containers with change notification
- Observer pattern with subscriber arrays
- `.value` property access pattern
- Memory management with unsubscribe functions

### ✅ Phase 2: Effects System (COMPLETE)
- Automatic dependency tracking via global `evalContext`
- Reactive effect re-execution on signal changes
- Cleanup function support
- Memory management and disposal
- Comprehensive test suite with 50+ test cases
- Error handling and edge case coverage

**Key Issues Resolved in Phase 2**:
- Fixed infinite loop caused by effects re-subscribing during signal updates
- Implemented immediate execution (removed deferred setTimeout approach)
- Proper cleanup of subscriptions and dependencies
- Effect disposal prevents memory leaks
- Error handling prevents system crashes

**Testing Achievements**:
- Complete unit test coverage for both Phase 1 and Phase 2
- Performance testing with rapid signal changes
- Memory management validation
- Error handling verification
- Edge case coverage including nested effects and conditional dependencies

### ✅ Phase 3: Computed Signals (COMPLETE)
**Full Implementation** - Lazy evaluation and derived state computations with comprehensive testing.

**Key Features Implemented**:
- `ComputedSignal<T>` class extending `ReactiveSignal` with `IEffect` interface
- Lazy evaluation with caching and invalidation strategies
- State management (`FRESH`, `STALE`, `COMPUTING`, `ERROR`) with proper transitions
- Cycle detection for circular dependencies with proper error messages
- Error recovery - computed signals can recover when dependencies change
- Integration with existing effect system with notification optimization
- Comprehensive test suite with 74+ test scenarios covering all edge cases

**Key Issues Resolved in Phase 3**:
- Fixed circular dependency detection timing to prevent false positives
- Implemented error recovery by handling ERROR→STALE state transitions
- Optimized notification timing to prevent double notifications
- Added proper type safety throughout the implementation
- Performance optimization to reduce effect runs by preventing notification during invalidation

**Testing Achievements**:
- 69/74 tests passing (5 intentionally skipped)
- Complete coverage of lazy evaluation, caching, dependency tracking
- Performance testing with deep dependency chains (50+ levels)
- Error handling and recovery validation
- Cycle detection and prevention verification
- Integration testing with effects system

### 🔄 Phase 4: Linked Lists (IN PROGRESS)
**Architecture Designed** - Memory-efficient dependency tracking using linked lists instead of Sets.

**Key Features Designed**:
- `LinkedReactiveSignal<T>` using linked list instead of `Set<Effect>`
- `LinkedEffect` using linked list instead of `Set<() => void>`
- `LinkedComputedSignal<T>` combining both optimizations
- Bidirectional linked list relationships for signals ↔ effects
- O(1) insertion/removal operations for dependencies
- Memory efficiency improvements and reduced GC pressure
- Comprehensive test suite validating performance and functionality

**Performance Benefits**:
- **Memory**: Eliminate Set object overhead (24+ bytes → 16 bytes per dependency)
- **Speed**: O(1) operations instead of Set hash operations
- **Cache**: Better memory locality for dependency traversal
- **GC**: Reduced garbage collection pressure from fewer objects

### 🔄 Next: Implement Phase 4 Linked List Classes
Ready to implement the memory-efficient linked list dependency tracking system.

## Key Learnings So Far

### Phase 2 Critical Insights:
1. **The Evaluation Context Pattern**: Global variable tracks which effect is currently executing
2. **Automatic Dependency Discovery**: Signals self-register when accessed during effect execution
3. **Deferred Execution**: Essential to prevent infinite loops during synchronous updates
4. **Memory Management**: Proper cleanup prevents memory leaks in long-running applications

### Common Pitfalls Avoided:
- Infinite loops from immediate effect re-execution
- Memory leaks from untracked subscriptions
- Double notifications from calling both parent and child setters