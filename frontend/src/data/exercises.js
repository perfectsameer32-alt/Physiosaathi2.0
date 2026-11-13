const yogaData = [
  ['Tadasana', 'Mountain Pose', 'Beginner', 'Full body', 'E1xym-F_B84', 'Stand tall with feet together, shoulders relaxed, arms hanging naturally, weight distributed evenly across the soles of your feet.'],
  ['Vrikshasana', 'Tree Pose', 'Beginner', 'Legs · Balance', '0g3lN6XpWrQ', 'Shift weight onto one leg, place the other foot against your inner calf or thigh, find a focal point, and bring palms together at your heart.'],
  ['Trikonasana', 'Triangle Pose', 'Intermediate', 'Hips · Core', 'h60lC7mCaFA', 'Extend arms parallel to the floor, hinge at the front hip, lower your front hand to shin or floor, and reach your opposite arm to the sky.'],
  ['Balasana', 'Child’s Pose', 'Beginner', 'Back · Hips', '2MJGg-dUKh0', 'Kneel with big toes touching, sit back on your heels, separate knees, and drape your torso forward with forehead resting on the floor.'],
  ['Bhujangasana', 'Cobra Pose', 'Beginner', 'Back · Chest', 'fOdrW7nf9gw', 'Lie face down, place hands under shoulders, hug elbows in, and gently lift chest and ribs while keeping pubic bone grounded.'],
  ['Setu Bandhasana', 'Bridge Pose', 'Intermediate', 'Glutes · Back', 'ju3-J4lIOVY', 'Lie on your back with knees bent, feet hip-width, press firmly into feet, and lift your hips toward the ceiling while engaging your glutes.'],
  ['Sukhasana', 'Easy Pose', 'Beginner', 'Hips · Breath', 'ZdggFRtM3V0', 'Sit cross-legged with an upright spine, hands resting on knees, softening your shoulders and breathing deep diaphragmatic breaths.'],
  ['Baddha Konasana', 'Butterfly Pose', 'Beginner', 'Hips · Groin', 'QV-PKq5sz5Y', 'Sit tall, bend knees, draw soles of feet together, hold ankles, and allow knees to relax toward the floor without forcing.'],
  ['Marjaryasana-Bitilasana', 'Cat-Cow Pose', 'Beginner', 'Spine · Shoulders', 'LIVJZZyZ2qM', 'On hands and knees, inhale to arch the back and lift the gaze (Cow), exhale to round the spine toward the ceiling (Cat).'],
  ['Virabhadrasana', 'Warrior I', 'Intermediate', 'Legs · Shoulders', 'm-CHztlyh0U', 'Step one foot forward into a deep lunge, back foot turned out 45 degrees, square hips forward, and raise arms overhead.'],
  ['Adho Mukha Svanasana', 'Downward Dog', 'Beginner', 'Full body', 'T9ZA30LL-kY', 'From hands and knees, tuck toes and lift hips high into an inverted V-shape, pressing firmly through hands and reaching heels toward the mat.'],
  ['Utkatasana', 'Chair Pose', 'Intermediate', 'Quads · Core', 'DNpB3B7xWm8', 'Inhale arms overhead, bend knees and sit hips back as if settling into an invisible chair, keeping weight in heels.'],
  ['Paschimottanasana', 'Seated Forward Fold', 'Intermediate', 'Hamstrings', 'T8sgVyF4Ux4', 'Sit with legs extended straight, flex feet, inhale to lengthen spine, and exhale to fold from hips over thighs.'],
  ['Ardha Matsyendrasana', 'Seated Twist', 'Intermediate', 'Spine · Hips', 'O4sP8TKsvCU', 'Sit tall, bend one knee crossing foot over opposite leg, place elbow outside knee, and gently rotate torso with each exhale.'],
  ['Dhanurasana', 'Bow Pose', 'Advanced', 'Back · Chest', 'fCrzSLEBi3U', 'Lie prone, bend knees, reach back to grasp ankles, inhale to lift chest and thighs off floor simultaneously.'],
  ['Matsyasana', 'Fish Pose', 'Advanced', 'Chest · Neck', '_OsFzyEP17Q', 'Lie on your back, slide hands under hips, press forearms into floor, and lift chest while gently arching your upper spine.'],
  ['Garudasana', 'Eagle Pose', 'Advanced', 'Legs · Balance', 'DpYlfr5zdMs', 'Sink hips, wrap one thigh over the other, wrap arms with forearms pressing together, and hold steady balance.'],
  ['Navasana', 'Boat Pose', 'Intermediate', 'Core · Hip flexors', 'QirfRdIDu5Q', 'Sit on sit-bones, lean back slightly, lift bent or straight legs into a V-shape, and extend arms parallel to floor.'],
  ['Anjaneyasana', 'Low Lunge', 'Beginner', 'Hips · Quads', 'a58UBQAmbxo', 'Step forward into a deep lunge, lower back knee to floor, untuck toes, and sweep arms upward while sinking hips forward.'],
  ['Savasana', 'Corpse Pose', 'Beginner', 'Relaxation', '9ZsTLblha9o', 'Lie flat on your back, feet falling open, palms facing up by your sides, closing your eyes and relaxing every muscle completely.'],
  ['Prasarita Padottanasana', 'Wide-Leg Fold', 'Intermediate', 'Hamstrings', 'FLVlV33mLyI', 'Step feet 3 to 4 feet apart, hands on hips, fold forward from hips, and place hands on floor beneath shoulders.'],
  ['Parsvakonasana', 'Side Angle', 'Intermediate', 'Legs · Core', 'KkzaE0tmxHI', 'Wide stance, front knee bent 90 degrees, rest front forearm on thigh or hand on floor, and reach opposite arm diagonally overhead.']
];

const workoutData = [
  ['Bodyweight Squats', 'Lower body strength', 'Beginner', 'Quads · Glutes', 'aclHkVaku9U', 'Stand feet shoulder-width, toes angled slightly out. Hinge hips back, bend knees until thighs are parallel to ground, and drive back up through heels.'],
  ['Wall Push-Ups', 'Upper body control', 'Beginner', 'Chest · Arms', 'wIPJvBQs7RA', 'Stand arm-length from wall, place hands shoulder-height, lower chest toward wall with controlled tempo, then push away.'],
  ['Knee Push-Ups', 'Build pressing strength', 'Beginner', 'Chest · Triceps', 'MFfchsqssBM', 'Kneel with hands beneath shoulders, body in straight line from head to knees, lower chest to floor, then press back up.'],
  ['Standard Push-Ups', 'Full upper body power', 'Intermediate', 'Chest · Core', 'IODxDxX7oi4', 'High plank position, core braced, lower body until chest hovers an inch above floor with elbows at 45 degrees, then push up strongly.'],
  ['Lunges', 'Single-leg strength', 'Beginner', 'Glutes · Quads', 'QOVaHwm-Q6U', 'Step forward with one foot, lower hips until both knees bend at 90 degrees, keep front knee above ankle, and press back.'],
  ['Glute Bridges', 'Posterior chain activation', 'Beginner', 'Glutes · Hamstrings', 'OUgsJ8-Vi0E', 'Lie on back with knees bent, feet flat, drive through heels to elevate hips until body forms straight diagonal line from knees to shoulders.'],
  ['Plank', 'Core stability hold', 'Beginner', 'Core · Shoulders', 'pSHjTRCQxIw', 'Rest on forearms and toes, maintain flat spine from head to heels, brace core and glutes, breathing rhythmically.'],
  ['Side Plank', 'Lateral core strength', 'Intermediate', 'Obliques · Core', 'K2VljzCC16g', 'Lie on side, elbow beneath shoulder, lift hips off floor until body forms a straight line, holding core firm.'],
  ['Bird Dog', 'Balance and control', 'Beginner', 'Core · Back', 'wiFNA3sqjCA', 'On hands and knees, simultaneously reach right arm forward and left leg back until parallel to floor, pause, and return.'],
  ['Dead Bug', 'Core coordination', 'Intermediate', 'Core · Hips', 'g_BYB0R-4Ws', 'Lie on back with arms extended up and knees at 90 degrees. Lower opposite arm and leg toward floor without arching lower back.'],
  ['Jumping Jacks', 'Cardio warm-up', 'Beginner', 'Full body · Cardio', 'iSSAk4XCsRA', 'Stand tall, jump feet outward while swinging arms overhead, then jump back to starting position in continuous rhythm.'],
  ['High Knees', 'Cardio power', 'Intermediate', 'Core · Legs', '0X0Q8wKLEfo', 'Jog in place driving knees up toward chest at a quick cadence, keeping torso tall and arms pumping.'],
  ['Standing Calf Raises', 'Lower leg strength', 'Beginner', 'Calves', '-M4-G8p8fmc', 'Stand tall on balls of feet, press upward onto toes as high as possible, pause at peak contraction, and lower slowly.'],
  ['Wall Sit', 'Isometric leg hold', 'Intermediate', 'Quads · Glutes', 'y-wV4Venusw', 'Slide back down wall until thighs are parallel to ground, knees bent at 90 degrees directly above ankles, and hold.'],
  ['Mountain Climbers', 'Dynamic core cardio', 'Intermediate', 'Core · Shoulders', 'nmwgirgXLYM', 'In high plank, rapidly drive knees forward toward chest alternating legs in a running motion while maintaining flat back.'],
  ['Reverse Lunges', 'Controlled leg strength', 'Beginner', 'Glutes · Quads', 'TI2U-RfbALY', 'Step backward with one leg, bend both knees to 90 degrees, keep chest tall, then push through front heel to return.'],
  ['Biceps Curls', 'Arm strength', 'Beginner', 'Biceps', 'ykJmrZ5v0Oo', 'Stand with palms forward, keep elbows pinned at your sides, curl hands toward shoulders squeezing biceps, and lower slowly.'],
  ['Shoulder Press', 'Shoulder strength', 'Intermediate', 'Shoulders · Arms', 'qEwKCR5JCog', 'Hold weights at shoulder height with palms forward, press directly overhead until arms are extended, then return with control.'],
  ['Resistance Band Rows', 'Back strength', 'Beginner', 'Back · Biceps', 'hqFwwv6dFGY', 'Sit with legs extended, loop band around feet, pull handles toward ribcage while retracting shoulder blades, and release slowly.'],
  ['Marching in Place', 'Low-impact cardio', 'Beginner', 'Legs · Cardio', '1gQ7OjSnHTw', 'Stand tall, lift knees to hip height alternately with opposite arm swing, maintaining steady aerobic breathing.'],
  ['Deadlift Hinge', 'Hip hinge pattern', 'Intermediate', 'Glutes · Hamstrings', '2W_gXhut5S8', 'Feet hip-width, soften knees, push hips backward with neutral spine, feel stretch in hamstrings, and drive hips forward to stand.'],
  ['Tricep Dips', 'Arm strength', 'Intermediate', 'Triceps · Chest', '6kALZikXxLc', 'Hands on sturdy bench behind you, lower body by bending elbows to 90 degrees, keeping back close to bench, then press up.']
];

const getThumbnail = (youtubeId, i, type) =>
  youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : (type === 'yoga'
        ? `https://images.unsplash.com/photo-${['1544367567-0f2fcb009e0b', '1506126613408-eca07ce68773', '1518611012118-696072aa579a', '1599447421416-3414500d18a5'][i % 4]}?auto=format&fit=crop&w=900&q=82`
        : `https://images.unsplash.com/photo-${['1581009146145-b5ef050c2e1e', '1517836357463-d25dfeac3438', '1538805060514-97d9cc17730c', '1599058917212-d750089bc07e'][i % 4]}?auto=format&fit=crop&w=900&q=82`);

export const yogaExercises = yogaData.map((x, i) => ({
  id: `yoga-${i + 1}`,
  name: x[0],
  subtitle: x[1],
  category: 'Yoga',
  level: x[2],
  target: x[3],
  youtubeId: x[4],
  videoUrl: `https://www.youtube.com/embed/${x[4]}?autoplay=1&mute=1&loop=1&playlist=${x[4]}&rel=0&cc_load_policy=0&iv_load_policy=3&enablejsapi=1`,
  duration: i % 3 === 0 ? '60 sec' : '45 sec',
  image: getThumbnail(x[4], i, 'yoga'),
  thumbnail: getThumbnail(x[4], i, 'yoga'),
  tracking: true, // all exercises have live camera pose tracking
  description: x[5],
  steps: [
    'Find a steady, comfortable position facing your camera.',
    'Align your joints, lengthen your spine, and breathe rhythmically.',
    'Hold the posture with relaxed shoulders, letting the AI analyze your alignment.'
  ],
}));

export const workoutExercises = workoutData.map((x, i) => ({
  id: `workout-${i + 1}`,
  name: x[0],
  subtitle: x[1],
  category: 'Home Workout',
  level: x[2],
  target: x[3],
  youtubeId: x[4],
  videoUrl: `https://www.youtube.com/embed/${x[4]}?autoplay=1&mute=1&loop=1&playlist=${x[4]}&rel=0&cc_load_policy=0&iv_load_policy=3&enablejsapi=1`,
  duration: i % 2 === 0 ? '3 sets' : '40 sec',
  image: getThumbnail(x[4], i, 'workout'),
  thumbnail: getThumbnail(x[4], i, 'workout'),
  tracking: true,
  description: x[5],
  steps: [
    'Set up with a stable stance in clear view of the camera.',
    'Move with deliberate control through the complete range of motion.',
    'Let the rep counter count each repetition as your form reaches optimal depth.'
  ],
}));

export const allExercises = [...yogaExercises, ...workoutExercises];
