import { WalletButton } from '@/components/wallet-button';
import { ERC721InteractionPanel } from '@/lib/erc721-stylus/src/ERC721InteractionPanel';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold mb-8">
          My DApp
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
          A Web3 application built with Cradle
        </p>

        <div className="flex flex-col items-center gap-8">
          <WalletButton />
          <div className="w-full max-w-lg">
            <ERC721InteractionPanel />
          </div>
        </div>
      </div>
    </main>
  );
}