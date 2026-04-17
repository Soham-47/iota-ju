# Deployment Guide: Drone Workshop Q&A Portal

This project consists of two parts: a **FastAPI Backend** and a **Static Frontend**.

## 1. Backend Deployment (Railway.app)
Since the backend uses Python and WebSockets, shared hosting (like basic Hostinger) won't work. **Railway** is recommended.

1.  Connect your GitHub repository to Railway.
2.  Add a New Service from your repository.
3.  Set the **Root Directory** to `drone-workshop/qa-portal/backend`.
4.  Railway will automatically detect the `Dockerfile` and deploy it.
5.  **Important**: In Railway settings, go to **Variables** and ensure `PORT` is 8080 (or whatever your Dockerfile uses).
6.  Copy the generated URL (e.g., `https://your-api.railway.app`).

## 2. Frontend Configuration
Before deploying the frontend, you must point it to your new backend.

1.  Open `drone-workshop/qa-portal/frontend/config.js`.
2.  Update `BASE_URL` to your Railway URL:
    ```javascript
    BASE_URL: 'https://your-api.railway.app'
    ```
3.  Commit and push these changes.

## 3. Frontend Deployment (Vercel / Hostinger)
You can deploy the frontend as a static site.

### Vercel:
1.  Connect GitHub to Vercel.
2.  Set the **Root Directory** to `drone-workshop/qa-portal/frontend`.
3.  Deploy.

### Hostinger:
1.  Upload the contents of the `frontend` folder to your public directory via FTP or File Manager.

## 4. Database Persistence
The current setup uses SQLite (`app.db`). 
- **Warning**: On Railway, the database will be reset every time you redeploy the app.
- **Solution**: For production, I recommend switching to a managed PostgreSQL database (also available on Railway) and updating the `DATABASE_URL` in `backend/database.py`.

---
**Note**: Ensure your frontend domain is allowed in the `CORSMiddleware` section of `backend/main.py`. It is currently set to `"*"` for ease of setup.
