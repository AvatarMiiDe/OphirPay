import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 animate-fade-in">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl font-black text-gray-200 dark:text-gray-800 mb-4 select-none">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-ophir-600 to-stellar-dark text-white text-sm font-medium hover:from-ophir-700 hover:to-stellar transition-all shadow-lg shadow-ophir-500/25"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href="/send"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Send Payment
          </Link>
        </div>
      </div>
    </div>
  );
}
