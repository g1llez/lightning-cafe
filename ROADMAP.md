# Lightning Café — Roadmap

Source of truth for what to build next. Do not replan after each task: take the first open item in the current version.

**Now:** v0.2.1b done → next is **v0.2.2**

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
- Sell sats back to $ from the same nav service as Buy
- Also an on-chain tx (service sweep), spending from the wallet addresses
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

xpub (watch-only): show it in the wallet, explain that it derives every address and reveals the whole
history without being able to spend. Possibly let the exchange take an xpub and pay a fresh address
each time. Nostr identity (npub, zaps, Lightning address) belongs with L2, not with buying on-chain.

---

## How we work

1. One item at a time, in order (v0.2.1 then v0.2.2 …).
2. An item is done when it is visible in the UI and covered by a test in `/tests` if it is simulation logic.
3. If an idea appears mid-task, add it under Later or at the end of the current version. Do not reshuffle the queue.
