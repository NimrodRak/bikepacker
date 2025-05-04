document.addEventListener('DOMContentLoaded', function () {
    const mapElement = document.getElementById('map');
    const slider = document.getElementById('gpx-slider');
    let trackPoints = [];
    // let trackMarker = null; // Remove slider marker for now

    if (!mapElement /*|| !slider*/) { // Ignore slider check for now
        console.error("Map or slider element not found!");
        return;
    }

    // Initialize the map centered somewhere (e.g., London)
    const map = L.map('map').setView([51.505, -0.09], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize the marker (will be placed later)
    // trackMarker = L.marker([0, 0]).addTo(map); // Remove slider marker for now

    // Path to your GPX file (relative to how it's served)
    const gpxPath = '/assets/route.gpx'; // Assumes server serves 'assets' folder

    new L.GPX(gpxPath, {
        async: true,
        marker_options: { // Optional: customize markers
            startIconUrl: null, // Hide default start/end markers if using slider marker
            endIconUrl: null,
            shadowUrl: null
        }
    }).on('loaded', function (e) {
        map.fitBounds(e.target.getBounds()); // Zoom the map to fit the GPX track

        // Extract track points by finding the Polyline layer with the most points
        console.log("GPX loaded. Analyzing layers...");
        const layers = e.target.getLayers();
        let longestTrackLayer = null;
        let maxPoints = 0;

        console.log(`GPX plugin created ${layers.length} layers.`);
        let layerIndex = 0;
        layers.forEach(layer => {
            // Check if the layer has a getLatLngs method (characteristic of Polyline)
            if (typeof layer.getLatLngs === 'function') {
                const points = layer.getLatLngs();
                let currentPointsCount = 0;

                // Handle MultiPolyline by summing points in all segments
                // Check if it looks like a MultiPolyline: array of arrays of LatLngs
                if (Array.isArray(points) && points.length > 0 && Array.isArray(points[0]) && points[0].length > 0 && points[0][0] instanceof L.LatLng) { // MultiPolyline check
                    points.forEach(segment => currentPointsCount += segment.length);
                    console.log(`Layer ${layerIndex}: Found MultiPolyline with ${currentPointsCount} total points.`);
                    // Check if it looks like a simple Polyline: array of LatLngs
                } else if (Array.isArray(points) && points.length > 0 && points[0] instanceof L.LatLng) {
                    currentPointsCount = points.length;
                    console.log(`Layer ${layerIndex}: Found Polyline with ${currentPointsCount} points.`);
                }

                // Keep track of the layer with the most points
                if (currentPointsCount > maxPoints) {
                    console.log(`Layer ${layerIndex}: New longest track found (${currentPointsCount} points).`);
                    maxPoints = currentPointsCount;
                    longestTrackLayer = layer;
                }

            } else {
                // Attempt to get a more useful type name
                let layerType = 'Unknown';
                if (layer.feature && layer.feature.geometry) {
                    layerType = layer.feature.geometry.type; // GeoJSON type if available
                } else if (layer.constructor && layer.constructor.name) {
                    layerType = layer.constructor.name; // Leaflet class name (like 'e')
                }
                console.log(`Layer ${layerIndex}: Not a Polyline/MultiPolyline (Type: ${layerType}).`);
            }
            layerIndex++;
        });

        // Remove all layers EXCEPT the one identified as the longest track
        if (longestTrackLayer) {
            console.log(`Identified longest track layer with ${maxPoints} points. Removing other layers.`);
            layers.forEach(layer => {
                if (layer !== longestTrackLayer) {
                    e.target.removeLayer(layer); // Use the GPX group's removeLayer method
                    console.log(`Removed a layer.`);
                }
            });
        } else {
            console.error("Could not identify a longest track layer to display.");
        }
    }).addTo(map);
});