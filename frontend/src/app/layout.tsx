import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Smart Study Planner',
  description: 'AI-powered study schedule and task management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen flex`}>
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur flex flex-col fixed h-full z-10">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Smart Study
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="block px-4 py-3 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium transition hover:bg-indigo-500/20">
              Dashboard
            </Link>
            <Link href="/zen" className="block px-4 py-3 rounded-lg text-slate-400 font-medium transition hover:bg-slate-800 hover:text-slate-200">
              Zen Mode
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
