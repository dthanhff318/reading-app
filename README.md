# Reading Room

A reading app for learning English. Paste a story or news article, select a word
or passage to save its meaning, then hover (desktop) or tap (mobile) the
highlighted text to see the meaning again.

Built with React + TypeScript (Vite) and Supabase.

## Setup

1. Create a Supabase project.
2. In the Supabase **SQL editor**, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in values from
   *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
4. Install and run:
   ```
   npm install
   npm run dev
   ```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Lint with oxlint |

## How it works

- **Import** (`/new`): title + pasted content are saved to `articles`.
  Line endings are normalized and extra blank lines collapsed.
- **Read** (`/read/:id`): content is rendered one paragraph per line. Every text
  segment carries a `data-offset` attribute, so a browser selection maps back to
  character offsets in the stored content (`src/lib/selection.ts`).
- **Meanings** are stored in `annotations` as `[start_offset, end_offset)` ranges
  plus the selected text and the meaning. `src/lib/segments.ts` splits each
  paragraph into plain / highlighted segments.
- Overlapping meanings are not supported: selecting inside an existing one opens
  it for editing; a selection that partially overlaps one is rejected.
- **Reading test**: at the end of each article, Gemini writes 5 or 10
  IELTS-style multiple-choice questions (inference, attitude, purpose, reference,
  vocabulary in context) through the `generate-quiz` Edge Function, with
  explanations in Vietnamese. *Standard* uses the lite model; *Hard* (default)
  uses a stronger model with more reasoning so the wrong options stay close.
  Options are reshuffled server-side so the right answer is not always in the
  same position. Quizzes are not stored; each one is generated on demand.

## Edge Functions

All functions live in `supabase/functions/` and are deployed with `verify_jwt`
off. The Gemini ones share the `GEMINI_API_KEY` secret.

| Function | Purpose | Optional model secret |
| --- | --- | --- |
| `lookup-word` | Meaning + IPA for a selected word | `GEMINI_MODEL` |
| `generate-story` | Original story by level and topic | `GEMINI_STORY_MODEL` |
| `generate-quiz` | Multiple-choice reading test for an article | `GEMINI_QUIZ_MODEL` (standard), `GEMINI_QUIZ_HARD_MODEL` (hard) |
| `extract-article` | Title and text from a web page | n/a |

## Notes

- Phase 1 has no login. The RLS policies in `schema.sql` let the anon key read
  and write everything, so anyone with the deployed URL can edit the data.
  Add Supabase Auth and per-user policies before sharing the app publicly.
