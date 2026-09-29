import os
import json
import sys
from dotenv import load_dotenv

# Try importing psycopg2
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Resolve location of registrations.json
candidates = [
    os.path.join("frontend", "EVENTS (2)", "Innovatia2026", "backend", "uploads", "registrations.json"),
    os.path.join("EVENTS (2)", "Innovatia2026", "backend", "uploads", "registrations.json"),
    os.path.join("frontend", "EVENTS", "Innovatia2026", "backend", "uploads", "registrations.json"),
    os.path.join("EVENTS", "Innovatia2026", "backend", "uploads", "registrations.json"),
]

json_path = None
for path in candidates:
    if os.path.exists(path):
        json_path = path
        break

if not json_path:
    json_path = candidates[0]

def sync_data():
    print("=" * 65)
    print("🚀  Innovatia 2026 - Supabase Sync Tool")
    print("=" * 65)

    if not HAS_PSYCOPG2:
        print("❌ Error: 'psycopg2' is not installed.")
        print("   Please run: pip install psycopg2-binary")
        sys.exit(1)

    if not DATABASE_URL:
        print("❌ Error: 'DATABASE_URL' not found in your .env file.")
        print("   Add DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres to your .env file.")
        sys.exit(1)

    if not os.path.exists(json_path):
        print(f"⚠️ Warning: No local registration backup found at '{json_path}'.")
        print("   No local data to sync yet.")
        sys.exit(0)

    try:
        with open(json_path, "r") as f:
            records = json.load(f)
    except Exception as e:
        print(f"❌ Failed to read {json_path}: {e}")
        sys.exit(1)

    print(f"📦 Found {len(records)} registration(s) in local JSON file.")

    try:
        print("🔌 Connecting to Supabase PostgreSQL database...")
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
        cur = conn.cursor()

        # 1. Ensure Table Exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS innovatia_2026_registrations (
                id VARCHAR PRIMARY KEY,
                registration_type VARCHAR,
                m1_name VARCHAR, m1_college VARCHAR, m1_department VARCHAR, m1_year VARCHAR,
                m1_email VARCHAR, m1_whatsapp VARCHAR, m1_alt_phone VARCHAR,
                m2_name VARCHAR, m2_college VARCHAR, m2_department VARCHAR, m2_year VARCHAR,
                m2_email VARCHAR, m2_whatsapp VARCHAR, m2_alt_phone VARCHAR,
                upi_ref_id VARCHAR, payment_screenshot_url VARCHAR, payment_status VARCHAR DEFAULT 'PENDING',
                expectations TEXT, suggestions_query TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Insert Records
        synced_count = 0
        for rec in records:
            cur.execute("""
                INSERT INTO innovatia_2026_registrations (
                    id, registration_type, m1_name, m1_college, m1_department, m1_year,
                    m1_email, m1_whatsapp, m1_alt_phone, m2_name, m2_college, m2_department,
                    m2_year, m2_email, m2_whatsapp, m2_alt_phone, upi_ref_id,
                    payment_screenshot_url, payment_status, expectations, suggestions_query
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (
                rec.get("id"), rec.get("registration_type", "single"),
                rec.get("m1_name"), rec.get("m1_college"), rec.get("m1_department"), rec.get("m1_year"),
                rec.get("m1_email"), rec.get("m1_whatsapp"), rec.get("m1_alt_phone"),
                rec.get("m2_name"), rec.get("m2_college"), rec.get("m2_department"), rec.get("m2_year"),
                rec.get("m2_email"), rec.get("m2_whatsapp"), rec.get("m2_alt_phone"),
                rec.get("upi_ref_id"), rec.get("payment_screenshot_url"), rec.get("payment_status", "PENDING"),
                rec.get("expectations"), rec.get("suggestions_query")
            ))
            if cur.rowcount > 0:
                synced_count += 1

        conn.commit()
        cur.close()
        conn.close()

        print(f"🎉 Sync Complete! Successfully pushed {synced_count} new registration(s) to Supabase.")

    except Exception as err:
        print(f"❌ Database connection/sync error: {err}")

if __name__ == "__main__":
    sync_data()
