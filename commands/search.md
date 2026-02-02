# /search <query> - Search Learnings

Search the pro-workflow learnings database using full-text search (BM25).

## Usage

```
/search testing
/search "file paths"
/search git commit
```

## Search Features

- **BM25 ranking**: Results are ranked by relevance
- **Prefix matching**: "test" matches "testing", "tests", etc.
- **Phrase search**: Use quotes for exact phrases
- **Multiple terms**: Space-separated terms are OR'd together

## Output Format

```
Found 3 learnings matching "testing":

#1 [Testing] Always run tests before commit
   Mistake: Pushed broken code
   Applied: 5 times

#2 [Testing] Use --related flag to run only affected tests
   Mistake: Ran full test suite unnecessarily
   Applied: 2 times

#3 [Quality] Mock external APIs in tests
   Mistake: Tests failed due to network issues
   Applied: 1 time
```

## Options

- **Category filter**: `/search testing category:Quality`
- **Project filter**: `/search testing project:my-app`
- **Limit results**: Results are limited to top 10 by default

## Related Commands

- `/learn` - Add a new learning to the database
- `/list` - List all learnings (no search filter)
- `/stats` - Show learning analytics (coming soon)

---

**Trigger:** Use when user asks "how did I handle...", "what was the rule for...", or needs to recall a past learning.
