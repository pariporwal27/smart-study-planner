'use client';
import { useState, useRef, useEffect } from 'react';

export default function MusicPlayer() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [trackName, setTrackName] = useState('No track loaded');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [loop, setLoop] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [collapsed, setCollapsed] = useState(true); // hidden by default
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = loop;
    audio.volume = volume;
    audioRef.current = audio;
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => { if (!loop) setIsPlaying(false); });
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop; }, [loop]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setTrackName(file.name.replace(/\.[^.]+$/, ''));
    if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); setIsPlaying(true); }
    setCollapsed(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) { fileInputRef.current?.click(); return; }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      {/* Floating toggle button always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="music-toggle-btn"
        title={collapsed ? 'Show Music Player' : 'Hide Music Player'}
      >
        {isPlaying ? '🎵' : '🎶'} {collapsed ? '▲' : '▼'}
      </button>

      {/* Player panel - slides up/down */}
      <div className={`music-player ${collapsed ? 'music-hidden' : ''}`}>
        <div className="music-bar">
          <div className="music-track-info">
            <div className={`music-icon ${isPlaying ? 'playing' : ''}`}>♪</div>
            <div>
              <div className="music-track-name">{trackName}</div>
              {duration > 0 && <div className="music-time">{fmt(currentTime)} / {fmt(duration)}</div>}
            </div>
          </div>

          <div className="music-controls">
            <button className="music-btn" onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }} title="Restart">⏮</button>
            <button className="music-btn play-btn" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
            <button className={`music-btn ${loop ? 'active' : ''}`} onClick={() => setLoop(!loop)} title="Loop">🔁</button>
            <button className="music-btn upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload music">📂</button>
          </div>

          <div className="music-volume">
            <span style={{ fontSize: '0.85rem' }}>{volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}</span>
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => setVolume(Number(e.target.value))} className="volume-slider" />
          </div>
        </div>

        {audioUrl && duration > 0 && (
          <div className="music-seek-bar">
            <input type="range" min="0" max={duration} step="0.5" value={currentTime}
              onChange={seek} className="seek-slider" />
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </>
  );
}
