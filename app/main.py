from fastapi import FastAPI

from app.api.routes.user import router as user_router
from app.api.routes.webhook import router as webhook_router
from app.api.routes.nudges import router as nudges_router

app = FastAPI(
    title="Kyroo",
    version="1.0.0",
)

app.include_router(user_router)
app.include_router(webhook_router)
app.include_router(nudges_router)


@app.get("/")
def health():

    return {
        "status": "ok",
        "service": "kyroo",
    }