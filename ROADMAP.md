# Lightning Café — Roadmap

Source of truth for what to build next. Do not replan after each task: take the first open item in the current version.

**Now:** v0.2.5 Sell BTC done → v0.2 L1 close (buy, send, inspect, sell, persist)

| Version | Goal | Status |
|---|---|---|
| v0.1 | Walking skeleton + L1 living chain + layout | Done |
| v0.2 | L1 fully usable | In progress |
| v0.3 | L2 node sim animated | Later |
| v0.4 | L2 usable (channels + payments) | Later |

L2 stays a placeholder until v0.2 is closed. No nodes, no channels, no Lightning payments before that.

---

## v0.1 — current (done)

Layout, i18n FR/EN, GitHub Pages.

L1: animated blocks (~1 min, labelled as estimate), mempool priorities, sat/vB, tx counts, fictional pools, tooltips.

Account: 1000 $ in the nav, BTC price, create wallet, buy 100 $ (instant, not yet a chain tx).

L2: empty table, create node = not yet.

---

## v0.2 — L1 100% functional

A wallet can receive, send, and watch its money move on the fake chain. Buying and sending are real L1 txs in the sim (mempool → next block → balance updates).

### v0.2.1 — Wallet usable ✅
- Show address in the L1 table (`lc1q…` sandbox prefix, not `bc1`)
- Select wallet (target for buy / send)
- Optional rename
- Hidden 12-word sandbox seed (not BIP39) to teach public vs secret
- Empty state already exists; keep it clean

### v0.2.1b — Wallet UI made logical ✅
- Wallets table is a list only (name + balance); `+` only creates a wallet
- Wallet detail (master/detail in the same card): balance → receive → my addresses → backup
- Several receive addresses per wallet, all derived from the 12 words, `New address` button
- 12 words drawn at random, explained in a popup right after wallet creation (OK → the wallet)
- 12 words revealed in two steps (warning first) from the Backup section
- Buy moved out of the wallets `+` to a `Buy` button in the nav: amount + destination wallet only
- No npub in the buy flow: an address is what receives money. KYC mentioned as a note instead
- Sats sit on an address, not on the wallet: balance per address, wallet total is the sum
- Nav separates `My funds` ($ + sats) from `Market` (BTC price), which used to read as one number
- L2 starts collapsed as a single bar; L1 takes the whole canvas until the user opens L2

### v0.2.2 — Buy goes on-chain ✅
- Buy creates a tx in the mempool (high priority by default)
- $ drops immediately (paid to the service)
- Sats appear on the destination address only when a block carries the tx
- Pending sats visible on the wallet row, in the detail, per address, and in the nav
- Badge on the mempool block that holds your tx, and it moves up as blocks are mined
- Fee tiers already wired: high 1 block, medium 2, low 3 — v0.2.3 only has to expose the choice
- The player pastes the receive address into the exchange; an unknown address is refused
- Animated chip flies from `My funds` to the mempool block when the buy is sent

### v0.2.2b — Fee choice on the buy ✅
- `Paste` button next to the destination, so the copy → paste habit stays but costs one click
- Fee choice high / medium / low, each showing its sat/vB and how many blocks it waits
- The chip flies to the block matching the choice, not always to the next block
- Orange ring follows the player's pending tx, not the next block to be mined
- Hovering a mempool block lists the player's waiting txs (sats, address, wallet)
- Browser check in `/tests/browser` (paste + landing block), run with `npm run test:browser`

### v0.2.2c — Fee market (bid vs market) ✅
- A tx bids a fixed sat/vB; the market `P` moves each mined block
- Above `P + 20%` → this block; below `P - 20%` → wait; in the band → coin flip
- Mempool lanes stay High / Medium / Low and only their quotes move (no conveyor)
- Buy buttons copy the current quotes as the bid
- Sim in `/tests/fees.test.ts`: min / med / max bids vs a falling market (6 / 4 / 1 blocks when unlucky)

### v0.2.3 — Send on-chain ✅
- List of wallets: Receive and Send on the source row; creating a wallet stays on the list
- Wallet detail is a summary: confirmed sats, UTXOs, backup / restore
- Confirmed sats leave the sender immediately; they land on the destination when a block accepts the bid
- Another of your wallets, or an unknown `lc1q` (those sats burn at confirmation — a typo lesson)
- Spends from the addresses that actually hold the sats
- Restore from 12 words recovers keys (and sats only if those addresses still hold them)
- Sim in `/tests/send.test.ts`

### v0.2.3b — Restore 12 boxes ✅
- Restore uses 12 fields, like Sparrow
- Paste still works if the backup copy kept `1.` / `1-` in front of each word
- Invalid seed shows a toast; it no longer blanks the whole screen
- Restore claims pending/confirmed sats already on those addresses (F5 or another client in the same Café room)
- Copy / paste the 12 words; delete a wallet from the screen (restore brings it back)

### v0.2.4 — Inspect txs ✅
- Click a mempool or confirmed block to see the `lc1q` addresses it pays (yours highlighted)
- Hover an address for sats, miner fee, mempool vs block
- Wallet UTXOs: same tooltip on each address that holds sats
- Sim in `/tests/inspect.test.ts`

### v0.2.6 — Persist ✅
- Solo: save chain + player in localStorage so F5 keeps wallets, $ and sats
- Café: keep the 12 words locally; the room rebuilds txs (no double credit)
- Reset sandbox in the footer (this browser only)
- Sim in `/tests/persist.test.ts`

### v0.2.5 — Sell BTC ✅
- Vendre shows the exchange `lc1` deposit only (copy). Send from a wallet, like a real deposit
- You pick sat/vB on Send; no extra cut; $ after 3 confirmations (tooltip on the deposit screen and on Send)
- Sim in `/tests/sell.test.ts` (a send to that address)

**v0.2 done when:** you can create two wallets, buy, wait for a block, send between them with a fee choice, see the tx in a block, sell, refresh the page and still have the same state.

---

## v0.3 — L2 node sim animated

Visual Lightning network that lives, still not fully playable.

### v0.3.1 — Create a node
- Alias, color, appears in L2 table
- Tied to a funding wallet (on-chain balance shown)

### v0.3.2 — NPC graph
- Several NPC nodes already connected
- Simple animated graph in the L2 canvas

### v0.3.3 — Background traffic
- Payments between NPCs along channels
- Heat on channels, no player routing yet

---

## v0.4 — L2 functional

Player node can open channels and pay, with the L1 contract visible.

### v0.4.1 — Open channel
- Funding tx on L1, then channel appears on L2
- Local / remote liquidity bar

### v0.4.2 — Lightning pay / receive
- Invoice, multi-hop if needed
- Inbound vs outbound made obvious

### v0.4.3 — Close channel
- Cooperative close → L1
- Force close simplified

### v0.4.4 — Third-party use
- NPC traffic can use the player channel
- Show routing fees earned (no profitability lecture)

---

## Later (not scheduled)

Shared cafe session: **Café** in the nav creates or joins a room on `cafe-session.sarius.ca`. Solo stays on the local clock. In a room, ticks come from the server and buy/send are published as `tx`. CORS is GitHub Pages only — test on the deployed site, not `npm run dev`. Backend: https://github.com/g1llez/lightning-cafe-session.git (private).

Guide / tips, LSP, rebalancing, watchtower, mempool.space link, extra languages.

xpub (watch-only): show it in the wallet, explain that it derives every address and reveals the whole
history without being able to spend. Possibly let the exchange take an xpub and pay a fresh address
each time. Nostr identity (npub, zaps, Lightning address) belongs with L2, not with buying on-chain.

---

## How we work

1. One item at a time, in order (v0.2.1 then v0.2.2 …).
2. An item is done when it is visible in the UI and covered by a test in `/tests` if it is simulation logic.
3. If an idea appears mid-task, add it under Later or at the end of the current version. Do not reshuffle the queue.
