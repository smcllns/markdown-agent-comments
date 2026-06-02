# mdac V1 Review Cases

This file is intentionally scanned by the test suite. It is meant to be easy for a human to review before publishing.

- `PROCESS` cases should be detected by `mdac scan` and handed to an agent.
- `IGNORE` cases should not be detected.
- Run `bun run test:review` to regenerate `test/.generated/review-cases.processed.md`.

## PROCESS Cases

### PROCESS inline concrete edit

The opening sentence is a little bloated. @claude tighten this sentence in place.

### PROCESS task checkbox update

- [ ] @agent turn this rough task into a clearer checkbox label

### PROCESS discussion-only answer

@agent give me three sharper options for this heading

### PROCESS asset insertion

@codex make a photorealistic image of a pelican riding a bike and add it below this paragraph

### PROCESS ambiguous ask requiring clarification

@agent improve the section above

### PROCESS active thread after human follow-up

> [!NOTE] heading options
>
> [@sam] @claude can you give me three sharper options for this heading?
>
> [@claude] Option 1: Faster Launch Notes. Option 2: Release Notes That Move. Option 3: Cleaner Launch Log. <!--mdac:eot-->
>
> [@sam] less cute and more direct

### PROCESS resolved thread after human follow-up

> [!DONE]- linked actual PR
>
> [@sam] @claude add a link to the actual PR
>
> [@claude] done - linked the draft PR. <!--mdac:eot-->
> Actually use the merged PR, not the draft

## IGNORE Cases

### IGNORE email address

Send questions to contact@claude.com if the form is down.

### IGNORE inline code escape

Mention `@codex` in docs when describing the trigger syntax.

### IGNORE quoted terminal paste

> @agent pasted from terminal but quoted as source material, not a live request
> npm error code EOTP

### IGNORE parked active thread

> [!NOTE] awaiting clarification
>
> [@sam] @claude tighten the wording above
>
> [@claude] Which paragraph should I edit? <!--mdac:eot-->
>
> [@sam]

### IGNORE sealed resolved thread

> [!DONE]- tightened paragraph
>
> [@sam] @claude tighten the paragraph
>
> [@claude] done - tightened it to one sentence. <!--mdac:eot-->

### IGNORE historical expanded marker

> [!NOTE]+ old atag marker should not be part of forward V1
>
> [@sam] @claude this old shape should not be detected

### IGNORE legacy hash directive

#agent this legacy directive is not on the V1 roadmap
