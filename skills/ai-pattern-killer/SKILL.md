---
name: ai-pattern-killer
description: Self-updating AI pattern detector and humanizer. Learns your voice from corrections, flags AI-isms, rewrites with 3 sub-agents. Gets sharper every time you use it.
tools: Read, Glob, Grep, Bash, Edit, Write, Task
---

# AI Pattern Killer

A living filter that learns what "sounds AI" and what sounds like you. Every correction sharpens it.

## How It Works

1. You write content with Claude
2. You spot an AI-ism (weird vocab, robotic structure, that "AI smell")
3. You flag it with `/flag`
4. The skill stores the pattern AND your preferred alternative
5. Next time, `/humanize` spawns 3 agents to clean your draft automatically

The more you use it, the sharper it gets.

---

## Quick Commands

| Command | What it does |
|---------|-------------|
| `/flag` | Flag an AI pattern with your preferred fix |
| `/humanize` | Run 3-agent pipeline on a draft |

---

## The 3-Agent Pipeline

When you run `/humanize`, Opus spawns 3 sub-agents:

### Agent 1: Detector
Reads your entire pattern database (banned words, phrases, structures) and flags every AI tell in the draft. Outputs a line-by-line flagged version with specific violations.

### Agent 2: Rewriter
Takes the flagged draft + your rewriting strategies + before/after examples. Rewrites each flagged section using YOUR voice patterns, not generic "human-sounding" text.

### Agent 3: Scorer
Scores each sentence 1-10 on a humanization scale calibrated to your writing samples. Anything below 7 gets sent back to Agent 2 for another pass. Final output includes per-sentence scores.

Three passes. Three filters. One output that sounds like you wrote it.

---

## Pattern Database

Located in `patterns/` directory:

### banned_words.json
Words that scream AI. Updated every time you `/flag` a word.

```json
{
  "words": [
    {"word": "leverage", "alternative": "use", "severity": "high", "flagged_count": 0},
    {"word": "utilize", "alternative": "use", "severity": "high", "flagged_count": 0},
    {"word": "delve", "alternative": "dig into", "severity": "high", "flagged_count": 0},
    {"word": "tapestry", "alternative": "[remove]", "severity": "high", "flagged_count": 0},
    {"word": "landscape", "alternative": "space", "severity": "medium", "flagged_count": 0},
    {"word": "robust", "alternative": "solid", "severity": "medium", "flagged_count": 0},
    {"word": "streamline", "alternative": "simplify", "severity": "medium", "flagged_count": 0},
    {"word": "facilitate", "alternative": "help", "severity": "high", "flagged_count": 0},
    {"word": "encompass", "alternative": "include", "severity": "high", "flagged_count": 0},
    {"word": "multifaceted", "alternative": "[simplify sentence]", "severity": "high", "flagged_count": 0},
    {"word": "furthermore", "alternative": "[cut or use 'also']", "severity": "medium", "flagged_count": 0},
    {"word": "moreover", "alternative": "[cut or use 'and']", "severity": "medium", "flagged_count": 0},
    {"word": "paramount", "alternative": "important", "severity": "high", "flagged_count": 0},
    {"word": "pivotal", "alternative": "key", "severity": "medium", "flagged_count": 0},
    {"word": "revolutionize", "alternative": "change", "severity": "high", "flagged_count": 0},
    {"word": "endeavor", "alternative": "try", "severity": "high", "flagged_count": 0},
    {"word": "foster", "alternative": "build", "severity": "medium", "flagged_count": 0},
    {"word": "navigate", "alternative": "work through", "severity": "low", "flagged_count": 0},
    {"word": "underscores", "alternative": "shows", "severity": "medium", "flagged_count": 0},
    {"word": "realm", "alternative": "[cut]", "severity": "high", "flagged_count": 0}
  ]
}
```

### banned_phrases.json
Dead giveaway phrases. Full phrases that no human writes.

```json
{
  "phrases": [
    {"phrase": "It's worth noting that", "alternative": "[cut entirely]", "severity": "high", "flagged_count": 0},
    {"phrase": "In today's rapidly evolving", "alternative": "[cut entirely]", "severity": "high", "flagged_count": 0},
    {"phrase": "Let's dive in", "alternative": "[cut or be specific]", "severity": "medium", "flagged_count": 0},
    {"phrase": "At the end of the day", "alternative": "[cut entirely]", "severity": "high", "flagged_count": 0},
    {"phrase": "In conclusion", "alternative": "[just conclude]", "severity": "medium", "flagged_count": 0},
    {"phrase": "It goes without saying", "alternative": "[then don't say it]", "severity": "high", "flagged_count": 0},
    {"phrase": "Here's the thing", "alternative": "[cut, state the thing]", "severity": "medium", "flagged_count": 0},
    {"phrase": "game-changer", "alternative": "[be specific about what changed]", "severity": "high", "flagged_count": 0},
    {"phrase": "a]testament to", "alternative": "shows", "severity": "high", "flagged_count": 0},
    {"phrase": "the power of", "alternative": "[be specific]", "severity": "medium", "flagged_count": 0},
    {"phrase": "This is where .* comes in", "alternative": "[name the thing directly]", "severity": "medium", "flagged_count": 0},
    {"phrase": "Whether you're a .* or a", "alternative": "[cut, be direct]", "severity": "high", "flagged_count": 0},
    {"phrase": "But here's the kicker", "alternative": "[just say it]", "severity": "high", "flagged_count": 0},
    {"phrase": "In the realm of", "alternative": "in", "severity": "high", "flagged_count": 0},
    {"phrase": "Not just .* but", "alternative": "[restructure]", "severity": "medium", "flagged_count": 0},
    {"phrase": "Think of it as", "alternative": "[just explain it]", "severity": "medium", "flagged_count": 0},
    {"phrase": "takes it to the next level", "alternative": "[be specific]", "severity": "high", "flagged_count": 0},
    {"phrase": "isn't just .* it's", "alternative": "[restructure]", "severity": "medium", "flagged_count": 0}
  ]
}
```

### banned_structures.json
Repetitive sentence shapes and structural patterns.

```json
{
  "structures": [
    {
      "name": "triple_bullet_syndrome",
      "description": "Topic sentence followed by exactly 3 bullets. Every time.",
      "pattern": "paragraph followed by exactly 3 bullet points",
      "alternative": "Vary list length. Use 2, 4, or 5. Or skip bullets entirely.",
      "severity": "high",
      "flagged_count": 0
    },
    {
      "name": "not_x_but_y",
      "description": "The 'Not X. But Y.' dramatic contrast.",
      "pattern": "Not [statement]. But [contrasting statement].",
      "alternative": "Just state the actual point. Drop the fake drama.",
      "severity": "high",
      "flagged_count": 0
    },
    {
      "name": "rhetorical_then_answer",
      "description": "Rhetorical question immediately answered.",
      "pattern": "[Question]? [Immediate answer in next sentence]",
      "alternative": "State the point directly. If you need a question, let it breathe.",
      "severity": "medium",
      "flagged_count": 0
    },
    {
      "name": "colon_list_opener",
      "description": "Every section opens with 'Here's what/why/how:'",
      "pattern": "Here's [what|why|how|the thing]: [list]",
      "alternative": "Vary openers. Start with the content, not a preamble.",
      "severity": "medium",
      "flagged_count": 0
    },
    {
      "name": "em_dash_addiction",
      "description": "Overuse of em dashes for parenthetical asides.",
      "pattern": "More than 2 em dashes per paragraph",
      "alternative": "Use periods. Use commas. Em dashes are seasoning, not the main dish.",
      "severity": "low",
      "flagged_count": 0
    },
    {
      "name": "mirror_intro_conclusion",
      "description": "Conclusion that restates the intro almost verbatim.",
      "pattern": "Final paragraph mirrors opening paragraph",
      "alternative": "End with a new insight or a forward-looking statement. Don't loop back.",
      "severity": "high",
      "flagged_count": 0
    },
    {
      "name": "fragment_for_emphasis",
      "description": "One-word or two-word sentence fragment for dramatic effect.",
      "pattern": "[Normal sentence]. [Fragment]. [Fragment].",
      "alternative": "Use sparingly. Once per piece max. Not every paragraph.",
      "severity": "medium",
      "flagged_count": 0
    },
    {
      "name": "identical_paragraph_lengths",
      "description": "Every paragraph is 3-4 sentences. Uniform blocks.",
      "pattern": "All paragraphs within 1 sentence of same length",
      "alternative": "Mix it up. One sentence. Then five. Then two. Rhythm matters.",
      "severity": "medium",
      "flagged_count": 0
    }
  ]
}
```

### exceptions.json
Patterns you approved to keep. Your whitelist.

```json
{
  "exceptions": [],
  "_note": "Add words/phrases here that the detector flags but YOU want to keep. Format: {\"pattern\": \"word or phrase\", \"reason\": \"why you keep it\", \"added\": \"date\"}"
}
```

---

## Feedback System

Located in `feedback/` directory:

### How Feedback Becomes Rules

When you use `/flag`:
1. Pattern gets added to the appropriate banned_*.json
2. Your preferred alternative gets stored
3. `flagged_count` increments each time you flag the same pattern
4. High-count patterns get promoted to `severity: "high"`
5. Feedback log tracks every correction for the learning engine

### Severity Promotion Rules

| Flag Count | Severity |
|-----------|----------|
| 1-2 | low |
| 3-5 | medium |
| 6+ | high |

---

## Rewriting Strategies

Located in `rewriting/` directory:

### Core Strategies

1. **Cut first, rewrite second.** Most AI-isms are filler. Delete before replacing.
2. **Match rhythm.** Read the surrounding sentences aloud. The rewrite should fit the cadence.
3. **Use the user's vocabulary.** Pull from their writing samples, not a thesaurus.
4. **Shorter > longer.** AI writes long. Humans write short. When in doubt, cut.
5. **Vary structure.** If the previous sentence was long, make this one short.
6. **Specifics over abstractions.** Replace vague ("leverage synergies") with concrete ("use the API").
7. **Active voice.** "We built X" not "X was built by the team."

### Before/After Examples

See `rewriting/examples.json` for the growing library of real corrections.

---

## Learning Engine

Located in `learning/` directory:

### How It Updates Itself

After every `/flag` and `/humanize` session:
1. New patterns get added to the database
2. Severity scores update based on frequency
3. Rewriting examples grow from Agent 2's corrections
4. Scorer calibration improves from Agent 3's feedback
5. Changelog tracks every change for auditability

### Sensitivity Levels

Configure in `config.yaml`:

| Level | Behavior |
|-------|----------|
| strict | Flag everything, even low-severity |
| balanced | Flag medium + high severity |
| relaxed | Only flag high severity |

---

## Setup

### Add These Commands

Create `~/.claude/commands/flag.md` and `~/.claude/commands/humanize.md` (included in this skill).

### Seed Your Voice

For best results, add 5-10 samples of YOUR writing to `rewriting/examples.json`. The more voice data Agent 2 has, the better it rewrites into your style.

---

## Philosophy

You're not fighting AI patterns manually anymore. You built the filter once. Now it runs itself.

Every correction makes it sharper. Every session makes it more YOU.
