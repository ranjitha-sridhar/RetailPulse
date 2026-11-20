import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .routes import dashboard, stores, inventory, recommendations, forecast, optimization
from .auth import routes as auth_routes
from .auth.dependencies import get_current_user
from .auth.database import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="RetailPulse API",
    description="Multi-store demand forecasting and intelligent inventory optimization",
    version="2.0.0",
    lifespan=lifespan
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to RetailPulse API",
        "status": "running",
        "stores_supported": ["CA_1", "CA_2", "TX_1", "WI_1"],
        "optimizer": "Google OR-Tools CP-SAT"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "stores": 4}


# Mount API routes
app.include_router(
    dashboard.router,
    prefix="/api",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    stores.router,
    prefix="/api",
    tags=["Stores"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    inventory.router,
    prefix="/api",
    tags=["Inventory"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    recommendations.router,
    prefix="/api",
    tags=["Recommendations"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    forecast.router,
    prefix="/api",
    tags=["Demand Forecasting"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    optimization.router,
    prefix="/api",
    tags=["Optimization & Analytics"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(auth_routes.router, prefix="/api")
