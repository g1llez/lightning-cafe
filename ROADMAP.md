# Lightning Café — Roadmap

Source of truth for what to build next. Do not replan after each task: take the first open item in the current version.

**Now:** v0.2.1 done → next is **v0.2.2**

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

Account: 1000 $ in the nav, BTC price, create wallet, buy 100 $ (instant, not yet a chain tx), npub required to buy.

L2: empty table, create node = not yet.

---

## v0.2 — L1 100% functional

A wallet can receive, send, and watch its money move on the fake chain. Buying and sending are real L1 txs in the sim (mempool → next block → balance updates).

### v0.2.1 — Wallet usable ✅
- Show address in the L1 table
- Select wallet (target for buy / send)
- Optional rename
- Empty state already exists; keep it clean

### v0.2.2 — Buy goes on-chain
- Buy 100 $ creates a tx in mempool (high priority by default)
- $ drops immediately (paid to the service)
- Sats appear on the wallet only when the tx is mined
- Pending sats visible on the wallet row

### v0.2.3 — Send on-chain
- Send sats from wallet A to wallet B (or a pasteable fake address)
- Same mempool → confirm flow
- Choose fee: high / medium / low (which projected block it joins)

### v0.2.4 — Inspect txs
- Click a mempool or confirmed block to see txs inside
- Player txs highlighted
- Click a wallet to see its tx history

### v0.2.5 — Sell BTC
- Sell sats back to $ via Services (L1 +)
- Also an on-chain tx (service sweep)
- Inverse of buy

### v0.2.6 — Persist
- Save chain + player in localStorage
- Reset sandbox action

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

Guide / tips, LSP, rebalancing, watchtower, mempool.space link, extra languages.

---

## How we work

1. One item at a time, in order (v0.2.1 then v0.2.2 …).
2. An item is done when it is visible in the UI and covered by a test in `/tests` if it is simulation logic.
3. If an idea appears mid-task, add it under Later or at the end of the current version. Do not reshuffle the queue.
