---
name: tdd
description: Drive a change through a red-green-refactor loop - failing test first, minimal code to pass, then clean up. Use when implementing a feature or fixing a bug where correctness matters and a test can pin the behavior. Says "TDD", "test first", "red green refactor", "write the test first".
user-invocable: true
---

# tdd

The agent codes better with a tight feedback loop than with a long
specification. A failing test is the tightest loop there is: it states the
target, and the target either goes green or it does not.

## The loop

1. **Red.** Write one failing test that states the next slice of behavior.
   Run it. Confirm it fails for the right reason - a test that passes before
   you write the code is testing nothing. If it errors instead of failing on
   the assertion, fix the test setup first.
2. **Green.** Write the least code that makes the test pass. Not the general
   solution, not the abstraction - the minimal move. Run the test. Green.
3. **Refactor.** Now clean up with the test as a net: remove duplication,
   name things, simplify. Re-run after every edit. Behavior is frozen; only
   the shape changes.
4. Repeat for the next slice. Small slices. The rate of feedback is the
   speed limit - never take on a step too big to hold a single test.

## What makes a test worth writing

- **Tests behavior, not implementation.** Assert on the observable result,
  not on which private method got called. A test that breaks on every
  refactor is a liability.
- **One reason to fail.** Each test pins one behavior. When it goes red you
  should know what broke without reading the body.
- **Real seams, minimal mocks.** Mock at the system boundary (network, clock,
  filesystem), not internal collaborators. A test that mocks the thing under
  test asserts nothing.
- **No tautologies.** A test that restates the implementation (`expect(x).toBe(x)`
  after setting `x`) verifies nothing. Assert the value the behavior should produce.

## When to reach for it

Reach for TDD when the behavior is specifiable and a test can pin it: business
logic, parsers, state machines, bug fixes (write the failing case first, then
fix). Skip it for pure exploration, throwaway spikes, and layout-only UI where
a test asserts nothing a human would not eyeball.

## Output contract

Show each red-green transition, not just the final green. If a test is hard to
write, say what the difficulty reveals about the design - untestable code is
usually badly-seamed code, and that is a finding, not an obstacle.
