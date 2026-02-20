# Rewriting Strategies

Rules for Agent 2 (Rewriter) when fixing flagged sections.

## Priority Order

1. **Cut it.** If the flagged text is filler, delete it. Don't replace filler with different filler.
2. **Shorten it.** AI writes 20 words where 8 work. Compress.
3. **Make it specific.** Replace abstractions with concrete details from the content.
4. **Match the voice.** Use vocabulary and rhythm from the user's writing samples.
5. **Read it aloud.** If it sounds like a press release, rewrite it.

## Word-Level Fixes

When a banned word is flagged:
- Use the stored alternative directly
- If alternative is `[remove]` or `[cut]`, delete the word and restructure
- If alternative is `[be specific]`, look at context and replace with concrete term

## Phrase-Level Fixes

When a banned phrase is flagged:
- If alternative is `[cut entirely]`, remove the full phrase and check if sentence still works
- If sentence collapses without the phrase, the sentence was probably filler too. Cut it.
- If alternative is `[restructure]`, rewrite the entire sentence, not just the phrase

## Structure-Level Fixes

When a banned structure is flagged:
- Read the 2 paragraphs before and after for rhythm context
- Apply the stored alternative strategy
- Verify the fix doesn't introduce a different banned structure

## Voice Matching

Agent 2 should:
- Read all entries in `rewriting/examples.json` before starting
- Note sentence length distribution (short sentences? long? mixed?)
- Note vocabulary level (technical? casual? mixed?)
- Note punctuation habits (em dashes? semicolons? parentheticals?)
- Mirror these patterns in rewrites

## What NOT to Do

- Don't make it "folksy" unless the user writes folksy
- Don't add slang that isn't in the user's samples
- Don't over-correct into choppy telegram-style prose
- Don't introduce new AI-isms while fixing old ones
