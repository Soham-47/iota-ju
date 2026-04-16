from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# We use SQLite for quick local development
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    sender_name = Column(String)
    text = Column(String)
    reply = Column(String, nullable=True)
    timestamp = Column(String) # For simplicity, storing as string or just use id for order

class WorkshopState(Base):
    __tablename__ = "workshop_state"
    id = Column(Integer, primary_key=True, index=True)
    session_title = Column(String, default="Autonomous Navigation")
    session_desc = Column(String, default="Learn how to implement PID controllers for stable flight and GPS waypoint following.")
    speaker_name = Column(String, default="Dr. Sarah Chen")
    modules_completed = Column(Integer, default=4)
    total_modules = Column(Integer, default=6)
    announcements = Column(String, default="[]") 
    resources = Column(String, default="[]")


# Create the tables when this file is imported
Base.metadata.create_all(bind=engine)

# Database dependency injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
