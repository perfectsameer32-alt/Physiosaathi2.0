import { useState, useRef, useEffect } from 'react';
import { Play, X, ExternalLink, Video } from 'lucide-react';

export function ExerciseDemo({ exercise }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const iframeRef = useRef(null);

  const youtubeId = exercise?.youtubeId;
  const videoSrc = exercise?.videoUrl || (youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&rel=0&controls=1&cc_load_policy=0&iv_load_policy=3&enablejsapi=1`
    : null);

  // Send API command to force-disable closed captions and unload captions module
  const disableCaptions = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {}] }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }), '*');
    } catch {
      // safe ignore cross-origin sandbox
    }
  };

  useEffect(() => {
    if (isPlaying) {
      // Trigger at intervals to catch the player once its captions module initializes
      const timers = [
        setTimeout(disableCaptions, 300),
        setTimeout(disableCaptions, 1000),
        setTimeout(disableCaptions, 2500),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isPlaying, videoSrc]);

  // High-res YouTube thumbnail with fallback to exercise.image
  const posterSrc = (!imgError && exercise?.image)
    ? exercise.image
    : (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '');

  const watchUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null;

  return (
    <div className="demo-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
      {isPlaying && videoSrc ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
          <iframe
            ref={iframeRef}
            onLoad={disableCaptions}
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
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 10,
              display: 'flex',
              gap: 8,
            }}
          >
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-button"
                title="Open tutorial on YouTube"
                style={{
                  background: 'rgba(15, 20, 28, 0.85)',
                  border: '1px solid #364053',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  gap: 4,
                }}
              >
                <ExternalLink size={13} />
                <span>YouTube</span>
              </a>
            )}
            <button
              className="icon-button"
              onClick={() => setIsPlaying(false)}
              data-testid="demo-video-play"
              title="Close video"
              style={{
                background: 'rgba(15, 20, 28, 0.85)',
                border: '1px solid #364053',
                color: '#fff',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: 10,
              left: 14,
              zIndex: 10,
              fontSize: 10,
              color: '#e2e8f0',
              background: 'rgba(0,0,0,0.7)',
              padding: '3px 8px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Video size={12} color="#00E5FF" />
            Certified Coach Video Demonstration
          </span>
        </div>
      ) : (
        <>
          <img
            src={posterSrc}
            alt={exercise?.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            className="play-overlay"
            onClick={() => setIsPlaying(true)}
            data-testid="demo-video-play"
            title="Play Demonstration Video"
          >
            <Play size={22} fill="currentColor" />
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 14,
              right: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#e2e8f0',
                background: 'rgba(0, 0, 0, 0.65)',
                padding: '4px 10px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Video size={13} color="#00E5FF" />
              HD Video Tutorial Available · Click to play
            </span>
          </div>
        </>
      )}
    </div>
  );
}
