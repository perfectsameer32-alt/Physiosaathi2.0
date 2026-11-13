import { useState } from 'react';
import { Play, Pause, X, Video } from 'lucide-react';

export function ExerciseDemo({ exercise }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const videoSrc = exercise?.videoUrl || (exercise?.youtubeId
    ? `https://www.youtube.com/embed/${exercise.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${exercise.youtubeId}&rel=0&controls=1`
    : null);

  return (
    <div className="demo-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
      {isPlaying && videoSrc ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
          <iframe
            src={videoSrc}
            title={`${exercise?.name || 'Exercise'} Demonstration`}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            className="icon-button"
            onClick={() => setIsPlaying(false)}
            data-testid="demo-video-play"
            title="Close video"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 10,
              background: 'rgba(15, 20, 28, 0.85)',
              border: '1px solid #364053',
              color: '#fff',
            }}
          >
            <X size={16} />
          </button>
          <span style={{ position: 'absolute', bottom: 10, left: 14, zIndex: 10, fontSize: 10, color: '#e2e8f0', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: 4 }}>
            Certified Coach Video Demonstration
          </span>
        </div>
      ) : (
        <>
          <img src={exercise?.image} alt={exercise?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            className="play-overlay"
            onClick={() => setIsPlaying(true)}
            data-testid="demo-video-play"
            title="Play Demonstration Video"
          >
            <Play size={22} fill="currentColor" />
          </button>
          <span>Certified Coach Demonstration · Click to play tutorial</span>
        </>
      )}
    </div>
  );
}
