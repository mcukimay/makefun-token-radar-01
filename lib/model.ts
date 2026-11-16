// Token Radar's value model (radar-3): one snapshot in, one ranked board out.
//
// The board ranks PRE-TOKEN protocols only. A protocol is pre-token when its
// DefiLlama record carries no token at all (no market cap, no CoinGecko id, no
// symbol). Protocols whose token already trades are set aside in a separate
// "live token" list with their market cap shown as a fact, never mixed into
// the ranking. The board covers every slug on the snapshot's watchlist (the
// floor, never the ceiling) plus EVERY other rankable pre-token protocol in
// the snapshot — 224 rows in all on this snapshot — because the radar exists
// to find the early ones, not to stop at an arbitrary cap. Rankable means
// pre-token and not a wrapped, staked or bridged product of a token that
// already trades (bridges, restaked BTC, exchange-named and staked-named
// products are set aside with the live tokens).
//
// Implied value is anchored to the snapshot's own live-token peers, not to
// an invented multiple. For each category, the peer multiple is the MEDIAN
// market-cap-to-TVL ratio of the live-token protocols in that category
// (categories with fewer than 3 live peers fall back to the global median
// across all live-token protocols). A category whose tokens already trade
// richly against TVL — bridges near 1.0x, Dexs near 0.34x — prices its
// pre-token names higher than one whose tokens trade thinly, like liquid
// staking near 0.04x. The multiple is clamped to [0.05, 1.20] so one wild
// peer cannot set the price. Then three snapshot-derived multipliers apply:
//
//   growth         = clamp(change_7d, -50, 150) per cent
//   growth mult    = 1 + (growth / 100) * 0.8
//                    Growing TVL pulls the value up; shrinking TVL drags it
//                    down, but never below 0.6x.
//   maturity       = 0.65 + 0.55 * min(age_days, 1460) / 1460
//                    Age is the days since DefiLlama first listed the
//                    protocol: the longer it has run with no token on record,
//                    the more pent-up value a launch would unlock. Unknown
//                    age counts as 365 days.
//   breadth        = 1 + 0.02 * min(chains - 1, 5)
//                    A protocol live on more chains reaches more users:
//                    up to 1.10x for six or more chains, 1.00x single-chain.
//   implied        = round(tvl * peer_multiple * growth mult * maturity
//                          * breadth), at least $1, at most $100T.
//
// No protocol name is ever special-cased; the same function scores every
// row. Each row also carries risk flags derived from its own record — TVL
// falling fast, very young, single-chain, no 7d data — and its farm plan is
// derived from its own category, chains, TVL, age and risk flags.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  peer_floor: number;
  peer_cap: number;
  peer_min_n: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_step: number;
  breadth_max_extra_chains: number;
  max_implied: number;
}

export const MODEL: ModelConstants = {
  peer_floor: 0.05,
  peer_cap: 1.2,
  peer_min_n: 3,
  growth_weight: 0.8,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.65,
  maturity_range: 0.55,
  maturity_days: 1460,
  unknown_age_days: 365,
  breadth_step: 0.02,
  breadth_max_extra_chains: 5,
  max_implied: 100_000_000_000_000,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** One category's peer anchor: the median live-token mcap/TVL in it. */
export interface PeerRow {
  category: string;
  n: number;
  median_multiple: number;
}

/** The peer table: per-category medians plus the global fallback. */
export interface PeerTable {
  by_category: Map<string, PeerRow>;
  global_median: number;
  global_n: number;
}

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    peer_multiple: number;
    peer_n: number;
    peer_category: string;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    implied_per_tvl: number;
    age_days: number | null;
  };
  risk_flags: string[];
  risk_level: 'low' | 'medium' | 'high';
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  peer_multiple: number;
  peer_n: number;
  peer_category: string;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  implied_per_tvl: number;
  risk_flags: string[];
  risk_level: 'low' | 'medium' | 'high';
  watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the peer anchors, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  peers: PeerRow[];
  global_peer_median: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a sorted number list. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * The peer table: for every category with at least `peer_min_n` live-token
 * protocols, the median of their market-cap-to-TVL ratios; plus the global
 * median over all live-token protocols as the fallback. Medians, not means:
 * one outlier token (a CEX at 30x TVL) must not set the price.
 */
export function buildPeerTable(snapshot: Snapshot, model: ModelConstants = MODEL): PeerTable {
  const byCat = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio)) continue;
    all.push(ratio);
    const cat = p.category ?? 'Other';
    const list = byCat.get(cat) ?? [];
    list.push(ratio);
    byCat.set(cat, list);
  }
  all.sort((a, b) => a - b);
  const globalMedian = median(all);
  const byCategory = new Map<string, PeerRow>();
  for (const [cat, ratios] of [...byCat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (ratios.length < model.peer_min_n) continue;
    ratios.sort((a, b) => a - b);
    byCategory.set(cat, {
      category: cat,
      n: ratios.length,
      median_multiple: Math.min(model.peer_cap, Math.max(model.peer_floor, median(ratios))),
    });
  }
  return { by_category: byCategory, global_median: Math.min(model.peer_cap, Math.max(model.peer_floor, globalMedian)), global_n: all.length };
}

/** A protocol's peer multiple: its category's median, or the global median when its category has too few live peers. */
export function peerMultipleFor(p: SnapshotProtocol, peers: PeerTable): { multiple: number; n: number; category: string } {
  const row = peers.by_category.get(p.category ?? 'Other');
  if (row !== undefined) return { multiple: row.median_multiple, n: row.n, category: row.category };
  return { multiple: peers.global_median, n: peers.global_n, category: 'all live-token protocols' };
}

/** The breadth multiplier: 1.00x single-chain, +0.02 per extra chain up to 1.10x. */
export function breadthMultiplier(chains: number, model: ModelConstants): number {
  return 1 + model.breadth_step * Math.min(Math.max(chains - 1, 0), model.breadth_max_extra_chains);
}

/** The risk flags a protocol's own record raises, each with its number attached. */
export function riskFlags(p: SnapshotProtocol, age: number | null): string[] {
  const flags: string[] = [];
  if (p.change_7d !== null && p.change_7d <= -10) flags.push(`TVL fell ${Math.abs(p.change_7d).toFixed(1)}% in 7 days`);
  if (p.change_7d === null) flags.push('no 7-day TVL change reported');
  if (age !== null && age < 180) flags.push(`listed only ${age} days ago`);
  if (age === null) flags.push('listing date unknown');
  if (p.chains.length <= 1) flags.push('single-chain: all TVL on one chain');
  if (p.tvl_usd < 10_000_000) flags.push(`small TVL: $${(p.tvl_usd / 1e6).toFixed(1)}M, thin liquidity`);
  return flags;
}

/** low: no flag or one mild one; medium: two flags; high: three or more, or TVL falling fast. */
export function riskLevel(flags: string[], p: SnapshotProtocol): 'low' | 'medium' | 'high' {
  if (p.change_7d !== null && p.change_7d <= -10) return 'high';
  if (flags.length >= 3) return 'high';
  if (flags.length === 2) return 'medium';
  return 'low';
}

/** The peer multiple and the three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  peers: PeerTable,
): { implied: number; peerMult: number; peerN: number; peerCategory: string; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; impliedPerTvl: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const peer = peerMultipleFor(protocol, peers);
  // Round the peer multiple to 4 decimals BEFORE pricing: board.json and
  // data.js carry the rounded value, and the dashboard recomputes the row
  // from it, so the page's number is bit-for-bit the board's number.
  const peerMult = Math.round(peer.multiple * 1e4) / 1e4;
  const breadthMult = breadthMultiplier(protocol.chains.length, model);
  const impliedPerTvl = peerMult * growthMult * maturityMult * breadthMult;
  const implied = Math.min(model.max_implied, Math.max(1, Math.round(protocol.tvl_usd * impliedPerTvl)));
  return { implied, peerMult, peerN: peer.n, peerCategory: peer.category, growthPct, growthMult, maturityMult, breadthMult, impliedPerTvl, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Categories that are a bridged product of a token that already trades — never a launch of their own. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Restaked BTC', 'CEX']);

/** A name that carries a whole word wrapped, staked or staking, in any case. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** A name that begins with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/**
 * Whether a protocol is one the board may rank: pre-token, and not a
 * wrapped, staked or bridged product of a protocol whose token already
 * trades. WBTC is Bitcoin on Ethereum, USDT0 is a bridged dollar, and
 * Binance staked ETH is ETH in a staking product: none of them is a
 * protocol still waiting on a launch of its own, whatever their TVL — so
 * bridges, restaked BTC and exchange-named or staked-named products are
 * out. Liquid-staking protocols stay in: a staking protocol's own
 * governance token is a genuine launch candidate, and any product whose
 * name says staked or wrapped is still caught by the name rules.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const peers = buildPeerTable(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it, whatever its size.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: EVERY other rankable pre-token protocol in the
  // snapshot, by TVL — no cap. The radar exists to find the early ones.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, peers);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const flags = riskFlags(s.p, s.age);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      model: {
        peer_multiple: round4(s.peerMult),
        peer_n: s.peerN,
        peer_category: s.peerCategory,
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        breadth_multiplier: round4(s.breadthMult),
        implied_per_tvl: round4(s.impliedPerTvl),
        age_days: s.age,
      },
      risk_flags: flags,
      risk_level: riskLevel(flags, s.p),
      farm_steps: farmSteps(s.p, s.age, flags).map(stepText),
    };
  });
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** A typical gas cost for one transaction on a chain, from the chain's own fee market. */
function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $5 to $15 of gas per transaction';
  if (c === 'solana') return 'about $0.01 of gas per transaction';
  if (c === 'bitcoin') return 'about $2 to $5 of network fees per transaction';
  if (c === 'tron') return 'about $0.50 of energy and bandwidth per transaction';
  if (c === 'binance' || c === 'bsc' || c === 'polygon' || c === 'avalanche') return 'about $0.10 to $0.50 of gas per transaction';
  if (c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'ink' || c === 'monad') return 'about $0.05 to $0.50 of gas per transaction';
  return 'about $0.50 to $2 of gas per transaction';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 90;
  if (age < 365) return 60;
  if (age < 730) return 45;
  return 30;
}

/** The category's main farming action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open so it earns interest and shows up in the protocol's activity record.`;
  if (c.includes('cdp')) return `Open a collateralised position on ${name} on ${chain} with $${capital} of collateral and mint or borrow against it at a safe ratio.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} in a balanced pair and keep the position open.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and hold the vault shares.`;
  if (c.includes('risk curator') || c.includes('allocator') || c.includes('curator')) return `Deposit $${capital} into a ${name} curated vault on ${chain} and keep the shares so the allocation is counted.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${capital} of USDC into ${chain} through ${name} and put the bridged funds to work in its app instead of bridging straight back.`;
  if (c.includes('liquid staking') || c.includes('liquid restaking') || c.includes('restak') || c.includes('staking pool')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the liquid receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small hedged position, then close it after a few days.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name} on ${chain}, then settle or hold it to expiry.`;
  if (c.includes('stablecoin') || c.includes('algo-stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the protocol's own vault.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it so the balance is visible on chain.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active through the coverage period.`;
  if (c.includes('launchpad')) return `Stake $${capital} into ${name}'s launch pool on ${chain} and join one sale or allocation round.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis vault on ${chain} and hold the position through at least one funding cycle.`;
  if (c.includes('nft')) return `List or lend against $${capital} of NFT collateral through ${name} on ${chain} and keep the position open.`;
  if (c.includes('payment') || c.includes('card')) return `Load $${capital} onto ${name} on ${chain} and spend or hold it through the protocol's own rails.`;
  if (c.includes('synthetic')) return `Mint $${capital} of ${name}'s synthetic asset on ${chain} against collateral and hold the position.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open so the wallet is active in the protocol.`;
}

/** The category's second, different action: a farm that does one thing once is easy to filter out. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const half = Math.max(25, Math.round(capital / 2));
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${half} against the deposit on ${name} and swap half of it back into the supplied asset, keeping the health factor above 2.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Swap $${half} through ${name}'s own router on ${chain} in two separate weeks so the wallet shows repeat trading volume.`;
  if (c.includes('yield') || c.includes('curator') || c.includes('allocator')) return `Move $${half} into a second ${name} vault on a different chain from its list and hold both vault shares.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${half} back through ${name} to a second chain it supports, then bridge it in again a week later.`;
  if (c.includes('staking') || c.includes('restak')) return `Restake the receipt token from ${name} once more through its own restaking route and keep the new receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return `Place a second, opposite small trade on ${name} a week later so the account shows two-sided activity.`;
  if (c.includes('prediction')) return `Place a second market position on ${name} in a different market, with $${half} at stake.`;
  if (c.includes('stablecoin') || c.includes('algo-stable')) return `Swap $${half} of the stable asset through ${name}'s own pool and hold the remainder in the vault.`;
  if (c.includes('rwa')) return `Use $${half} of the yield asset as collateral in ${name}'s own lending route, if it offers one, and repay it within a week.`;
  if (c.includes('launchpad')) return `Vote or complete one allocation task on ${name} with the staked position still open.`;
  return `Do one more on-chain action inside ${name} on ${chain} — a swap, a vote or a second deposit of $${half} — a week after the first.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age, risk flags), never from a hand-written list of names. Step 2 splits
 * the capital across the protocol's first two chains; step 7 answers the
 * row's own risk flags, so two protocols never get the same warning.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, flags: string[]): FarmStep[] {
  const chain = chainOf(p);
  const chain2 = p.chains.length > 1 ? p.chains[1]! : chain;
  const capital = capitalFor(p);
  const half = Math.max(25, Math.round(capital / 2));
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  const gas2 = chain2 !== chain ? gasFor(chain2) : gas;
  const riskStep =
    flags.length === 0
      ? {
          text: `This row raises no risk flag on its own record: TVL is steady, it runs on ${p.chains.length} chain${p.chains.length === 1 ? '' : 's'}, and it has been listed long enough to judge. Still size the position so a single protocol is never more than a fifth of one farm wallet.`,
          cost: 'no extra cost, position sizing only',
          time: '5 minutes to check the split',
        }
      : {
          text: `Mind this row's flags before adding capital: ${flags.join('; ')}. Keep the first deposit at $${half}, not $${capital}, and only scale up after two weekly actions with no further TVL drop.`,
          cost: `$${half} first, the other $${capital - half} only after two clean weeks`,
          time: 'two weeks of watching before scaling',
        };
  return [
    {
      text: `Set up a fresh wallet that holds only the funds you plan to farm on ${p.name}, write its seed phrase on paper and keep it offline.`,
      cost: 'nothing to create, under $3 of gas for the first transaction',
      time: '10 minutes',
    },
    {
      text: actionFor(p, capital, chain) +
        (chain2 !== chain ? ` Put $${half} of it on ${chain2} as well, so the wallet is active on both of ${p.name}'s top chains.` : ''),
      cost: `$${capital} of capital and ${gas}${chain2 !== chain ? ` on ${chain} plus ${gas2} on ${chain2}` : ''}`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `$${half} of capital and ${gas}`,
      time: '10 minutes, one week after the first deposit',
    },
    {
      text: `Repeat one qualifying action each week — a deposit, a borrow, a swap or a vote on ${chain}${chain2 !== chain ? ` or ${chain2}` : ''} — so the wallet stays active across snapshots.`,
      cost: gas + ' a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot and not read as a one-day deposit.`,
      cost: `the $${capital} stays in the position for ${hold} days`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open ${p.name}'s own points or rewards page from the link the protocol itself publishes and check what the wallet has earned.`,
      cost: 'no fee to check, and never pay anyone to claim',
      time: '10 minutes',
    },
    riskStep,
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log, then unwind in reverse — repay any borrow first, then withdraw the deposit.`,
      cost: gas + ' to unwind',
      time: '15 minutes to unwind',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan carried along. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    peer_multiple: row.model.peer_multiple,
    peer_n: row.model.peer_n,
    peer_category: row.model.peer_category,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    implied_per_tvl: row.model.implied_per_tvl,
    risk_flags: row.risk_flags,
    risk_level: row.risk_level,
    watchlist: watchlist.has(row.slug),
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const peers = buildPeerTable(snapshot, model);
  const watchSet = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchSet.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    peers: [...peers.by_category.values()].sort((a, b) => b.median_multiple - a.median_multiple || (a.category < b.category ? -1 : 1)),
    global_peer_median: peers.global_median,
    rows: board.map((r) => radarRow(r, watchSet)),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
