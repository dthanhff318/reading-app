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

## Notes

- Phase 1 has no login. The RLS policies in `schema.sql` let the anon key read
  and write everything, so anyone with the deployed URL can edit the data.
  Add Supabase Auth and per-user policies before sharing the app publicly.
