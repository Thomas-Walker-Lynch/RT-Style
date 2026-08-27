# RT-Style — six amendments

Eight files touched. About 490 lines added, 60 removed, and most of the
addition is commentary. Nothing was restructured.

Drop `Manuscript.copy/` over `developer/authored/Manuscript.copy/` and build,
or apply `RT-Style.patch` from that directory.

    cd developer/authored/Manuscript.copy && patch -p1 < RT-Style.patch

---

## 1. Orphan control and sections

**Cause.** `paginate.js` asked whether an element was a heading by matching its
tag against `H[1-6]`. A section title stopped being an `<h1>` when sections
became scoped counted steps — it is now a `div.RT·section-title` holding
counter reads — so the test has matched nothing since, and the widow control
it guards has been inert. Not a new fault in the orphan logic so much as an
old test left describing a document that no longer exists.

**Change.**

- `section.js` marks the title `data-rt-heading="true"` when it builds it.
- `paginate.js` gains `is_heading()` (h1–h6, or the mark) and `is_ghost()`
  (snapshot, make, name, whitespace — nodes that occupy no space). Both
  backtrack loops now use `is_heading`.
- `RT.Splitter['rt·counter·step']` gains widow control, which it never had.
  If a fragment's tail, ignoring ghosts, is a heading, the cut moves above it.
  If nothing but the heading fitted, no fragment is emitted and the whole
  scope moves on.

The backtrack loops were never going to be enough on their own: sections are
cut by the step splitter, and it was the splitter that produced the
`[snapshot, title]` fragment.

**Termination.** A null first fragment sends the caller down one of two paths.
On a page with content it closes the page and retries against a full page. On
an empty page it places the scope whole and grows, which is terminal. Neither
can return with the same room twice.

## 2. A counter per division

`section.js` now holds an open series table. Each series names a counter, the
styles its levels are set in, and the words that precede a number:

| series | counter | style | prefix |
|---|---|---|---|
| `body` | `RT·Section·counter` | CountingNumber | Chapter, Section |
| `front` | `RT·Section·counter·front` | roman | Front Matter, Front Matter Section |
| `appendix` | `RT·Section·counter·appendix` | Alpha, CountingNumber | Appendix, Appendix Section |

Written once at the top of a division:

    <RT·section series="appendix">
      <RT·name>Notation</RT·name>
      <RT·section><RT·name>Symbols</RT·name></RT·section>
    </RT·section>

giving *Appendix A* and *Appendix Section A.1*. Nested sections inherit, so the
attribute is not repeated. A series never referenced emits no make tag.

The table is open. Before the element phase:

    RT.Element.Section.series.part =
      { counter: 'RT·Section·counter·part', style: 'Roman'
        ,prefix: 'Part', on_first_step: 'I' };

**The prefix list** mirrors the counter nesting with the last entry repeating,
as specified. `{Chapter, Section}` reads *Chapter 3* at the top and
*Section 3.2.1* at every level below the first. The word is chosen from the
same `active_list` the number is formatted from — factored out as
`active_list_of` — so the two cannot disagree at a scope boundary, which is
where a separately computed depth would have gone wrong.

**A read takes a list.** Fields are whitespace separated and emitted in order:

    <RT·counter·read snapshot="s" key="prefix count">   →  Appendix B
    <RT·counter·read snapshot="s" key="count prefix">   →  B Appendix

Empty fields are dropped rather than leaving a hanging space, so a counter
with no prefix set still reads as a bare number. Every read written before
this — `key="name"`, `key="list.short"`, no key at all — takes the same path
and reads the same.

**`TOC.js`** named `RT·Section·counter` in its query, which would have listed
the chapters and dropped the front matter and the appendices — the two things
a reader looks for in a contents list first. It now queries
`[data-rt-section]` and counts depth against each step's own counter, so the
divisions nest independently and the query needs no knowledge of what counters
exist.

## 3. Authored leaves

Worth knowing before anything else: **authored `<RT·page>` elements were being
discarded.** `paginate_0` filtered them out of the element list and then
cleared the article. Anything on one was lost silently.

They are now kept. An authored leaf closes whatever page is open and stands as
one, carried through unmeasured — the author decided what is on it and the
paginator has no business adding to it.

    <RT·page no-number>
      <RT·title title="…" author="…"></RT·title>
    </RT·page>

`no-number` takes no counter step, so the counter does not advance across the
leaf. Not counted, rather than counted and hidden: the reader's page one is
the first page of text. Written plainly, the leaf takes its number in sequence
like any other.

## 4. Rendering time

**Where it went.** Not in the shrink wrapping. In the length of the document
behind it. Setting a width on a label in the flow dirties it, which changes
its height, which moves everything below, and the browser lays out the rest of
the book before it will answer. A shrink wrap asks about a dozen such
questions per label; a hundred labels is a thousand full layouts. The cost
scales with book length rather than table count, which is why it read as
general slowness rather than as slow tables.

**Change.** `RT.Utility.Dom.measure_host(context_el)` returns a positioned,
contained host appended to the element's real parent at that parent's content
width. Out of flow, so nothing below it moves. A child of the real parent, so
font, size, weight and colour are inherited exactly, and the wrapping measured
is the wrapping that will be rendered — measuring somewhere convenient instead
would answer a question about a document that does not exist.

`grid.js` gains `place_and_size`, which inverts the order: measure in the host,
*then* `replaceWith`. Both results are explicit lengths — a frozen column
template, a pixel width per label — so they survive the move unchanged. Where
no host can be established the old order stands: measuring in place is slow,
measuring at the wrong width is wrong, and slow is better.

The first-line widening probe drops from 16 trials to 6. Widths that satisfy
the test come in runs rather than as isolated points, since a range of widths
keeps the same line breaks, so the coarser step finds nearly all of them. Where
it steps over one the balanced width stands and the loss is a short first line.

**On the rest of your thinking.** Revealing before cleanup is done — see 6.
On rendering pages in blocks: I would leave it. Growth is already local and
terminal by design, and block rendering reintroduces exactly the coupling that
reasoning was built to avoid. Cross references are the smaller problem and
they are already last.

**Not done.** The two long phases, `element` and `paginate_0`, still hold the
thread from beginning to end. Cutting a phase into resumable pieces is the
larger prize and a different order of change.

## 5. The white page

The canvas takes its colour from the root, and until the theme compiles the
root has no colour, so the browser paints its own default.

Two measures, because neither alone is enough.

The resolved screen colour is remembered in `localStorage` and applied in
`stage_manager` at parse time, ahead of the first paint. Every opening after
the first shows no white at all.

A transition is armed at the same moment, for the first opening, where the
colour arrives late — and now arrives as a fade rather than as a cut. A fade
from white is a change of light; a cut from white is a flash, and the eye reads
the two quite differently. If the remembered colour is wrong because the
reader has changed theme since, the correction shows as a fade too.

## 6. The timer, and letting the reader in

`run_pipeline` now runs one phase per turn with two frames between them. No
phase is split and the order is unchanged; what changes is that the thread is
given back between them, which is the only moment the browser has to paint.

A panel appears after 500ms — not sooner, or a short book gets its own flicker
— showing elapsed seconds and the phase name against the phase count. It sets
`visibility:visible` explicitly, since the root is hidden and visibility
inherits, and leaves its background clear so the screen colour shows through.

**Honest limitation.** The count advances at phase boundaries, not within them.
A long `element` or `paginate_0` shows a still number under a moving phase
name. That is at least honest about where the time is going, and it is enough
to tell a working machine from a hung one.

**Reveal.** `RT.Phase_reveal = 'note'`. The document is readable once the notes
resolve; everything after only grows leaves that overflowed. Scroll is settled
first, or the reader would be shown the top of the book and then moved. Set to
`null` to hold the blank until every phase finishes — worth doing if a late
phase ever gains the power to move content rather than only to grow pages.

---

## Tests

    npm install jsdom
    node test/test_counter.js    # 22 — series, prefixes, list reads
    node test/test_widow.js      # 11 — widow control, and what it must not change
    node test/test_page.js       # 10 — authored leaves, numbered and not

43 passing. jsdom reports every height as zero, so `test_widow` and `test_page`
declare heights on a `data-h` attribute and answer `getBoundingClientRect` from
the tree. That is enough to drive every decision the splitter makes and it lets
a fragment be posed exactly — a heading with two lines beneath it, a heading
with none — which is awkward to arrange in a real document and is the whole of
what is being tested.

## What wants a browser

I have no browser here, so these are reasoned rather than observed:

1. **`place_and_size`** is the change I would check first. The risk is not
   correctness but inheritance — if a grid sits somewhere whose typography
   differs from its parent's in a way I have not anticipated, the frozen
   widths will be subtly wrong. Compare a rendered table before and after.
2. **The 6-probe widening** is a visual judgement. If first lines look short,
   raise `probe_budget` in `utility.js`.
3. **Revealing at `note`** — whether `paginate_1` growing pages under a reader
   is acceptable in practice, or merely acceptable in principle.
4. **The remembered screen colour** on a first-ever opening, where the fade is
   the only defence.

---

## Addendum — RT code format conformance

Corrected after review against `developer/document/RT-code-format.html`.

**Acronyms stay capitalized.** The four attributes introduced here were written
`data-rt-*`, following the surrounding code rather than the rule:

| was | now |
|---|---|
| `data-rt-heading` | `data-RT-heading` |
| `data-RT-series` (was `data-rt-series`) | `data-RT-series` |
| `data-rt-section` | `data-RT-section` |
| `data-rt-measure-host` | `data-RT-measure-host` |

This is a source legibility change and nothing else. HTML lowercases attribute
names on `setAttribute`, and matches them case-insensitively on `getAttribute`,
`hasAttribute` and in selectors — verified, not assumed. So the two spellings
are the same attribute at runtime and the mixed state cannot break anything.

**Containers take a type prefix**, not a plural and not a type suffix.

- `ghost_tag_set` → `Set_ghost_tag`, matching the `Map_*` / `dict_*` forms.
- `parts` → `list_part` in `process_read_node`.

`CounterMachine.prefix` is left as it is, against the `list_*` rule, because
`style` beside it is also a list and is not `list_style`. Local consistency
looked like the stronger claim; say if it is not.

**Read and write are the two ends of a copy.**

- `screen_color_remember` → `screen_color_write`, and the matching
  `screen_color_read` is lifted out of `prepaint_screen` so both ends are named.

**Factory functions are called make.**

- `RT.Utility.Dom.measure_host` → `measure_host_make`, as `theme_make` and
  `RT·counter·make` are.

**Namespacing.** The store key `RT·screen_color` → `RT-Manuscript·screen_color`,
matching `RT-Manuscript·theme_preference`, which sits in the same store.

**Punctuation.** Three prose commas in new comments written `word, word` rather
than `word ,word`. Multi-level enclosures given one space of padding on the
outermost only — `if( !(best_height > 0) ){`.

### Not touched

The pre-existing `data-rt-component`, `data-rt-row`, `data-rt-row-extent`,
`data-rt-col`, `data-rt-columns-frozen`, `data-rt-continued` and
`data-rt-wrapped` are left alone. The format document invites updating
non-conforming code on contact, and this is a one-line change per site with no
runtime effect, but it touches files this work was not otherwise opening. Say
the word and it is a separate patch.
