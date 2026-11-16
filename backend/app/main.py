
from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from .routes import dashboard, stores, inventory, recommendations
from .auth import routes as auth_routes
from .auth.dependencies import get_current_user
from .routes import forecast


app = FastAPI(
    title="RetailPulse API",
    description="Multi-store demand forecasting and inventory optimization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Welcome to RetailPulse API",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

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
app.include_router(auth_routes.router, prefix="/api")
app.include_router(
    forecast.router,
    prefix="/api",
    tags=["Demand Forecasting"],
    dependencies=[Depends(get_current_user)]
)