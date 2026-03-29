# My Dapp

A Web3 application - composed with [N]skills

## 📁 Project Structure

```
my-dapp/
├── apps/
│   └── web/                              # Next.js 14 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css           # Global styles & animations
│       │   │   ├── layout.tsx            # Root layout with fonts & providers
│       │   │   ├── page.tsx              # Home page (renders NftDashboard)
│       │   │   └── providers.tsx         # Wagmi + RainbowKit provider setup
│       │   ├── components/
│       │   │   ├── nft-dashboard.tsx     # Main NFT dashboard UI
│       │   │   └── wallet-button.tsx     # Connect wallet button
│       │   ├── lib/
│       │   │   ├── erc721-stylus/        # ERC-721 Stylus interaction module
│       │   │   │   ├── src/
│       │   │   │   │   ├── ERC721InteractionPanel.tsx
│       │   │   │   │   ├── hooks/        # useERC721Deploy, useERC721Interactions
│       │   │   │   │   ├── constants.ts
│       │   │   │   │   ├── deployment.ts
│       │   │   │   │   ├── interactions.ts
│       │   │   │   │   └── types.ts
│       │   │   │   └── components/
│       │   │   │       └── ERC721NFTPanel.tsx
│       │   │   ├── wallet-auth/          # Wallet authentication module
│       │   │   │   └── src/
│       │   │   │       ├── providers.tsx
│       │   │   │       ├── hooks/        # useWalletAuth
│       │   │   │       ├── config.ts
│       │   │   │       ├── constants.ts
│       │   │   │       └── types.ts
│       │   │   ├── chains.ts             # Supported chain definitions
│       │   │   ├── wagmi.ts              # Wagmi config with RainbowKit
│       │   │   └── utils.ts              # Utility helpers
│       │   └── types/                    # TypeScript type declarations
│       │       ├── env.d.ts
│       │       ├── viem.d.ts
│       │       └── viem-chains.d.ts
│       ├── tailwind.config.js
│       ├── next.config.js
│       ├── tsconfig.json
│       └── package.json
├── contracts/
│   └── erc721/                           # Rust/Stylus ERC-721 smart contract
│       ├── src/                          # Contract source code
│       ├── examples/                     # Example usage
│       ├── Cargo.toml
│       └── rust-toolchain.toml
├── docs/
│   ├── frontend/
│   │   └── README.md                     # Frontend architecture guide
│   ├── erc721-nft.md                     # ERC-721 NFT integration docs
│   ├── SMARTCACHE_USAGE.md               # SmartCache usage guide
│   └── RADAR_SECURITY_ANALYSIS.md        # Security analysis report
├── scripts/
│   ├── deploy-erc721.ts                  # ERC-721 deployment script
│   ├── deploy-sepolia.sh                 # Arbitrum Sepolia deployment
│   ├── deploy-mainnet.sh                 # Arbitrum One deployment
│   ├── install-radar.sh                  # Radar security tool installer
│   └── run-radar.sh                      # Run security analysis
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd my-dapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
      - `PRIVATE_KEY`: Private key for deployment and transactions
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Cloud project ID for wallet connections

4. **Deploy contracts** (from repo root): `pnpm deploy:sepolia` or `pnpm deploy:mainnet`

5. **Scripts (Windows):** Run `pnpm fix-scripts` or `dos2unix scripts/*.sh` if you see line-ending errors.

## 🔗 Smart Contracts

The `contracts/` folder contains Rust/Stylus smart contract source code. See `docs/` for deployment and integration guides.

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm deploy:sepolia` | Deploy to Arbitrum Sepolia |
| `pnpm deploy:mainnet` | Deploy to Arbitrum One |
| `pnpm fix-scripts` | Fix CRLF line endings (Windows) |

## 🌐 Supported Networks

- Arbitrum Sepolia (Testnet)
- Arbitrum One (Mainnet)
- Superposition
- Superposition Testnet

## 📚 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Web3:** wagmi + viem
- **Wallet Connection:** RainbowKit

## 📖 Documentation

See the `docs/` folder for:
- Contract interaction guide
- Deployment instructions
- API reference

## License

MIT

---

Generated with ❤️ by [[N]skills](https://www.nskills.xyz)
