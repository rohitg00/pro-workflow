# System 1 Classifiers (Optional)

pro-workflow can ask a small, fast classifier model a closed question during a hook. The layer is opt-in and off by default. When it is off, the hooks make no network calls and behave exactly as before.

## What a System 1 model is

A System 1 model takes a state (text or JSON) and one or more questions with a fixed set of answers. It returns a probability for every answer from one encoder pass. It generates no text, so a yes/no or routing call takes tens of milliseconds.

Three question types exist:

| Type | Returns | Use |
|------|---------|-----|
| `choice` | the picked option, a probability per option, a confidence | route to one of N buckets |
| `score` | a score over ordered levels, a probability per level, a confidence | rate severity or quality |
| `noul` | one probability that a statement holds | an `if` in your code |

Two engines speak the same wire format (`POST /v1/systemone`):

- **Laya**: open weights and code under Apache-2.0, runs locally. Package `laya` on PyPI.
- **Jev**: hosted by TypeSafe AI at `https://api.typesafe.ai/v1/systemone`.

## What pro-workflow uses it for

| Where | Question | Effect |
|-------|----------|--------|
| `scripts/prompt-submit.js` | `noul`: is the user correcting or rejecting the previous action? | Only runs when the regex heuristic did not match. At or above `correction_threshold`, the hook logs a correction hint and counts it like a heuristic correction. You still save the learning with `/learn`. |
| `agents/permission-analyst.md` | `choice`: risk class of a denied command | A suggestion in the report. You confirm every rule. |

The classifier never allows, denies, or blocks a tool call. It never changes a hook exit code. If the server is down, slow, or returns an error, the hook continues on its normal path.

## Enable Laya (local)

Install it in its own virtual environment. pro-workflow does not add a Python dependency.

```bash
python3.12 -m venv ~/.pro-workflow/laya-venv
~/.pro-workflow/laya-venv/bin/pip install "laya[serve]==0.3.20"
LAYA_HOST=127.0.0.1 LAYA_DEVICE=cpu LAYA_PRELOAD=1 LAYA_MODELS=multilingual LAYA_PORT=8791 \
  ~/.pro-workflow/laya-venv/bin/laya-serve
```

Keep the server running in its own terminal or as a login service. The hook never starts it.

`LAYA_HOST=127.0.0.1` matters. `laya-serve` binds to `0.0.0.0` by default and accepts unauthenticated requests when `LAYA_API_KEY` is unset, so without it any machine on your network can use your model.

Then turn the layer on with one of:

```bash
export PRO_WORKFLOW_SYSTEM_ONE=laya
```

or `~/.pro-workflow/config.json`:

```json
{ "system_one": { "enabled": true, "provider": "laya" } }
```

If you set `LAYA_API_KEY` on the server, export the same value for Claude Code. The client sends it as a bearer token only to an `https:` URL or a loopback host (`127.0.0.1`, `localhost`, `::1`). For any other `http:` URL it drops the key, so the request fails with 401 and the hook carries on without the classifier.

## Enable Jev (hosted)

```bash
export TYPESAFE_API_KEY=...
export PRO_WORKFLOW_SYSTEM_ONE=jev
```

Without `TYPESAFE_API_KEY` the Jev provider counts as disabled. Jev bills per input token, so each prompt costs a small amount.

## Settings

Defaults live in the plugin `config.json`. Values in `~/.pro-workflow/config.json` override them. `PRO_WORKFLOW_SYSTEM_ONE=laya|jev|off` overrides both.

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | `false` | Master switch |
| `provider` | `laya` | `laya` or `jev` |
| `laya_url` | `http://127.0.0.1:8791/v1/systemone` | Local server endpoint |
| `laya_model` | `multilingual` | Pinned Laya checkpoint |
| `jev_model` | `jev-1.13.0` | Pinned Jev version. Do not use `jev-latest`: the alias moves on release and your threshold stops matching. |
| `timeout_ms` | `150` | Hard timeout. On timeout the hook continues without an answer. |
| `correction_threshold` | `0.9` | Minimum `noul` probability to flag a correction |

## Caveats

- **Confidently wrong off-distribution.** In a 30-ticket test of the small Laya checkpoint, 6 of 9 errors had confidence of 0.98 or higher. A threshold cannot catch those.
- **Negation flips.** "I do not want to cancel" scored as a cancel request at 0.837. This is why the layer only suggests and never decides.
- **Thresholds do not port.** Laya and Jev compute confidence with different formulas. A threshold tuned for one engine, checkpoint, or version is wrong for another.
- **Tune on your own labels.** Collect a few hundred of your own prompts, label them, sweep the threshold, and set `correction_threshold` from that sweep.
- **Latency.** Measured on an M1 Max CPU: about 45 ms for one question in process and about 70 ms over HTTP. The 150 ms timeout leaves some headroom. Raise it on slower machines instead of letting the hook stall.

## Why it never decides allow or deny

Claude Code already has a permission pipeline: deny and ask rules, then the auto mode classifier, then you. A second classifier that can be confidently wrong about negations must not sit inside that path. pro-workflow uses System 1 output only for hints and suggestions that a person confirms.

## Further reading

- [Laya and Jev: System 1 Models Answer With a Type, Not Text](https://rohitghumare.com/blog/laya-jev-system-1-models/)
- [Laya on PyPI](https://pypi.org/project/laya/)
- [Laya on Hugging Face](https://huggingface.co/convaiinnovations/laya)
- [TypeSafe API docs](https://docs.typesafe.ai/api)
