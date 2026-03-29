'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Sparkles,
  Send,
  Shield,
  Flame,
  RefreshCw,
  Check,
  Wallet,
  Image,
  AlertCircle,
  ExternalLink,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Tag,
  DollarSign,
  Crown,
  XCircle,
} from 'lucide-react';
import { cn } from './cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Chain } from 'viem';

// Define custom Superposition chains
const superposition: Chain = {
  id: 55244,
  name: 'Superposition',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.superposition.so' },
  },
};

const superpositionTestnet: Chain = {
  id: 98985,
  name: 'Superposition Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SPN',
    symbol: 'SPN',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet-explorer.superposition.so' },
  },
  testnet: true,
};

const robinhoodTestnet: Chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
};

// ERC721 ABI for the deployed Stylus NFT contract (IStylusNFT)
const ERC721_ABI = [
  // ERC721 Standard Interface
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 token_id) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 token_id, bytes data)",
  "function safeTransferFrom(address from, address to, uint256 token_id)",
  "function transferFrom(address from, address to, uint256 token_id)",
  "function approve(address approved, uint256 token_id)",
  "function setApprovalForAll(address operator, bool approved)",
  "function getApproved(uint256 token_id) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  // StylusNFT Specific Functions (from lib.rs)
  "function mint()",
  "function mintTo(address to)",
  "function safeMint(address to)",
  "function burn(uint256 token_id)",
  // Marketplace Functions
  "function listForSale(uint256 token_id, uint256 price)",
  "function unlist(uint256 token_id)",
  "function buyNft(uint256 token_id) payable",
  "function getListing(uint256 token_id) view returns (address seller, uint256 price)",
  // ERC-2981 Royalty Functions
  "function royaltyInfo(uint256 token_id, uint256 sale_price) view returns (address receiver, uint256 amount)",
  "function setDefaultRoyalty(address receiver, uint256 fee_numerator)",
  "function getRoyaltyReceiver() view returns (address)",
  "function getRoyaltyFee() view returns (uint256)",
];

// Network-specific default contract addresses (only for networks where contracts are deployed)
const DEFAULT_CONTRACT_ADDRESSES: Record<string, string | undefined> = {
  'arbitrum-sepolia': '0xe2a8cd01354ecc63a8341a849e9b89f14ff9f08f',
  'arbitrum': undefined, // No default contract deployed on mainnet
  'superposition': undefined, // No default contract deployed on mainnet
  'superposition-testnet': '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
  'robinhood-testnet': '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
};

// Network configurations
const NETWORKS = {
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    chainId: arbitrumSepolia.id,
    chain: arbitrumSepolia,
  },
  'arbitrum': {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    chainId: arbitrum.id,
    chain: arbitrum,
  },
  'superposition': {
    name: 'Superposition',
    rpcUrl: 'https://rpc.superposition.so',
    explorerUrl: 'https://explorer.superposition.so',
    chainId: 55244,
    chain: superposition,
  },
  'superposition-testnet': {
    name: 'Superposition Testnet',
    rpcUrl: 'https://testnet-rpc.superposition.so',
    explorerUrl: 'https://testnet-explorer.superposition.so',
    chainId: 98985,
    chain: superpositionTestnet,
  },
  'robinhood-testnet': {
    name: 'Robinhood Chain Testnet',
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
    chainId: 46630,
    chain: robinhoodTestnet,
  },
};

interface ChainLogos {
  arbitrum?: string;
  superposition?: string;
  robinhood?: string;
}

interface ERC721InteractionPanelProps {
  contractAddress?: string;
  network?: 'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet';
  /** Optional: URLs for chain logos (arbitrum, superposition, robinhood) - pass to show logos in network selector */
  logos?: ChainLogos;
}

interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}

const NETWORK_IDS = ['arbitrum', 'arbitrum-sepolia', 'superposition', 'superposition-testnet', 'robinhood-testnet'] as const;

function getLogoForNetwork(net: (typeof NETWORK_IDS)[number], logos?: ChainLogos): string | undefined {
  if (!logos) return undefined;
  if (net.includes('arbitrum')) return logos.arbitrum;
  if (net.includes('superposition')) return logos.superposition;
  if (net.includes('robinhood')) return logos.robinhood;
  return undefined;
}

export function ERC721InteractionPanel({
  contractAddress: initialAddress,
  network: initialNetwork = 'arbitrum-sepolia',
  logos,
}: ERC721InteractionPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet'>(initialNetwork);
  const [contractAddress, setContractAddress] = useState(initialAddress || DEFAULT_CONTRACT_ADDRESSES[initialNetwork] || '');
  const [showCustomContract, setShowCustomContract] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const networkConfig = NETWORKS[selectedNetwork];
  const rpcUrl = networkConfig.rpcUrl;
  const explorerUrl = networkConfig.explorerUrl;

  // Wagmi hooks for wallet connection
  const { address: userAddress, isConnected: walletConnected, chain: currentChain } = useAccount();
  const publicClient = usePublicClient({ chainId: networkConfig.chainId });
  const { data: walletClient } = useWalletClient({ chainId: networkConfig.chainId });
  const { switchChainAsync } = useSwitchChain();

  // NFT info
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [collectionSymbol, setCollectionSymbol] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  // Form inputs - Write operations
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferTokenId, setTransferTokenId] = useState('');
  const [approveAddress, setApproveAddress] = useState('');
  const [approveTokenId, setApproveTokenId] = useState('');
  const [operatorAddress, setOperatorAddress] = useState('');
  const [operatorApproved, setOperatorApproved] = useState(true);
  const [burnTokenId, setBurnTokenId] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');
  const [safeMintToAddress, setSafeMintToAddress] = useState('');

  // Read operations
  const [ownerOfTokenId, setOwnerOfTokenId] = useState('');
  const [ownerOfResult, setOwnerOfResult] = useState<string | null>(null);
  const [balanceCheckAddress, setBalanceCheckAddress] = useState('');
  const [balanceCheckResult, setBalanceCheckResult] = useState<string | null>(null);
  const [getApprovedTokenId, setGetApprovedTokenId] = useState('');
  const [getApprovedResult, setGetApprovedResult] = useState<string | null>(null);
  const [approvalCheckOwner, setApprovalCheckOwner] = useState('');
  const [approvalCheckOperator, setApprovalCheckOperator] = useState('');
  const [approvalCheckResult, setApprovalCheckResult] = useState<boolean | null>(null);

  // Marketplace state
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [unlistTokenId, setUnlistTokenId] = useState('');
  const [buyTokenId, setBuyTokenId] = useState('');
  const [buyListingPrice, setBuyListingPrice] = useState<string | null>(null);
  const [buyListingSeller, setBuyListingSeller] = useState<string | null>(null);
  const [getListingTokenId, setGetListingTokenId] = useState('');
  const [getListingResult, setGetListingResult] = useState<{ seller: string; price: string } | null>(null);

  // Royalty state
  const [royaltyReceiver, setRoyaltyReceiver] = useState('');
  const [royaltyFee, setRoyaltyFee] = useState('');
  const [royaltyInfoTokenId, setRoyaltyInfoTokenId] = useState('');
  const [royaltyInfoSalePrice, setRoyaltyInfoSalePrice] = useState('');
  const [royaltyInfoResult, setRoyaltyInfoResult] = useState<{ receiver: string; amount: string } | null>(null);

  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isValidatingContract, setIsValidatingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  // Check if using the default contract for the selected network
  const defaultAddress = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
  const isUsingDefaultContract = defaultAddress && contractAddress === defaultAddress;
  const hasDefaultContract = !!defaultAddress;
  const displayExplorerUrl = explorerUrl;

  // Update contract address when network changes
  useEffect(() => {
    const newDefault = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
    if (newDefault && (isUsingDefaultContract || !initialAddress)) {
      setContractAddress(newDefault);
    } else if (!newDefault && !initialAddress) {
      setContractAddress('');
    }
  }, [selectedNetwork]);

  // Validate if an address is a contract
  const validateContract = async (address: string): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      return code !== '0x' && code.length > 2;
    } catch (error) {
      return false;
    }
  };

  // Update contract address when using custom
  const handleUseCustomContract = async () => {
    if (!customAddress || !ethers.isAddress(customAddress)) {
      setCustomAddressError('Invalid address format');
      return;
    }

    setIsValidatingContract(true);
    setCustomAddressError(null);

    const isContract = await validateContract(customAddress);
    if (!isContract) {
      setCustomAddressError('Address is not a contract');
      setIsValidatingContract(false);
      return;
    }

    setContractAddress(customAddress);
    setIsValidatingContract(false);
  };

  // Reset to default contract for the selected network
  const handleUseDefaultContract = () => {
    const defaultAddr = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
    setContractAddress(defaultAddr || '');
    setCustomAddress('');
    setCustomAddressError(null);
    setShowCustomContract(false);
  };

  const getReadContract = useCallback(() => {
    if (!contractAddress || !rpcUrl) return null;
    // Create a fresh provider with the current RPC URL
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(contractAddress, ERC721_ABI, provider);
  }, [contractAddress, rpcUrl, selectedNetwork]);

  const getWriteContract = useCallback(async () => {
    console.log('[ERC721] getWriteContract called', { contractAddress, walletConnected, currentChainId: currentChain?.id, targetChainId: networkConfig.chainId });

    if (!contractAddress) {
      console.error('[ERC721] No contract address');
      throw new Error('No contract address specified');
    }

    if (!walletConnected) {
      console.error('[ERC721] Wallet not connected');
      throw new Error('Please connect your wallet first');
    }

    // Check if ethereum provider exists
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.error('[ERC721] No ethereum provider found');
      throw new Error('No wallet detected. Please install MetaMask.');
    }

    // Switch chain if necessary
    const targetChainIdHex = `0x${networkConfig.chainId.toString(16)}`;
    console.log('[ERC721] Current chain:', currentChain?.id, 'Target chain:', networkConfig.chainId);

    if (currentChain?.id !== networkConfig.chainId) {
      console.log('[ERC721] Switching chain to', networkConfig.name);
      try {
        // Try to switch to the chain
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
        console.log('[ERC721] Chain switched successfully');
      } catch (switchError: any) {
        console.log('[ERC721] Switch error:', switchError.code, switchError.message);
        // Chain doesn't exist, try to add it
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain') || switchError.message?.includes('wallet_addEthereumChain')) {
          console.log('[ERC721] Chain not found, adding chain...');
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: targetChainIdHex,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.chain.nativeCurrency,
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.explorerUrl],
              }],
            });
            console.log('[ERC721] Chain added successfully');
          } catch (addError: any) {
            console.error('[ERC721] Failed to add chain:', addError);
            throw new Error(`Failed to add ${networkConfig.name} to wallet: ${addError.message}`);
          }
        } else if (switchError.code === 4001) {
          throw new Error('User rejected chain switch');
        } else {
          throw switchError;
        }
      }
    }

    // Use ethers with window.ethereum directly for better compatibility
    console.log('[ERC721] Creating provider and signer...');
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    console.log('[ERC721] Signer address:', await signer.getAddress());

    const contract = new ethers.Contract(contractAddress, ERC721_ABI, signer);
    console.log('[ERC721] Contract created at:', contractAddress);
    return contract;
  }, [contractAddress, walletConnected, currentChain?.id, networkConfig]);

  // Helper to parse RPC/contract errors into user-friendly messages
  const parseContractError = useCallback((error: any): string => {
    const errorMessage = error?.message || error?.reason || String(error);

    if (errorMessage.includes('BAD_DATA') || errorMessage.includes('could not decode result data')) {
      return `Contract not found or not deployed on ${networkConfig.name}. The contract may only exist on a different network.`;
    }
    if (errorMessage.includes('call revert exception')) {
      return `Contract call failed. The contract may not support this function or is not properly deployed on ${networkConfig.name}.`;
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return `Network connection error. Please check your connection and try again.`;
    }
    if (errorMessage.includes('execution reverted')) {
      return `Transaction reverted: ${error?.reason || 'Unknown reason'}`;
    }

    return `Error: ${error?.reason || error?.shortMessage || errorMessage.slice(0, 100)}`;
  }, [networkConfig.name]);

  const fetchNFTInfo = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    setContractError(null);

    try {
      const [name, symbol] = await Promise.all([
        contract.name().catch(() => null),
        contract.symbol().catch(() => null),
      ]);

      // Check if we got valid data
      if (name === null && symbol === null) {
        setContractError(`Unable to read contract data. The contract may not be deployed on ${networkConfig.name}.`);
        setIsConnected(false);
        return;
      }

      setCollectionName(name);
      setCollectionSymbol(symbol);

      if (userAddress) {
        try {
          const balance = await contract.balanceOf(userAddress);
          setUserBalance(balance.toString());
        } catch (balanceError: any) {
          console.error('Error fetching balance:', balanceError);
          setContractError(parseContractError(balanceError));
        }
      }
      setIsConnected(true);
    } catch (error: any) {
      console.error('Error:', error);
      setContractError(parseContractError(error));
      setIsConnected(false);
    }
  }, [getReadContract, userAddress, networkConfig.name, parseContractError]);

  useEffect(() => {
    if (contractAddress && rpcUrl) {
      fetchNFTInfo();
    }
  }, [contractAddress, rpcUrl, fetchNFTInfo, userAddress]);

  const handleTransaction = async (
    operation: () => Promise<ethers.TransactionResponse>,
    successMessage: string
  ) => {
    console.log('[ERC721] handleTransaction called, walletConnected:', walletConnected, 'txStatus:', txStatus.status);

    if (txStatus.status === 'pending') {
      console.log('[ERC721] Transaction already pending, skipping');
      return;
    }

    if (!walletConnected) {
      console.log('[ERC721] Wallet not connected');
      setTxStatus({ status: 'error', message: 'Please connect your wallet first' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
      return;
    }

    try {
      setTxStatus({ status: 'pending', message: 'Confirming...' });
      console.log('[ERC721] Executing operation...');
      const tx = await operation();
      console.log('[ERC721] Transaction submitted:', tx.hash);
      setTxStatus({ status: 'pending', message: 'Waiting for confirmation...', hash: tx.hash });
      await tx.wait();
      console.log('[ERC721] Transaction confirmed');
      setTxStatus({ status: 'success', message: successMessage, hash: tx.hash });
      fetchNFTInfo();
    } catch (error: any) {
      console.error('[ERC721] Transaction error:', error);
      const errorMsg = error.reason || error.message || error.shortMessage || 'Transaction failed';
      setTxStatus({ status: 'error', message: errorMsg });
    }
    setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
  };

  const handleMint = async () => {
    console.log('[ERC721] handleMint called');
    try {
      const contract = await getWriteContract();
      if (!contract) {
        console.error('[ERC721] getWriteContract returned null');
        return;
      }
      console.log('[ERC721] Got contract, calling mint()...');
      handleTransaction(
        () => contract.mint(),
        'NFT minted to yourself!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleMint error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleMintTo = async () => {
    console.log('[ERC721] handleMintTo called');
    try {
      const contract = await getWriteContract();
      if (!contract || !mintToAddress) return;
      handleTransaction(
        () => contract.mintTo(mintToAddress),
        'NFT minted successfully!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleMintTo error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleSafeMint = async () => {
    console.log('[ERC721] handleSafeMint called');
    try {
      const contract = await getWriteContract();
      if (!contract || !safeMintToAddress) return;
      handleTransaction(
        () => contract['safeMint(address)'](safeMintToAddress),
        'NFT safely minted!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleSafeMint error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleTransfer = async () => {
    console.log('[ERC721] handleTransfer called');
    try {
      const contract = await getWriteContract();
      if (!contract || !transferFrom || !transferTo || !transferTokenId) return;
      handleTransaction(
        () => contract['safeTransferFrom(address,address,uint256)'](transferFrom, transferTo, transferTokenId),
        `NFT #${transferTokenId} transferred!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleTransfer error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleApprove = async () => {
    console.log('[ERC721] handleApprove called');
    try {
      const contract = await getWriteContract();
      if (!contract || !approveAddress || !approveTokenId) return;
      handleTransaction(
        () => contract.approve(approveAddress, approveTokenId),
        `Approval set for NFT #${approveTokenId}!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleApprove error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleSetApprovalForAll = async () => {
    console.log('[ERC721] handleSetApprovalForAll called');
    try {
      const contract = await getWriteContract();
      if (!contract || !operatorAddress) return;
      handleTransaction(
        () => contract.setApprovalForAll(operatorAddress, operatorApproved),
        `Operator ${operatorApproved ? 'approved' : 'revoked'}!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleSetApprovalForAll error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleBurn = async () => {
    console.log('[ERC721] handleBurn called');
    try {
      const contract = await getWriteContract();
      if (!contract || !burnTokenId) return;
      handleTransaction(
        () => contract.burn(burnTokenId),
        `NFT #${burnTokenId} burned!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleBurn error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const checkOwnerOf = async () => {
    const contract = getReadContract();
    if (!contract || !ownerOfTokenId) return;
    try {
      const owner = await contract.ownerOf(ownerOfTokenId);
      setOwnerOfResult(owner);
    } catch {
      setOwnerOfResult('Token does not exist');
    }
  };

  const checkBalance = async () => {
    const contract = getReadContract();
    if (!contract || !balanceCheckAddress) return;
    try {
      const balance = await contract.balanceOf(balanceCheckAddress);
      setBalanceCheckResult(balance.toString());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkGetApproved = async () => {
    const contract = getReadContract();
    if (!contract || !getApprovedTokenId) return;
    try {
      const approved = await contract.getApproved(getApprovedTokenId);
      setGetApprovedResult(approved);
    } catch {
      setGetApprovedResult('Token does not exist');
    }
  };

  const checkApprovalForAll = async () => {
    const contract = getReadContract();
    if (!contract || !approvalCheckOwner || !approvalCheckOperator) return;
    try {
      const isApproved = await contract.isApprovedForAll(approvalCheckOwner, approvalCheckOperator);
      setApprovalCheckResult(isApproved);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ─── Marketplace Handlers ────────────────────────────────

  const handleListForSale = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract || !listTokenId || !listPrice) return;
      const priceWei = ethers.parseEther(listPrice);
      handleTransaction(
        () => contract.listForSale(listTokenId, priceWei),
        `NFT #${listTokenId} listed for ${listPrice} ETH!`
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleUnlist = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract || !unlistTokenId) return;
      handleTransaction(
        () => contract.unlist(unlistTokenId),
        `NFT #${unlistTokenId} unlisted!`
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleBuyNft = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract || !buyTokenId || !buyListingPrice) return;
      handleTransaction(
        () => contract.buyNft(buyTokenId, { value: ethers.parseEther(buyListingPrice) }),
        `NFT #${buyTokenId} purchased!`
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const checkListing = async (tokenId?: string) => {
    const contract = getReadContract();
    const id = tokenId || getListingTokenId;
    if (!contract || !id) return;
    try {
      const [seller, price] = await contract.getListing(id);
      const result = {
        seller: seller as string,
        price: ethers.formatEther(price as bigint),
      };
      if (tokenId === buyTokenId) {
        setBuyListingPrice(result.price !== '0.0' ? result.price : null);
        setBuyListingSeller(result.seller !== ethers.ZeroAddress ? result.seller : null);
      } else {
        setGetListingResult(
          (price as bigint) > 0n ? result : null
        );
      }
    } catch (error) {
      console.error('Error checking listing:', error);
    }
  };

  // ─── Royalty Handlers ────────────────────────────────────

  const handleSetDefaultRoyalty = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract || !royaltyReceiver || !royaltyFee) return;
      // Convert percentage to basis points (e.g., 5% → 500)
      const bps = Math.round(parseFloat(royaltyFee) * 100);
      handleTransaction(
        () => contract.setDefaultRoyalty(royaltyReceiver, bps),
        `Royalty set to ${royaltyFee}% for ${royaltyReceiver.slice(0, 8)}...!`
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const checkRoyaltyInfo = async () => {
    const contract = getReadContract();
    if (!contract || !royaltyInfoTokenId || !royaltyInfoSalePrice) return;
    try {
      const salePriceWei = ethers.parseEther(royaltyInfoSalePrice);
      const [receiver, amount] = await contract.royaltyInfo(royaltyInfoTokenId, salePriceWei);
      setRoyaltyInfoResult({
        receiver: receiver as string,
        amount: ethers.formatEther(amount as bigint),
      });
    } catch (error) {
      console.error('Error checking royalty info:', error);
      setRoyaltyInfoResult(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3 rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">
            {collectionName || 'ERC-721'} {collectionSymbol ? `(${collectionSymbol})` : 'NFT'}
          </span>
        </div>
        <p className="text-[10px] text-forge-muted">Stylus NFT Contract Interaction</p>
      </div>

      {/* Wallet Status */}
      <div className={cn(
        'p-2.5 rounded-lg border',
        walletConnected ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
      )}>
        <div className="flex items-center gap-2">
          <Wallet className={cn('w-3.5 h-3.5', walletConnected ? 'text-green-400' : 'text-amber-400')} />
          {walletConnected ? (
            <span className="text-[10px] text-green-300">
              Connected: <code className="text-green-400">{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</code>
            </span>
          ) : (
            <span className="text-[10px] text-amber-300">Connect wallet via Wallet Auth node for write ops</span>
          )}
        </div>
      </div>

      {/* Network Selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-forge-muted flex items-center gap-1.5">
          <Globe className="w-3 h-3" /> Network
        </label>
        <Select value={selectedNetwork} onValueChange={(value) => setSelectedNetwork(value as typeof selectedNetwork)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center gap-2">
                {getLogoForNetwork(selectedNetwork, logos) && (
                  <img src={getLogoForNetwork(selectedNetwork, logos)} alt="" width={16} height={16} className="rounded" />
                )}
                <span>{NETWORKS[selectedNetwork].name}</span>
                {NETWORKS[selectedNetwork].chain.testnet && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Testnet</span>
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NETWORK_IDS.map((net) => (
              <SelectItem key={net} value={net}>
                <div className="flex items-center gap-2">
                  {getLogoForNetwork(net, logos) && (
                    <img src={getLogoForNetwork(net, logos)} alt="" width={16} height={16} className="rounded" />
                  )}
                  <span>{NETWORKS[net].name}</span>
                  {NETWORKS[net].chain.testnet && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Testnet</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contract Info */}
      <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-forge-muted">Contract:</span>
            {isUsingDefaultContract && (
              <span className="text-[8px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded">Default</span>
            )}
          </div>
          <a
            href={`${displayExplorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-violet-400 hover:underline flex items-center gap-1"
          >
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Custom Contract Toggle */}
      <button
        onClick={() => setShowCustomContract(!showCustomContract)}
        className="w-full flex items-center justify-between px-3 py-2 bg-forge-bg/50 border border-forge-border/30 rounded-lg text-xs text-forge-muted hover:text-white transition-colors"
      >
        <span>Use Custom Contract</span>
        {showCustomContract ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showCustomContract && (
        <div className="p-3 rounded-lg bg-forge-bg/30 border border-forge-border/30 space-y-2">
          <input
            type="text"
            value={customAddress}
            onChange={(e) => {
              setCustomAddress(e.target.value);
              setCustomAddressError(null);
            }}
            placeholder="0x..."
            className={cn(
              "w-full px-3 py-2 bg-forge-bg border rounded-lg text-xs text-white placeholder-forge-muted focus:outline-none",
              customAddressError ? "border-red-500/50" : "border-forge-border/50 focus:border-violet-500/50"
            )}
          />
          {customAddressError && (
            <p className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {customAddressError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleUseCustomContract}
              disabled={!customAddress || isValidatingContract}
              className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-medium disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isValidatingContract ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Validating...
                </>
              ) : (
                'Use Custom'
              )}
            </button>
            <button
              onClick={handleUseDefaultContract}
              className="flex-1 py-1.5 bg-forge-border hover:bg-forge-muted/20 text-white rounded text-[10px] font-medium"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}

      <button
        onClick={fetchNFTInfo}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>

      {/* Contract Error Banner */}
      {/* {contractError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-300 font-medium">Contract Error</p>
              <p className="text-[10px] text-red-400/80 mt-1">{contractError}</p>
            </div>
            <button
              onClick={() => setContractError(null)}
              className="text-red-400/60 hover:text-red-400 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )} */}

      {/* Transaction Status */}
      {txStatus.status !== 'idle' && (
        <div className={cn(
          'rounded-lg p-2.5 border flex items-start gap-2',
          txStatus.status === 'pending' && 'bg-blue-500/10 border-blue-500/30',
          txStatus.status === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
          txStatus.status === 'error' && 'bg-red-500/10 border-red-500/30'
        )}>
          {txStatus.status === 'pending' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
          {txStatus.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {txStatus.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[10px] font-medium truncate',
              txStatus.status === 'pending' && 'text-blue-300',
              txStatus.status === 'success' && 'text-emerald-300',
              txStatus.status === 'error' && 'text-red-300'
            )}>{txStatus.message}</p>
            {txStatus.hash && (
              <a href={`${explorerUrl}/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer"
                className="text-[9px] text-forge-muted hover:text-white flex items-center gap-1">
                Explorer <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* NFT Stats */}
      {isConnected && walletConnected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
            <div className="flex items-center gap-1.5">
              <Image className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] text-forge-muted">Your NFTs</span>
            </div>
            <span className="text-xs font-medium text-white">{userBalance || '0'}</span>
          </div>
        </div>
      )}

      {/* Write Operations */}
      {isConnected && walletConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-white">Write Operations</span>
          </div>

          {/* Mint (to self) */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] font-medium text-violet-400">Mint (to yourself)</span>
            </div>
            <button onClick={handleMint} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Mint NFT
            </button>
          </div>

          {/* Mint To */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-fuchsia-400" />
              <span className="text-[10px] font-medium text-fuchsia-400">Mint To Address</span>
            </div>
            <input type="text" value={mintToAddress} onChange={(e) => setMintToAddress(e.target.value)}
              placeholder="To Address (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleMintTo} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Mint To
            </button>
          </div>

          {/* Safe Mint */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Safe Mint</span>
            </div>
            <input type="text" value={safeMintToAddress} onChange={(e) => setSafeMintToAddress(e.target.value)}
              placeholder="To Address (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleSafeMint} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Safe Mint
            </button>
          </div>

          {/* Safe Transfer */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <span className="text-[10px] font-medium text-cyan-400">Safe Transfer</span>
            <input type="text" value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}
              placeholder="From (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="text" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
              placeholder="To (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="number" value={transferTokenId} onChange={(e) => setTransferTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleTransfer} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Transfer NFT
            </button>
          </div>

          {/* Approve */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-medium text-blue-400">Approve Token</span>
            </div>
            <input type="text" value={approveAddress} onChange={(e) => setApproveAddress(e.target.value)}
              placeholder="Approved Address (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="number" value={approveTokenId} onChange={(e) => setApproveTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleApprove} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Approve
            </button>
          </div>

          {/* Set Approval For All */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">Set Approval For All</span>
            </div>
            <input type="text" value={operatorAddress} onChange={(e) => setOperatorAddress(e.target.value)}
              placeholder="Operator (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={operatorApproved} onChange={(e) => setOperatorApproved(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-forge-bg border-forge-border" />
              <span className="text-[10px] text-forge-muted">Grant Approval</span>
            </label>
            <button onClick={handleSetApprovalForAll} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              {operatorApproved ? 'Grant' : 'Revoke'} Access
            </button>
          </div>

          {/* Burn */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] font-medium text-orange-400">Burn NFT</span>
            </div>
            <input type="number" value={burnTokenId} onChange={(e) => setBurnTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleBurn} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Burn
            </button>
          </div>
        </div>
      )}

      {/* Read Operations */}
      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-white">Read Operations</span>
          </div>

          {/* Owner Of */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <span className="text-[10px] font-medium text-violet-400">Owner Of</span>
            <input type="number" value={ownerOfTokenId} onChange={(e) => setOwnerOfTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={checkOwnerOf}
              className="w-full py-1.5 bg-violet-600/50 hover:bg-violet-600 text-white rounded text-[10px] font-medium">
              Check Owner
            </button>
            {ownerOfResult && (
              <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded">
                <p className="text-[9px] text-violet-300 mb-0.5">Owner:</p>
                <p className="text-[10px] font-mono text-white break-all">{ownerOfResult}</p>
              </div>
            )}
          </div>

          {/* Balance Of */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <span className="text-[10px] font-medium text-fuchsia-400">Balance Of</span>
            <input type="text" value={balanceCheckAddress} onChange={(e) => setBalanceCheckAddress(e.target.value)}
              placeholder="Address (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={checkBalance}
              className="w-full py-1.5 bg-fuchsia-600/50 hover:bg-fuchsia-600 text-white rounded text-[10px] font-medium">
              Check Balance
            </button>
            {balanceCheckResult && (
              <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded">
                <p className="text-[10px] text-fuchsia-300">NFTs owned: <span className="font-medium text-white">{balanceCheckResult}</span></p>
              </div>
            )}
          </div>

          {/* Get Approved */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <span className="text-[10px] font-medium text-blue-400">Get Approved</span>
            <input type="number" value={getApprovedTokenId} onChange={(e) => setGetApprovedTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={checkGetApproved}
              className="w-full py-1.5 bg-blue-600/50 hover:bg-blue-600 text-white rounded text-[10px] font-medium">
              Check Approved
            </button>
            {getApprovedResult && (
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                <p className="text-[9px] text-blue-300 mb-0.5">Approved:</p>
                <p className="text-[10px] font-mono text-white break-all">{getApprovedResult}</p>
              </div>
            )}
          </div>

          {/* Is Approved For All */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">Is Approved For All</span>
            </div>
            <input type="text" value={approvalCheckOwner} onChange={(e) => setApprovalCheckOwner(e.target.value)}
              placeholder="Owner (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="text" value={approvalCheckOperator} onChange={(e) => setApprovalCheckOperator(e.target.value)}
              placeholder="Operator (0x...)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={checkApprovalForAll}
              className="w-full py-1.5 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded text-[10px] font-medium">
              Check Approval
            </button>
            {approvalCheckResult !== null && (
              <div className={cn(
                'p-2 rounded border',
                approvalCheckResult ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
              )}>
                <p className={cn('text-[10px] font-medium', approvalCheckResult ? 'text-emerald-300' : 'text-red-300')}>
                  {approvalCheckResult ? '✓ Operator is approved' : '✗ Operator is not approved'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Marketplace ─────────────────────────────────────── */}
      {isConnected && walletConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-white">Marketplace</span>
          </div>

          {/* List for Sale */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">List for Sale</span>
            </div>
            <input type="number" value={listTokenId} onChange={(e) => setListTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="text" value={listPrice} onChange={(e) => setListPrice(e.target.value)}
              placeholder="Price (ETH)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleListForSale} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              List NFT
            </button>
          </div>

          {/* Unlist */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-medium text-rose-400">Cancel Listing</span>
            </div>
            <input type="number" value={unlistTokenId} onChange={(e) => setUnlistTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={handleUnlist} disabled={txStatus.status === 'pending'}
              className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Unlist NFT
            </button>
          </div>

          {/* Buy NFT */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-medium text-green-400">Buy NFT</span>
            </div>
            <input type="number" value={buyTokenId} onChange={(e) => { setBuyTokenId(e.target.value); setBuyListingPrice(null); setBuyListingSeller(null); }}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={() => checkListing(buyTokenId)}
              className="w-full py-1.5 bg-green-600/50 hover:bg-green-600 text-white rounded text-[10px] font-medium">
              Check Price
            </button>
            {buyListingPrice && (
              <div className="p-2 bg-green-500/10 border border-green-500/30 rounded space-y-1">
                <p className="text-[10px] text-green-300">
                  Price: <span className="font-medium text-white">{buyListingPrice} ETH</span>
                </p>
                {buyListingSeller && (
                  <p className="text-[9px] text-green-300/70">
                    Seller: <code className="text-green-400">{buyListingSeller.slice(0, 8)}...{buyListingSeller.slice(-6)}</code>
                  </p>
                )}
              </div>
            )}
            <button onClick={handleBuyNft} disabled={txStatus.status === 'pending' || !buyListingPrice}
              className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
              Buy NFT
            </button>
          </div>

          {/* Get Listing (Read) */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-teal-400" />
              <span className="text-[10px] font-medium text-teal-400">Check Listing</span>
            </div>
            <input type="number" value={getListingTokenId} onChange={(e) => setGetListingTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={() => checkListing()}
              className="w-full py-1.5 bg-teal-600/50 hover:bg-teal-600 text-white rounded text-[10px] font-medium">
              Check Listing
            </button>
            {getListingResult ? (
              <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded space-y-1">
                <p className="text-[10px] text-teal-300">
                  Price: <span className="font-medium text-white">{getListingResult.price} ETH</span>
                </p>
                <p className="text-[9px] text-teal-300/70">
                  Seller: <code className="text-teal-400 break-all">{getListingResult.seller}</code>
                </p>
              </div>
            ) : getListingTokenId && getListingResult === null && (
              <div className="p-2 bg-slate-500/10 border border-slate-500/30 rounded">
                <p className="text-[10px] text-slate-400">Not listed for sale</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Royalties (ERC-2981) ─────────────────────────────── */}
      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-white">Royalties (ERC-2981)</span>
          </div>

          {/* Set Default Royalty (Owner Only) */}
          {walletConnected && (
            <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
              <div className="flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-medium text-amber-400">Set Default Royalty</span>
                <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Owner Only</span>
              </div>
              <input type="text" value={royaltyReceiver} onChange={(e) => setRoyaltyReceiver(e.target.value)}
                placeholder="Receiver Address (0x...)"
                className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
              <input type="text" value={royaltyFee} onChange={(e) => setRoyaltyFee(e.target.value)}
                placeholder="Fee % (e.g. 5 for 5%, max 10%)"
                className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
              <button onClick={handleSetDefaultRoyalty} disabled={txStatus.status === 'pending'}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium disabled:opacity-50">
                Set Royalty
              </button>
            </div>
          )}

          {/* Check Royalty Info (Read) */}
          <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] font-medium text-yellow-400">Calculate Royalty</span>
            </div>
            <input type="number" value={royaltyInfoTokenId} onChange={(e) => setRoyaltyInfoTokenId(e.target.value)}
              placeholder="Token ID"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <input type="text" value={royaltyInfoSalePrice} onChange={(e) => setRoyaltyInfoSalePrice(e.target.value)}
              placeholder="Sale Price (ETH)"
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none" />
            <button onClick={checkRoyaltyInfo}
              className="w-full py-1.5 bg-yellow-600/50 hover:bg-yellow-600 text-white rounded text-[10px] font-medium">
              Calculate Royalty
            </button>
            {royaltyInfoResult && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded space-y-1">
                <p className="text-[10px] text-yellow-300">
                  Royalty Amount: <span className="font-medium text-white">{royaltyInfoResult.amount} ETH</span>
                </p>
                <p className="text-[9px] text-yellow-300/70">
                  Receiver: <code className="text-yellow-400 break-all">{royaltyInfoResult.receiver}</code>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
