# Demo

This file is a human-readable tour of Markdown Agent Comments. It shows realistic use cases and negative cases that will correctly not be changed.

## Refining some content

Playfair, who argued that charts communicated better than tables of data, has been credited with inventing the line, bar, area, and pie charts. His time-series plots are still presented as models of clarity. Playfair first published The Commercial and Political Atlas in London in 1786. It contained 43 time-series plots and one bar chart, a form apparently introduced in this work. It has been described by Ian Spence and Howard Wainer as the first major work to contain statistical graphs.

@agent can you summarize that in three bullets instead please

## Checklist

- [ ] Write the mdac PRD @claude check if we've done this and link here
- [ ] Build prototype
- [ ] Test with users

## Add a link

The product requirements are already drafted. @claude add a link to the PRD here please.

## Generate or insert diagrams or images

@codex add ASCII filetree for mdac skill in here please. If you have access to image gen, can you also make a beautiful image version of the filetree below it and I'll see which one to keep. If you don't have access, can you explain what's missing and give me steps to set up?

## Agentic input without page edits

I keep coming back to a simple pattern in AI work: methods that scale with computation tend to beat methods packed with handcrafted assumptions. That does not mean domain knowledge is useless, but it does mean our systems should leave room for search and learning to discover structure we did not know how to name in advance. When we bake in too many clever assumptions, we often make the system harder to scale later.

@claude people keep telling me I write too much. I'm not sure. Can you suggest a 3 different tweet-sized messages I could use to summarize my above writing and I'll see if I like any of them?

## Inline Discussion Thread

> [!NOTE] title options
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

## Ambiguous requests will require further user input

@codex please make this doc 100x better

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
