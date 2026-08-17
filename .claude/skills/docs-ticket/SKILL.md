---
name: docs-ticket
description: Work a JIRA docs ticket in the ccx-docs repo end to end - sweep for the real scope, edit, verify rendering, build, commit per ticket, and open a PR. Use for any CCX-xxxx ticket whose fix is a change to files under docs/ or blog/. Not for code repos - use /work-on there.
---

# Working a docs ticket in ccx-docs

This repo is a Docusaurus content site. There is no test suite, no staging
environment, and no application code to break. The failure modes are
different from a code repo, so the gates are different too.

**What actually goes wrong here**, in rough order of frequency:

1. The ticket's stated scope is incomplete. Reporters grep once and paste
   what they found.
2. The text is right but the *rendering* is wrong - broken column
   alignment in a code fence, a mis-cased MDX directive, a dead relative
   link.
3. A reader copy-pastes an example that doesn't work.

Everything below exists to catch those three.

---

## Step 0 - Read the ticket

Fetch it with the JIRA MCP tools. Note the parent epic and whether it has
sibling tickets - that decides the branch in Step 2.

If the expected end state is ambiguous, stop and ask. Otherwise summarise
it back in a paragraph and continue; don't wait for a nod on something
unambiguous.

## Step 1 - Sweep. Do not trust the ticket's scope.

**Treat line numbers in the ticket as a hypothesis, not a boundary.**
Before editing anything, run an exhaustive search for the *pattern* the
ticket describes, across `docs blog src static` and the root markdown
files.

Two rules that matter more than they look:

- **Filter on the match, never on the whole line.** Excluding lines that
  contain an acceptable value will silently hide an unacceptable value
  sitting next to it on the same line. This has already caused a miss:
  a sweep for public IPs excluded any line matching `10.x`, which
  swallowed three real addresses that shared a line with a `10.108.22.0`
  cluster IP. The ticket said two occurrences; there were nine.
- **Re-run the sweep after editing** and confirm it returns nothing. That
  command is your regression marker - there is no test to leave behind,
  so it goes in the PR body verbatim.

Classify every hit before touching the files, and show the user the table:

| Hit | Verdict |
|---|---|
| ... | in scope / already correct / false positive |

Watch for false positives from `.svg` path data and version strings like
`2.0.0.9042`, which match most numeric patterns.

If the real scope is materially wider than the ticket says, say so
explicitly - that is a finding worth reporting, not a detail to absorb
silently.

## Step 2 - Branch

- **Ticket has an epic parent with sibling docs tickets** you intend to fix
  together: branch on the **epic** ID (`CCX-6086`), and land **one commit
  per child ticket** on it, each message prefixed with that child's ID.
  One PR at the end covering all of them.
- **Standalone ticket**: branch on its own ID.

Bare ticket ID is this repo's convention - `CCX-5456`, `CCX-5176`, no slug.
Always branch from `origin/main`; there are no release branches for docs.

```bash
git fetch origin main --quiet
git checkout -b <TICKET-OR-EPIC-ID> origin/main
```

## Step 3 - Edit

Smallest change that resolves the ticket. No drive-by rewording of
adjacent prose - docs diffs get reviewed by people scanning for meaning
changes, and unrelated edits hide the real one.

Prefer `sed` for a mechanical substitution repeated across files; it
catches occurrences an eyeball sweep misses. Follow it with Step 4 -
`sed` will not fix what it breaks.

## Step 4 - Verify the rendering, not just the text

This is the step with no equivalent in a code repo, and the one that
catches the most.

- **Column alignment inside code fences.** Sample output from `kubectl`,
  `psql`, etc. is column-aligned. Any substitution of a different length
  skews the table. Re-pad, then verify numerically rather than by eye:

  ```bash
  python3 -c "
  lines=open('<file>').read().split('\n')
  print([lines[n].index('<column-header>') for n in [<row indices>]])
  "
  ```

  All offsets must be identical.
- **MDX directives.** Must be lowercase - `:::note`, `:::important`,
  `:::warning`. `:::Note` builds fine but silently renders as plain text.
- **Relative links** between docs pages still resolve.
- **Copy-pasteability.** If you changed an example, would pasting it still
  work? Placeholders should read as placeholders.

### Placeholder conventions in this repo

| Kind | Use | Notes |
|---|---|---|
| Security-group CIDR | `x.x.x.x/32` | Matches sibling entries in the vendor blocks |
| Example IPv4 | `203.0.113.10` | RFC 5737; already used in `Upgrading-to-be-production-ready.md` |
| Example IPv6 | `2001:db8::/32` range | RFC 3849 |
| Example domain | `ccx.example.com`, `cc.example.com` | RFC 2606 |

Never commit a routable address. Check IPv6 as well as IPv4 - they travel
together in `kubectl get svc` output and it is easy to swap one and leave
the other.

## Step 5 - Build

```bash
yarn install --frozen-lockfile && yarn build
```

This is byte-identical to what `.github/workflows/deploy.yml` runs in CI,
so a green local build is exact parity - no surprises after merge.

**Warnings are informational.** A warning counts against you only if it
points at a line you touched. This repo has pre-existing warnings; fixing
them is a separate ticket, not scope creep into yours. State which ones
are pre-existing rather than silently ignoring them.

## Step 6 - Self-review, then commit

Read the diff cold. Then commit - one per ticket:

```
<TICKET-ID> <imperative verb> <what>

<paragraph on why, not what - the diff shows the what>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

There is no `/pre-commit-review` skill in this repo. For a mechanical
content substitution, a full code review pass is not worth the tokens -
say so and skip it. For a ticket that rewrites explanatory prose or
restructures a page, run `/code-review` first, since meaning changes are
where docs bugs actually live.

## Step 7 - PR

One PR per branch, against `main`. Body must contain:

- **Summary** - 1-3 bullets.
- **Verification command** - the exact sweep from Step 1 that now returns
  nothing. This is the regression marker; there is no test.
- **Build status** - and any pre-existing warnings you deliberately left.
- **Every ticket ID** on the branch, linked to JIRA.

Then run the Copilot review loop exactly as `/work-on` Step 11.5
describes, before asking any human.

## Step 8 - Publishing

There is **no staging environment**. Merging to `main` triggers
`.github/workflows/deploy.yml`, which builds and deploys straight to
GitHub Pages. The live site is the first place a change is visible.

That makes the PR the only review gate - do not merge expecting to check
it afterwards.

## Step 9 - Note what the fix does not cover

For anything published in error - a leaked address, a wrong credential, a
customer name - changing the tip is not the whole remediation:

- The value **remains in git history** and is reachable from any prior
  commit.
- The value **remains on the live site** until the next deploy.

Both are out of scope for a normal docs fix, and both should be flagged to
the user explicitly rather than assumed handled. Scrubbing history is a
deliberate decision with rewrite consequences for everyone with a clone -
never do it unprompted.
