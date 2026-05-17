import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Smart Study Planner',
  description: 'AI-powered study schedule and task management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <h1>Smart Study</h1>
              <span>AI-Powered Planner</span>
            </div>
            <nav className="sidebar-nav">
              <Link href="/dashboard" className="nav-link active">
                <span className="icon">📊</span> Dashboard
              </Link>
              <Link href="/zen" className="nav-link">
                <span className="icon">🧘</span> Zen Mode
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
