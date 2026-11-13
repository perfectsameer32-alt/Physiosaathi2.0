import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { analyzeMovement } from '../lib/poseClassifier';

// Web Audio synthesizer with shared AudioContext to prevent context limits/leaks
let sharedAudioCtx = null;
function getSharedAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Global active utterance reference to prevent Chromium garbage collection bug
let activeUtteranceRef = null;

export function speakSpeech(phrase, { priority = false, voiceEnabled = true } = {}) {
  if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  try {
    if (synth.paused) {
      synth.resume();
    }

    if (priority) {
      synth.cancel();
    }

    const utter = new SpeechSynthesisUtterance(phrase);
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Pick best available English voice
    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      const bestVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.default)
      ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
      if (bestVoice) utter.voice = bestVoice;
    }

    activeUtteranceRef = utter;
    utter.onend = () => {
      if (activeUtteranceRef === utter) activeUtteranceRef = null;
    };
    utter.onerror = () => {
      if (activeUtteranceRef === utter) activeUtteranceRef = null;
    };

    if (priority) {
      setTimeout(() => {
        try {
          synth.speak(utter);
        } catch {
          // ignore
        }
      }, 15);
    } else {
      synth.speak(utter);
    }
  } catch (err) {
    console.warn('[Speech] Error speaking:', err);
  }
}

// User interaction listeners to ensure AudioContext and Speech are instantly unmuted
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function playChime(freq = 659.25, type = 'success') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    // Audio context may be restricted
  }
}

// Safe Canvas roundRect helper for cross-browser support
function drawRoundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

// MediaPipe 33 Landmark Skeleton Topology
const SKELETON_CONNECTIONS = [
  // Head & Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Shoulders & Torso Box
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Left Arm
  [11, 13], [13, 15],
  // Right Arm
  [12, 14], [14, 16],
  // Hands
  [15, 17], [15, 19], [15, 21], [17, 19],
  [16, 18], [16, 20], [16, 22], [18, 20],
  // Left Leg
  [23, 25], [25, 27],
  // Right Leg
  [24, 26], [26, 28],
  // Feet
  [27, 29], [29, 31], [27, 31],
  [28, 30], [30, 32], [28, 32],
];

// Singleton MediaPipe PoseLandmarker
let landmarkerInstance = null;
let landmarkerLoadingPromise = null;

async function getPoseLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerLoadingPromise) return landmarkerLoadingPromise;

  landmarkerLoadingPromise = (async () => {
    // 1. Resolve WASM runtime (try local first, fallback to CDN)
    let vision = null;
    try {
      vision = await FilesetResolver.forVisionTasks('/wasm');
    } catch (e1) {
      console.warn('Local /wasm load failed, using jsdelivr CDN:', e1);
      vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    }

    // 2. Load model (try local first, fallback to Google CDN)
    const candidates = [
      '/models/pose_landmarker_lite.task',
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    ];

    for (const modelPath of candidates) {
      for (const delegate of ['GPU', 'CPU']) {
        try {
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          console.log(`[MediaPipe] PoseLandmarker initialized (${delegate}) from ${modelPath}`);
          landmarkerInstance = landmarker;
          return landmarker;
        } catch (err) {
          console.warn(`[MediaPipe] Init attempt failed (${delegate}, ${modelPath}):`, err);
        }
      }
    }

    throw new Error('Could not initialize MediaPipe PoseLandmarker');
  })();

  return landmarkerLoadingPromise;
}

export function PoseTracker({
  videoRef,
  canvasRef,
  exercise,
  active,
  isPaused,
  voiceEnabled,
  onRepCount,
  onFeedback,
  currentReps,
}) {
  const [modelStatus, setModelStatus] = useState('loading'); // loading, ready, error
  const repStateRef = useRef('START');
  const repCountRef = useRef(currentReps || 0);
  const lastRepTimeRef = useRef(0);
  const lastVoiceCueTimeRef = useRef(0);
  const holdSecondsRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastTimestampRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastRenderDataRef = useRef(null);

  useEffect(() => {
    repCountRef.current = currentReps || 0;
  }, [currentReps]);

  useEffect(() => {
    let isCancelled = false;

    getPoseLandmarker()
      .then(() => {
        if (!isCancelled) setModelStatus('ready');
      })
      .catch((err) => {
        console.error('[MediaPipe] Model failed to load:', err);
        if (!isCancelled) setModelStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active || modelStatus !== 'ready' || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const speak = (phrase, isPriority = false) => {
      if (!voiceEnabled || !window.speechSynthesis) return;
      const now = Date.now();
      if (!isPriority && now - lastVoiceCueTimeRef.current < 2600) return;
      lastVoiceCueTimeRef.current = now;
      speakSpeech(phrase, { priority: isPriority, voiceEnabled });
    };

    const renderLoop = () => {
      if (!active || isPaused) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      if (video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cw = canvas.clientWidth || 640;
        const ch = canvas.clientHeight || 480;

        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }

        // Calculate aspect-ratio scaling to match video object-fit: cover
        const videoAspect = vw / vh;
        const canvasAspect = cw / ch;
        let renderWidth, renderHeight, offsetX, offsetY;

        if (canvasAspect > videoAspect) {
          renderWidth = cw;
          renderHeight = cw / videoAspect;
          offsetX = 0;
          offsetY = (ch - renderHeight) / 2;
        } else {
          renderHeight = ch;
          renderWidth = ch * videoAspect;
          offsetY = 0;
          offsetX = (cw - renderWidth) / 2;
        }

        // Run MediaPipe inference when video frame advances
        if (landmarkerInstance && video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const nowPerf = performance.now();
          const timestamp = nowPerf > lastTimestampRef.current ? nowPerf : lastTimestampRef.current + 1;
          lastTimestampRef.current = timestamp;

          let poseResult = null;
          try {
            poseResult = landmarkerInstance.detectForVideo(video, timestamp);
          } catch (err) {
            console.warn('[MediaPipe] detectForVideo error:', err);
          }

          frameCountRef.current++;
          const frame = frameCountRef.current;
          const now = Date.now();
          const timeSinceLastRep = now - lastRepTimeRef.current;

          if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
            const rawLandmarks = poseResult.landmarks[0];

            // Convert raw landmarks to screen coordinates with mirror flip
            const screenPoints = rawLandmarks.map((lm) => ({
              x: offsetX + (1 - lm.x) * renderWidth,
              y: offsetY + lm.y * renderHeight,
              z: lm.z,
              visibility: lm.visibility ?? 1,
            }));

            // Comprehensive biomechanical and camera angle posture analysis
            const analysis = analyzeMovement({
              exercise,
              rawLandmarks,
              screenPoints,
              repState: repStateRef.current,
              timeSinceLastRep,
              frameNumber: frame,
            });

            if (analysis.nextRepState) {
              repStateRef.current = analysis.nextRepState;
            }

            if (analysis.countedRep) {
              lastRepTimeRef.current = now;
              const nextCount = repCountRef.current + 1;
              repCountRef.current = nextCount;
              onRepCount?.(nextCount);
              playChime(659.25, 'success');
              // Rep counted with valid form - speak count immediately with top priority!
              speak(analysis.cueVoice || `Rep ${nextCount}!`, true);
            } else if (analysis.repFailedForm) {
              // Form or depth fault detected during repetition - do NOT count!
              playChime(220, 'error');
              speak(analysis.cueVoice || 'Check your form', true);
            } else if (analysis.countedHold) {
              holdSecondsRef.current += 3;
              const nextCount = repCountRef.current + 1;
              repCountRef.current = nextCount;
              onRepCount?.(nextCount);
              playChime(587.33, 'success');
              speak(analysis.cueVoice || `Hold steady! ${holdSecondsRef.current} seconds`, true);
            } else if (analysis.cueVoice && !analysis.isRightForm) {
              speak(analysis.cueVoice, false);
            }

            onFeedback?.(analysis.feedbackMessage, analysis.feedbackCategory);

            // Store render state for stable, flicker-free rendering
            lastRenderDataRef.current = {
              detected: true,
              screenPoints,
              isRightForm: analysis.isRightForm,
              activeAngleDisplay: analysis.activeAngleDisplay,
              activeJointPoint: analysis.activeJointPoint,
              activeMetricName: analysis.activeMetricName,
              feedbackCategory: analysis.feedbackCategory,
            };
          } else {
            // No pose detected in this video frame
            onFeedback?.('Step into camera view · Align your full body', 'neutral');
            lastRenderDataRef.current = { detected: false };
          }
        }

        // ----------------------------------------------------
        // Flicker-Free Rendering from latest cached inference
        // ----------------------------------------------------
        ctx.clearRect(0, 0, cw, ch);

        const renderData = lastRenderDataRef.current;
        if (renderData && renderData.detected && renderData.screenPoints) {
          const {
            screenPoints,
            isRightForm,
            activeAngleDisplay,
            activeJointPoint,
            activeMetricName,
            feedbackCategory,
          } = renderData;

          const strokeColor = isRightForm ? '#26d9c2' : feedbackCategory === 'neutral' ? '#ffae5b' : '#ef4444';
          const glowColor = isRightForm
            ? 'rgba(38, 217, 194, 0.7)'
            : feedbackCategory === 'neutral'
            ? 'rgba(255, 174, 91, 0.7)'
            : 'rgba(239, 68, 68, 0.7)';

          // Render Real Skeleton Bones & Glowing Connectors
          ctx.save();
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = strokeColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 10;

          SKELETON_CONNECTIONS.forEach(([i1, i2]) => {
            const p1 = screenPoints[i1];
            const p2 = screenPoints[i2];
            if (p1 && p2 && p1.visibility > 0.35 && p2.visibility > 0.35) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });

          // Render All 33 Landmark Dots
          screenPoints.forEach((pt, idx) => {
            if (pt.visibility > 0.35) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, idx >= 11 && idx <= 28 ? 6 : 4, 0, Math.PI * 2);
              ctx.fillStyle = !isRightForm && idx >= 23 ? strokeColor : idx < 11 ? '#ffae5b' : '#a8f368';
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 12;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          });

          // Active Joint Telemetry Tag on Body
          if (activeJointPoint && activeJointPoint.visibility > 0.35) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const tagText = String(activeAngleDisplay).includes('°')
              ? String(activeAngleDisplay)
              : typeof activeAngleDisplay === 'number'
              ? `${activeAngleDisplay}°`
              : String(activeAngleDisplay);

            drawRoundRect(ctx, activeJointPoint.x + 10, activeJointPoint.y - 14, 62, 26, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isRightForm ? '#a8f368' : strokeColor;
            ctx.font = '700 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(tagText, activeJointPoint.x + 41, activeJointPoint.y + 4);
            ctx.restore();
          }

          // Top-Left Telemetry HUD Card
          ctx.fillStyle = 'rgba(11, 14, 20, 0.94)';
          ctx.strokeStyle = isRightForm ? '#234e44' : feedbackCategory === 'neutral' ? '#5c4622' : '#5c2226';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          drawRoundRect(ctx, 16, 16, 250, 64, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#8f9aa9';
          ctx.font = '600 9px "DM Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(activeMetricName, 26, 33);

          const hudVal = String(activeAngleDisplay).includes('°')
            ? String(activeAngleDisplay)
            : typeof activeAngleDisplay === 'number'
            ? `${activeAngleDisplay}°`
            : String(activeAngleDisplay);

          ctx.fillStyle = isRightForm ? '#a8f368' : strokeColor;
          ctx.font = '700 20px "Space Grotesk", sans-serif';
          ctx.fillText(hudVal, 26, 60);

          ctx.fillStyle = strokeColor;
          ctx.font = '600 10px "DM Mono", monospace';
          ctx.fillText(isRightForm ? '● FORM: ACCURATE' : '▲ ADJUST FORM', 130, 59);

          ctx.restore();
        } else if (renderData && !renderData.detected) {
          // Render step into camera message
          ctx.save();
          ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
          ctx.strokeStyle = '#2d3748';
          ctx.lineWidth = 1;
          ctx.beginPath();
          drawRoundRect(ctx, cw / 2 - 130, ch / 2 - 25, 260, 50, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '600 12px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Step into camera view', cw / 2, ch / 2 - 3);

          ctx.fillStyle = '#26d9c2';
          ctx.font = '500 10px "DM Mono", monospace';
          ctx.fillText('MediaPipe Pose tracking active', cw / 2, ch / 2 + 15);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [active, isPaused, exercise, voiceEnabled, onRepCount, onFeedback, canvasRef, videoRef, modelStatus]);

  if (modelStatus === 'loading') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#26d9c2',
          fontSize: 11,
          fontFamily: '"DM Mono", monospace',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#26d9c2' }} />
        Initializing MediaPipe AI Vision Engine...
      </div>
    );
  }

  return null;
}
