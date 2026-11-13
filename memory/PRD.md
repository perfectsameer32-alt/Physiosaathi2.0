Pysiosaathi Product Requirements Document
Original problem statement
Build Pysiosaathi, an AI-powered personal fitness companion with yoga and home workouts, camera-based movement guidance, exercise demonstrations, voice assistance, progress tracking, plans, multilingual support, Supabase authentication/database readiness, and a safe fitness AI assistant. The supplied Fitoozone screenshot is the visual reference. The user requested a complete first release and at least 20 yoga plus 20 home workout exercises.

Architecture decisions
React 19 with CRA/Craco runtime, React Router, Recharts-ready styling, lucide-react icons, and responsive CSS.
FastAPI remains the server boundary on port 8001 with resilient optional MongoDB and Gemini LLM streaming with local Coach Nova fallback.
Supabase client is configured through public frontend environment values; auth actions never expose a service key and include a preview-safe unavailable state.
Gemini 3 Flash / Coach Nova intelligence stream with comprehensive technique knowledge and medical disclaimer.
Exercise catalog is local, structured seed content for 22 yoga and 22 home-workout movements; completed records persisted to local storage.
Camera mode uses browser getUserMedia, optical/kinematic skeleton tracking on canvas, joint angle calculations (squat, pushup, bicep curl, plank, balance poses), real-time rep counting, voice coaching cues, and cleanup on unmount.
User personas
A busy beginner who wants an encouraging, low-friction home routine.
A college-hackathon demo user evaluating polished AI fitness product flows.
A returning fitness user who wants quick access to movement libraries, session history, and weekly structure.
Core requirements
Dark premium athletic interface inspired by the supplied reference.
Dashboard, Yoga, Home Workout, Workout Plans, Progress, AI Assistant, Profile, Settings, Onboarding, and Auth routes.
22 yoga and 22 home workout entries with images, difficulty, targets, duration, instructions, precautions, and tracking flags.
Interactive animated demonstration guide, camera permission flow, live pose tracking skeleton on canvas, joint angle telemetry HUD, voice guidance, rep counting, and session completion action.
Responsive desktop sidebar and mobile navigation (including mobile bottom bar).
Full multi-language support (English, Hindi, Kannada, Telugu, Bengali) and accessible critical-flow test IDs.
General fitness safety language; no medical diagnosis, rehabilitation, or safety guarantees.

What's been implemented
2026-11-06 (Initial Build)
Replaced the starter splash with the Pysiosaathi product shell and reference-inspired navy, violet, teal, and lime visual system.
Added dashboard with recommendation hero, activity stats, movement categories, weekly rhythm chart, and recent movement list.
Added 22 yoga and 22 home-workout catalog entries with searchable responsive grids.
Added workout detail mode with side-by-side demonstration and camera surfaces, camera permission handling, cleanup, voice guidance, feedback states, coaching cues, and completion navigation.
Added Supabase-ready Auth route with sign in, sign up, preview-safe configuration messaging, and public-key-only client setup.
Added streamed Gemini fitness assistant endpoint with safety instructions, error state, and responsive chat UI.

2026-11-13 (Full Completion)
Built complete multi-step Onboarding flow (/onboarding) with fitness goals, level selection, training focus, weekly commitment, physical biometrics (height, weight, age, target weight, BMI calculation), and tailored plan generation.
Built comprehensive User Profile (/profile) with athlete biometrics, live BMI meter, editable physical metrics, training commitment cards, 6 collectible fitness achievement badges (unlocked/locked status), and sign-out action.
Built full Settings view (/settings) with instant 5-language switcher (English, Hindi, Kannada, Telugu, Bengali), voice coach controls (audio on/off, speech rate, rep chime, form guidance), camera & computer vision preferences (mirroring, skeleton overlay, joint angle HUD), data management (clear history, reset profile), and medical safety disclaimer.
Built rich, interactive Workout Plans view (/plans) with 4 structured protocols (Baseline, Strength & Core, Mindful Zen, Metabolic Burn), day-by-day routines with exercise launch links, weekly adherence tracking, and active plan setting.
Built real-time Pose Tracking engine (PoseTracker) in camera view with dynamic canvas skeleton rendering, joint angle detection (knee angle for squats, elbow angle for push-ups and bicep curls, spine alignment for planks/yoga), live rep counter, speech synthesis coaching cues, audio chimes, and live elapsed timer with pause/resume.
Built animated exercise demonstration guide (ExerciseDemo) with play/pause and anatomical form cues.
Built celebratory Finish Workout modal that calculates elapsed duration, counted reps, estimated calories, and records sessions to persistent storage.
Built dynamic Progress analytics with time filters (7d, 30d, all-time), live aggregated stats (minutes, sessions, streak), and workout history log.
Added dual-engine AI assistant with backend SSE connection and seamless Coach Nova local streaming fallback.
Completed full 5-language localization (EN, HI, KN, TE, BN) across navigation, dashboard greetings, labels, buttons, and settings.
Made backend server.py fully resilient with optional MongoDB and LLM fallbacks so it runs cleanly in any local or cloud environment.
