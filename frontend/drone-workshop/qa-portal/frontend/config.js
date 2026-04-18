// Central configuration for the Event Portal
const API_CONFIG = {
    // Replace this with your actual deployed backend URL (e.g., https://your-app.railway.app)
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://' + window.location.hostname + ':8000'
        : 'https://iota-ju.up.railway.app',

    get WS_URL() {
        return this.BASE_URL.replace('http', 'ws');
    }
};
