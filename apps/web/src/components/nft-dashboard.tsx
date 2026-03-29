'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAccount, usePublicClient } from 'wagmi';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Blocks,
  ExternalLink,
  GalleryHorizontal,
  RefreshCw,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { WalletButton } from '@/components/wallet-button';
import { ERC721InteractionPanel } from '@/lib/erc721-stylus/src/ERC721InteractionPanel';

type SupportedChainId = 421614 | 98985 | 46630;
type Address = `0x${string}`;

type EventKind = 'Transfer' | 'Approval' | 'ApprovalForAll' | 'Listed' | 'Sold';

interface GalleryToken {
  tokenId: bigint;
  owner: Address | null;
  tokenUri: string | null;
  metadataImage: string | null;
  metadataName: string | null;
  metadataDescription: string | null;
}

interface EventRow {
  kind: EventKind;
  txHash: string;
  blockNumber: bigint;
  from?: Address;
  to?: Address;
  owner?: Address;
  approved?: Address;
  operator?: Address;
  tokenId?: bigint;
}

interface ListedLog {
  transactionHash?: string;
  blockNumber?: bigint;
  args: {
    token_id?: bigint;
    seller?: string;
    price?: bigint;
  };
}

interface SoldLog {
  transactionHash?: string;
  blockNumber?: bigint;
  args: {
    token_id?: bigint;
    seller?: string;
    buyer?: string;
    price?: bigint;
  };
}

interface TransferLog {
  transactionHash?: string;
  blockNumber?: bigint;
  args: {
    from?: string;
    to?: string;
    tokenId?: bigint;
  };
}

interface ApprovalLog {
  transactionHash?: string;
  blockNumber?: bigint;
  args: {
    owner?: string;
    approved?: string;
    tokenId?: bigint;
  };
}

interface ApprovalForAllLog {
  transactionHash?: string;
  blockNumber?: bigint;
  args: {
    owner?: string;
    operator?: string;
  };
}

const CONTRACTS_BY_CHAIN: Record<SupportedChainId, Address> = {
  421614: '0xe2a8cd01354ecc63a8341a849e9b89f14ff9f08f',
  98985: '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
  46630: '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
};

const NETWORK_NAME_BY_CHAIN: Record<SupportedChainId, string> = {
  421614: 'Arbitrum Sepolia',
  98985: 'Superposition Testnet',
  46630: 'Robinhood Testnet',
};

const EXPLORER_BY_CHAIN: Record<SupportedChainId, string> = {
  421614: 'https://sepolia.arbiscan.io',
  98985: 'https://testnet-explorer.superposition.so',
  46630: 'https://explorer.testnet.chain.robinhood.com',
};

const TRANSFER_EVENT = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: true, name: 'tokenId', type: 'uint256' },
  ],
} as const;

const APPROVAL_EVENT = {
  type: 'event',
  name: 'Approval',
  inputs: [
    { indexed: true, name: 'owner', type: 'address' },
    { indexed: true, name: 'approved', type: 'address' },
    { indexed: true, name: 'tokenId', type: 'uint256' },
  ],
} as const;

const APPROVAL_FOR_ALL_EVENT = {
  type: 'event',
  name: 'ApprovalForAll',
  inputs: [
    { indexed: true, name: 'owner', type: 'address' },
    { indexed: true, name: 'operator', type: 'address' },
    { indexed: false, name: 'approved', type: 'bool' },
  ],
} as const;

const LISTED_EVENT = {
  type: 'event',
  name: 'Listed',
  inputs: [
    { indexed: true, name: 'token_id', type: 'uint256' },
    { indexed: true, name: 'seller', type: 'address' },
    { indexed: false, name: 'price', type: 'uint256' },
  ],
} as const;

const SOLD_EVENT = {
  type: 'event',
  name: 'Sold',
  inputs: [
    { indexed: true, name: 'token_id', type: 'uint256' },
    { indexed: true, name: 'seller', type: 'address' },
    { indexed: true, name: 'buyer', type: 'address' },
    { indexed: false, name: 'price', type: 'uint256' },
  ],
} as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ERC721_READ_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const LOOKBACK_BLOCKS = 150000n;
const MAX_GALLERY_ITEMS = 24;
const MAX_EVENT_ITEMS = 30;

function shortAddress(address?: string | null): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function normalizeIpfsUrl(url: string): string {
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  }
  return url;
}

async function fetchNftMetadata(tokenUri: string): Promise<{
  image: string | null;
  name: string | null;
  description: string | null;
}> {
  const uri = normalizeIpfsUrl(tokenUri);
  try {
    const res = await fetch(uri, { cache: 'no-store' });
    if (!res.ok) {
      return { image: null, name: null, description: null };
    }

    const data = await res.json();
    const image = typeof data?.image === 'string' ? normalizeIpfsUrl(data.image) : null;
    const name = typeof data?.name === 'string' ? data.name : null;
    const description = typeof data?.description === 'string' ? data.description : null;

    return { image, name, description };
  } catch {
    return { image: null, name: null, description: null };
  }
}

function eventPillStyles(kind: EventKind): string {
  if (kind === 'Transfer') return 'bg-sky-500/15 text-sky-300 ring-sky-400/30';
  if (kind === 'Approval') return 'bg-amber-500/15 text-amber-300 ring-amber-400/30';
  if (kind === 'Listed') return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30';
  if (kind === 'Sold') return 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30';
  return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30';
}

function formatCount(value: bigint): string {
  return value.toString();
}

async function safeRead<T>(reader: () => Promise<T>): Promise<T | null> {
  try {
    return await reader();
  } catch {
    return null;
  }
}

export function NftDashboard() {
  const { address, chain } = useAccount();
  const activeChainId = (chain?.id ?? 421614) as number;
  const isSupportedChain = activeChainId in CONTRACTS_BY_CHAIN;
  const selectedChainId = (isSupportedChain ? activeChainId : 421614) as SupportedChainId;

  const contractAddress = CONTRACTS_BY_CHAIN[selectedChainId];
  const networkName = NETWORK_NAME_BY_CHAIN[selectedChainId];
  const explorerBase = EXPLORER_BY_CHAIN[selectedChainId];
  const publicClient = usePublicClient({ chainId: selectedChainId });

  const [collectionName, setCollectionName] = useState('Stylus NFT Collection');
  const [collectionSymbol, setCollectionSymbol] = useState('NFT');
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [walletBalance, setWalletBalance] = useState<bigint>(0n);
  const [tokens, setTokens] = useState<GalleryToken[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplyWarning, setSupplyWarning] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

      const [name, symbol, supply, transferLogsRaw, approvalLogsRaw, approvalForAllLogsRaw, listedLogsRaw, soldLogsRaw, balance] = await Promise.all([
        safeRead(
          () =>
            publicClient.readContract({
              address: contractAddress,
              abi: ERC721_READ_ABI,
              functionName: 'name',
            }) as Promise<string>
        ),
        safeRead(
          () =>
            publicClient.readContract({
              address: contractAddress,
              abi: ERC721_READ_ABI,
              functionName: 'symbol',
            }) as Promise<string>
        ),
        safeRead(
          () =>
            publicClient.readContract({
              address: contractAddress,
              abi: ERC721_READ_ABI,
              functionName: 'totalSupply',
            }) as Promise<bigint>
        ),
        publicClient.getLogs({
          address: contractAddress,
          event: TRANSFER_EVENT as never,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: APPROVAL_EVENT as never,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: APPROVAL_FOR_ALL_EVENT as never,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: LISTED_EVENT as never,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: SOLD_EVENT as never,
          fromBlock,
          toBlock: latestBlock,
        }),
        address
          ? safeRead(
              () =>
                publicClient.readContract({
                  address: contractAddress,
                  abi: ERC721_READ_ABI,
                  functionName: 'balanceOf',
                  args: [address],
                }) as Promise<bigint>
            )
          : Promise.resolve(null),
      ]);

      const transferLogs = transferLogsRaw as TransferLog[];
      const approvalLogs = approvalLogsRaw as ApprovalLog[];
      const approvalForAllLogs = approvalForAllLogsRaw as ApprovalForAllLog[];
      const listedLogs = listedLogsRaw as ListedLog[];
      const soldLogs = soldLogsRaw as SoldLog[];

      setCollectionName(name ?? 'Stylus NFT Collection');
      setCollectionSymbol(symbol ?? 'NFT');
      setWalletBalance(balance ?? 0n);

      const mintedTokenIds = Array.from(
        new Set(
          transferLogs
            .filter((log: TransferLog) => log.args.from?.toLowerCase() === ZERO_ADDRESS)
            .map((log) => log.args.tokenId)
            .filter((tokenId: bigint | undefined): tokenId is bigint => typeof tokenId === 'bigint')
        )
      )
        .sort((a, b) => Number(b - a))
        .slice(0, MAX_GALLERY_ITEMS);

      const liveTokenIds = new Set<bigint>();
      transferLogs.forEach((log) => {
        const tokenId = log.args.tokenId;
        if (typeof tokenId !== 'bigint') return;

        if (log.args.to?.toLowerCase() === ZERO_ADDRESS) {
          liveTokenIds.delete(tokenId);
        } else {
          liveTokenIds.add(tokenId);
        }
      });

      if (supply === null) {
        setTotalSupply(BigInt(liveTokenIds.size));
        setSupplyWarning('This contract does not expose totalSupply(). Showing estimated supply from Transfer events.');
      } else {
        setTotalSupply(supply);
        setSupplyWarning(null);
      }

      const loadedTokens = await Promise.all(
        mintedTokenIds.map(async (tokenId): Promise<GalleryToken> => {
          const [owner, tokenUri] = await Promise.all([
            publicClient
              .readContract({
                address: contractAddress,
                abi: ERC721_READ_ABI,
                functionName: 'ownerOf',
                args: [tokenId],
              })
              .then((value: unknown) => value as Address)
              .catch(() => null),
            publicClient
              .readContract({
                address: contractAddress,
                abi: ERC721_READ_ABI,
                functionName: 'tokenURI',
                args: [tokenId],
              })
              .then((value: unknown) => value as string)
              .catch(() => null),
          ]);

          let metadataImage: string | null = null;
          let metadataName: string | null = null;
          let metadataDescription: string | null = null;

          if (tokenUri) {
            const metadata = await fetchNftMetadata(tokenUri);
            metadataImage = metadata.image;
            metadataName = metadata.name;
            metadataDescription = metadata.description;
          }

          return {
            tokenId,
            owner,
            tokenUri,
            metadataImage,
            metadataName,
            metadataDescription,
          };
        })
      );

      setTokens(loadedTokens);

      const transferRows: EventRow[] = transferLogs.map((log) => ({
        kind: 'Transfer',
        txHash: log.transactionHash ?? '0x',
        blockNumber: log.blockNumber ?? 0n,
        from: log.args.from as Address | undefined,
        to: log.args.to as Address | undefined,
        tokenId: log.args.tokenId,
      }));

      const approvalRows: EventRow[] = approvalLogs.map((log) => ({
        kind: 'Approval',
        txHash: log.transactionHash ?? '0x',
        blockNumber: log.blockNumber ?? 0n,
        owner: log.args.owner as Address | undefined,
        approved: log.args.approved as Address | undefined,
        tokenId: log.args.tokenId,
      }));

      const approvalForAllRows: EventRow[] = approvalForAllLogs.map((log) => ({
        kind: 'ApprovalForAll',
        txHash: log.transactionHash ?? '0x',
        blockNumber: log.blockNumber ?? 0n,
        owner: log.args.owner as Address | undefined,
        operator: log.args.operator as Address | undefined,
      }));

      const listedRows: EventRow[] = listedLogs.map((log) => ({
        kind: 'Listed',
        txHash: log.transactionHash ?? '0x',
        blockNumber: log.blockNumber ?? 0n,
        from: log.args.seller as Address | undefined,
        tokenId: log.args.token_id,
      }));

      const soldRows: EventRow[] = soldLogs.map((log) => ({
        kind: 'Sold',
        txHash: log.transactionHash ?? '0x',
        blockNumber: log.blockNumber ?? 0n,
        from: log.args.seller as Address | undefined,
        to: log.args.buyer as Address | undefined,
        tokenId: log.args.token_id,
      }));

      const allEvents = [...transferRows, ...approvalRows, ...approvalForAllRows, ...listedRows, ...soldRows]
        .sort((a, b) => Number(b.blockNumber - a.blockNumber))
        .slice(0, MAX_EVENT_ITEMS);

      setEvents(allEvents);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, address]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Minted',
        value: formatCount(totalSupply),
        icon: Shapes,
      },
      {
        label: 'Your Balance',
        value: formatCount(walletBalance),
        icon: BadgeCheck,
      },
      {
        label: 'Tracked Events',
        value: `${events.length}`,
        icon: Activity,
      },
    ],
    [totalSupply, walletBalance, events.length]
  );

  return (
    <main className="page-shell">
      <div className="ambient-bg" />

      <section className="mx-auto w-full max-w-7xl px-5 pb-14 pt-10 md:px-8 md:pt-14">
        <div className="glass-panel reveal-up mb-8 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                NFT Operations Console
              </p>
              <h1 className="text-balance text-3xl font-semibold text-white md:text-5xl">
                {collectionName} <span className="text-cyan-300">{collectionSymbol}</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
                A polished front-end for minting, monitoring, and managing your Stylus NFT collection.
                The gallery is sourced from on-chain mint events, and the timeline shows recent contract activity.
              </p>
              {!isSupportedChain && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  Current wallet network is unsupported. Displaying Arbitrum Sepolia by default.
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <WalletButton />
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <p className="text-xs text-slate-400">
                Network: <span className="text-slate-200">{networkName}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stats.map((stat, index) => (
              <article
                key={stat.label}
                className="glass-stat reveal-up rounded-2xl p-4"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{stat.label}</p>
                  <stat.icon className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
              </article>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            Failed to load dashboard data: {error}
          </div>
        )}

        {supplyWarning && (
          <div className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            {supplyWarning}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <section className="glass-panel reveal-up rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <GalleryHorizontal className="h-5 w-5 text-cyan-300" />
                Minted NFT Gallery
              </h2>
              <p className="text-xs text-slate-400">Showing up to {MAX_GALLERY_ITEMS} latest mints</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 h-40 rounded-xl bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                  </div>
                ))}

              {!isLoading && tokens.length === 0 && (
                <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
                  No mint events found in the recent block window.
                </div>
              )}

              {!isLoading &&
                tokens.map((token, index) => {
                  const tokenLink = `${explorerBase}/token/${contractAddress}?a=${token.tokenId.toString()}`;
                  return (
                    <article
                      key={token.tokenId.toString()}
                      className="gallery-card reveal-up rounded-2xl p-3"
                      style={{ animationDelay: `${index * 65}ms` }}
                    >
                      <div className="relative mb-3 h-44 overflow-hidden rounded-xl bg-slate-900/60">
                        {token.metadataImage ? (
                          <Image
                            src={token.metadataImage}
                            alt={token.metadataName ?? `Token #${token.tokenId.toString()}`}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="token-fallback h-44 w-full p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Token</p>
                            <p className="mt-2 text-3xl font-semibold text-white">#{token.tokenId.toString()}</p>
                            <p className="mt-4 text-xs text-slate-300">Metadata image unavailable</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-100">
                          {token.metadataName ?? `NFT #${token.tokenId.toString()}`}
                        </p>
                        <p className="text-xs text-slate-400">Owner: {shortAddress(token.owner)}</p>
                        {token.metadataDescription && (
                          <p className="line-clamp-2 text-xs text-slate-400">{token.metadataDescription}</p>
                        )}
                      </div>

                      <a
                        href={tokenLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300 transition hover:text-cyan-200"
                      >
                        View on Explorer
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </article>
                  );
                })}
            </div>
          </section>

          <section className="glass-panel reveal-up rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Blocks className="h-5 w-5 text-cyan-300" />
                Event History
              </h2>
              {lastUpdated && (
                <p className="text-xs text-slate-400">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {events.length === 0 && !isLoading && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  No recent contract events found.
                </div>
              )}

              {events.map((event) => (
                <article
                  key={`${event.txHash}-${event.kind}-${event.blockNumber.toString()}-${event.tokenId?.toString() ?? 'none'}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ring-1 ${eventPillStyles(event.kind)}`}>
                      {event.kind}
                    </span>
                    <a
                      href={`${explorerBase}/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                    >
                      {shortHash(event.txHash)}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {event.kind === 'Transfer' && (
                    <p className="text-xs text-slate-300">
                      {shortAddress(event.from)} to {shortAddress(event.to)}
                      {event.tokenId !== undefined ? ` • Token #${event.tokenId.toString()}` : ''}
                    </p>
                  )}

                  {event.kind === 'Approval' && (
                    <p className="text-xs text-slate-300">
                      Owner {shortAddress(event.owner)} approved {shortAddress(event.approved)}
                      {event.tokenId !== undefined ? ` • Token #${event.tokenId.toString()}` : ''}
                    </p>
                  )}

                  {event.kind === 'ApprovalForAll' && (
                    <p className="text-xs text-slate-300">
                      Owner {shortAddress(event.owner)} set operator {shortAddress(event.operator)}
                    </p>
                  )}

                  {event.kind === 'Listed' && (
                    <p className="text-xs text-slate-300">
                      {shortAddress(event.from)} listed
                      {event.tokenId !== undefined ? ` Token #${event.tokenId.toString()}` : ''}
                    </p>
                  )}

                  {event.kind === 'Sold' && (
                    <p className="text-xs text-slate-300">
                      {shortAddress(event.from)} sold to {shortAddress(event.to)}
                      {event.tokenId !== undefined ? ` • Token #${event.tokenId.toString()}` : ''}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-panel reveal-up mt-6 overflow-hidden rounded-3xl">
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-r from-violet-600/20 via-fuchsia-600/15 to-cyan-600/20 px-6 py-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                  <BadgeCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Advanced Contract Actions</h2>
                  <p className="text-xs text-slate-400">Full ERC-721 contract interaction suite</p>
                </div>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div className="relative mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30">
                <Sparkles className="h-3 w-3" /> Mint
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-500/30">
                <Activity className="h-3 w-3" /> Transfer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30">
                <BadgeCheck className="h-3 w-3" /> Approve
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300 ring-1 ring-orange-500/30">
                <Blocks className="h-3 w-3" /> Burn
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                <Blocks className="h-3 w-3" /> Marketplace
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30">
                <Blocks className="h-3 w-3" /> Royalties
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <ERC721InteractionPanel
              contractAddress={contractAddress}
              network={selectedChainId === 421614 ? 'arbitrum-sepolia' : selectedChainId === 98985 ? 'superposition-testnet' : 'robinhood-testnet'}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
