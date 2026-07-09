from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
import requests
import os

router = APIRouter(prefix="/fitness", tags=["fitness"])

WGER_BASE = "https://wger.de/api/v2"

class LogWorkoutRequest(BaseModel):
    user_id: str
    exercise: str
    sets: int = 3
    reps: int = 10
    duration_mins: int = 0
    calories: int = 0

class GetPlanRequest(BaseModel):
    user_id: str
    goal: str = ""
    level: str = ""

# Get exercises from Wger
def get_exercises(muscle: str = "", difficulty: str = "") -> list:
    try:
        params = {
            "format": "json",
            "language": 2,  # English
            "limit": 10
        }
        if muscle:
            params["muscles"] = muscle
            
        response = requests.get(
            f"{WGER_BASE}/exercise/",
            params=params,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            exercises = []
            for ex in data.get("results", []):
                if ex.get("name"):
                    exercises.append(ex["name"])
            return exercises
    except:
        pass
    
    # Fallback exercises if API fails
    return [
        "Push ups", "Squats", "Lunges",
        "Plank", "Burpees", "Mountain climbers",
        "Jumping jacks", "High knees"
    ]

# Generate workout plan based on user profile
def generate_workout_plan(user: dict) -> dict:
    level = user.get("fitness_level", "").lower()
    goal = user.get("fitness_goal", "").lower()
    
    # Determine difficulty
    if "couch" in level or "light" in level:
        difficulty = "beginner"
        sets = 2
        reps = 10
        rest = "60 seconds"
    elif "moderate" in level or "active" in level:
        difficulty = "intermediate"
        sets = 3
        reps = 12
        rest = "45 seconds"
    else:
        difficulty = "advanced"
        sets = 4
        reps = 15
        rest = "30 seconds"
    
    # Get exercises from Wger
    exercises = get_exercises()
    
    # Build plan based on goal
    if "weight" in goal or "lose" in goal:
        plan_type = "Fat Burn Circuit"
        workout = [
            {"exercise": "Jumping Jacks", "sets": sets, "reps": 30, "type": "cardio"},
            {"exercise": "Squats", "sets": sets, "reps": reps, "type": "strength"},
            {"exercise": "Push Ups", "sets": sets, "reps": reps, "type": "strength"},
            {"exercise": "Mountain Climbers", "sets": sets, "reps": 20, "type": "cardio"},
            {"exercise": "Plank", "sets": sets, "reps": 0, "duration": "45 sec", "type": "core"},
            {"exercise": "Burpees", "sets": sets, "reps": 10, "type": "cardio"},
        ]
    elif "muscle" in goal or "build" in goal:
        plan_type = "Muscle Building"
        workout = [
            {"exercise": "Push Ups", "sets": sets, "reps": reps, "type": "chest"},
            {"exercise": "Squats", "sets": sets, "reps": reps, "type": "legs"},
            {"exercise": "Lunges", "sets": sets, "reps": reps, "type": "legs"},
            {"exercise": "Plank", "sets": sets, "reps": 0, "duration": "60 sec", "type": "core"},
            {"exercise": "Tricep Dips", "sets": sets, "reps": reps, "type": "arms"},
            {"exercise": "Glute Bridge", "sets": sets, "reps": reps, "type": "glutes"},
        ]
    else:
        plan_type = "General Fitness"
        workout = [
            {"exercise": "Warm up walk", "sets": 1, "reps": 0, "duration": "5 min", "type": "warmup"},
            {"exercise": "Squats", "sets": sets, "reps": reps, "type": "legs"},
            {"exercise": "Push Ups", "sets": sets, "reps": reps, "type": "chest"},
            {"exercise": "Plank", "sets": sets, "reps": 0, "duration": "45 sec", "type": "core"},
            {"exercise": "Jumping Jacks", "sets": sets, "reps": 30, "type": "cardio"},
            {"exercise": "Cool down stretch", "sets": 1, "reps": 0, "duration": "5 min", "type": "cooldown"},
        ]
    
    return {
        "plan_type": plan_type,
        "difficulty": difficulty,
        "rest_between_sets": rest,
        "estimated_duration": "30-45 minutes",
        "workout": workout
    }

@router.post("/plan")
async def get_workout_plan(req: GetPlanRequest):
    db = get_db()
    user_data = db.table("users").select("*").eq("id", req.user_id).execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_data.data[0]
    plan = generate_workout_plan(user)
    
    return {
        "user": user.get("name"),
        "plan": plan,
        "status": "success"
    }

@router.post("/log")
async def log_workout(req: LogWorkoutRequest):
    db = get_db()
    user_data = db.table("users").select("*").eq("id", req.user_id).execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Save workout log to chat history
    log_message = f"Workout logged: {req.exercise} - {req.sets} sets x {req.reps} reps"
    if req.duration_mins:
        log_message += f" ({req.duration_mins} mins)"
    if req.calories:
        log_message += f" ~{req.calories} calories"
    
    db.table("chat_history").insert({
        "user_id": req.user_id,
        "user_message": log_message,
        "kiro_response": "Workout logged! 💪",
        "module": "fitness"
    }).execute()
    
    return {
        "message": f"Workout logged! 💪",
        "exercise": req.exercise,
        "sets": req.sets,
        "reps": req.reps,
        "status": "success"
    }

@router.get("/exercises")
async def get_exercise_list(muscle: str = "", difficulty: str = ""):
    exercises = get_exercises(muscle, difficulty)
    return {
        "exercises": exercises,
        "count": len(exercises),
        "status": "success"
    }

@router.get("/weekly-summary/{user_id}")
async def weekly_fitness_summary(user_id: str):
    db = get_db()
    
    # Get last 7 days of fitness logs
    logs = db.table("chat_history").select("*").eq(
        "user_id", user_id
    ).eq(
        "module", "fitness"
    ).limit(20).execute()
    
    workouts = [l for l in logs.data if "Workout logged" in l.get("user_message", "")]
    
    return {
        "workouts_this_week": len(workouts),
        "logs": workouts,
        "status": "success"
    }