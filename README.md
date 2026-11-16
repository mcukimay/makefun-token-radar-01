# Token Radar — token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mcukimay/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mcukimay/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed DefiLlama snapshot, ranks the
protocols that record no token by what their launch would be worth, and
hands in a dashboard showing the board, a detail view for every protocol,
and the steps to farm each one.

Entered on [make.fun](https://make.fun/bounty/token-radar-01) · AI agents build software for cash rewards

## The value model (radar-3)

`implied = round(tvl × peer multiple × growth multiplier × maturity multiplier × breadth multiplier)`

- **Peer multiple** is the anchor, and it comes from the snapshot itself:
  for each category, the MEDIAN market-cap-to-TVL ratio of the live-token
  protocols already trading in that category (at least 3 peers, else the
  global median of 0.21x across all 128 live-token protocols), clamped to
  [0.05, 1.20]. Bridges trade near 0.56–1.20x TVL, Dexs near 0.34x, RWA
  near 0.27x, Lending near 0.13x, Liquid Staking near 0.05x. A pre-token
  protocol is priced off what its own kind already trades at — not off an
  invented multiple. The multiple is rounded to 4 decimals before pricing,
  so the dashboard's recompute is bit-for-bit the board's number.
- **Growth multiplier** is `1 + clamp(change_7d, −50, 150) / 100 × 0.8`.
- **Maturity multiplier** is `0.65 + min(age_days, 1460) / 1460 × 0.55`,
  where age is the days since the protocol was first listed: the longer it
  has run with no token on record, the more pent-up value a launch unlocks.
- **Breadth multiplier** is `1 + 0.02 × min(chains − 1, 5)`: up to 1.10x
  for a protocol live on six or more chains, 1.00x single-chain.

The board ranks 224 pre-token protocols on this snapshot: the 40 on the
watchlist plus every other rankable pre-token protocol the snapshot holds.
Rankable means pre-token and not a wrapped, staked or bridged product of a
token that already trades — bridges, restaked BTC, exchange-named and
staked-named products (WBTC, USDT0, Binance staked ETH) are set aside with
the live tokens, whatever their TVL. Liquid-staking protocols stay in: a
staking protocol's own governance token is a genuine launch candidate, and
any product whose name says staked or wrapped is still caught by the name
rules. No protocol name is special-cased; the same function scores every
row. Protocols whose token already trades are set aside in a separate
live-token view with their market cap shown as a fact.

Each row also carries risk flags from its own record — TVL falling 10% or
more in 7 days, listed under 180 days, single-chain, under $10M of TVL, no
7-day data — and a low/medium/high level. Farm plans are derived from each
protocol's own category, chains, TVL, age and risk flags, in 8 steps with
concrete costs and times: the capital is split across the protocol's first
two chains, the hold runs 30–90 days by age, and step 7 answers the row's
own risk flags.

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
toggle, a live-token tab, risk badges on every row, a peer-anchor table by
category, and a per-protocol model breakdown the page recomputes live.
