const status = document.getElementById('status');
try {
    await import('./app.mjs?v=20261124f');
} catch (error) {
    status.textContent = 'River Watch could not start: ' + error.message + '. Reload the page to retry.';
    status.style.color = '#a52d2d';
    document.getElementById('map').textContent = 'Application startup failed. See the connection message above.';
    console.error('River Watch startup', error);
}
