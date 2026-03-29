# 🏹 RobinhoodNFT — Stylus ERC-721 NFT Platform

> A full-stack NFT platform built with **Arbitrum Stylus** (Rust) and **Next.js 14**, featuring an on-chain marketplace, ERC-2981 royalties, whitelist minting, and a polished glassmorphism dashboard. Built during the **Arbitrum Stylus Workshop**.

![Arbitrum Stylus](https://img.shields.io/badge/Arbitrum-Stylus-blue?style=flat-square&logo=arbitrum)
![Rust](https://img.shields.io/badge/Rust-Smart%20Contract-orange?style=flat-square&logo=rust)
![Next.js](https://img.shields.io/badge/Next.js%2014-Frontend-black?style=flat-square&logo=next.js)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Key Features

### 🔗 Smart Contract (Rust / Stylus SDK)

The core smart contract is written in **Rust** using the **Stylus SDK v0.9.0** and compiled to WASM for execution on the Arbitrum Stylus VM. It implements:

| Feature | Description |
|---|---|
| **ERC-721 NFT Standard** | Full implementation — `name`, `symbol`, `balanceOf`, `ownerOf`, `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll`, `getApproved`, `isApprovedForAll`, `tokenURI` |
| **ERC-2981 Royalties** | On-chain royalty standard — configurable receiver & fee (basis points, max 10%). Automatically enforced during marketplace sales |
| **ERC-165 Interface Detection** | `supportsInterface` returns `true` for ERC-165, ERC-721, ERC-721 Metadata, and ERC-2981 |
| **On-Chain Marketplace** | List NFTs for sale (escrow-based), buy with automatic royalty deduction + excess refund, and unlist |
| **Whitelist / Allowlist Minting** | Owner-controlled whitelist with per-wallet mint limits. Toggle whitelist mode on/off |
| **Supply Cap** | Configurable max supply enforced at mint time (`0` = unlimited) |
| **Pausable** | Emergency pause/unpause halts all transfers, mints, burns, and approvals |
| **Ownable** | Owner-only access control with `transferOwnership` support |
| **Token URI / Metadata** | Configurable `baseURI` for off-chain metadata (OpenSea, marketplaces) |
| **Burn** | Token holders can burn their own NFTs |
| **Multiple Mint Methods** | `mint()`, `mintTo(address)`, `safeMint(address)`, and `whitelistMint()` |

### 🌐 Frontend (Next.js 14 / React)

A modern, responsive dashboard built with **Next.js 14 App Router**, **Tailwind CSS**, **wagmi v2**, **viem**, and **RainbowKit**:

| Feature | Description |
|---|---|
| **NFT Gallery** | Live gallery sourced from on-chain `Transfer` events — displays metadata images, names, and owners |
| **Event Timeline** | Real-time feed of `Transfer`, `Approval`, `Listed`, and `Sold` events with block explorer links |
| **Full Contract Interaction Panel** | UI for every contract function — mint, transfer, approve, burn, list, buy, unlist, and royalty management |
| **Multi-Network Support** | Switch between Arbitrum Sepolia, Superposition Testnet, and Robinhood Chain Testnet |
| **Custom Contract Address** | Enter any deployed contract address with automatic validation |
| **Wallet Integration** | RainbowKit connect button with automatic chain switching and network detection |
| **Glassmorphism UI** | Premium dark-mode design with glass panels, gradient accents, skeleton loaders, and micro-animations |
| **Auto-Refresh** | Dashboard data refreshes every 30 seconds and on-demand |

---

## 🏗️ Architecture

```
my-first-dapp/
├── contracts/
│   └── erc721/                           # Rust/Stylus smart contract
│       ├── src/
│       │   ├── lib.rs                    # RobinhoodNFT — main contract logic
│       │   │                               (marketplace, royalties, whitelist,
│       │   │                                pause, ownership, supply cap)
│       │   ├── erc721.rs                 # Base ERC-721 implementation
│       │   │                               (transfers, approvals, minting,
│       │   │                                burning, ERC-165, metadata)
│       │   └── main.rs                   # ABI export entrypoint
│       ├── Cargo.toml                    # Stylus SDK 0.9.0, alloy-primitives
│       └── rust-toolchain.toml
│
├── apps/
│   └── web/                              # Next.js 14 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx              # Home — renders NftDashboard
│       │   │   ├── layout.tsx            # Root layout, fonts, providers
│       │   │   ├── providers.tsx         # Wagmi + RainbowKit provider tree
│       │   │   └── globals.css           # Glassmorphism styles & animations
│       │   ├── components/
│       │   │   ├── nft-dashboard.tsx     # NFT gallery + event timeline
│       │   │   └── wallet-button.tsx     # Connect wallet button
│       │   └── lib/
│       │       ├── erc721-stylus/        # Full ERC-721 interaction module
│       │       │   ├── src/
│       │       │   │   ├── ERC721InteractionPanel.tsx
│       │       │   │   │                   (mint, transfer, approve, burn,
│       │       │   │   │                    marketplace, royalties UI)
│       │       │   │   ├── hooks/        # useERC721Deploy, useERC721Interactions
│       │       │   │   ├── constants.ts
│       │       │   │   ├── deployment.ts
│       │       │   │   ├── interactions.ts
│       │       │   │   └── types.ts
│       │       │   └── components/
│       │       │       └── ERC721NFTPanel.tsx
│       │       ├── wallet-auth/          # Wallet authentication module
│       │       ├── chains.ts             # Chain definitions
│       │       ├── wagmi.ts              # Wagmi config
│       │       └── utils.ts
│       ├── tailwind.config.js
│       ├── next.config.js
│       └── package.json
│
├── scripts/
│   ├── deploy-sepolia.sh                 # Arbitrum Sepolia deployment
│   ├── deploy-mainnet.sh                 # Arbitrum One deployment
│   ├── deploy-erc721.ts                  # TypeScript deploy helper
│   ├── install-radar.sh                  # Radar security tool installer
│   └── run-radar.sh                      # Run security analysis
│
├── docs/
│   ├── erc721-nft.md                     # ERC-721 integration guide
│   ├── SMARTCACHE_USAGE.md               # SmartCache usage guide
│   ├── RADAR_SECURITY_ANALYSIS.md        # Security analysis report
│   └── frontend/
│       └── README.md                     # Frontend architecture docs
│
└── package.json                          # Monorepo root scripts
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ / **pnpm**
- **Rust** toolchain with `wasm32-unknown-unknown` target
- **cargo-stylus** (`cargo install cargo-stylus`)
- **Foundry** (`cast`) for deployment

### 1. Clone & Install

```bash
git clone https://github.com/your-username/my-first-dapp.git
cd my-first-dapp
pnpm install
cd apps/web && pnpm install && cd ../..
```

### 2. Configure Environment

```bash
cp apps/web/.env.example apps/web/.env
```

Set the following in your `.env`:

```env
PRIVATE_KEY=your_deployment_private_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

> Get a WalletConnect Project ID at [dashboard.reown.com](https://dashboard.reown.com)

### 3. Build the Contract

```bash
cd contracts/erc721
cargo build --release --target wasm32-unknown-unknown
```

### 4. Deploy to Arbitrum Sepolia

```bash
# From repo root
pnpm deploy:sepolia
```

The script will:
1. Check for `cargo stylus` and required tools
2. Optionally verify Radar security analysis was run
3. Deploy the WASM contract via `cargo stylus deploy`
4. Output the contract address and transaction hash

### 5. Run the Frontend

```bash
cd apps/web
pnpm dev
```

Open [localhost:3000](http://localhost:3000) — connect your wallet and interact with the deployed contract.

---

## 📜 Smart Contract API Reference

### Initialization

| Function | Access | Description |
|---|---|---|
| `initialize(max_supply)` | Once | Sets caller as owner, configures max supply |

### Minting

| Function | Access | Description |
|---|---|---|
| `mint()` | Owner | Mints NFT to caller |
| `mintTo(address)` | Owner | Mints NFT to specified address |
| `safeMint(address)` | Owner | Safe mint with `onERC721Received` callback |
| `whitelistMint()` | Whitelisted | Mint if whitelist enabled and within limit |

### Marketplace (Escrow-Based)

| Function | Access | Description |
|---|---|---|
| `listForSale(tokenId, price)` | Token Owner | Lists NFT for sale, transfers to contract escrow |
| `unlist(tokenId)` | Original Seller | Cancels listing, returns NFT from escrow |
| `buyNft(tokenId)` | Anyone (payable) | Buys listed NFT; auto-deducts royalty, refunds excess ETH |
| `getListing(tokenId)` | View | Returns `(seller, price)` for a listing |

### ERC-2981 Royalties

| Function | Access | Description |
|---|---|---|
| `setDefaultRoyalty(receiver, fee)` | Owner | Sets royalty receiver & fee in basis points (max 1000 = 10%) |
| `royaltyInfo(tokenId, salePrice)` | View | Returns `(receiver, royaltyAmount)` per ERC-2981 |
| `getRoyaltyReceiver()` | View | Current royalty receiver address |
| `getRoyaltyFee()` | View | Current fee in basis points |

### Access Control & Safety

| Function | Access | Description |
|---|---|---|
| `pause()` / `unpause()` | Owner | Emergency stop — blocks transfers, mints, burns, approvals |
| `transferOwnership(newOwner)` | Owner | Transfer contract ownership |
| `setWhitelistEnabled(bool)` | Owner | Toggle whitelist minting mode |
| `addToWhitelist(address)` | Owner | Add address to whitelist |
| `removeFromWhitelist(address)` | Owner | Remove address from whitelist |
| `setWhitelistMintLimit(limit)` | Owner | Set per-wallet mint cap (0 = unlimited) |

### ERC-721 Standard

| Function | Access | Description |
|---|---|---|
| `name()` / `symbol()` | View | Collection metadata |
| `totalSupply()` | View | Total minted token count |
| `balanceOf(owner)` | View | NFT count for address |
| `ownerOf(tokenId)` | View | Token owner lookup |
| `tokenURI(tokenId)` | View | Metadata URI (`baseURI + tokenId`) |
| `transferFrom(from, to, tokenId)` | Approved | Transfer NFT |
| `approve(address, tokenId)` | Owner | Approve spender for token |
| `setApprovalForAll(operator, bool)` | Owner | Approve/revoke operator |
| `supportsInterface(interfaceId)` | View | ERC-165 introspection |

---

## 🌍 Deployed Contracts

| Network | Contract Address | Explorer |
|---|---|---|
| **Arbitrum Sepolia** | `0xe2a8cd01354ecc63a8341a849e9b89f14ff9f08f` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xe2a8cd01354ecc63a8341a849e9b89f14ff9f08f) |
| **Superposition Testnet** | `0xa0cc35ec0ce975c28dacc797edb7808e882043c3` | [View on Explorer](https://testnet-explorer.superposition.so/address/0xa0cc35ec0ce975c28dacc797edb7808e882043c3) |

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `pnpm deploy:sepolia` | Deploy contract to Arbitrum Sepolia via `cargo stylus` |
| `pnpm deploy:mainnet` | Deploy contract to Arbitrum One |
| `pnpm security:install` | Install Radar security analysis tool |
| `pnpm security:analyze` | Run security analysis on the contract |
| `pnpm fix-scripts` | Fix CRLF line endings (Windows) |
| `cd apps/web && pnpm dev` | Start the Next.js frontend dev server |

---

## 📚 Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Rust, Stylus SDK 0.9.0, alloy-primitives 0.8.20, alloy-sol-types 0.8.20 |
| **Contract Target** | `wasm32-unknown-unknown` → Arbitrum Stylus VM |
| **Frontend Framework** | Next.js 14 (App Router), React 18, TypeScript 5 |
| **Web3 Libraries** | wagmi v2, viem v2, ethers v6 |
| **Wallet** | RainbowKit v2, WalletConnect |
| **Styling** | Tailwind CSS 3.4, custom glassmorphism design system |
| **Security** | Radar static analysis integration |

---

## 🔒 Security Considerations

- **Escrow-based marketplace**: NFTs are transferred to the contract when listed, preventing double-listing or transfer-while-listed attacks
- **Royalty cap**: Maximum royalty fee is capped at 10% (1000 basis points) to prevent misconfiguration
- **Excess refund**: `buyNft` refunds any ETH sent above the listing price
- **Pause mechanism**: Owner can emergency-pause all state-changing operations
- **Access control**: All administrative functions are owner-gated with explicit error types
- **Zero-address guards**: Ownership transfer and royalty receiver reject the zero address
- **Radar analysis**: Integrated static security analysis tooling (`pnpm security:analyze`)

---

## 📖 Development Log (Commit History)

The project was built incrementally, with each commit adding a distinct feature:

1. **Initial scaffold** — [N]skills boilerplate with Next.js + Stylus contract skeleton
2. **Owner-based access control** — `Ownable` pattern with `only_owner` guard
3. **tokenURI metadata support** — `baseURI` + `tokenURI(tokenId)` for marketplace compatibility
4. **Pausable contract** — Emergency `pause()` / `unpause()` with `when_not_paused` guard
5. **totalSupply view function** — Expose total minted count as a public view
6. **Max supply cap** — Configurable minting limit to enforce NFT scarcity
7. **Whitelist/allowlist minting** — Per-wallet mint limits with owner-managed allowlist
8. **Enhanced frontend UI** — Glassmorphism dashboard with NFT gallery, event timeline, and full interaction panel
9. **README documentation** — Comprehensive project documentation
10. **NFT Marketplace + ERC-2981 Royalties** — Escrow-based list/buy/unlist with automatic royalty deduction

---

## 📄 License

MIT

---

Built with ❤️ during the **Arbitrum Stylus Workshop**
