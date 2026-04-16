from fastapi import FastAPI, WebSocket, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session

# Import our database and auth modules
from database import get_db, User, Question, SessionLocal
import auth

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to IOTA JU Backend API"}

@app.post("/signup")
def signup(user: auth.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Authenticate immediately upon signup
    token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "name": new_user.name}

@app.post("/login")
def login(user: auth.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "name": db_user.name}


import json


class ConnectionManager:
    def __init__(self):
        self.participants: list[WebSocket] = []
        self.organizers: list[WebSocket] = []

    async def connect_participant(self, websocket: WebSocket):
        await websocket.accept()
        self.participants.append(websocket)

    def disconnect_participant(self, websocket: WebSocket):
        if websocket in self.participants:
            self.participants.remove(websocket)

    async def connect_organizer(self, websocket: WebSocket):
        await websocket.accept()
        self.organizers.append(websocket)

    def disconnect_organizer(self, websocket: WebSocket):
        if websocket in self.organizers:
            self.organizers.remove(websocket)

    async def broadcast_stats(self):
        await self.broadcast({
            "type": "stats_update",
            "participants": len(self.participants),
            "organizers": len(self.organizers)
        })

    async def broadcast(self, message_dict: dict):
        message_str = json.dumps(message_dict)
        for connection in self.participants + self.organizers:
            try:
                await connection.send_text(message_str)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/participant")
async def websocket_participant(websocket: WebSocket, token: str = None):
    db: Session = SessionLocal()
    try:
        # 1. Verify the JWT token
        email = auth.decode_token(token) if token else None
        if not email:
            await websocket.accept()
            await websocket.send_text(json.dumps({"type": "system", "text": "Authentication Failed."}))
            await websocket.close()
            return

        user = db.query(User).filter(User.email == email).first()
        if not user:
            await websocket.accept()
            await websocket.send_text(json.dumps({"type": "system", "text": "User not found."}))
            await websocket.close()
            return

        await manager.connect_participant(websocket)
        await manager.broadcast_stats()
        
        # Send current state
        state = db.query(WorkshopState).first()
        if not state:
            state = WorkshopState()
            db.add(state)
            db.commit()
            db.refresh(state)

        await websocket.send_text(json.dumps({
            "type": "state_update",
            "session_title": state.session_title,
            "session_desc": state.session_desc,
            "speaker_name": state.speaker_name,
            "modules_completed": state.modules_completed,
            "total_modules": state.total_modules,
            "announcements": json.loads(state.announcements),
            "resources": json.loads(state.resources)
        }))
        
        # Send history
        history = db.query(Question).order_by(Question.id.asc()).all()
        for q in history:
            await websocket.send_text(json.dumps({
                "type": "message",
                "role": "participant",
                "id": q.id,
                "name": q.sender_name,
                "text": q.text
            }))
            if q.reply:
                await websocket.send_text(json.dumps({
                    "type": "message",
                    "role": "organizer",
                    "name": "Organizer",
                    "text": q.reply
                }))

        # ... (history sent above)
        # Removed connection system message as requested


        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "question":
                    # Save to DB
                    new_q = Question(sender_name=user.name, text=data.get("text"))
                    db.add(new_q)
                    db.commit()
                    
                    payload = {
                        "type": "message",
                        "role": "participant",
                        "id": new_q.id,
                        "name": user.name,
                        "text": data.get("text")
                    }
                    await manager.broadcast(payload)
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"WS Error: {e}")
    finally:
        manager.disconnect_participant(websocket)
        try:
            await manager.broadcast_stats()
        except:
            pass
        db.close()

@app.websocket("/ws/organizer")
async def websocket_organizer(websocket: WebSocket):
    db: Session = SessionLocal()
    try:
        await manager.connect_organizer(websocket)
        await manager.broadcast_stats()
        
        # Send current state
        state = db.query(WorkshopState).first()
        if not state:
            state = WorkshopState()
            db.add(state)
            db.commit()
            db.refresh(state)

        await websocket.send_text(json.dumps({
            "type": "state_update",
            "session_title": state.session_title,
            "session_desc": state.session_desc,
            "speaker_name": state.speaker_name,
            "modules_completed": state.modules_completed,
            "total_modules": state.total_modules,
            "announcements": json.loads(state.announcements),
            "resources": json.loads(state.resources)
        }))
        
        # Send history to organizer too
        history = db.query(Question).order_by(Question.id.asc()).all()
        for q in history:
            await websocket.send_text(json.dumps({
                "type": "message",
                "role": "participant",
                "id": q.id,
                "name": q.sender_name,
                "text": q.text,
                "reply": q.reply
            }))

        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "reply":
                    q_id = data.get("question_id")
                    text = data.get("text")
                    
                    # Update in DB
                    db_q = db.query(Question).filter(Question.id == q_id).first()
                    if db_q:
                        db_q.reply = text
                        db.commit()
                    
                    payload = {
                        "type": "message",
                        "role": "organizer",
                        "name": "Organizer",
                        "text": text,
                        "question_id": q_id
                    }
                    await manager.broadcast(payload)
                elif data.get("type") == "update_state":
                    state = db.query(WorkshopState).first()
                    if not state:
                        state = WorkshopState()
                        db.add(state)
                    
                    if "session_title" in data: state.session_title = data["session_title"]
                    if "session_desc" in data: state.session_desc = data["session_desc"]
                    if "speaker_name" in data: state.speaker_name = data["speaker_name"]
                    if "modules_completed" in data: state.modules_completed = int(data["modules_completed"])
                    if "total_modules" in data: state.total_modules = int(data["total_modules"])
                    if "announcements" in data: state.announcements = json.dumps(data["announcements"])
                    if "resources" in data: state.resources = json.dumps(data["resources"])
                    
                    db.commit()
                    
                    # Broadcast new state
                    await manager.broadcast({
                        "type": "state_update",
                        "session_title": state.session_title,
                        "session_desc": state.session_desc,
                        "speaker_name": state.speaker_name,
                        "modules_completed": state.modules_completed,
                        "total_modules": state.total_modules,
                        "announcements": json.loads(state.announcements),
                        "resources": json.loads(state.resources)
                    })
            except json.JSONDecodeError:
                pass

    except Exception as e:
        print(f"Organizer WS Error: {e}")
    finally:
        manager.disconnect_organizer(websocket)
        try:
            await manager.broadcast_stats()
        except:
            pass
        db.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)