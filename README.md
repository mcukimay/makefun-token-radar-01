# Token Radar — token-radar-01

A token launch radar: it reads a sealed DefiLlama snapshot, ranks the
protocols that record no token by what their launch would be worth, and
hands in a dashboard showing the board, a detail view for every protocol,
and the steps to farm each one.

## The value model (radar-2)

`implied = round(tvl × size multiple × growth multiplier × maturity multiplier)`

- **Size multiple** runs 0.12 at $5M of TVL to 0.30 at $5B and above
  (log scale): a bigger protocol is worth more per TVL dollar.
- **Growth multiplier** is `1 + clamp(change_7d, −50, 150) / 100 × 0.8`.
- **Maturity multiplier** is `0.65 + min(age_days, 1460) / 1460 × 0.55`,
  where age is the days since the protocol was first listed: the longer it
  has run with no token on record, the more pent-up value a launch unlocks.

The board ranks pre-token protocols only (40 on the watchlist plus the 160
pre-token protocols below the floor with the most TVL). Protocols whose token
already trades are set aside in a separate live-token view with their market
cap shown as a fact. No protocol name is special-cased; the same function
scores every row. Farm plans are derived from each protocol's own category,
chains, TVL and age, with concrete costs and times.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path/to/snapshot.json>
```

Node 22.18+ (standard library only, no install). Writes `out/board.json`,
`out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`.
Run it twice: both runs write identical bytes.

## Dashboard

Static, no network. Open `dashboard/index.html` beside `data.js`:

- `index.html` — the board
- `index.html?view=detail&slug=<slug>` — one protocol's detail view
- `index.html?filter=<text or category>` — the board filtered
- `index.html?watchlist=1` — watchlist protocols only

Sortable columns, search, category and chain filters, a watchlist-only
toggle, and a live-token tab.
