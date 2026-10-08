import os
import sys
import json
import uuid
from email.parser import BytesParser
from email.policy import HTTP
from http.server import SimpleHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv

# Try importing psycopg2 for Supabase PostgreSQL connection
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Load environment variables from .env file
load_dotenv()

PORT = 3000
DATABASE_URL = os.getenv("DATABASE_URL")

# Upload Security Constants
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg'}

# Resolve project upload directory for Innovatia 2026 across folder structures
def resolve_uploads_dir():
    candidates = [
        os.path.join("frontend", "EVENTS (2)", "Innovatia2026", "backend", "uploads"),
        os.path.join("EVENTS (2)", "Innovatia2026", "backend", "uploads"),
        os.path.join("frontend", "EVENTS", "Innovatia2026", "backend", "uploads"),
        os.path.join("EVENTS", "Innovatia2026", "backend", "uploads"),
    ]
    for path in candidates:
        parent = os.path.dirname(path)
        if os.path.exists(parent):
            return path
    return os.path.join("frontend", "EVENTS (2)", "Innovatia2026", "backend", "uploads")

BASE_UPLOADS = resolve_uploads_dir()
UPLOAD_DIR = os.path.join(BASE_UPLOADS, "screenshots")
DATA_FILE = os.path.join(BASE_UPLOADS, "registrations.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)


class HardenedRegistrationHandler(SimpleHTTPRequestHandler):
    """
    Hardened HTTP Server handler that enforces:
    1. Upload File Security: Max 5MB file size limit, extension whitelist (.png, .jpg, .jpeg), sanitized UUID filenames.
    2. Durable Persistence Gate: Returns HTTP 200 OK ONLY if registration data was durably saved
       to Supabase PostgreSQL or local JSON storage. Returns HTTP 500 on write failure.
    """

    def do_POST(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        print(f"\n📩 [POST Request Received] Endpoint path: {self.path}")

        # Match any variant of registration route (case-insensitive)
        if clean_path.lower().endswith("/registration"):
            try:
                content_length = int(self.headers.get('Content-Length', 0))

                # Global payload size check (10MB threshold for entire multipart form)
                if content_length > 10 * 1024 * 1024:
                    print("⚠️ [Upload Rejected] Request body exceeds 10MB limit.")
                    self.send_error_json(413, "Payload Too Large: Request body exceeds size limit.")
                    return

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

                # Process and validate uploaded payment screenshot
                saved_path = ""
                if 'payment_screenshot' in files:
                    orig_filename, file_bytes = files['payment_screenshot']
                    
                    if file_bytes and len(file_bytes) > 0:
                        # 1. Enforce strict 5MB file size limit on screenshot image
                        if len(file_bytes) > MAX_FILE_SIZE:
                            print(f"❌ [Upload Rejected] File size ({len(file_bytes)} bytes) exceeds 5MB limit.")
                            self.send_error_json(413, "File size exceeds maximum 5MB limit.")
                            return

                        # 2. Enforce file extension whitelist (.png, .jpg, .jpeg)
                        ext = os.path.splitext(orig_filename)[1].lower() if orig_filename else ".png"
                        if ext not in ALLOWED_EXTENSIONS:
                            print(f"❌ [Upload Rejected] Invalid file extension '{ext}'.")
                            self.send_error_json(400, f"Invalid file format '{ext}'. Only PNG and JPEG images are permitted.")
                            return

                        # 3. Generate secure, non-predictable UUID filename to prevent path traversal
                        safe_filename = f"{uuid.uuid4().hex}{ext}"
                        saved_path = os.path.join(UPLOAD_DIR, safe_filename)

                        with open(saved_path, "wb") as f:
                            f.write(file_bytes)
                        print(f"📸 [Upload Saved] Validated receipt saved securely: {saved_path}")

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

                db_saved = False
                json_saved = False
                db_error_msg = None
                json_error_msg = None

                # 1. Attempt Supabase PostgreSQL insert
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
                        db_saved = True
                        print(f"✅ [Supabase DB] Registration durably stored: {reg_id}")
                    except Exception as db_err:
                        db_error_msg = str(db_err)
                        print(f"❌ [Supabase DB Error] Write failed: {db_err}")

                # 2. Attempt local JSON file backup insert
                try:
                    all_regs = []
                    if os.path.exists(DATA_FILE):
                        with open(DATA_FILE, "r", encoding="utf-8") as f:
                            all_regs = json.load(f)
                    all_regs.append(record)
                    with open(DATA_FILE, "w", encoding="utf-8") as f:
                        json.dump(all_regs, f, indent=2)
                    json_saved = True
                    print(f"💾 [Local JSON] Backup durably stored: {DATA_FILE}")
                except Exception as json_err:
                    json_error_msg = str(json_err)
                    print(f"❌ [Local JSON Error] Write failed: {json_err}")

                # 3. Persistence Gate: Require at least ONE storage target to succeed
                if db_saved or json_saved:
                    response_data = json.dumps({
                        "status": "success",
                        "message": "Registration submitted and durably saved!",
                        "registration_id": reg_id,
                        "payment_status": "PENDING",
                        "persistence": {
                            "supabase_db": db_saved,
                            "local_json": json_saved
                        }
                    }).encode('utf-8')

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Content-Length", str(len(response_data)))
                    self.end_headers()
                    self.wfile.write(response_data)
                    print(f"🎉 [200 OK] Responded with Registration ID: {reg_id}\n")
                else:
                    err_msg = "Failed to durably store registration in database or local storage."
                    print(f"⛔ [500 ERROR] Persistence failed for registration: {reg_id}")
                    err_data = json.dumps({
                        "status": "error",
                        "message": err_msg,
                        "details": {
                            "db_error": db_error_msg,
                            "json_error": json_error_msg
                        }
                    }).encode('utf-8')

                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Content-Length", str(len(err_data)))
                    self.end_headers()
                    self.wfile.write(err_data)

            except Exception as e:
                print(f"💥 [Critical Exception] POST processing error: {e}")
                err_data = json.dumps({
                    "status": "error",
                    "message": f"Server error: {str(e)}"
                }).encode('utf-8')
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(err_data)))
                self.end_headers()
                self.wfile.write(err_data)
        else:
            self.send_error(404, f"Endpoint {clean_path} not found")

    def send_error_json(self, status_code, message):
        """Helper method to return structured JSON errors for client validation failures."""
        err_data = json.dumps({
            "status": "error",
            "message": message
        }).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(err_data)))
        self.end_headers()
        self.wfile.write(err_data)

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    server_address = ('', PORT)
    HTTPServer.allow_reuse_address = True
    httpd = HTTPServer(server_address, HardenedRegistrationHandler)
    print("=" * 65)
    print(f"🚀  IOTA JU Hardened Web Server (Security & Persistence Enforced)")
    print(f"🌐  Open in browser: http://localhost:{PORT}")
    print(f"🔒  Upload limits: Max 5MB | Allowed: .png, .jpg, .jpeg | UUID Filenames")
    print(f"📂  Upload target: {UPLOAD_DIR}")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
