import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Page title / breadcrumb area */}
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:block">
            Financial Operations Platform
          </h2>
        </div>

        {/* Right: Wallet button */}
        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
