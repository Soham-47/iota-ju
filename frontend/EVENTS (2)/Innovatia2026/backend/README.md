# Innovatia 2026 - Registration Backend Decoupling Note

As of the latest update:
- Registration submissions from `frontend/RegisterInnovatia2026.html` connect **directly** to the Supabase database (`innovatia_2026_registrations` table) using the Supabase JS client and REST API.
- Running `server.py` or a local FastAPI server (`main.py`) is **no longer required** for attendee registration.
- All registration records and payment receipts are written directly to Supabase PostgreSQL in real time.
