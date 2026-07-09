from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import users, ai, payments, whatsapp, fitness, files, reminders, tracking, reports
from scheduler import start_scheduler, stop_scheduler
import os

load_dotenv()

app = FastAPI(title="KYROO API", version="1.0.0")


@app.on_event("startup")
async def on_startup():
    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"):
        start_scheduler()
    else:
        print("[scheduler] skipped — SUPABASE_URL/SUPABASE_KEY not set")


@app.on_event("shutdown")
async def on_shutdown():
    stop_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(ai.router)
app.include_router(payments.router)
app.include_router(whatsapp.router)
app.include_router(fitness.router)
app.include_router(files.router)
app.include_router(reminders.router)
app.include_router(tracking.router)
app.include_router(reports.router)

@app.get("/")
async def root():
    return {"message": "KYROO API is alive 🔥", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0", "app": "KYROO"}