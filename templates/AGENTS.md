# [Project Name]

## Build / Test / Lint
```bash
[build command]      # Build the project
[test command]       # Run tests
[lint command]       # Lint and format
[typecheck command]  # Type checking (if applicable)
```

## Code Style
- [Language] with [framework]
- [Naming convention: e.g., camelCase for variables, PascalCase for types]
- [Import ordering: e.g., stdlib > external > internal > relative]
- [Error handling pattern: e.g., Result types, try/catch, error codes]
- [Test file convention: e.g., __tests__/foo.test.ts, foo_test.go]

## Architecture
```text
src/
  [layer]/       # [Purpose]
  [layer]/       # [Purpose]
  [layer]/       # [Purpose]
```

Key decisions:
- [State management approach]
- [API pattern: REST/GraphQL/RPC]
- [Database and ORM]

## Gotchas
- [Thing that breaks if you forget it]
- [Non-obvious dependency or ordering requirement]
- [Environment variable that must be set]
- [Command that must run after schema/config changes]

## Do NOT
- [Anti-pattern specific to this project]
- [File or directory to never modify directly]
- [Deprecated approach that still appears in old code]
