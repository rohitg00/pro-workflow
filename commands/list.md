# /list - List All Learnings

Display all learnings stored in the pro-workflow database.

## Usage

```
/list
/list recent
/list category:Testing
/list project:my-app
```

## Output Format

```
Pro-Workflow Learnings (15 total)

Recent learnings:
#42 [Navigation] Confirm full path when multiple files share a name
    Applied: 3 times | Created: 2026-02-01

#41 [Testing] Always run tests before commit
    Applied: 5 times | Created: 2026-01-28

#40 [Git] Use feature branches for all changes
    Applied: 8 times | Created: 2026-01-25

... and 12 more. Use /search to filter.
```

## Options

- **recent**: Show most recently created (default)
- **applied**: Sort by times_applied (most useful learnings)
- **category:<name>**: Filter by category
- **project:<name>**: Filter by project

## Categories

Available categories:
- Navigation
- Editing
- Testing
- Git
- Quality
- Context
- Architecture
- Performance
- Claude-Code
- Prompting

## Related Commands

- `/learn` - Add a new learning
- `/search <query>` - Search learnings by keyword

---

**Trigger:** Use when user wants to review all learnings, see what patterns have been captured, or browse the knowledge base.
