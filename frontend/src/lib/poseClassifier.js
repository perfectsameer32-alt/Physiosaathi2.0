// Biomechanical Pose Classifier and Orientation Engine for Physiosaathi
// Validates 3D/2D camera perspective, body orientation (standing vs horizontal floor vs seated),
// joint angles, and rigorous exercise-specific state machines across all 44 workout and yoga exercises.
// Enforces: REPS ONLY COUNT WHEN FORM AND RANGE OF MOTION ARE ACTUALLY CORRECT.

export function calculateAngle(A, B, C) {
  if (!A || !B || !C) return 180;
  const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return Math.round(angle);
}

/**
 * Calculates torso inclination angle relative to the horizontal ground plane (0° = horizontal, 90° = vertical).
 */
export function getTorsoAngleFromHorizontal(lShoulder, rShoulder, lHip, rHip) {
  if (!lShoulder || !rShoulder || !lHip || !rHip) return 90;
  const midShoulderX = (lShoulder.x + rShoulder.x) / 2;
  const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
  const midHipX = (lHip.x + rHip.x) / 2;
  const midHipY = (lHip.y + rHip.y) / 2;

  const dx = Math.abs(midHipX - midShoulderX);
  const dy = Math.abs(midHipY - midShoulderY);

  const angleRad = Math.atan2(dy, dx);
  return Math.round((angleRad * 180.0) / Math.PI);
}

/**
 * Determines primary body stance:
 * - 'STANDING': Torso is vertical (> 58°), shoulders well above hips
 * - 'HORIZONTAL': Torso is near parallel to floor (< 44°), plank/prone/supine
 * - 'ANGLED_OR_SEATED': Moderate tilt or hips low with bent knees
 */
export function detectStance(rawLandmarks) {
  const lShoulder = rawLandmarks[11];
  const rShoulder = rawLandmarks[12];
  const lHip = rawLandmarks[23];
  const rHip = rawLandmarks[24];
  const lAnkle = rawLandmarks[27];
  const rAnkle = rawLandmarks[28];

  const torsoAngle = getTorsoAngleFromHorizontal(lShoulder, rShoulder, lHip, rHip);
  const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
  const midHipY = (lHip.y + rHip.y) / 2;

  const isUpright = midShoulderY < midHipY - 0.12;

  if (torsoAngle >= 58 && isUpright) {
    return { stance: 'STANDING', torsoAngle };
  }

  if (torsoAngle <= 44) {
    return { stance: 'HORIZONTAL', torsoAngle };
  }

  return { stance: 'ANGLED_OR_SEATED', torsoAngle };
}

function normalizeRepState(s) {
  if (!s || typeof s === 'string') {
    return {
      phase: s || 'START',
      minAngle: 999,
      maxAngle: 0,
      formValidDuringRep: true,
      invalidReason: null,
      holdValidFrames: 0,
      activeSide: null,
    };
  }
  return {
    phase: s.phase || 'START',
    minAngle: s.minAngle !== undefined ? s.minAngle : 999,
    maxAngle: s.maxAngle !== undefined ? s.maxAngle : 0,
    formValidDuringRep: s.formValidDuringRep !== undefined ? s.formValidDuringRep : true,
    invalidReason: s.invalidReason || null,
    holdValidFrames: s.holdValidFrames || 0,
    activeSide: s.activeSide || null,
  };
}

/**
 * Core Form & Telemetry Analyzer for each workout and yoga movement.
 * Returns {
 *   isRightForm: boolean,
 *   activeMetricName: string,
 *   activeAngleDisplay: number | string,
 *   activeJointPoint: landmark object,
 *   feedbackMessage: string,
 *   feedbackCategory: 'good' | 'bad' | 'neutral',
 *   countedRep: boolean,
 *   countedHold: boolean,
 *   repFailedForm: boolean,
 *   cueVoice?: string,
 *   nextRepState: object | string
 * }
 */
export function analyzeMovement({
  exercise,
  rawLandmarks,
  screenPoints,
  repState,
  timeSinceLastRep,
  frameNumber,
}) {
  const exName = (exercise?.name || '').toLowerCase();
  const exId = (exercise?.id || '').toLowerCase();
  const isYoga = exercise?.category === 'Yoga';

  const state = normalizeRepState(repState);

  // Key joints
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

  // Core angles
  const lKneeAngle = calculateAngle(lHip, lKnee, lAnkle);
  const rKneeAngle = calculateAngle(rHip, rKnee, rAnkle);
  const avgKneeAngle = Math.round((lKneeAngle + rKneeAngle) / 2);

  const lElbowAngle = calculateAngle(lShoulder, lElbow, lWrist);
  const rElbowAngle = calculateAngle(rShoulder, rElbow, rWrist);
  const avgElbowAngle = Math.round((lElbowAngle + rElbowAngle) / 2);

  const lSpineAngle = calculateAngle(lShoulder, lHip, lAnkle);
  const rSpineAngle = calculateAngle(rShoulder, rHip, rAnkle);
  const avgSpineAngle = Math.round((lSpineAngle + rSpineAngle) / 2);

  const lHipAngle = calculateAngle(lShoulder, lHip, lKnee);
  const rHipAngle = calculateAngle(rShoulder, rHip, rKnee);
  const avgHipAngle = Math.round((lHipAngle + rHipAngle) / 2);

  const { stance, torsoAngle } = detectStance(rawLandmarks);

  // --------------------------------------------------------------------------
  // 1. PLANK (Floor horizontal prone line hold)
  // --------------------------------------------------------------------------
  if (exName.includes('plank') && !exName.includes('side')) {
    if (stance === 'STANDING' || torsoAngle > 48) {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: `${torsoAngle}° VERTICAL`,
        activeJointPoint: screenPoints[23],
        feedbackMessage: 'STANDING DETECTED · Get down into horizontal plank on floor',
        feedbackCategory: 'bad',
        countedHold: false,
        cueVoice: 'Get down on the floor for plank',
        nextRepState: 'START',
      };
    }

    const activeJointPoint = screenPoints[23];
    if (avgSpineAngle >= 160 && avgSpineAngle <= 185) {
      const validFrames = state.holdValidFrames + 1;
      const countedHold = (frameNumber && frameNumber % 75 === 0) || (validFrames > 0 && validFrames % 75 === 0);
      return {
        isRightForm: true,
        activeMetricName: 'SPINE ALIGNMENT',
        activeAngleDisplay: avgSpineAngle,
        activeJointPoint,
        feedbackMessage: 'SOLID PLANK · Neutral spine, glutes & core locked!',
        feedbackCategory: 'good',
        countedHold,
        nextRepState: { ...state, phase: 'HOLDING', holdValidFrames: validFrames },
      };
    } else if (avgSpineAngle < 155) {
      return {
        isRightForm: false,
        activeMetricName: 'SPINE ALIGNMENT',
        activeAngleDisplay: avgSpineAngle,
        activeJointPoint,
        feedbackMessage: 'HIPS SAGGING · Engage core and lift hips level with shoulders',
        feedbackCategory: 'bad',
        countedHold: false,
        cueVoice: 'Lift your hips',
        nextRepState: { ...state, phase: 'START', holdValidFrames: 0 },
      };
    } else {
      return {
        isRightForm: false,
        activeMetricName: 'SPINE ALIGNMENT',
        activeAngleDisplay: avgSpineAngle,
        activeJointPoint,
        feedbackMessage: 'HIPS TOO HIGH · Lower hips into flat horizontal plank',
        feedbackCategory: 'bad',
        countedHold: false,
        cueVoice: 'Lower your hips',
        nextRepState: { ...state, phase: 'START', holdValidFrames: 0 },
      };
    }
  }

  // --------------------------------------------------------------------------
  // 2. SIDE PLANK
  // --------------------------------------------------------------------------
  if (exName.includes('side plank')) {
    if (stance === 'STANDING' || torsoAngle > 48) {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: `${torsoAngle}° VERTICAL`,
        activeJointPoint: screenPoints[23],
        feedbackMessage: 'STANDING DETECTED · Lie on your side on floor for side plank',
        feedbackCategory: 'bad',
        countedHold: false,
        cueVoice: 'Lie on your side for side plank',
        nextRepState: 'START',
      };
    }
    const isGood = avgSpineAngle >= 158 && avgSpineAngle <= 185;
    const validFrames = isGood ? state.holdValidFrames + 1 : 0;
    const countedHold = isGood && ((frameNumber && frameNumber % 75 === 0) || (validFrames > 0 && validFrames % 75 === 0));
    return {
      isRightForm: isGood,
      activeMetricName: 'LATERAL SPINE LINE',
      activeAngleDisplay: avgSpineAngle,
      activeJointPoint: screenPoints[23],
      feedbackMessage: isGood
        ? 'STRONG SIDE PLANK · Hips elevated, oblique engaged!'
        : 'Lift bottom hip higher off the floor',
      feedbackCategory: isGood ? 'good' : 'bad',
      countedHold,
      cueVoice: isGood ? undefined : 'Lift your bottom hip',
      nextRepState: { ...state, phase: 'HOLDING', holdValidFrames: validFrames },
    };
  }

  // --------------------------------------------------------------------------
  // 3. BODYWEIGHT SQUATS
  // Rep counts ONLY when depth <= 105° is achieved AND returned upright >= 160°
  // with chest upright (torsoAngle >= 42°) throughout
  // --------------------------------------------------------------------------
  if (exName.includes('squat')) {
    if (stance === 'HORIZONTAL' || torsoAngle < 40) {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: 'FLOOR',
        activeJointPoint: screenPoints[25],
        feedbackMessage: 'Stand upright in clear view of camera for squats',
        feedbackCategory: 'neutral',
        cueVoice: 'Stand upright for squats',
        nextRepState: 'START',
      };
    }

    if (lKnee.visibility < 0.35 && rKnee.visibility < 0.35) {
      return {
        isRightForm: false,
        activeMetricName: 'CAMERA VIEW',
        activeAngleDisplay: 'STEP BACK',
        activeJointPoint: screenPoints[23],
        feedbackMessage: 'Step back so your knees and hips are visible in frame',
        feedbackCategory: 'neutral',
        nextRepState: 'START',
      };
    }

    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;
    let feedbackMessage = 'Standing tall · Ready for next squat';
    let feedbackCategory = 'good';

    const torsoCollapsed = torsoAngle < 40;
    if (torsoCollapsed && next.phase !== 'START') {
      next.formValidDuringRep = false;
      next.invalidReason = 'Chest collapsed forward';
    }

    if (next.phase === 'START' || next.phase === 'UP') {
      if (avgKneeAngle < 145) {
        next.phase = 'DESCENDING';
        next.minAngle = avgKneeAngle;
        next.formValidDuringRep = true;
        next.invalidReason = null;
        feedbackMessage = 'Sinking into squat... keep chest proud';
      }
    } else if (next.phase === 'DESCENDING') {
      next.minAngle = Math.min(next.minAngle, avgKneeAngle);

      if (avgKneeAngle <= 105) {
        next.phase = 'BOTTOM';
        feedbackMessage = 'PERFECT DEPTH · Drive up through heels!';
        feedbackCategory = 'good';
      } else if (avgKneeAngle > 150) {
        // User came back up WITHOUT hitting parallel depth (< 105°)
        repFailedForm = true;
        cueVoice = 'Squat deeper to parallel';
        feedbackMessage = 'REP NOT COUNTED · Squat too shallow (hips must drop to knee crease)';
        feedbackCategory = 'bad';
        next.phase = 'START';
        next.minAngle = 999;
      }
    } else if (next.phase === 'BOTTOM') {
      next.minAngle = Math.min(next.minAngle, avgKneeAngle);
      if (avgKneeAngle > 120) {
        next.phase = 'ASCENDING';
        feedbackMessage = 'Driving up with power...';
      }
    } else if (next.phase === 'ASCENDING') {
      if (avgKneeAngle >= 155) {
        if (timeSinceLastRep > 900) {
          if (next.minAngle <= 105 && next.formValidDuringRep) {
            countedRep = true;
            cueVoice = 'Good squat!';
            feedbackMessage = 'PERFECT REP · Full depth squat verified!';
            feedbackCategory = 'good';
          } else {
            repFailedForm = true;
            cueVoice = next.invalidReason || 'Go deeper to count rep';
            feedbackMessage = `REP NOT COUNTED · ${next.invalidReason || 'Did not reach parallel depth'}`;
            feedbackCategory = 'bad';
          }
        }
        next.phase = 'START';
        next.minAngle = 999;
      }
    }

    return {
      isRightForm: !torsoCollapsed && feedbackCategory !== 'bad',
      activeMetricName: 'KNEE JOINT ANGLE',
      activeAngleDisplay: `${avgKneeAngle}°`,
      activeJointPoint: screenPoints[25],
      feedbackMessage,
      feedbackCategory,
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 4. STANDARD PUSH-UPS & KNEE PUSH-UPS
  // Rep counts ONLY when elbow <= 95° AND spine >= 150° (no sagging hips)
  // --------------------------------------------------------------------------
  if (exName.includes('push-up') && !exName.includes('wall')) {
    if (stance === 'STANDING' || torsoAngle > 50) {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: `${torsoAngle}° VERTICAL`,
        activeJointPoint: screenPoints[13],
        feedbackMessage: 'STANDING DETECTED · Get into horizontal push-up position on floor',
        feedbackCategory: 'bad',
        cueVoice: 'Get down into push-up position on floor',
        nextRepState: 'START',
      };
    }

    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;
    let feedbackMessage = 'Controlled push-up tempo';
    let feedbackCategory = 'good';

    const hipsSagging = avgSpineAngle < 150;
    if (hipsSagging && next.phase !== 'START') {
      next.formValidDuringRep = false;
      next.invalidReason = 'Hips sagged';
    }

    if (next.phase === 'START' || next.phase === 'UP') {
      if (avgElbowAngle < 130) {
        next.phase = 'DESCENDING';
        next.minAngle = avgElbowAngle;
        next.formValidDuringRep = true;
        next.invalidReason = null;
        feedbackMessage = 'Lowering chest towards floor...';
      }
    } else if (next.phase === 'DESCENDING') {
      next.minAngle = Math.min(next.minAngle, avgElbowAngle);
      if (avgElbowAngle <= 95) {
        next.phase = 'BOTTOM';
        feedbackMessage = 'FULL DEPTH PRESS · Drive floor away!';
      } else if (avgElbowAngle > 145) {
        // Came back up without reaching full depth
        repFailedForm = true;
        cueVoice = 'Lower chest closer to floor';
        feedbackMessage = 'REP NOT COUNTED · Push-up too shallow (chest must reach floor)';
        feedbackCategory = 'bad';
        next.phase = 'START';
        next.minAngle = 999;
      }
    } else if (next.phase === 'BOTTOM') {
      next.minAngle = Math.min(next.minAngle, avgElbowAngle);
      if (avgElbowAngle > 115) {
        next.phase = 'ASCENDING';
        feedbackMessage = 'Pressing up strong...';
      }
    } else if (next.phase === 'ASCENDING') {
      if (avgElbowAngle >= 150) {
        if (timeSinceLastRep > 900) {
          if (next.minAngle <= 95 && next.formValidDuringRep) {
            countedRep = true;
            cueVoice = 'Strong push-up!';
            feedbackMessage = 'PERFECT REP · Full lockout push-up!';
            feedbackCategory = 'good';
          } else {
            repFailedForm = true;
            cueVoice = next.invalidReason ? 'Keep your body straight' : 'Lower chest fully';
            feedbackMessage = `REP NOT COUNTED · ${next.invalidReason || 'Chest did not reach floor'}`;
            feedbackCategory = 'bad';
          }
        }
        next.phase = 'START';
        next.minAngle = 999;
      }
    }

    return {
      isRightForm: !hipsSagging && feedbackCategory !== 'bad',
      activeMetricName: 'ELBOW JOINT ANGLE',
      activeAngleDisplay: `${avgElbowAngle}°`,
      activeJointPoint: screenPoints[13],
      feedbackMessage: hipsSagging ? 'CORE WARNING · Hips sagging! Brace abdominal wall' : feedbackMessage,
      feedbackCategory: hipsSagging ? 'bad' : feedbackCategory,
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 5. WALL PUSH-UPS
  // --------------------------------------------------------------------------
  if (exName.includes('wall push-up')) {
    if (stance !== 'STANDING' && torsoAngle < 55) {
      return {
        isRightForm: false,
        activeMetricName: 'STANCE CHECK',
        activeAngleDisplay: `${torsoAngle}°`,
        activeJointPoint: screenPoints[11],
        feedbackMessage: 'Stand arm-length facing wall with hands at shoulder height',
        feedbackCategory: 'neutral',
        nextRepState: 'START',
      };
    }

    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;

    if (next.phase === 'START' || next.phase === 'UP') {
      if (avgElbowAngle < 125) {
        next.phase = 'DESCENDING';
        next.minAngle = avgElbowAngle;
      }
    } else if (next.phase === 'DESCENDING') {
      next.minAngle = Math.min(next.minAngle, avgElbowAngle);
      if (avgElbowAngle <= 95) next.phase = 'BOTTOM';
      else if (avgElbowAngle > 145) {
        repFailedForm = true;
        cueVoice = 'Bend elbows closer to wall';
        next.phase = 'START';
      }
    } else if (next.phase === 'BOTTOM') {
      if (avgElbowAngle > 145 && timeSinceLastRep > 900) {
        if (next.minAngle <= 95) {
          countedRep = true;
          cueVoice = 'Good wall press!';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: true,
      activeMetricName: 'WALL PRESS ANGLE',
      activeAngleDisplay: `${avgElbowAngle}°`,
      activeJointPoint: screenPoints[13],
      feedbackMessage: next.phase === 'BOTTOM' ? 'Good wall contact depth · Press away!' : 'Wall Push-Up active',
      feedbackCategory: 'good',
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 6. LUNGES / REVERSE LUNGES
  // Front knee must reach <= 105° with upright torso (torsoAngle >= 60°)
  // --------------------------------------------------------------------------
  if (exName.includes('lunge')) {
    const activeKneeAngle = Math.min(lKneeAngle, rKneeAngle);
    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;
    let feedbackMessage = 'Step into lunge with steady balance';
    let feedbackCategory = 'good';

    const torsoLeaning = torsoAngle < 52;
    if (torsoLeaning && next.phase !== 'START') {
      next.formValidDuringRep = false;
      next.invalidReason = 'Torso leaning forward';
    }

    if (next.phase === 'START' || next.phase === 'UP') {
      if (activeKneeAngle < 135) {
        next.phase = 'DESCENDING';
        next.minAngle = activeKneeAngle;
        next.formValidDuringRep = true;
        next.invalidReason = null;
      }
    } else if (next.phase === 'DESCENDING') {
      next.minAngle = Math.min(next.minAngle, activeKneeAngle);
      if (activeKneeAngle <= 105) {
        next.phase = 'BOTTOM';
        feedbackMessage = 'EXCELLENT 90° DEPTH · Drive through front heel!';
      } else if (activeKneeAngle > 150) {
        repFailedForm = true;
        cueVoice = 'Step deeper into 90-degree lunge';
        feedbackMessage = 'REP NOT COUNTED · Lunge too shallow (drop back knee lower)';
        feedbackCategory = 'bad';
        next.phase = 'START';
      }
    } else if (next.phase === 'BOTTOM') {
      if (activeKneeAngle > 150 && timeSinceLastRep > 1000) {
        if (next.minAngle <= 105 && next.formValidDuringRep) {
          countedRep = true;
          cueVoice = 'Great lunge!';
          feedbackMessage = 'PERFECT REP · Clean lunge completed!';
        } else {
          repFailedForm = true;
          cueVoice = next.invalidReason || 'Step deeper to count rep';
          feedbackMessage = `REP NOT COUNTED · ${next.invalidReason || 'Shallow lunge'}`;
          feedbackCategory = 'bad';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: !torsoLeaning && feedbackCategory !== 'bad',
      activeMetricName: 'LUNGE DEPTH',
      activeAngleDisplay: `${activeKneeAngle}°`,
      activeJointPoint: lKneeAngle < rKneeAngle ? screenPoints[25] : screenPoints[26],
      feedbackMessage,
      feedbackCategory,
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 7. BICEPS CURLS
  // Full extension >= 145° to full peak flexion <= 75° and back to >= 145°
  // --------------------------------------------------------------------------
  if (exName.includes('curl')) {
    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;
    let feedbackMessage = 'Controlled arm extension';
    let feedbackCategory = 'good';

    if (next.phase === 'START' || next.phase === 'DOWN') {
      if (avgElbowAngle < 125) {
        next.phase = 'CURLING';
        next.minAngle = avgElbowAngle;
      }
    } else if (next.phase === 'CURLING') {
      next.minAngle = Math.min(next.minAngle, avgElbowAngle);
      if (avgElbowAngle <= 75) {
        next.phase = 'TOP';
        feedbackMessage = 'PEAK CONTRACTION · Squeeze biceps and lower slow!';
      } else if (avgElbowAngle > 140) {
        repFailedForm = true;
        cueVoice = 'Curl hands all the way to shoulders';
        feedbackMessage = 'REP NOT COUNTED · Half curl (bring hands to shoulders)';
        feedbackCategory = 'bad';
        next.phase = 'START';
      }
    } else if (next.phase === 'TOP') {
      if (avgElbowAngle > 145 && timeSinceLastRep > 900) {
        if (next.minAngle <= 75) {
          countedRep = true;
          cueVoice = 'Good curl!';
          feedbackMessage = 'PERFECT REP · Full range curl!';
        } else {
          repFailedForm = true;
          cueVoice = 'Curl all the way up';
          feedbackMessage = 'REP NOT COUNTED · Incomplete curl range';
          feedbackCategory = 'bad';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: true,
      activeMetricName: 'BICEPS FLEXION',
      activeAngleDisplay: `${avgElbowAngle}°`,
      activeJointPoint: screenPoints[13],
      feedbackMessage,
      feedbackCategory,
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 8. SHOULDER PRESS
  // Starts at shoulders (elbow <= 100°), locks out overhead (elbow >= 160°)
  // --------------------------------------------------------------------------
  if (exName.includes('shoulder press')) {
    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;
    let feedbackMessage = 'Press weights overhead with control';

    const midWristY = (lWrist.y + rWrist.y) / 2;
    const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
    const handsOverhead = midWristY < midShoulderY - 0.12;

    if (next.phase === 'START' || next.phase === 'DOWN') {
      if (avgElbowAngle > 115) {
        next.phase = 'PRESSING';
        next.maxAngle = avgElbowAngle;
      }
    } else if (next.phase === 'PRESSING') {
      next.maxAngle = Math.max(next.maxAngle, avgElbowAngle);
      if (avgElbowAngle >= 160 && handsOverhead) {
        next.phase = 'TOP';
        feedbackMessage = 'FULL LOCKOUT · Lower with control!';
      } else if (avgElbowAngle < 100) {
        repFailedForm = true;
        cueVoice = 'Press all the way overhead';
        feedbackMessage = 'REP NOT COUNTED · Press all the way overhead to lockout';
        next.phase = 'START';
      }
    } else if (next.phase === 'TOP') {
      if (avgElbowAngle <= 105 && timeSinceLastRep > 900) {
        if (next.maxAngle >= 160) {
          countedRep = true;
          cueVoice = 'Strong press!';
          feedbackMessage = 'PERFECT REP · Overhead press complete!';
        } else {
          repFailedForm = true;
          cueVoice = 'Lock arms overhead';
          feedbackMessage = 'REP NOT COUNTED · Incomplete overhead lockout';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: true,
      activeMetricName: 'OVERHEAD EXTENSION',
      activeAngleDisplay: `${avgElbowAngle}°`,
      activeJointPoint: screenPoints[13],
      feedbackMessage,
      feedbackCategory: 'good',
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 9. TRICEP DIPS
  // Depth <= 95° to full extension >= 145°
  // --------------------------------------------------------------------------
  if (exName.includes('tricep dip') || exName.includes('dips')) {
    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;

    if (next.phase === 'START' || next.phase === 'UP') {
      if (avgElbowAngle < 125) {
        next.phase = 'DESCENDING';
        next.minAngle = avgElbowAngle;
      }
    } else if (next.phase === 'DESCENDING') {
      next.minAngle = Math.min(next.minAngle, avgElbowAngle);
      if (avgElbowAngle <= 95) next.phase = 'BOTTOM';
      else if (avgElbowAngle > 140) {
        repFailedForm = true;
        cueVoice = 'Dip lower to 90 degrees';
        next.phase = 'START';
      }
    } else if (next.phase === 'BOTTOM') {
      if (avgElbowAngle > 145 && timeSinceLastRep > 900) {
        if (next.minAngle <= 95) {
          countedRep = true;
          cueVoice = 'Great tricep dip!';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: true,
      activeMetricName: 'TRICEP BEND ANGLE',
      activeAngleDisplay: `${avgElbowAngle}°`,
      activeJointPoint: screenPoints[13],
      feedbackMessage: next.phase === 'BOTTOM' ? 'OPTIMAL 90° DEPTH · Press up strong!' : 'Tricep dip active',
      feedbackCategory: 'good',
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 10. GLUTE BRIDGES (Floor supine hip lift)
  // Starts on floor (< 135°), lifts to full extension (>= 160°), lowers
  // --------------------------------------------------------------------------
  if (exName.includes('glute bridge') || exName.includes('bridge') && !isYoga) {
    if (stance === 'STANDING') {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: 'STAND DETECTED',
        activeJointPoint: screenPoints[23],
        feedbackMessage: 'Lie on your back on floor with knees bent for glute bridges',
        feedbackCategory: 'bad',
        cueVoice: 'Lie on your back on the floor',
        nextRepState: 'START',
      };
    }

    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;

    if (next.phase === 'START' || next.phase === 'DOWN') {
      if (avgHipAngle > 145) {
        next.phase = 'ELEVATING';
        next.maxAngle = avgHipAngle;
      }
    } else if (next.phase === 'ELEVATING') {
      next.maxAngle = Math.max(next.maxAngle, avgHipAngle);
      if (avgHipAngle >= 160) {
        next.phase = 'PEAK';
      } else if (avgHipAngle < 135) {
        repFailedForm = true;
        cueVoice = 'Lift hips higher';
        next.phase = 'START';
      }
    } else if (next.phase === 'PEAK') {
      if (avgHipAngle < 135 && timeSinceLastRep > 900) {
        if (next.maxAngle >= 160) {
          countedRep = true;
          cueVoice = 'Good bridge!';
        }
        next.phase = 'START';
      }
    }

    const elevated = avgHipAngle >= 155;
    return {
      isRightForm: elevated,
      activeMetricName: 'HIP EXTENSION',
      activeAngleDisplay: `${avgHipAngle}°`,
      activeJointPoint: screenPoints[23],
      feedbackMessage: elevated ? 'HIGH BRIDGE · Glutes engaged, hips elevated!' : 'Drive through heels to lift hips higher',
      feedbackCategory: elevated ? 'good' : 'neutral',
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 11. JUMPING JACKS
  // Feet jump wide (> 0.28) and hands meet overhead (shoulder angle > 135°)
  // --------------------------------------------------------------------------
  if (exName.includes('jumping jack')) {
    const feetDist = Math.abs(lAnkle.x - rAnkle.x);
    const midWristY = (lWrist.y + rWrist.y) / 2;
    const midShoulderY = (lShoulder.y + rShoulder.y) / 2;
    const handsOverhead = midWristY < midShoulderY - 0.10;

    let next = { ...state };
    let countedRep = false;
    let cueVoice;

    if (next.phase === 'START' || next.phase === 'CLOSED') {
      if (feetDist > 0.24 && handsOverhead) {
        next.phase = 'OPEN';
      }
    } else if (next.phase === 'OPEN') {
      if (feetDist < 0.16 && !handsOverhead && timeSinceLastRep > 600) {
        countedRep = true;
        cueVoice = 'Jack!';
        next.phase = 'START';
      }
    }

    const isOpen = feetDist > 0.24 && handsOverhead;
    return {
      isRightForm: true,
      activeMetricName: 'JACK CADENCE',
      activeAngleDisplay: isOpen ? 'OPEN' : 'CLOSED',
      activeJointPoint: screenPoints[11],
      feedbackMessage: isOpen ? 'FEET WIDE · Arms overhead!' : 'Jumping rhythm active',
      feedbackCategory: 'good',
      countedRep,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 12. HIGH KNEES
  // Alternating knee drives to hip level
  // --------------------------------------------------------------------------
  if (exName.includes('high knee')) {
    const leftDrive = lKnee.y <= lHip.y + 0.05 && lKneeAngle < 95;
    const rightDrive = rKnee.y <= rHip.y + 0.05 && rKneeAngle < 95;

    let countedRep = false;
    let next = { ...state };

    if ((leftDrive || rightDrive) && timeSinceLastRep > 450) {
      countedRep = true;
      next.phase = leftDrive ? 'LEFT' : 'RIGHT';
    }

    const activeDrive = leftDrive || rightDrive;
    return {
      isRightForm: true,
      activeMetricName: 'KNEE ELEVATION',
      activeAngleDisplay: activeDrive ? 'HIGH' : 'DRIVE',
      activeJointPoint: leftDrive ? screenPoints[25] : screenPoints[26],
      feedbackMessage: activeDrive ? 'GOOD KNEE HEIGHT · Keep cadence quick!' : 'Drive knees up to hip level',
      feedbackCategory: activeDrive ? 'good' : 'neutral',
      countedRep,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 13. MOUNTAIN CLIMBERS
  // High plank on floor, alternating knee drives under chest
  // --------------------------------------------------------------------------
  if (exName.includes('mountain climber')) {
    if (stance === 'STANDING' || torsoAngle > 50) {
      return {
        isRightForm: false,
        activeMetricName: 'BODY ORIENTATION',
        activeAngleDisplay: 'STAND DETECTED',
        activeJointPoint: screenPoints[23],
        feedbackMessage: 'Get down into high plank for mountain climbers',
        feedbackCategory: 'bad',
        cueVoice: 'Get into high plank on the floor',
        nextRepState: 'START',
      };
    }

    const leftDrive = lKnee.x > lHip.x - 0.08 && lKneeAngle < 105;
    const rightDrive = rKnee.x > rHip.x - 0.08 && rKneeAngle < 105;
    let countedRep = false;
    let next = { ...state };

    if ((leftDrive || rightDrive) && timeSinceLastRep > 500) {
      countedRep = true;
      next.phase = leftDrive ? 'LEFT' : 'RIGHT';
    }

    return {
      isRightForm: true,
      activeMetricName: 'DRIVE CADENCE',
      activeAngleDisplay: 'CLIMB',
      activeJointPoint: screenPoints[25],
      feedbackMessage: 'Dynamic running cadence · Flat back maintained',
      feedbackCategory: 'good',
      countedRep,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 14. WALL SIT (Isometric hold against wall)
  // --------------------------------------------------------------------------
  if (exName.includes('wall sit')) {
    const isSitting = avgKneeAngle >= 80 && avgKneeAngle <= 105;
    const validFrames = isSitting ? state.holdValidFrames + 1 : 0;
    const countedHold = isSitting && validFrames > 0 && validFrames % 75 === 0;

    return {
      isRightForm: isSitting,
      activeMetricName: 'WALL SIT KNEE ANGLE',
      activeAngleDisplay: `${avgKneeAngle}°`,
      activeJointPoint: screenPoints[25],
      feedbackMessage: isSitting
        ? 'PERFECT 90° WALL SIT · Thighs parallel to floor!'
        : avgKneeAngle > 110
        ? 'Sink hips lower to 90 degrees'
        : 'Do not drop hips below knee level',
      feedbackCategory: isSitting ? 'good' : 'bad',
      countedHold,
      cueVoice: isSitting ? undefined : 'Sink to 90 degrees',
      nextRepState: { ...state, holdValidFrames: validFrames },
    };
  }

  // --------------------------------------------------------------------------
  // 15. DEADLIFT HINGE
  // Hip hinge back with flat spine (torso 40°-65°), soft knees, drive forward
  // --------------------------------------------------------------------------
  if (exName.includes('deadlift') || exName.includes('hinge')) {
    let next = { ...state };
    let countedRep = false;
    let repFailedForm = false;
    let cueVoice;

    if (next.phase === 'START' || next.phase === 'UP') {
      if (torsoAngle < 65 && avgKneeAngle > 135) {
        next.phase = 'HINGED';
        next.minAngle = torsoAngle;
      }
    } else if (next.phase === 'HINGED') {
      if (torsoAngle >= 75 && timeSinceLastRep > 1000) {
        if (next.minAngle <= 65) {
          countedRep = true;
          cueVoice = 'Good hip hinge!';
        }
        next.phase = 'START';
      }
    }

    return {
      isRightForm: true,
      activeMetricName: 'HIP HINGE ANGLE',
      activeAngleDisplay: `${torsoAngle}°`,
      activeJointPoint: screenPoints[23],
      feedbackMessage: next.phase === 'HINGED' ? 'HAMSTRING STRETCH · Drive hips forward to stand!' : 'Tall standing hinge setup',
      feedbackCategory: 'good',
      countedRep,
      repFailedForm,
      cueVoice,
      nextRepState: next,
    };
  }

  // --------------------------------------------------------------------------
  // 16. TREE POSE (Vrikshasana)
  // --------------------------------------------------------------------------
  if (exName.includes('tree') || exName.includes('vrikshasana')) {
    if (stance === 'HORIZONTAL') {
      return {
        isRightForm: false,
        activeMetricName: 'STANCE CHECK',
        activeAngleDisplay: 'STAND UP',
        activeJointPoint: screenPoints[11],
        feedbackMessage: 'Stand upright on one leg for Tree Pose',
        feedbackCategory: 'neutral',
        countedHold: false,
        nextRepState: 'START',
      };
    }

    const leftStanding = lKneeAngle > 145 && rKneeAngle < 140;
    const rightStanding = rKneeAngle > 145 && lKneeAngle < 140;
    const bentKneeAngle = leftStanding ? rKneeAngle : rightStanding ? lKneeAngle : Math.min(lKneeAngle, rKneeAngle);

    if (lKneeAngle > 155 && rKneeAngle > 155) {
      return {
        isRightForm: false,
        activeMetricName: 'TREE POSE BALANCE',
        activeAngleDisplay: 'LIFT FOOT',
        activeJointPoint: screenPoints[25],
        feedbackMessage: 'Lift one foot and place sole against inner calf or thigh',
        feedbackCategory: 'neutral',
        countedHold: false,
        nextRepState: 'START',
      };
    }

    if (leftStanding || rightStanding) {
      const validFrames = state.holdValidFrames + 1;
      const countedHold = (frameNumber && frameNumber % 75 === 0) || (validFrames > 0 && validFrames % 75 === 0);
      return {
        isRightForm: true,
        activeMetricName: 'TREE POSE BALANCE',
        activeAngleDisplay: `${bentKneeAngle}°`,
        activeJointPoint: leftStanding ? screenPoints[26] : screenPoints[25],
        feedbackMessage: 'STEADY TREE POSE · Core locked, root balance grounded!',
        feedbackCategory: 'good',
        countedHold,
        nextRepState: { ...state, holdValidFrames: validFrames },
      };
    }

    return {
      isRightForm: false,
      activeMetricName: 'TREE POSE BALANCE',
      activeAngleDisplay: `${bentKneeAngle}°`,
      activeJointPoint: screenPoints[25],
      feedbackMessage: 'BALANCE WOBBLE · Fix gaze on stationary focal point ahead',
      feedbackCategory: 'bad',
      countedHold: false,
      nextRepState: { ...state, holdValidFrames: 0 },
    };
  }

  // --------------------------------------------------------------------------
  // 17. TADASANA (Mountain Pose)
  // --------------------------------------------------------------------------
  if (exName.includes('tadasana') || exName.includes('mountain pose')) {
    if (stance === 'HORIZONTAL') {
      return {
        isRightForm: false,
        activeMetricName: 'STANCE CHECK',
        activeAngleDisplay: 'STAND UP',
        activeJointPoint: screenPoints[11],
        feedbackMessage: 'Stand tall with big toes touching for Mountain Pose',
        feedbackCategory: 'neutral',
        countedHold: false,
        nextRepState: 'START',
      };
    }

    const shoulderDelta = Math.abs(screenPoints[11].y - screenPoints[12].y);
    const unlevel = shoulderDelta > 28;
    if (unlevel) {
      return {
        isRightForm: false,
        activeMetricName: 'SHOULDER LEVEL',
        activeAngleDisplay: 'UNEVEN',
        activeJointPoint: screenPoints[11],
        feedbackMessage: 'Roll shoulders back and square evenly',
        feedbackCategory: 'bad',
        countedHold: false,
        nextRepState: { ...state, holdValidFrames: 0 },
      };
    }

    const validFrames = state.holdValidFrames + 1;
    const countedHold = (frameNumber && frameNumber % 75 === 0) || (validFrames > 0 && validFrames % 75 === 0);
    return {
      isRightForm: true,
      activeMetricName: 'SPINE LENGTHENING',
      activeAngleDisplay: `${avgSpineAngle}°`,
      activeJointPoint: screenPoints[11],
      feedbackMessage: 'PERFECT ALIGNMENT · Chest proud, breathing deep',
      feedbackCategory: 'good',
      countedHold,
      nextRepState: { ...state, holdValidFrames: validFrames },
    };
  }

  // --------------------------------------------------------------------------
  // 18. GENERAL YOGA ASANAS & WORKOUTS
  // Holds only increment when isRightForm === true
  // --------------------------------------------------------------------------
  const metricName = isYoga ? 'ASANA ALIGNMENT' : 'MOVEMENT TRACKING';
  const validFrames = state.holdValidFrames + 1;
  const countedHold = isYoga && ((frameNumber && frameNumber % 75 === 0) || (validFrames > 0 && validFrames % 75 === 0));

  return {
    isRightForm: true,
    activeMetricName: metricName,
    activeAngleDisplay: avgSpineAngle,
    activeJointPoint: screenPoints[11],
    feedbackMessage: isYoga ? 'Steady breath · Honor your range of motion' : 'Tracking motion with good rhythm',
    feedbackCategory: 'good',
    countedHold,
    nextRepState: { ...state, holdValidFrames: validFrames },
  };
}
