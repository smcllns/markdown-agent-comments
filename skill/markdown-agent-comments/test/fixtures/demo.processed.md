# Demo

This file is a human-readable tour of Markdown Agent Comments. It shows realistic use cases and negative cases that will correctly not be changed.

## Refining some content

- William Playfair argued that charts communicate patterns more clearly than raw tables.
- His 1786 Commercial and Political Atlas popularized time-series plots and introduced a bar chart.
- Later writers still cite his statistical graphics as early models of clarity.

> [!DONE]- summarized Playfair paragraph
>
> [@user] @agent can you summarize that in three bullets instead please
>
> [@agent] done - summarized the paragraph in three bullets. <!--mdac:eot-->

## Checklist

- [x] Write the mdac PRD ([docs/PRD.md](../../../../docs/PRD.md))
- [ ] Build prototype
- [ ] Test with users

> [!DONE]- linked completed PRD task
>
> [@user] Write the mdac PRD - @claude check if we've done this and link here
>
> [@claude] done - confirmed the PRD exists and linked it from the checklist item. <!--mdac:eot-->

## Add a link

The product requirements are documented in [docs/PRD.md](../../../../docs/PRD.md).

> [!DONE]- added PRD link
>
> [@user] @claude add a link to the PRD here please
>
> [@claude] done - added a link to the PRD. <!--mdac:eot-->

## Generate or insert diagrams or images

```text
skill/markdown-agent-comments/
├── SKILL.md
├── scripts/
│   └── scanner.js
└── test/
    ├── README.md
    ├── fixtures/
    └── scripts/
```

> [!DONE]- added filetree and image setup note
>
> [@user] @codex add ASCII filetree for mdac skill in here please. If you have access to image gen, can you also make a beautiful image version of the filetree below it and I'll see which one to keep. If you don't have access, can you explain what's missing and give me steps to set up?
>
> [@codex] done - added the ASCII filetree. I cannot generate an image from this text-only eval fixture because no image-generation tool/output path is available in the run. To make the image version, run this request in an agent session with image generation enabled, give it the filetree above as the source, and ask it to save a PNG beside this markdown file. <!--mdac:eot-->

## Agentic input without page edits

I keep coming back to a simple pattern in AI work: methods that scale with computation tend to beat methods packed with handcrafted assumptions. That does not mean domain knowledge is useless, but it does mean our systems should leave room for search and learning to discover structure we did not know how to name in advance. When we bake in too many clever assumptions, we often make the system harder to scale later.

> [!DONE]- suggested tweet-sized summaries
>
> [@user] @claude people keep telling me I write too much. I'm not sure. Can you suggest a 3 different tweet-sized messages I could use to summarize my above writing and I'll see if I like any of them?
>
> [@claude] Three options:
> 1. Systems that scale with computation usually beat systems packed with clever assumptions. Leave room for search and learning to discover structure we could not name upfront.
> 2. Domain knowledge helps, but overbuilding assumptions can make AI systems harder to scale. The durable move is to design for learning and search.
> 3. The more we bake in our own theories, the less room systems have to discover better ones. General methods win when they can keep scaling. <!--mdac:eot-->

## Inline Discussion Thread

> [!DONE]- suggested product-specific titles
>
> [@user] @claude can you give me three sharper title options?
>
> [@claude] Sure how about these:
> Option 1: Examples
> Option 2: How It Works
> Option 3: Markdown Agent Comments Live Demo
> Do any of those fit better? Let me know and I can update the doc. <!--mdac:eot-->
>
> [@user] less generic and more product-specific
>
> [@claude] Three more product-specific options: Markdown Agent Comments Demo, Live mdac Comment Examples, Markdown Comments To Agent Actions. <!--mdac:eot-->

## Ambiguous requests will require further user input

> [!NOTE] awaiting improvement target
>
> [@user] @codex please make this doc 100x better
>
> [@codex] What kind of improvement should I prioritize: shorter copy, clearer examples, better structure, or more realistic processed output? <!--mdac:eot-->
>
> [@user]

---

## Cases That Will Not Fire

Markdown Agent Comments will process `@agent` triggers that are at the start of a new line, or surrounded by whitespace but not inside a markdown blockquote or callout (`> `). So all the following examples are not live triggers and will not be processed.

Send questions to contact@claude.com if the form is down.

Mention `@codex` in docs when explaining the trigger syntax.

> @agent pasted from terminal but quoted as source material
> npm error code EOTP

> [!NOTE] awaiting clarification
>
> [@user] @claude tighten the wording above
>
> [@claude] Which paragraph should I edit? <!--mdac:eot-->
>
> [@user]

> [!DONE]- tightened paragraph
>
> [@user] @claude tighten the paragraph
>
> [@claude] done - tightened it to one sentence. <!--mdac:eot-->
