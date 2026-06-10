# Scanner Cases

This fixture is dense on purpose. It is optimized for scanner regression tests, not casual reading.

## Inline Defaults

Plain inline comment @agent fix this sentence.
Another inline comment @claude tighten this paragraph.
One more inline comment @codex make this direct.

## False Positives

Send mail to contact@claude.com when the form is down.
Mention `@codex` in docs when explaining trigger syntax.
Legacy #agent directives are old syntax and should not match.

```markdown
@agent example inside fenced code
> [!NOTE] example callout
>
> @claude example inside fenced code
```

> @agent quoted terminal transcript should not scan as inline
> npm error code EOTP

## Active Notes

> [!NOTE] active raw trigger
>
> @claude tighten this note

> [!NOTE] active human follow-up
>
> [@user] @agent summarize options?
>
> [@agent] Which options? <!--mdac:eot-->
>
> [@user] the top three

## Parked Notes

> [!NOTE] parked on agent question
>
> [@user] @codex rewrite this
>
> [@codex] Which paragraph should I edit? <!--mdac:eot-->

> [!NOTE] parked on human placeholder
>
> [@user] @claude rewrite this
>
> [@claude] Which paragraph should I edit? <!--mdac:eot-->
>
> [@user]

> [!NOTE] fenced trigger inside callout only
>
> ```md
> @agent example only
> ```
>
> [@agent] done <!--mdac:eot-->

## Done Threads

> [!DONE]- human follow-up after seal
>
> [@user] @claude update this
>
> [@claude] done <!--mdac:eot-->
>
> [@user] one more detail

> [!DONE]- sealed no follow-up
>
> [@user] @claude update this
>
> [@claude] done <!--mdac:eot-->

> [!NOTE]+ historical plus callout
>
> [@user] @agent old atag-style thread

## Adjacent Punctuation Triggers

(@claude can you check this section?)
**@codex** make this heading bolder.
[@pi] body speaker labels count as triggers.

## Inline Code Spans

Run the `mdac run @agent` command to verify.
Keep `@claude` and `spaced @codex spans` quiet.

## Unsealed Agent Turn

> [!NOTE] agent crashed mid-reply
>
> [@user] @claude fix the heading
>
> [@claude] Working on it now
