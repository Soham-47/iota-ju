// Central configuration for the Event Portal
const API_CONFIG = {
    // Replace this with your actual deployed backend URL (e.g., https://your-app.railway.app)
    BASE_URL: window.location.hostname.includes('railway.app') || window.location.hostname.includes('vercel.app')
        ? 'https://iota-ju-production.up.railway.app'
        : 'http://' + window.location.hostname + ':8000',

    get WS_URL() {
        return this.BASE_URL.replace('http', 'ws');
    }
};
