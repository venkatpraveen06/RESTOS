from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from .database import engine, Base, get_db
from . import models, schemas, auth

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RestaurantOS API",
    description="The Complete AI-Powered Restaurant Management Platform REST API",
    version="1.0.0"
)

# Enable CORS for cross-origin frontend support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "RestaurantOS Enterprise Platform", "version": "1.0.0"}

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(email: str, password: str, db: Session = Depends(get_db)):
    if email == "admin@restaurantos.demo" and password == "admin123":
        token = auth.create_access_token({"sub": email, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "user_name": "Restaurant Admin", "role": "admin"}
    elif email == "kitchen@restaurantos.demo" and password == "kitchen123":
        token = auth.create_access_token({"sub": email, "role": "kitchen"})
        return {"access_token": token, "token_type": "bearer", "user_name": "Head Chef", "role": "kitchen"}
    else:
        # Default demo login for any user
        token = auth.create_access_token({"sub": email, "role": "customer"})
        return {"access_token": token, "token_type": "bearer", "user_name": email.split("@")[0].title(), "role": "customer"}

@app.get("/api/menu", response_model=list[schemas.MenuItemResponse])
def get_menu(db: Session = Depends(get_db)):
    items = db.query(models.MenuItem).all()
    return items

@app.post("/api/menu", response_model=schemas.MenuItemResponse)
def create_menu_item(item: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    db_item = models.MenuItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/api/orders", response_model=list[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    return orders

# --- Static File Serving & SPA Route Handler ---
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Mount css, js, images directories
if os.path.exists(os.path.join(parent_dir, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(parent_dir, "css")), name="css")
if os.path.exists(os.path.join(parent_dir, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(parent_dir, "js")), name="js")
if os.path.exists(os.path.join(parent_dir, "images")):
    app.mount("/images", StaticFiles(directory=os.path.join(parent_dir, "images")), name="images")

@app.get("/")
def read_root():
    index_path = os.path.join(parent_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "RestaurantOS Backend API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
