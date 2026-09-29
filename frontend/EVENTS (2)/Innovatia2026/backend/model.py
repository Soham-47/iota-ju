import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum
import enum
from database import Base

class RegistrationType(str, enum.Enum):
    SINGLE = "single"
    TEAM = "team"

class PaymentStatus(str, enum.Enum):
    PENDING = "Pending"
    PAID = "Paid"
    REJECTED = "Rejected"

class InnovatiaRegistration(Base):
    __tablename__ = "innovatia_2026_registrations"

    id = Column(String, primary_key=True, default=lambda: f"INNO26-{uuid.uuid4().hex[:6].upper()}")
    registration_type = Column(Enum(RegistrationType), nullable=False)
    
    # Member 1 / Single Participant Details
    m1_name = Column(String, nullable=False)
    m1_college = Column(String, nullable=False)
    m1_department = Column(String, nullable=False)
    m1_year = Column(String, nullable=False)
    m1_email = Column(String, nullable=False, index=True)
    m1_whatsapp = Column(String, nullable=False)
    m1_alt_phone = Column(String, nullable=True)

    # Member 2 Details (If Team of 2)
    m2_name = Column(String, nullable=True)
    m2_college = Column(String, nullable=True)
    m2_department = Column(String, nullable=True)
    m2_year = Column(String, nullable=True)
    m2_email = Column(String, nullable=True)
    m2_whatsapp = Column(String, nullable=True)
    m2_alt_phone = Column(String, nullable=True)

    # Payment & Proof Details
    upi_ref_id = Column(String, nullable=False)
    payment_screenshot_url = Column(String, nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)

    # Optional Fields
    expectations = Column(Text, nullable=True)
    suggestions_query = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
