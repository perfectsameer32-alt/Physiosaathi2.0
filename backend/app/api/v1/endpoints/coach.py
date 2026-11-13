from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.coach import AssistantRequest
from app.services.coach_service import CoachService

router = APIRouter(tags=["AI Coach"])

@router.post("/assistant")
async def fitness_assistant(input_data: AssistantRequest):
    return StreamingResponse(
        CoachService.stream_coach_response(input_data.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

