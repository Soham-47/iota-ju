import os
import shutil
from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from model import InnovatiaRegistration, RegistrationType, PaymentStatus

# Automatically create database tables in Supabase on application startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="IOTA JU Gateway & Innovatia 2026 API")

UPLOAD_DIR = "uploads/screenshots"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. API REGISTRATION ENDPOINT
# -------------------------------------------------------------
@app.post("/EVENTS/Innovatia2026/Registration")
async def register_innovatia(
    registration_type: str = Form(...),
    # Member 1 / Leader details
    m1_name: str = Form(...),
    m1_college: str = Form(...),
    m1_department: str = Form(...),
    m1_year: str = Form(...),
    m1_email: str = Form(...),
    m1_whatsapp: str = Form(...),
    m1_alt_phone: str = Form(None),
    # Member 2 details (Optional if single participant)
    m2_name: str = Form(None),
    m2_college: str = Form(None),
    m2_department: str = Form(None),
    m2_year: str = Form(None),
    m2_email: str = Form(None),
    m2_whatsapp: str = Form(None),
    m2_alt_phone: str = Form(None),
    # Payment and feedback details
    upi_ref_id: str = Form(...),
    expectations: str = Form(None),
    suggestions_query: str = Form(None),
    payment_screenshot: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save uploaded payment screenshot receipt locally
    file_extension = payment_screenshot.filename.split(".")[-1] if "." in payment_screenshot.filename else "jpg"
    filename = f"{upi_ref_id}_{m1_whatsapp}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(payment_screenshot.file, buffer)

    # Create new registration entry in Supabase database
    new_reg = InnovatiaRegistration(
        registration_type=RegistrationType(registration_type),
        m1_name=m1_name,
        m1_college=m1_college,
        m1_department=m1_department,
        m1_year=m1_year,
        m1_email=m1_email,
        m1_whatsapp=m1_whatsapp,
        m1_alt_phone=m1_alt_phone,
        m2_name=m2_name,
        m2_college=m2_college,
        m2_department=m2_department,
        m2_year=m2_year,
        m2_email=m2_email,
        m2_whatsapp=m2_whatsapp,
        m2_alt_phone=m2_alt_phone,
        upi_ref_id=upi_ref_id,
        payment_screenshot_url=file_path,
        payment_status=PaymentStatus.PENDING,
        expectations=expectations,
        suggestions_query=suggestions_query
    )

    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    return {
        "status": "success",
        "message": "Registration submitted successfully!",
        "registration_id": new_reg.id,
        "payment_status": new_reg.payment_status.value
    }

# -------------------------------------------------------------
# 2. MOUNT ALL STATIC FRONTEND FILES FROM REPO ROOT
# -------------------------------------------------------------
# Resolves path to repository root (iota-ju/)
# Directory structure: backend -> Innovatia2026 -> EVENTS -> root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))

if os.path.exists(REPO_ROOT):
    app.mount("/", StaticFiles(directory=REPO_ROOT, html=True), name="static")
