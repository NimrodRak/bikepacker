// At the top of your map.js, with other global variables
let altitudeChart = null;
let trackAltitudes = [];
let trackDistances = []; // Cumulative distances in km
function createOrUpdateAltitudeChart(distances, altitudes, max_distance) {
    const chartContainer = document.getElementById('altitude-chart-container');
    const canvas = document.getElementById('altitude-chart');

    if (!canvas || !distances || !altitudes || distances.length === 0) {
        if (chartContainer) chartContainer.style.display = 'none';
        if (altitudeChart) {
            altitudeChart.destroy();
            altitudeChart = null;
        }
        return;
    }
    if (chartContainer) chartContainer.style.display = 'block';

    const ctx = canvas.getContext('2d');

    if (altitudeChart) {
        altitudeChart.destroy();
    }

    const altitudeLineData = altitudes.map((ele, i) => ({ x: distances[i], y: ele }));
    console.log(distances)
    const initialDotData = distances.length > 0 ? [{ x: distances[0], y: altitudes[0] }] : [];

    // Calculate min and max altitude for y-axis normalization
    let yMin, yMax;
    const validAltitudes = altitudes.filter(alt => typeof alt === 'number' && isFinite(alt));

    if (validAltitudes.length > 0) {
        let dataMinAltitude = Math.min(...validAltitudes);
        let dataMaxAltitude = Math.max(...validAltitudes);
        const range = dataMaxAltitude - dataMinAltitude;

        if (range === 0) { // If the track is flat
            yMin = dataMinAltitude - 10; // Add a 10m buffer
            yMax = dataMaxAltitude + 10; // Add a 10m buffer
        } else {
            const padding = range * 0.10; // 10% padding
            yMin = dataMinAltitude - padding;
            yMax = dataMaxAltitude + padding;
        }
    } else {
        // Fallback if no valid altitude data, Chart.js will auto-scale
        yMin = undefined;
        yMax = undefined;
    }

    // Custom inline plugin to draw altitude label above the dot
    const customAltitudeLabelPlugin = {
        id: 'customAltitudeLabel',
        afterDatasetsDraw: function (chartInstance, args, pluginOptions) {
            const { ctx, data } = chartInstance;
            const currentPositionDataset = data.datasets[1]; // 'Current Position' dot dataset (index 1)

            if (currentPositionDataset && currentPositionDataset.data && currentPositionDataset.data.length > 0) {
                const pointData = currentPositionDataset.data[0]; // Data for the dot: {x: distance, y: altitude}

                // Check if altitude (pointData.y) is a valid number
                if (pointData && typeof pointData.y === 'number' && isFinite(pointData.y)) {
                    const meta = chartInstance.getDatasetMeta(1); // Meta for the 'Current Position' dataset
                    if (meta && meta.data && meta.data.length > 0) {
                        const pointElement = meta.data[0]; // The visual element (the dot on the canvas)

                        const xPos = pointElement.x; // x-coordinate of the dot
                        const yPos = pointElement.y; // y-coordinate of the dot
                        const altitude = Math.round(pointData.y);
                        const text = altitude + ' m';

                        // Style the text
                        ctx.save();
                        ctx.font = pluginOptions.font || 'bold 11px "Helvetica Neue", Helvetica, Arial, sans-serif';
                        ctx.textAlign = pluginOptions.textAlign || 'center';
                        ctx.textBaseline = pluginOptions.textBaseline || 'bottom';
                        ctx.fillStyle = pluginOptions.color || '#333';

                        const yOffset = pluginOptions.offset || 10; // Pixels above the dot's center
                        ctx.fillText(text, xPos, yPos - yOffset);
                        ctx.restore();
                    }
                }
            }
        }
    };

    altitudeChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Altitude',
                data: altitudeLineData,
                borderColor: 'rgb(54, 162, 235)', // Blue
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 1.5,
                tension: 0.1,
                pointRadius: 0,
                fill: true,
                order: 1 // Draw line dataset first
            },
            {
                label: 'Current Position',
                data: initialDotData,
                backgroundColor: '#ff6384', // Reddish-pink
                borderColor: '#ff6384',
                pointRadius: 5,
                pointHoverRadius: 7,
                showLine: false,
                type: 'scatter', // Important: render this dataset as scatter
                order: 0 // Draw dot dataset on top
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // No animation for smoother dot updates
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: false,
                        text: 'Distance (km)' // Label the x-axis
                    },
                    min: 0,
                    max: altitudeLineData[altitudeLineData.length - 1].x,
                    ticks: {
                        display: true, // Ensure ticks are shown
                        callback: function (value, index, ticks) {
                            value *= 1000;
                            // Format tick values: integers as is, floats to one decimal place.
                            if (Number.isInteger(value)) {
                                return value;
                            }
                            return (value).toFixed(1);
                        },
                        autoSkip: true, // Automatically skip ticks to prevent overlap
                    },
                },
                y: {
                    ticks: {
                        display: true,
                    },
                    min: yMin, // Set calculated min altitude
                    position: "right",
                    max: yMax, // Set calculated max altitude
                    // grace: '10%' // Removed as we are now calculating min/max with padding
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false // Disable default tooltips for now
                },
                // Configuration for our custom inline plugin
                customAltitudeLabel: {
                    font: 'bold 11px "Helvetica Neue", Helvetica, Arial, sans-serif',
                    color: '#333', // Dark grey for good visibility
                    textAlign: 'center',
                    textBaseline: 'bottom', // Anchor text from its bottom
                    offset: 10 // Distance in pixels above the dot
                },
            },
            hover: { mode: null }
        },
        plugins: [customAltitudeLabelPlugin] // Register the custom inline plugin
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map centered somewhere (e.g., London)
    const map = L.map('map').setView([51.505, -0.09], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Slider and marker related variables
    const fileInput = document.getElementById('gpx-file-input');
    const sliderContainer = document.getElementById('altitude-chart-container');
    const trackSlider = document.getElementById('track-slider');
    let trackMarker = null;
    let allTrackPoints = [];

    // Custom icon for the moving dot
    const dotIcon = L.divIcon({
        className: 'track-dot-icon', // Defined in index.html CSS
        html: '', // No HTML content needed, styled by CSS
        iconSize: [12, 12], // Size of the icon
        iconAnchor: [6, 6]  // Anchor point (center)
    });

    function cleanupTrackElements() {
        if (trackMarker) {
            map.removeLayer(trackMarker);
            trackMarker = null;
        }
        allTrackPoints = [];

        if (sliderContainer) sliderContainer.style.display = 'none';
        if (trackSlider) {
            trackSlider.value = 0;
            trackSlider.min = 0;
            trackSlider.max = 100; // Default max
        }
    }

    let currentGpxLayer = null;
    let currentGpxObjectUrl = null; // To store the object URL for cleanup

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            // Clean up previous layer and object URL if they exist
            if (currentGpxLayer) {
                map.removeLayer(currentGpxLayer);
                currentGpxLayer = null;
            }
            if (currentGpxObjectUrl) {
                URL.revokeObjectURL(currentGpxObjectUrl);
                currentGpxObjectUrl = null;
            }

            currentGpxObjectUrl = URL.createObjectURL(file); // Create new object URL

            currentGpxLayer = new L.GPX(currentGpxObjectUrl, {
                async: true,
                gpx_options: {
                    parseElements: ["track"]
                },
                marker_options: {
                    startIconUrl: null,
                    endIconUrl: null,
                    shadowUrl: null,
                }
            }).on('loaded', function (e) {
                map.fitBounds(e.target.getBounds());
                allTrackPoints = []; // Reset points

                // Extract all LatLng points from the GPX track
                const gpxLayers = e.target.getLayers(); // e.target is the L.GPX layer group
                gpxLayers.forEach(trkLayer => {
                    if (trkLayer instanceof L.Polyline) { // Ensure it's a polyline
                        const latlngs = trkLayer.getLatLngs(); // For L.Polyline, this is LatLng[]
                        allTrackPoints = allTrackPoints.concat(latlngs);
                    }
                });

                if (allTrackPoints.length > 0) {
                    sliderContainer.style.display = 'block';
                    trackSlider.min = 0;
                    trackSlider.max = allTrackPoints.length - 1;
                    trackSlider.value = 0;

                    if (!trackMarker) {
                        trackMarker = L.marker(allTrackPoints[0], { icon: dotIcon }).addTo(map);
                    } else {
                        trackMarker.setLatLng(allTrackPoints[0]);
                    }
                } else {
                    sliderContainer.style.display = 'none';
                }
                // Assuming 'gpx' is your L.GPX instance
                // ... (existing code to get trackCoords, setup slider, etc.)

                // Extract elevation data
                const elevationDataRaw = e.target.get_elevation_data(); // Array of [distance_m, elevation_m, tooltip_html]

                if (elevationDataRaw && elevationDataRaw.length > 0) {
                    trackDistances = elevationDataRaw.map(p => p[0] / 1000); // Convert distance to km
                    trackAltitudes = elevationDataRaw.map(p => p[1] === undefined || p[1] === null ? null : parseFloat(p[1])); // Get elevation, handle nulls

                    createOrUpdateAltitudeChart(trackDistances, trackAltitudes, e.target.get_distance() / 1000);
                    document.getElementById('altitude-chart-container').style.display = 'block';
                } else {
                    // No elevation data, hide chart
                    trackDistances = [];
                    trackAltitudes = [];
                    createOrUpdateAltitudeChart([], [], null); // This will hide the chart
                    console.log("No elevation data found in GPX.");
                }

                // Manually trigger an update for the chart dot to the initial position
                if (altitudeChart && trackDistances.length > 0 && trackAltitudes.length > 0) {
                    altitudeChart.data.datasets[1].data = [{ x: trackDistances[0], y: trackAltitudes[0] }];
                    altitudeChart.update('none');
                }


                console.log("GPX file loaded and displayed from upload.");
            }).on('error', function (e) { // Note: L.GPX error handling might be limited for parsing errors
                console.error("Error loading GPX file:", e.error || e);
                alert("Error loading GPX file. Please ensure it's a valid GPX format.");
                if (currentGpxObjectUrl) { // Clean up object URL on error
                    URL.revokeObjectURL(currentGpxObjectUrl);
                    currentGpxObjectUrl = null;
                }
                cleanupTrackElements(); // Clean up slider/marker on error too

            }).addTo(map);
        }
    });
    // Event listener for the slider
    trackSlider.addEventListener('input', function () {
        const pointIndex = parseInt(this.value, 10);
        if (trackMarker && allTrackPoints.length > 0) {
            if (pointIndex >= 0 && pointIndex < allTrackPoints.length) {
                const currentPoint = allTrackPoints[pointIndex];
                trackMarker.setLatLng(currentPoint);

                // Optional: Pan map to keep marker in view if it's near edges
                if (!map.getBounds().contains(currentPoint)) {
                    map.panTo(currentPoint);
                }
            }
        }
        if (altitudeChart && trackDistances.length > pointIndex && trackAltitudes.length > pointIndex) {
            const currentDistance = trackDistances[pointIndex];
            const currentAltitude = trackAltitudes[pointIndex];

            if (currentDistance !== undefined && currentAltitude !== undefined) {
                // Update the dot's data on the altitude chart
                altitudeChart.data.datasets[1].data = [{ x: currentDistance, y: currentAltitude }];
                altitudeChart.update('none'); // 'none' for no animation, for smoother updates
            }
        }

    });

    console.log("Map initialized. Ready for GPX file upload.");
});