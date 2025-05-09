document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map centered somewhere (e.g., London)
    const map = L.map('map').setView([51.505, -0.09], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Path to your GPX file (relative to how it's served)
    const gpxPath = '/assets/route.gpx'; // Assumes server serves 'assets' folder

    let gpxLayer = new L.GPX(gpxPath, {
        async: true,
        gpx_options: {
            parseElements: ["track"]
        },
        marker_options: { // Optional: customize markers
            startIconUrl: null, // Hide default start/end markers if using slider marker
            endIconUrl: null,
            shadowUrl: null,
        }
    }).on('loaded', function (e) {
        map.fitBounds(e.target.getBounds()); // Zoom the map to fit the GPX track
    }).addTo(map);
    console.log("Loaded GPX")
});