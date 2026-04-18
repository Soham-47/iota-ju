from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Question(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_role = Column(String, default="participant")
    sender_name = Column(String)
    thread_name = Column(String)
    text = Column(String)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class WorkshopState(Base):
    __tablename__ = "workshop_state"
    id = Column(Integer, primary_key=True, index=True)
    session_title = Column(String, default="Code-To-Flight: Drone Bootcamp")
    session_desc = Column(String, default="Learn drone autonomy, PID controllers, and live telemetry.")
    speaker_name = Column(String, default="IOTA Team")
    modules_completed = Column(Integer, default=0)
    total_modules = Column(Integer, default=6)
    announcements = Column(String, default="[]")
    resources = Column(String, default="[]")
    tasks = Column(String, default="[]")
    polls = Column(String, default="[]")

Base.metadata.create_all(bind=engine)

# ─── Safe Migrations ─────────────────────────────────────────────────────────
# Add columns that may be missing in older DB files (ALTER TABLE is idempotent here)
def safe_migrate():
    import sqlite3
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    migrations = [
        ("chat_messages",  "created_at",  "DATETIME"),
        ("workshop_state", "tasks",       "TEXT DEFAULT '[]'"),
        ("workshop_state", "polls",       "TEXT DEFAULT '[]'"),
    ]
    for table, col, col_type in migrations:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            conn.commit()
            print(f"[DB Migration] Added '{col}' to '{table}'")
        except Exception:
            pass  # Column already exists
    conn.close()

safe_migrate()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
