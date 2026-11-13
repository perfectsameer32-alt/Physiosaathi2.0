import asyncio
import logging
import uuid
from typing import AsyncGenerator

from app.core.config import settings

logger = logging.getLogger(__name__)

# Optional Emergent LLM integration with fallback
HAS_EMERGENT = False
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False

COACH_KNOWLEDGE = {
    "squat": (
        "Squat Form Essentials: 1. Stance shoulder-width, toes angled slightly out (15-30°). "
        "2. Hinge hips back first, then bend knees while keeping chest proud and spine neutral. "
        "3. Track knees in line with toes, avoiding inward knee collapse. "
        "4. Descend to parallel depth (hips level with knee crease) or as mobility comfortably allows. "
        "5. Drive up evenly through mid-foot and heels, exhaling at the top."
    ),
    "tadasana": (
        "Tadasana (Mountain Pose) Alignment: 1. Stand tall with big toes touching, heels slightly apart. "
        "2. Ground evenly into all four corners of each foot. "
        "3. Engage thighs, lift kneecaps, tuck tailbone slightly, and elongate your spine. "
        "4. Roll shoulders up, back, and down, letting arms rest naturally at your sides with palms forward. "
        "5. Breathe deeply into the belly, holding a steady, unhurried focal gaze."
    ),
    "tree": (
        "Vrikshasana (Tree Pose) Balance: 1. Shift weight onto your standing leg. "
        "2. Place the sole of your opposite foot on your inner calf or thigh (never directly on the knee joint). "
        "3. Press foot and thigh firmly against each other to create root stability. "
        "4. Bring hands to prayer at heart center or reach tall overhead. "
        "5. Fix your gaze on a stationary point 6 feet ahead to maintain steady equilibrium."
    ),
    "push": (
        "Push-Up Technique: 1. Place hands slightly wider than shoulder-width, fingers spread. "
        "2. Lock your plank — engage glutes and brace your core so hips do not sag or pike. "
        "3. Lower body with elbows at a 45-degree arrow shape relative to torso, not flared wide. "
        "4. Lower until chest hovers just above the floor. "
        "5. Push the ground away firmly to full arm extension without locking elbows harshly."
    ),
    "plank": (
        "Plank Alignment: 1. Body must be horizontal on the floor, forearms or hands directly under shoulders. "
        "2. Create a straight line from crown of head through hips to heels. "
        "3. Tuck tailbone slightly to engage transverse abdominis and glutes — avoid sagging hips or piking upwards. "
        "4. Breathe smoothly through the nose — avoid holding breath during holds."
    ),
    "lunge": (
        "Lunge Mechanics: 1. Step forward with proud chest and braced core. "
        "2. Lower back knee until front thigh is parallel to ground and both knees form 90° angles. "
        "3. Keep front knee tracked directly above front ankle, avoiding forward knee overhang. "
        "4. Drive firmly through front heel to return to standing position."
    ),
    "yoga": (
        "Mindful Yoga Flow Guidance: Focus on synchronizing breath (pranayama) with each transition. "
        "Never force a joint into hyperextension; honor your body's current mobility threshold. "
        "Hold foundational poses like Tadasana, Balasana (Child's Pose), and Bhujangasana (Cobra) "
        "with calm, rhythmic diaphragmatic breathing to release neural tension."
    ),
    "curl": (
        "Biceps Curl Technique: 1. Keep elbows pinned close to your torso. "
        "2. Curl upward by contracting biceps, avoiding swinging with your lower back. "
        "3. Squeeze at peak contraction at top, then lower with a slow, controlled negative eccentric phase."
    ),
    "warm": (
        "Effective 5-Minute Warm-Up: 1. Arm circles & shoulder rolls (60s). "
        "2. Cat-Cow spine articulation (60s). 3. Bodyweight hip hinges (60s). "
        "4. Gentle bodyweight squats (60s). 5. Light jumping jacks or marching in place (60s)."
    ),
    "structure": (
        "Weekly Training Rhythm: Train 3 to 4 days each week with progressive balance. "
        "Day 1: Foundational Strength & Core (Squats, Push-Ups, Planks). "
        "Day 2: Rest & Hydration or walking. "
        "Day 3: Mindful Yoga & Hip Mobility (Warrior, Tree Pose, Cobra). "
        "Day 4: Full Body Athletic Conditioning. Allow 48 hours recovery between heavy muscle groups."
    ),
}

class CoachService:
    @staticmethod
    async def stream_coach_response(user_query: str) -> AsyncGenerator[str, None]:
        key = settings.emergent_llm_key or settings.gemini_api_key
        if HAS_EMERGENT and key:
            try:
                chat = LlmChat(
                    api_key=key,
                    session_id=f"fitness-{uuid.uuid4()}",
                    system_message=("You are Coach Nova inside Pysiosaathi. Give concise, encouraging general fitness guidance. "
                                    "Explain technique and training structure, but never diagnose, prescribe rehabilitation, "
                                    "or guarantee safety. For injury, severe pain, or medical concerns advise a qualified healthcare professional.")
                ).with_model("gemini", "gemini-3-flash-preview")
                async for event in chat.stream_message(UserMessage(text=user_query)):
                    if isinstance(event, TextDelta):
                        yield f"data: {event.content.replace(chr(10), ' ')}\n\n"
                    elif isinstance(event, StreamDone):
                        break
                return
            except Exception as e:
                logger.warning("Emergent LLM stream error: %s, falling back to local coach", e)

        # Fallback expert Coach Nova response
        query = user_query.lower()
        matched_reply = None
        for kw, text in COACH_KNOWLEDGE.items():
            if kw in query:
                matched_reply = text
                break

        if not matched_reply:
            matched_reply = (
                f"Coach Nova here. For {user_query.strip()}, remember that consistency and clean movement quality "
                f"always beat intensity. Prioritize smooth breathing, keep joint alignment stacked, and build your routine "
                f"step by step. Always listen to your body and rest if you feel acute discomfort."
            )

        words = matched_reply.split()
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.03)

