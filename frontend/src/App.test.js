import { calculateStats, defaultProfile, defaultSettings } from './lib/storage';
import { allExercises, yogaExercises, workoutExercises } from './data/exercises';
import { workoutPlans } from './data/plans';
import { i18n, languages } from './data/i18n';
import { detectStance, analyzeMovement, getTorsoAngleFromHorizontal } from './lib/poseClassifier';

describe('Physiosaathi Data & Core Utilities', () => {
  test('Exercise dataset integrity', () => {
    expect(allExercises.length).toBe(44);
    expect(yogaExercises.length).toBe(22);
    expect(workoutExercises.length).toBe(22);

    allExercises.forEach((ex) => {
      expect(ex.id).toBeDefined();
      expect(ex.name).toBeDefined();
      expect(ex.category).toMatch(/Yoga|Home Workout/);
      expect(ex.videoUrl).toContain('youtube.com');
      expect(ex.image).toContain(ex.youtubeId);
      expect(Array.isArray(ex.steps)).toBe(true);
      expect(ex.steps.length).toBeGreaterThan(0);
    });
  });

  test('Workout plans structure and schedules', () => {
    expect(workoutPlans.length).toBeGreaterThanOrEqual(3);
    workoutPlans.forEach((plan) => {
      expect(plan.id).toBeDefined();
      expect(plan.title).toBeDefined();
      expect(Array.isArray(plan.schedule)).toBe(true);
      expect(plan.schedule.length).toBe(7); // 7 days in a week
    });
  });

  test('i18n translations coverage for all 5 languages', () => {
    expect(languages.length).toBe(5);
    const expectedCodes = ['en', 'hi', 'kn', 'te', 'bn'];
    expectedCodes.forEach((code) => {
      expect(i18n[code]).toBeDefined();
      expect(i18n[code].nav).toBeDefined();
      expect(i18n[code].common).toBeDefined();
      expect(i18n[code].dashboard).toBeDefined();
    });
  });

  test('calculateStats calculation with mixed camelCase and snake_case', () => {
    const mockHistory = [
      {
        id: '1',
        exerciseId: 'workout-1',
        durationSeconds: 120,
        reps: 15,
        calories: 30,
        accuracy: 90,
        timestamp: Date.now(),
      },
      {
        id: '2',
        exercise_id: 'yoga-1',
        duration_seconds: 180,
        reps: 10,
        calories: 20,
        accuracy: 94,
        timestamp: Date.now() - 86400000,
      },
    ];

    const stats = calculateStats(mockHistory);
    // 120 + 180 = 300 seconds = 5 minutes
    expect(stats.totalMinutes).toBe(5);
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalCalories).toBe(50);
    expect(stats.totalReps).toBe(25);
    expect(stats.avgAccuracy).toBe(92);
    expect(stats.streakDays).toBe(2);
  });

  test('calculateStats on empty history', () => {
    const stats = calculateStats([]);
    expect(stats.totalMinutes).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.totalCalories).toBe(0);
    expect(stats.totalReps).toBe(0);
    expect(stats.avgAccuracy).toBe(0);
    expect(stats.streakDays).toBe(0);
  });
});

describe('Biomechanical Pose Classifier & Stance Validation', () => {
  // Helper to build realistic 33 landmarks for tests
  function buildMockLandmarks({
    lShoulder = { x: 0.45, y: 0.25, z: 0, visibility: 0.9 },
    rShoulder = { x: 0.55, y: 0.25, z: 0, visibility: 0.9 },
    lElbow = { x: 0.40, y: 0.40, z: 0, visibility: 0.9 },
    rElbow = { x: 0.60, y: 0.40, z: 0, visibility: 0.9 },
    lWrist = { x: 0.40, y: 0.55, z: 0, visibility: 0.9 },
    rWrist = { x: 0.60, y: 0.55, z: 0, visibility: 0.9 },
    lHip = { x: 0.46, y: 0.60, z: 0, visibility: 0.9 },
    rHip = { x: 0.54, y: 0.60, z: 0, visibility: 0.9 },
    lKnee = { x: 0.46, y: 0.78, z: 0, visibility: 0.9 },
    rKnee = { x: 0.54, y: 0.78, z: 0, visibility: 0.9 },
    lAnkle = { x: 0.46, y: 0.95, z: 0, visibility: 0.9 },
    rAnkle = { x: 0.54, y: 0.95, z: 0, visibility: 0.9 },
  } = {}) {
    const lms = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
    lms[11] = lShoulder;
    lms[12] = rShoulder;
    lms[13] = lElbow;
    lms[14] = rElbow;
    lms[15] = lWrist;
    lms[16] = rWrist;
    lms[23] = lHip;
    lms[24] = rHip;
    lms[25] = lKnee;
    lms[26] = rKnee;
    lms[27] = lAnkle;
    lms[28] = rAnkle;
    return lms;
  }

  test('Detects STANDING stance when user is upright', () => {
    const standingLandmarks = buildMockLandmarks();
    const result = detectStance(standingLandmarks);
    expect(result.stance).toBe('STANDING');
    expect(result.torsoAngle).toBeGreaterThan(60);
  });

  test('Detects HORIZONTAL stance when user is prone in plank', () => {
    const plankLandmarks = buildMockLandmarks({
      // Horizontal on floor: shoulders and hips roughly at same y height, stretched in x
      lShoulder: { x: 0.25, y: 0.65, z: 0, visibility: 0.9 },
      rShoulder: { x: 0.25, y: 0.70, z: 0, visibility: 0.9 },
      lHip: { x: 0.60, y: 0.66, z: 0, visibility: 0.9 },
      rHip: { x: 0.60, y: 0.71, z: 0, visibility: 0.9 },
      lKnee: { x: 0.78, y: 0.67, z: 0, visibility: 0.9 },
      rKnee: { x: 0.78, y: 0.72, z: 0, visibility: 0.9 },
      lAnkle: { x: 0.92, y: 0.68, z: 0, visibility: 0.9 },
      rAnkle: { x: 0.92, y: 0.73, z: 0, visibility: 0.9 },
    });
    const result = detectStance(plankLandmarks);
    expect(result.stance).toBe('HORIZONTAL');
    expect(result.torsoAngle).toBeLessThan(35);
  });

  test('Plank Exercise FAILS with STANDING warning when user is standing up', () => {
    // The exact bug the user reported: standing in front of camera while plank is active
    const standingLandmarks = buildMockLandmarks();
    const screenPoints = standingLandmarks.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));
    const plankExercise = { id: 'workout-7', name: 'Plank', category: 'Home Workout' };

    const analysis = analyzeMovement({
      exercise: plankExercise,
      rawLandmarks: standingLandmarks,
      screenPoints,
      repState: 'START',
      timeSinceLastRep: 5000,
      frameNumber: 75,
    });

    expect(analysis.isRightForm).toBe(false);
    expect(analysis.feedbackCategory).toBe('bad');
    expect(analysis.feedbackMessage).toContain('STANDING DETECTED');
    expect(analysis.countedHold).toBeFalsy();
    expect(analysis.activeMetricName).toBe('BODY ORIENTATION');
  });

  test('Plank Exercise SUCCEEDS with SOLID PLANK when user is horizontally on the floor', () => {
    const plankLandmarks = buildMockLandmarks({
      lShoulder: { x: 0.25, y: 0.65, z: 0, visibility: 0.9 },
      rShoulder: { x: 0.25, y: 0.70, z: 0, visibility: 0.9 },
      lHip: { x: 0.55, y: 0.65, z: 0, visibility: 0.9 },
      rHip: { x: 0.55, y: 0.70, z: 0, visibility: 0.9 },
      lKnee: { x: 0.75, y: 0.65, z: 0, visibility: 0.9 },
      rKnee: { x: 0.75, y: 0.70, z: 0, visibility: 0.9 },
      lAnkle: { x: 0.90, y: 0.65, z: 0, visibility: 0.9 },
      rAnkle: { x: 0.90, y: 0.70, z: 0, visibility: 0.9 },
    });
    const screenPoints = plankLandmarks.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));
    const plankExercise = { id: 'workout-7', name: 'Plank', category: 'Home Workout' };

    const analysis = analyzeMovement({
      exercise: plankExercise,
      rawLandmarks: plankLandmarks,
      screenPoints,
      repState: 'START',
      timeSinceLastRep: 5000,
      frameNumber: 75,
    });

    expect(analysis.isRightForm).toBe(true);
    expect(analysis.feedbackCategory).toBe('good');
    expect(analysis.feedbackMessage).toContain('SOLID PLANK');
    expect(analysis.countedHold).toBe(true);
    expect(analysis.activeMetricName).toBe('SPINE ALIGNMENT');
  });

  test('Standard Push-Up FAILS with standing warning when user is upright', () => {
    const standingLandmarks = buildMockLandmarks();
    const screenPoints = standingLandmarks.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));
    const pushUpExercise = { id: 'workout-4', name: 'Standard Push-Ups', category: 'Home Workout' };

    const analysis = analyzeMovement({
      exercise: pushUpExercise,
      rawLandmarks: standingLandmarks,
      screenPoints,
      repState: 'START',
      timeSinceLastRep: 5000,
      frameNumber: 10,
    });

    expect(analysis.isRightForm).toBe(false);
    expect(analysis.feedbackCategory).toBe('bad');
    expect(analysis.feedbackMessage).toContain('STANDING DETECTED');
  });

  test('Tree Pose requires lifting one foot off the floor', () => {
    const bothFeetFlat = buildMockLandmarks({
      lKnee: { x: 0.46, y: 0.78, z: 0, visibility: 0.9 },
      rKnee: { x: 0.54, y: 0.78, z: 0, visibility: 0.9 },
      lAnkle: { x: 0.46, y: 0.95, z: 0, visibility: 0.9 },
      rAnkle: { x: 0.54, y: 0.95, z: 0, visibility: 0.9 },
    });
    const screenPoints = bothFeetFlat.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));
    const treeExercise = { id: 'yoga-2', name: 'Vrikshasana (Tree Pose)', category: 'Yoga' };

    const analysis = analyzeMovement({
      exercise: treeExercise,
      rawLandmarks: bothFeetFlat,
      screenPoints,
      repState: 'START',
      timeSinceLastRep: 5000,
      frameNumber: 10,
    });

    expect(analysis.isRightForm).toBe(false);
    expect(analysis.feedbackMessage).toContain('Lift one foot');
  });

  test('Squat: Shallow squat does NOT count rep and triggers form warning', () => {
    // User descends to only 130° (half squat) and rises back up
    const squatEx = { id: 'workout-1', name: 'Bodyweight Squats', category: 'Home Workout' };
    const shallowDescending = buildMockLandmarks({
      lHip: { x: 0.46, y: 0.65, z: 0, visibility: 0.9 },
      rHip: { x: 0.54, y: 0.65, z: 0, visibility: 0.9 },
      // 123 degrees angle at knees (shallow, did not reach parallel <= 105)
      lKnee: { x: 0.38, y: 0.78, z: 0, visibility: 0.9 },
      rKnee: { x: 0.62, y: 0.78, z: 0, visibility: 0.9 },
    });
    const screenPoints = shallowDescending.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));

    // Descending to 130°
    const descAnalysis = analyzeMovement({
      exercise: squatEx,
      rawLandmarks: shallowDescending,
      screenPoints,
      repState: { phase: 'START', minAngle: 999, formValidDuringRep: true },
      timeSinceLastRep: 5000,
      frameNumber: 15,
    });

    expect(descAnalysis.countedRep).toBe(false);
    expect(descAnalysis.nextRepState.phase).toBe('DESCENDING');

    // User rises up to 160° without ever hitting <= 105°
    const standingUp = buildMockLandmarks();
    const upPoints = standingUp.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));

    const upAnalysis = analyzeMovement({
      exercise: squatEx,
      rawLandmarks: standingUp,
      screenPoints: upPoints,
      repState: descAnalysis.nextRepState,
      timeSinceLastRep: 2000,
      frameNumber: 30,
    });

    // REP MUST NOT COUNT!
    expect(upAnalysis.countedRep).toBe(false);
    expect(upAnalysis.repFailedForm).toBe(true);
    expect(upAnalysis.feedbackMessage).toContain('REP NOT COUNTED');
  });

  test('Squat: Full parallel squat (<= 105°) counts rep successfully', () => {
    const squatEx = { id: 'workout-1', name: 'Bodyweight Squats', category: 'Home Workout' };

    // Simulating user in ASCENDING phase having reached full parallel depth (minAngle: 98°)
    const standingUp = buildMockLandmarks();
    const upPoints = standingUp.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));

    const repAnalysis = analyzeMovement({
      exercise: squatEx,
      rawLandmarks: standingUp,
      screenPoints: upPoints,
      repState: {
        phase: 'ASCENDING',
        minAngle: 98, // Valid depth <= 105°
        formValidDuringRep: true,
      },
      timeSinceLastRep: 2000,
      frameNumber: 45,
    });

    expect(repAnalysis.countedRep).toBe(true);
    expect(repAnalysis.repFailedForm).toBe(false);
    expect(repAnalysis.feedbackMessage).toContain('PERFECT REP');
  });

  test('Push-Up: Full lockout after reaching chest-to-floor counts rep', () => {
    const pushUpEx = { id: 'workout-4', name: 'Standard Push-Ups', category: 'Home Workout' };
    const horizontalPlank = buildMockLandmarks({
      lShoulder: { x: 0.25, y: 0.65, z: 0, visibility: 0.9 },
      rShoulder: { x: 0.25, y: 0.70, z: 0, visibility: 0.9 },
      lHip: { x: 0.55, y: 0.65, z: 0, visibility: 0.9 },
      rHip: { x: 0.55, y: 0.70, z: 0, visibility: 0.9 },
      lKnee: { x: 0.75, y: 0.65, z: 0, visibility: 0.9 },
      rKnee: { x: 0.75, y: 0.70, z: 0, visibility: 0.9 },
      lAnkle: { x: 0.90, y: 0.65, z: 0, visibility: 0.9 },
      rAnkle: { x: 0.90, y: 0.70, z: 0, visibility: 0.9 },
      // Elbows locked out > 150
      lElbow: { x: 0.25, y: 0.50, z: 0, visibility: 0.9 },
      rElbow: { x: 0.25, y: 0.55, z: 0, visibility: 0.9 },
      lWrist: { x: 0.25, y: 0.35, z: 0, visibility: 0.9 },
      rWrist: { x: 0.25, y: 0.40, z: 0, visibility: 0.9 },
    });
    const screenPoints = horizontalPlank.map((lm) => ({ x: lm.x * 640, y: lm.y * 480, visibility: lm.visibility }));

    const repAnalysis = analyzeMovement({
      exercise: pushUpEx,
      rawLandmarks: horizontalPlank,
      screenPoints,
      repState: {
        phase: 'ASCENDING',
        minAngle: 88, // Valid depth <= 95°
        formValidDuringRep: true,
      },
      timeSinceLastRep: 2000,
      frameNumber: 50,
    });

    expect(repAnalysis.countedRep).toBe(true);
    expect(repAnalysis.feedbackMessage).toContain('PERFECT REP');
  });
});
