import './globals.css';
import MusicPlayer from '@/components/MusicPlayer';

export const metadata = {
  title: 'Smart Study Planner',
  description: 'AI-powered study schedule and task management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell" style={{ display: 'block' }}>
          {/* Main Content - No sidebar, full width */}
          <main className="main-content" style={{ marginLeft: 0, padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </main>
        </div>

        {/* Global Music Player */}
        <MusicPlayer />
      </body>
    </html>
  );
}
