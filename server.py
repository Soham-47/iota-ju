import os
import sys
import json
import uuid
from email.parser import BytesParser
from email.policy import HTTP
from http.server import SimpleHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv

# Try importing psycopg2 for optional Supabase logging
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

load_dotenv()

PORT = 3000
DATABASE_URL = os.getenv("DATABASE_URL")

# Resolve upload directory according to project structure
def get_uploads_dir():
    candidates = [
        os.path.join("frontend", "EVENTS (2)", "Innovatia2026", "backend", "uploads"),
        os.path.join("EVENTS (2)", "Innovatia2026", "backend", "uploads"),
        os.path.join("EVENTS", "Innovatia2026", "backend", "uploads"),
    ]
    for candidate in candidates:
        parent = os.path.dirname(candidate)
        if os.path.exists(parent):
            return candidate
    return os.path.join("frontend", "EVENTS (2)", "Innovatia2026", "backend", "uploads")

BASE_UPLOADS = get_uploads_dir()
UPLOAD_DIR = os.path.join(BASE_UPLOADS, "screenshots")
DATA_FILE = os.path.join(BASE_UPLOADS, "registrations.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)


class UnifiedRegistrationHandler(SimpleHTTPRequestHandler):
    """
    Unified HTTP server for IOTA JU:
    - Serves all static HTML/CSS/JS frontend files on GET
    - Handles ALL POST registration requests across any path variant
    """

    def do_POST(self):
        print(f"\n📩 [POST Request Received] Path: {self.path}")

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            content_type = self.headers.get('Content-Type', '')
            raw_bytes = f"Content-Type: {content_type}\r\n\r\n".encode('iso-8859-1') + body
            msg = BytesParser(policy=HTTP).parsebytes(raw_bytes)

            form = {}
            files = {}

            if msg.is_multipart():
                for part in msg.iter_parts():
                    name = part.get_param('name', header='content-disposition')
                    filename = part.get_filename()
                    if filename:
                        files[name] = (filename, part.get_payload(decode=True))
                    elif name:
                        form[name] = part.get_payload(decode=True).decode('utf-8', errors='ignore')

            def get_val(key, default=""):
                return form.get(key, default).strip()

            reg_id = f"INNO26-{uuid.uuid4().hex[:6].upper()}"
            upi_ref = get_val('upi_ref_id', 'NO_UPI')
            m1_phone = get_val('m1_whatsapp', 'NO_PHONE')

            # Save uploaded payment screenshot receipt
            saved_path = ""
            if 'payment_screenshot' in files:
                orig_filename, file_bytes = files['payment_screenshot']
                ext = orig_filename.split('.')[-1] if '.' in orig_filename else 'png'
                filename = f"{upi_ref}_{m1_phone}.{ext}"
                saved_path = os.path.join(UPLOAD_DIR, filename)
                with open(saved_path, "wb") as f:
                    f.write(file_bytes)
                print(f"📸 Saved payment screenshot: {saved_path}")

            record = {
                "id": reg_id,
                "registration_type": get_val('registration_type', 'single'),
                "m1_name": get_val('m1_name'),
                "m1_college": get_val('m1_college'),
                "m1_department": get_val('m1_department'),
                "m1_year": get_val('m1_year'),
                "m1_email": get_val('m1_email'),
                "m1_whatsapp": get_val('m1_whatsapp'),
                "m1_alt_phone": get_val('m1_alt_phone'),
                "m2_name": get_val('m2_name'),
                "m2_college": get_val('m2_college'),
                "m2_department": get_val('m2_department'),
                "m2_year": get_val('m2_year'),
                "m2_email": get_val('m2_email'),
                "m2_whatsapp": get_val('m2_whatsapp'),
                "m2_alt_phone": get_val('m2_alt_phone'),
                "upi_ref_id": upi_ref,
                "payment_screenshot_url": saved_path,
                "payment_status": "PENDING",
                "expectations": get_val('expectations'),
                "suggestions_query": get_val('suggestions_query')
            }

            # Optional Supabase Database insert
            if HAS_PSYCOPG2 and DATABASE_URL:
                try:
                    conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
                    cur = conn.cursor()
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
                    cur.execute("""
                        INSERT INTO innovatia_2026_registrations (
                            id, registration_type, m1_name, m1_college, m1_department, m1_year,
                            m1_email, m1_whatsapp, m1_alt_phone, m2_name, m2_college, m2_department,
                            m2_year, m2_email, m2_whatsapp, m2_alt_phone, upi_ref_id,
                            payment_screenshot_url, payment_status, expectations, suggestions_query
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        record["id"], record["registration_type"],
                        record["m1_name"], record["m1_college"], record["m1_department"], record["m1_year"],
                        record["m1_email"], record["m1_whatsapp"], record["m1_alt_phone"],
                        record["m2_name"], record["m2_college"], record["m2_department"], record["m2_year"],
                        record["m2_email"], record["m2_whatsapp"], record["m2_alt_phone"],
                        record["upi_ref_id"], record["payment_screenshot_url"], "PENDING",
                        record["expectations"], record["suggestions_query"]
                    ))
                    conn.commit()
                    cur.close()
                    conn.close()
                    print(f"✅ Logged to Supabase DB: {reg_id}")
                except Exception as db_err:
                    print(f"⚠️ Supabase DB notice: {db_err}")

            # Local JSON backup
            try:
                all_regs = []
                if os.path.exists(DATA_FILE):
                    with open(DATA_FILE, "r") as f:
                        all_regs = json.load(f)
                all_regs.append(record)
                with open(DATA_FILE, "w") as f:
                    json.dump(all_regs, f, indent=2)
                print(f"💾 Saved local backup: {DATA_FILE}")
            except Exception as json_err:
                print(f"⚠️ Local JSON notice: {json_err}")

            # Send JSON response back to browser
            res_body = json.dumps({
                "status": "success",
                "message": "Registration submitted successfully!",
                "registration_id": reg_id,
                "payment_status": "PENDING"
            }).encode('utf-8')

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Content-Length", str(len(res_body)))
            self.end_headers()
            self.wfile.write(res_body)
            print(f"🎉 Responded 200 OK for Registration ID: {reg_id}\n")

        except Exception as e:
            print(f"❌ Error processing POST: {e}")
            err_body = json.dumps({"status": "error", "message": str(e)}).encode('utf-8')
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()


if __name__ == '__main__':
    server_address = ('', PORT)
    HTTPServer.allow_reuse_address = True
    httpd = HTTPServer(server_address, UnifiedRegistrationHandler)
    print("=" * 65)
    print("🚀  IOTA JU Unified Local Web Server")
    print(f"🌐  Open in browser: http://localhost:{PORT}")
    print(f"📁  Uploads directory: {BASE_UPLOADS}")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
