from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn
import json
import time
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from collections import defaultdict
from sqlalchemy.orm import Session

# Load environment variables
load_dotenv()

from database import get_db, User, Question, WorkshopState, SessionLocal
import auth

app = FastAPI()
bearer_scheme = HTTPBearer(auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate Limiting ────────────────────────────────────────────────────────────
_rate_store: dict[str, list] = defaultdict(list)
_last_private_msg: dict[str, float] = {}
_last_public_msg: dict[str, float] = {}
MSG_COOLDOWN_PRIVATE = 300  # 5 minutes
MSG_COOLDOWN_PUBLIC  = 30   # 30 seconds

# ─── In-Memory Event Stores ───────────────────────────────────────────────────
# poll_votes: {poll_id: {"question": str, "results": {option: count}, "voters": {email: {name, option}}}}
poll_votes: dict[str, dict] = {}
# task_submissions: {task_id: [{name, text, ts}]}
task_submissions: dict[str, list] = {}

# ─── Auth & Security ──────────────────────────────────────────────────────────
ORGANIZER_PASSWORD = os.getenv("ORGANIZER_PASSWORD", "iota-organizer-2026")

class OrgLogin(BaseModel):
    password: str

@app.post("/organizer_login")
def organizer_login(data: OrgLogin):
    if data.password == ORGANIZER_PASSWORD:
        # For this workshop, we use a static but hard-to-guess token
        return {"status": "success", "token": "iota_org_v1_secure_session_2026"}
    raise HTTPException(status_code=401, detail="Invalid organizer password.")

def rate_limit(request: Request, max_calls: int = 20, window_sec: int = 60):
    ip = request.client.host
    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < window_sec]
    if len(_rate_store[ip]) >= max_calls:
        raise HTTPException(status_code=429, detail="Too many requests. Slow down.")
    _rate_store[ip].append(now)

def fmt_ts(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

def q_to_dict(q):
    return {
        "type": "message",
        "id": q.id,
        "role": q.sender_role,
        "name": q.sender_name,
        "thread": q.thread_name,
        "text": q.text,
        "is_public": q.is_public,
        "created_at": fmt_ts(q.created_at)
    }

# ─── REST Endpoints ───────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "IOTA Drone Workshop API v2"}

@app.get("/state")
def get_workshop_state(db: Session = Depends(get_db)):
    state = db.query(WorkshopState).first()
    if not state:
        state = WorkshopState()
        db.add(state)
        db.commit()
        db.refresh(state)
    return {
        "session_title": state.session_title,
        "session_desc": state.session_desc,
        "speaker_name": state.speaker_name,
        "modules_completed": state.modules_completed,
        "total_modules": state.total_modules,
        "announcements": json.loads(state.announcements),
        "resources": json.loads(state.resources),
        "tasks": json.loads(state.tasks) if state.tasks else [],
        "polls": json.loads(state.polls) if state.polls else []
    }

@app.get("/messages")
def get_messages(user: str = "", db: Session = Depends(get_db)):
    """Polling endpoint - returns all messages visible to this user."""
    msgs = db.query(Question).order_by(Question.id.asc()).all()
    return [q_to_dict(q) for q in msgs if q.is_public or q.thread_name == user or q.thread_name == "Global"]

@app.get("/organizer_messages")
def get_organizer_messages(db: Session = Depends(get_db)):
    """Polling endpoint for organizer - returns ALL messages."""
    msgs = db.query(Question).order_by(Question.id.asc()).all()
    return [q_to_dict(q) for q in msgs]

VALID_ORGANIZERS = ["soham saha", "soumojeet pan"]

class EditMessagePayload(BaseModel):
    text: str

class DeleteMessagePayload(BaseModel):
    org_name: str = ""

class PatchStatePayload(BaseModel):
    key: str  # "tasks" | "polls" | "resources" | "announcements"
    value: list

@app.delete("/messages/{msg_id}")
async def delete_message(
    msg_id: int,
    org_name: str = "",
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    msg = db.query(Question).filter(Question.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    is_org = org_name.lower().strip() in VALID_ORGANIZERS

    if not is_org:
        if not email:
            raise HTTPException(status_code=401, detail="Unauthorized")
        user = db.query(User).filter(User.email == email).first()
        if not user or msg.sender_name != user.name:
            raise HTTPException(status_code=403, detail="Cannot delete others' messages")

    db.delete(msg)
    db.commit()
    await manager.broadcast({"type": "message_deleted", "id": msg_id})
    return {"status": "deleted"}

@app.patch("/messages/{msg_id}")
async def edit_message(
    msg_id: int,
    payload: EditMessagePayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    msg = db.query(Question).filter(Question.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or msg.sender_name != user.name:
        raise HTTPException(status_code=403, detail="Cannot edit others' messages")

    msg.text = payload.text
    db.commit()
    updated = q_to_dict(msg)
    updated["type"] = "message_edited"
    await manager.broadcast(updated)
    return {"status": "edited"}

@app.patch("/state")
async def patch_state(
    payload: PatchStatePayload,
    org_name: str = "",
    db: Session = Depends(get_db)
):
    """REST endpoint for organizer to update state arrays (tasks, polls, resources, announcements)."""
    if org_name.lower().strip() not in VALID_ORGANIZERS:
        raise HTTPException(status_code=403, detail="Not an organizer")
    allowed = {"tasks", "polls", "resources", "announcements"}
    if payload.key not in allowed:
        raise HTTPException(status_code=400, detail="Invalid state key")

    state = db.query(WorkshopState).first()
    if not state:
        state = WorkshopState(); db.add(state); db.commit(); db.refresh(state)

    setattr(state, payload.key, json.dumps(payload.value))
    db.commit()

    await manager.broadcast({
        "type": "state_update",
        payload.key: payload.value
    })
    return {"status": "updated", "key": payload.key}

class SendMessagePayload(BaseModel):
    text: str
    is_public: bool = False

@app.post("/send_message")
async def send_message_rest(
    request: Request,
    payload: SendMessagePayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    rate_limit(request, max_calls=10, window_sec=60)

    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Enforce cooldown: private=5min, public=30sec
    now = time.time()
    if payload.is_public:
        last = _last_public_msg.get(email, 0)
        remaining = MSG_COOLDOWN_PUBLIC - (now - last)
        cooldown_total = MSG_COOLDOWN_PUBLIC
    else:
        last = _last_private_msg.get(email, 0)
        remaining = MSG_COOLDOWN_PRIVATE - (now - last)
        cooldown_total = MSG_COOLDOWN_PRIVATE

    if remaining > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Cooldown active. Wait {int(remaining)} more seconds."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_q = Question(
        sender_role="participant",
        sender_name=user.name,
        thread_name=user.name,
        text=payload.text,
        is_public=payload.is_public
    )
    db.add(new_q)
    db.commit()

    if payload.is_public:
        _last_public_msg[email] = now
    else:
        _last_private_msg[email] = now

    msg_payload = q_to_dict(new_q)
    await manager.broadcast(msg_payload)
    return {"status": "sent", "id": new_q.id}

@app.post("/signup")
def signup(request: Request, user: auth.UserCreate, db: Session = Depends(get_db)):
    rate_limit(request, max_calls=5, window_sec=60)
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "name": new_user.name}

@app.post("/login")
def login(request: Request, user: auth.UserLogin, db: Session = Depends(get_db)):
    rate_limit(request, max_calls=10, window_sec=60)
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "name": db_user.name}

@app.get("/cooldown")
def get_cooldown(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """Returns seconds remaining in cooldown for privates (5min) and public (30s)."""
    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    if not email:
        return {"remaining": 0, "total": MSG_COOLDOWN_PRIVATE}
    now = time.time()
    private_remaining = max(0, MSG_COOLDOWN_PRIVATE - (now - _last_private_msg.get(email, 0)))
    public_remaining  = max(0, MSG_COOLDOWN_PUBLIC  - (now - _last_public_msg.get(email, 0)))
    # Return the private cooldown as primary (more restrictive)
    return {
        "remaining": int(private_remaining),
        "total": MSG_COOLDOWN_PRIVATE,
        "public_remaining": int(public_remaining),
        "public_total": MSG_COOLDOWN_PUBLIC
    }

# ─── Poll Voting ──────────────────────────────────────────────────────────────

class PollVotePayload(BaseModel):
    poll_id: str
    question: str
    option: str

@app.post("/poll_vote")
async def submit_poll_vote(
    payload: PollVotePayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pid = payload.poll_id
    if pid not in poll_votes:
        poll_votes[pid] = {"question": payload.question, "results": {}, "voters": {}}

    # Prevent double-voting
    if email in poll_votes[pid]["voters"]:
        raise HTTPException(status_code=409, detail="Already voted")

    poll_votes[pid]["voters"][email] = {"name": user.name, "option": payload.option}
    poll_votes[pid]["results"][payload.option] = poll_votes[pid]["results"].get(payload.option, 0) + 1

    results = poll_votes[pid]["results"]
    total_votes = sum(results.values())

    # Broadcast live results to organizer
    await manager.broadcast({
        "type": "poll_result_update",
        "poll_id": pid,
        "question": payload.question,
        "results": results,
        "total_votes": total_votes,
        "voter": user.name,
        "option": payload.option,
        "all_voters": poll_votes[pid]["voters"]
    })
    return {"status": "voted", "results": results}

@app.get("/poll_results")
def get_poll_results():
    return {pid: {
                "question": v["question"], 
                "results": v["results"], 
                "total_votes": sum(v["results"].values()),
                "voters": v["voters"]
            } for pid, v in poll_votes.items()}

# ─── Task Submissions ─────────────────────────────────────────────────────────

class TaskSubmitPayload(BaseModel):
    task_id: str
    task_title: str
    text: str

@app.post("/task_submit")
async def submit_task(
    payload: TaskSubmitPayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    token_str = credentials.credentials if credentials else None
    email = auth.decode_token(token_str) if token_str else None
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    submission = {
        "name": user.name,
        "text": payload.text,
        "ts": fmt_ts(datetime.now(timezone.utc))
    }
    if payload.task_id not in task_submissions:
        task_submissions[payload.task_id] = []
    task_submissions[payload.task_id].append(submission)

    # Broadcast to organizer
    await manager.broadcast({
        "type": "task_submission",
        "task_id": payload.task_id,
        "task_title": payload.task_title,
        "submission": submission
    })
    return {"status": "submitted"}

@app.get("/task_submissions")
def get_task_submissions_endpoint():
    return task_submissions

# ─── WebSocket Connection Manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.participants: dict[WebSocket, str] = {}
        self.organizers: dict[WebSocket, str] = {}

    async def connect_participant(self, websocket: WebSocket, name: str):
        await websocket.accept()
        self.participants[websocket] = name

    def disconnect_participant(self, websocket: WebSocket):
        self.participants.pop(websocket, None)

    async def connect_organizer(self, websocket: WebSocket, name: str = "Host"):
        await websocket.accept()
        self.organizers[websocket] = name

    def disconnect_organizer(self, websocket: WebSocket):
        self.organizers.pop(websocket, None)

    def update_organizer_name(self, websocket: WebSocket, name: str):
        if websocket in self.organizers:
            self.organizers[websocket] = name

    async def broadcast_stats(self):
        await self.broadcast({
            "type": "stats_update",
            "participants": len(self.participants),
            "organizers": len(self.organizers),
            "participant_names": list(self.participants.values()),
            "organizer_names": list(self.organizers.values())
        })

    async def broadcast(self, message_dict: dict):
        message_str = json.dumps(message_dict, default=str)
        all_conns = list(self.participants.keys()) + list(self.organizers.keys())
        for connection in all_conns:
            try:
                await connection.send_text(message_str)
            except Exception:
                pass

manager = ConnectionManager()

# ─── WebSocket: Participant ────────────────────────────────────────────────────

@app.websocket("/ws/participant")
async def websocket_participant(websocket: WebSocket, token: str = None):
    email = auth.decode_token(token)
    if not email:
        await websocket.accept()
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid session. Please login again."}))
        await websocket.close(code=1008); return
    
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            await websocket.accept(); await websocket.close(code=1008); return

        await websocket.accept()
        await manager.connect_participant(websocket, user.name)
        await manager.broadcast_stats()

        # Send current state & history (Scoped)
        state = db.query(WorkshopState).first()
        if not state:
            state = WorkshopState(); db.add(state); db.commit(); db.refresh(state)

        await websocket.send_text(json.dumps({
            "type": "state_update",
            "session_title": state.session_title,
            "session_desc": state.session_desc,
            "speaker_name": state.speaker_name,
            "modules_completed": state.modules_completed,
            "total_modules": state.total_modules,
            "announcements": json.loads(state.announcements),
            "resources": json.loads(state.resources),
            "tasks": json.loads(state.tasks) if state.tasks else [],
            "polls": json.loads(state.polls) if state.polls else []
        }))

        history = db.query(Question).order_by(Question.id.asc()).all()
        for q in history:
            if q.is_public or q.thread_name == user.name:
                await websocket.send_text(json.dumps(q_to_dict(q)))

    # Cooldown info
    now = time.time()
    priv_rem = max(0, MSG_COOLDOWN_PRIVATE - (now - _last_private_msg.get(email, 0)))
    pub_rem  = max(0, MSG_COOLDOWN_PUBLIC  - (now - _last_public_msg.get(email, 0)))
    await websocket.send_text(json.dumps({
        "type": "cooldown_update",
        "remaining": int(priv_rem), "total": MSG_COOLDOWN_PRIVATE,
        "public_remaining": int(pub_rem), "public_total": MSG_COOLDOWN_PUBLIC
    }))

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "question":
                    is_pub = data.get("is_public", False)
                    now = time.time()

                    # Check appropriate cooldown
                    if is_pub:
                        last = _last_public_msg.get(email, 0)
                        remaining = MSG_COOLDOWN_PUBLIC - (now - last)
                        total = MSG_COOLDOWN_PUBLIC
                    else:
                        last = _last_private_msg.get(email, 0)
                        remaining = MSG_COOLDOWN_PRIVATE - (now - last)
                        total = MSG_COOLDOWN_PRIVATE

                    if remaining > 0:
                        await websocket.send_text(json.dumps({
                            "type": "cooldown_update", "remaining": int(remaining), "total": total
                        }))
                        continue

                    # Open fresh session for storage
                    with SessionLocal() as db:
                        user = db.query(User).filter(User.email == email).first()
                        new_q = Question(
                            sender_role="participant", sender_name=user.name,
                            thread_name=user.name, text=data.get("text"), is_public=is_pub
                        )
                        db.add(new_q); db.commit()
                        msg_data = q_to_dict(new_q) # Convert to dict while session is active

                    if is_pub:
                        _last_public_msg[email] = time.time()
                    else:
                        _last_private_msg[email] = time.time()

                    await manager.broadcast(msg_data)
                    await websocket.send_text(json.dumps({
                        "type": "cooldown_update", "remaining": total, "total": total
                    }))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Participant Error: {e}")
    finally:
        manager.disconnect_participant(websocket)
        try: await manager.broadcast_stats()
        except: pass

# ─── WebSocket: Organizer ──────────────────────────────────────────────────────

@app.websocket("/ws/organizer")
async def websocket_organizer(websocket: WebSocket, token: str = None):
    # Strict token verification
    if token != "iota_org_v1_secure_session_2026":
        await websocket.accept()
        await websocket.send_text(json.dumps({"type": "error", "message": "Unauthorized organizer session."}))
        await websocket.close(code=1008)
        return

    try:
        await manager.connect_organizer(websocket)
        await manager.broadcast_stats()

        # Initial state/history fetch (Scoped)
        with SessionLocal() as db:
            state = db.query(WorkshopState).first()
            if not state:
                state = WorkshopState(); db.add(state); db.commit(); db.refresh(state)

            await websocket.send_text(json.dumps({
                "type": "state_update",
                "session_title": state.session_title,
                "session_desc": state.session_desc,
                "speaker_name": state.speaker_name,
                "modules_completed": state.modules_completed,
                "total_modules": state.total_modules,
                "announcements": json.loads(state.announcements),
                "resources": json.loads(state.resources),
                "tasks": json.loads(state.tasks) if state.tasks else [],
                "polls": json.loads(state.polls) if state.polls else []
            }))

            history = db.query(Question).order_by(Question.id.asc()).all()
            for q in history:
                await websocket.send_text(json.dumps(q_to_dict(q)))

        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "reply":
                    thread = data.get("thread", "Global")
                    text = data.get("text")
                    is_pub = True if thread == "Global" else data.get("is_public", False)
                    name = data.get("name", "Organizer")
                    
                    with SessionLocal() as db:
                        new_q = Question(
                            sender_role="organizer", sender_name=name,
                            thread_name=thread, text=text, is_public=is_pub
                        )
                        db.add(new_q); db.commit()
                        msg_data = q_to_dict(new_q)
                    await manager.broadcast(msg_data)

                elif data.get("type") == "update_state":
                    with SessionLocal() as db:
                        state = db.query(WorkshopState).first()
                        if not state:
                            state = WorkshopState(); db.add(state)
                        if "session_title" in data: state.session_title = data["session_title"]
                        if "session_desc" in data: state.session_desc = data["session_desc"]
                        if "speaker_name" in data: state.speaker_name = data["speaker_name"]
                        if "modules_completed" in data: state.modules_completed = int(data["modules_completed"])
                        if "total_modules" in data: state.total_modules = int(data["total_modules"])
                        if "announcements" in data: state.announcements = json.dumps(data["announcements"])
                        if "resources" in data: state.resources = json.dumps(data["resources"])
                        if "tasks" in data: state.tasks = json.dumps(data["tasks"])
                        if "polls" in data: state.polls = json.dumps(data["polls"])
                        db.commit()
                        
                        updated_state = {
                            "type": "state_update",
                            "session_title": state.session_title,
                            "session_desc": state.session_desc,
                            "speaker_name": state.speaker_name,
                            "modules_completed": state.modules_completed,
                            "total_modules": state.total_modules,
                            "announcements": json.loads(state.announcements),
                            "resources": json.loads(state.resources),
                            "tasks": json.loads(state.tasks) if state.tasks else [],
                            "polls": json.loads(state.polls) if state.polls else []
                        }
                    await manager.broadcast(updated_state)

                elif data.get("type") == "ident":
                    name = data.get("name", "Host")
                    manager.update_organizer_name(websocket, name)
                    await manager.broadcast_stats()

                elif data.get("type") == "notification":
                    await manager.broadcast({
                        "type": "notification",
                        "title": data.get("title", "Update"),
                        "message": data.get("message", "")
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Organizer WS Error: {e}")
    finally:
        manager.disconnect_organizer(websocket)
        try: await manager.broadcast_stats()
        except: pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)