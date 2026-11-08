# Implementation Plan: DD Timeline Promo Copy Edit

## Scope

Copy-only. No game code, assets, or SNS templates outside `memo.md` change for the announcement itself. Reports and planning files are added under `.agent/`.

## Constraints

- Keep the author's thanks to AI and DreamCore
- Keep the house CTA sentence
- Do not invent mechanics that the HTML/README do not support
- Do not push to GitHub

## Steps

1. Compare the draft with `Readme_JP.md` and in-game copy
2. Apply a light edit, not a rewrite
3. Save the adopted text in `memo.md`
4. Record before/after and rationale in result reports
5. Commit locally

## Adopted wording rules

| Issue | Decision |
| --- | --- |
| `3ステージ制であり` | `全3ステージで` |
| `難易度と獲得スコア` | `難易度も獲得スコアも` |
| Missing player role | Add one sentence: blue vs red/yellow AI, aim for unification |
| `昔断念した作りたかった` | `昔は作りたかったけれど断念した` |
| `ゲームであり` | `ゲームで` |
| Trailing ideographic space | Remove |

## Out of scope

- Rewriting `Post/X.md` and other SNS drafts
- Changing the game title
- Recording or thumbnail work
