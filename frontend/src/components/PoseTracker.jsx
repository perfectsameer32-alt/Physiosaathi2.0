import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

// Web Audio synthesizer for positive and error feedback
function playChime(freq = 659.25, type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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

// Calculate angle between three 2D points in degrees (Angle at point B)
function calculateAngle(A, B, C) {
  if (!A || !B || !C) return 180;
  const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return Math.round(angle);
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

    const speak = (phrase) => {
      if (!voiceEnabled || !window.speechSynthesis) return;
      const now = Date.now();
      if (now - lastVoiceCueTimeRef.current < 2500) return;
      lastVoiceCueTimeRef.current = now;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      } catch (err) {
        // Speech API
      }
    };

    const exName = (exercise?.name || '').toLowerCase();
    const isSquatEx = exName.includes('squat');
    const isPushUpEx = exName.includes('push-up') || exName.includes('pushup');
    const isPlankEx = exName.includes('plank');
    const isTreePose = exName.includes('tree') || exName.includes('vrikshasana');
    const isTadasana = exName.includes('tadasana') || exName.includes('mountain');
    const isWarrior = exName.includes('warrior') || exName.includes('virabhadrasana');

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

        ctx.clearRect(0, 0, cw, ch);

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

            // Key Landmarks
            const lShoulder = rawLandmarks[11];
            const rShoulder = rawLandmarks[12];
            const lElbow = rawLandmarks[13];
            const rElbow = rawLandmarks[14];
            const lWrist = rawLandmarks[15];
            const rWrist = rawLandmarks[16];
            const lHip = rawLandmarks[23];
            const rHip = rawLandmarks[24];
            const lKnee = rawLandmarks[25];
            const rKnee = rawLandmarks[26];
            const lAnkle = rawLandmarks[27];
            const rAnkle = rawLandmarks[28];

            // Real joint angles
            const lKneeAngle = calculateAngle(lHip, lKnee, lAnkle);
            const rKneeAngle = calculateAngle(rHip, rKnee, rAnkle);
            const avgKneeAngle = Math.round((lKneeAngle + rKneeAngle) / 2);

            const lElbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
            const rElbowAngle = calculateAngle(rShoulder, rElbow, rWrist);
            const avgElbowAngle = Math.round((lElbowAngle + rElbowAngle) / 2);

            const lSpineAngle = calculateAngle(lShoulder, lHip, lAnkle);
            const rSpineAngle = calculateAngle(rShoulder, rHip, rAnkle);
            const avgSpineAngle = Math.round((lSpineAngle + rSpineAngle) / 2);

            let isRightForm = true;
            let feedbackMessage = 'Good posture';
            let feedbackCategory = 'good';
            let activeMetricName = 'JOINT ALIGNMENT';
            let activeAngleDisplay = avgSpineAngle;
            let activeJointPoint = screenPoints[11];

            // ----------------------------------------------------
            // Exercise-Specific Form Analysis & State Machines
            // ----------------------------------------------------
            if (isTreePose) {
              activeMetricName = 'TREE POSE BALANCE';
              // Check if legs are visible
              const legsVisible = (lKnee.visibility > 0.4 || rKnee.visibility > 0.4) &&
                                  (lAnkle.visibility > 0.35 || rAnkle.visibility > 0.35);

              if (!legsVisible) {
                isRightForm = false;
                activeAngleDisplay = 0;
                feedbackMessage = 'Step back so your full body & legs are visible in frame';
                feedbackCategory = 'neutral';
              } else {
                // Determine standing leg vs bent leg
                const leftStanding = lKneeAngle > 145 && rKneeAngle < 140;
                const rightStanding = rKneeAngle > 145 && lKneeAngle < 140;
                const bentKneeAngle = leftStanding ? rKneeAngle : rightStanding ? lKneeAngle : Math.min(lKneeAngle, rKneeAngle);
                activeAngleDisplay = bentKneeAngle;
                activeJointPoint = leftStanding ? screenPoints[26] : screenPoints[25];

                if (leftStanding || rightStanding) {
                  // Leg is properly placed on inner calf/thigh
                  isRightForm = true;
                  feedbackMessage = 'STEADY TREE POSE · Core locked, balance steady!';
                  feedbackCategory = 'good';

                  // Hands verification (prayer or high overhead)
                  const wristsNear = Math.hypot(lWrist.x - rWrist.x, lWrist.y - rWrist.y) < 0.22;
                  const handsUp = lWrist.y < lShoulder.y && rWrist.y < rShoulder.y;
                  if (handsUp || wristsNear) {
                    feedbackMessage = 'PERFECT TREE POSE · Hands aligned & root grounded!';
                  }

                  if (frame % 75 === 0) {
                    holdSecondsRef.current += 3;
                    playChime(659.25, 'success');
                    onRepCount?.(repCountRef.current + 1);
                    repCountRef.current += 1;
                    speak('Hold strong!');
                  }
                } else if (lKneeAngle > 155 && rKneeAngle > 155) {
                  isRightForm = false;
                  feedbackMessage = 'Lift one foot and place against inner calf or thigh';
                  feedbackCategory = 'neutral';
                } else {
                  isRightForm = false;
                  feedbackMessage = 'FORM WARNING: Balance wobbling! Fix gaze on stationary point.';
                  feedbackCategory = 'bad';
                }
              }

            } else if (isSquatEx) {
              activeMetricName = 'KNEE JOINT ANGLE';
              activeAngleDisplay = avgKneeAngle;
              activeJointPoint = screenPoints[25];

              // Check if lower body is visible
              if (lKnee.visibility < 0.4 && rKnee.visibility < 0.4) {
                isRightForm = false;
                feedbackMessage = 'Step back so your knees and hips are visible';
                feedbackCategory = 'neutral';
              } else {
                if (repStateRef.current === 'START' || repStateRef.current === 'UP') {
                  if (avgKneeAngle < 140) {
                    repStateRef.current = 'DESCENDING';
                    feedbackMessage = 'Descending · Hinge hips back and bend knees';
                    feedbackCategory = 'good';
                  } else {
                    feedbackMessage = 'Standing tall · Ready for next squat';
                    feedbackCategory = 'good';
                  }
                } else if (repStateRef.current === 'DESCENDING') {
                  if (avgKneeAngle <= 100) {
                    repStateRef.current = 'BOTTOM';
                    isRightForm = true;
                    feedbackMessage = 'PERFECT DEPTH · Thighs parallel to floor! Drive up!';
                    feedbackCategory = 'good';
                    playChime(523.25, 'success');
                  } else if (avgKneeAngle > 150) {
                    // Ascended before parallel depth
                    repStateRef.current = 'UP';
                    isRightForm = false;
                    feedbackMessage = 'SQUAT TOO SHALLOW · Lower hips level with knees!';
                    feedbackCategory = 'bad';
                    playChime(220, 'error');
                    speak('Squat deeper to parallel');
                  }
                } else if (repStateRef.current === 'BOTTOM') {
                  if (avgKneeAngle > 150 && timeSinceLastRep > 1200) {
                    repStateRef.current = 'UP';
                    lastRepTimeRef.current = now;
                    const nextReps = repCountRef.current + 1;
                    repCountRef.current = nextReps;
                    onRepCount?.(nextReps);
                    playChime(659.25, 'success');
                    speak(`Rep ${nextReps}! Great depth!`);
                    feedbackMessage = `Rep ${nextReps} Counted! Excellent power`;
                    feedbackCategory = 'good';
                  } else {
                    feedbackMessage = 'Drive up through heels!';
                    feedbackCategory = 'good';
                  }
                }

                // Knee cave check
                const kneeDist = Math.abs(screenPoints[25].x - screenPoints[26].x);
                const hipDist = Math.abs(screenPoints[23].x - screenPoints[24].x);
                if (repStateRef.current === 'BOTTOM' && kneeDist < hipDist * 0.85) {
                  isRightForm = false;
                  feedbackMessage = 'KNEE CAVE WARNING · Push knees out over toes!';
                  feedbackCategory = 'bad';
                }
              }

            } else if (isPushUpEx) {
              activeMetricName = 'ELBOW JOINT ANGLE';
              activeAngleDisplay = avgElbowAngle;
              activeJointPoint = screenPoints[13];

              if (repStateRef.current === 'START' || repStateRef.current === 'UP') {
                if (avgElbowAngle < 130) {
                  repStateRef.current = 'DESCENDING';
                  feedbackMessage = 'Lowering chest with controlled elbows at 45°';
                  feedbackCategory = 'good';
                }
              } else if (repStateRef.current === 'DESCENDING') {
                if (avgElbowAngle <= 95) {
                  repStateRef.current = 'BOTTOM';
                  isRightForm = true;
                  feedbackMessage = 'EXCELLENT DEPTH · Full chest press! Now drive up!';
                  feedbackCategory = 'good';
                }
              } else if (repStateRef.current === 'BOTTOM') {
                if (avgElbowAngle > 150 && timeSinceLastRep > 1200) {
                  repStateRef.current = 'UP';
                  lastRepTimeRef.current = now;
                  const nextReps = repCountRef.current + 1;
                  repCountRef.current = nextReps;
                  onRepCount?.(nextReps);
                  playChime(659.25, 'success');
                  speak(`Rep ${nextReps}! Strong press!`);
                  feedbackMessage = `Rep ${nextReps} Counted! Clean lockout`;
                  feedbackCategory = 'good';
                }
              }

              // Spine / core check in push-up
              if (avgSpineAngle < 150) {
                isRightForm = false;
                feedbackMessage = 'CORE WARNING · Hips sagging! Engage glutes and brace abs.';
                feedbackCategory = 'bad';
              }

            } else if (isPlankEx) {
              activeMetricName = 'SPINE ALIGNMENT';
              activeAngleDisplay = avgSpineAngle;
              activeJointPoint = screenPoints[23];

              if (avgSpineAngle >= 160 && avgSpineAngle <= 185) {
                isRightForm = true;
                feedbackMessage = 'SOLID PLANK · Neutral spine, glutes & core locked!';
                feedbackCategory = 'good';
                if (frame % 75 === 0) {
                  holdSecondsRef.current += 3;
                  playChime(587.33, 'success');
                  onRepCount?.(repCountRef.current + 1);
                  repCountRef.current += 1;
                }
              } else if (avgSpineAngle < 155) {
                isRightForm = false;
                feedbackMessage = 'HIPS SAGGING · Lift hips to straight alignment.';
                feedbackCategory = 'bad';
              } else {
                isRightForm = false;
                feedbackMessage = 'HIPS TOO HIGH · Lower hips into flat plank posture.';
                feedbackCategory = 'bad';
              }

            } else if (isTadasana) {
              activeMetricName = 'SHOULDER & SPINE ALIGNMENT';
              activeAngleDisplay = avgSpineAngle;
              activeJointPoint = screenPoints[11];

              const shoulderDelta = Math.abs(screenPoints[11].y - screenPoints[12].y);
              if (shoulderDelta > ch * 0.05) {
                isRightForm = false;
                feedbackMessage = 'FORM WARNING: Shoulders unlevel! Roll shoulders back and square.';
                feedbackCategory = 'bad';
              } else {
                isRightForm = true;
                feedbackMessage = 'PERFECT ALIGNMENT: Spine lengthened, chest proud.';
                feedbackCategory = 'good';
                if (frame % 75 === 0) {
                  holdSecondsRef.current += 3;
                  playChime(523.25, 'success');
                  onRepCount?.(repCountRef.current + 1);
                  repCountRef.current += 1;
                }
              }

            } else if (isWarrior) {
              activeMetricName = 'WARRIOR STANCE ANGLE';
              activeAngleDisplay = Math.min(lKneeAngle, rKneeAngle);
              activeJointPoint = lKneeAngle < rKneeAngle ? screenPoints[25] : screenPoints[26];

              if (activeAngleDisplay <= 115) {
                isRightForm = true;
                feedbackMessage = 'STRONG WARRIOR POSE · Deep front knee lunge & stable core!';
                feedbackCategory = 'good';
                if (frame % 75 === 0) {
                  holdSecondsRef.current += 3;
                  playChime(659.25, 'success');
                  onRepCount?.(repCountRef.current + 1);
                  repCountRef.current += 1;
                }
              } else {
                isRightForm = false;
                feedbackMessage = 'Sink deeper into your front knee towards 90°';
                feedbackCategory = 'neutral';
              }

            } else {
              // General Movement
              activeMetricName = 'MOVEMENT TRACKING';
              activeAngleDisplay = avgKneeAngle;
              activeJointPoint = screenPoints[25];
              isRightForm = true;
              feedbackMessage = 'MediaPipe Pose active · Moving with good rhythm';
              feedbackCategory = 'good';
            }

            onFeedback?.(feedbackMessage, feedbackCategory);

            // ----------------------------------------------------
            // Render Real Skeleton Bones & Glowing Connectors
            // ----------------------------------------------------
            ctx.save();
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = isRightForm ? '#26d9c2' : '#ef4444';
            ctx.shadowColor = isRightForm ? 'rgba(38, 217, 194, 0.7)' : 'rgba(239, 68, 68, 0.7)';
            ctx.shadowBlur = 10;

            SKELETON_CONNECTIONS.forEach(([i1, i2]) => {
              const p1 = screenPoints[i1];
              const p2 = screenPoints[i2];
              if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            });

            // ----------------------------------------------------
            // Render All 33 Landmark Dots
            // ----------------------------------------------------
            screenPoints.forEach((pt, idx) => {
              if (pt.visibility > 0.4) {
                // Outer glow dot
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, idx >= 11 && idx <= 28 ? 6 : 4, 0, Math.PI * 2);
                ctx.fillStyle = !isRightForm && idx >= 23 ? '#ef4444' : idx < 11 ? '#ffae5b' : '#a8f368';
                ctx.shadowColor = isRightForm ? '#a8f368' : '#ef4444';
                ctx.shadowBlur = 12;
                ctx.fill();

                // Inner crisp white core
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
              }
            });

            // ----------------------------------------------------
            // Active Joint Telemetry Tag on Body
            // ----------------------------------------------------
            if (activeJointPoint && activeJointPoint.visibility > 0.4) {
              ctx.save();
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.strokeStyle = isRightForm ? '#26d9c2' : '#ef4444';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(activeJointPoint.x + 10, activeJointPoint.y - 14, 52, 26, 6);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = isRightForm ? '#a8f368' : '#ef4444';
              ctx.font = '700 12px "Space Grotesk", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`${activeAngleDisplay}°`, activeJointPoint.x + 36, activeJointPoint.y + 4);
              ctx.restore();
            }

            // ----------------------------------------------------
            // Top-Left Telemetry HUD Card
            // ----------------------------------------------------
            ctx.fillStyle = 'rgba(11, 14, 20, 0.92)';
            ctx.strokeStyle = isRightForm ? '#234e44' : '#5c2226';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(16, 16, 220, 60, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#8f9aa9';
            ctx.font = '600 9px "DM Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(activeMetricName, 28, 33);

            ctx.fillStyle = isRightForm ? '#a8f368' : '#ef4444';
            ctx.font = '700 22px "Space Grotesk", sans-serif';
            ctx.fillText(`${activeAngleDisplay}°`, 28, 60);

            ctx.fillStyle = isRightForm ? '#26d9c2' : '#ef4444';
            ctx.font = '600 10px "DM Mono", monospace';
            ctx.fillText(isRightForm ? '● FORM: ACCURATE' : '▲ ADJUST FORM', 98, 59);

            ctx.restore();

          } else {
            // No pose detected
            onFeedback?.('Step into camera view · Align your full body', 'neutral');

            ctx.save();
            ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(cw / 2 - 130, ch / 2 - 25, 260, 50, 10);
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
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
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
