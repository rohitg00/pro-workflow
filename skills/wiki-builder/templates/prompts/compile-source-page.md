# Compile source page — {{TITLE}}

Given a single source (paper, blog, video transcript, doc), produce `wiki/<type>/<slug>.md` with:

1. **Front-matter**: title, source_id, page_type, last_verified.
2. **One-paragraph TL;DR** in plain language.
3. **Key claims** as bulleted list, each suffixed `[^src-id]`.
4. **Method / argument summary** — what the source actually does, not editorial.
5. **Open questions raised** — feed back into wiki seeds.
6. **Cross-links** — relative links to existing pages in this wiki when topics overlap.

Rules:
- Never paraphrase without citing.
- Never copy long verbatim quotes. Two sentences max per quote.
- If source is paywalled or `private: true`, skip web verification.
- Mark inferences with `> SPECULATION:`.
