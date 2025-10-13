import express from 'express'
import path from 'path'; // Import the 'path' module
import { fileURLToPath } from 'url'; // Needed for __dirname in ES modules
import fs from 'fs/promises'; // Import the 'fs' module to read directory contents
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Define the path to the assets directory (one level up from src)
const assetsPath = path.join(__dirname, '../assets');

const app = express()
const port = 3000

// Serve static files from the 'src' directory (where this script lives)
app.use(express.static(__dirname));

// Serve static files from the 'assets' directory under the /assets route
app.use('/assets', express.static(assetsPath));

// API endpoint to get the list of GPX files
app.get('/api/gpx-files', async (req, res) => {
    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const trackDirectories = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        res.json(trackDirectories);
    } catch (error) {
        console.error("Error reading assets directory:", error);
        res.status(500).json({ error: 'Could not list GPX files.' });
    }
});

// API endpoint to get the details from route.json for a specific track
app.get('/api/track-details/:trackName', async (req, res) => {
    const trackName = req.params.trackName;
    // Basic sanitization to prevent directory traversal
    if (trackName.includes('..') || trackName.includes('/')) {
        return res.status(400).json({ error: 'Invalid track name.' });
    }
    const detailsPath = path.join(assetsPath, trackName, 'route.json');

    try {
        const detailsContent = await fs.readFile(detailsPath, 'utf-8');
        // Try to parse as JSON, if it fails, it will be caught.
        let detailsJson = JSON.parse(detailsContent);

        // If there are stops, geocode them on the server
        if (detailsJson.stops && detailsJson.stops.length > 0) {
            const apiKey = process.env.GEOAPIFY_API_KEY;
            if (!apiKey) {
                console.error("Geoapify API key is missing. Please check your .env file.");
                // Send data without coordinates
                return res.json(detailsJson);
            }

            const geocodingPromises = detailsJson.stops.map(async (stop) => {
                const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(stop.city)}&apiKey=${apiKey}&limit=1`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    const [lon, lat] = data.features[0].geometry.coordinates;
                    return { ...stop, coordinates: [lat, lon] }; // Add coordinates to the stop object
                }
                return { ...stop, coordinates: null }; // Return stop without coordinates if not found
            });
            detailsJson.stops = await Promise.all(geocodingPromises);
        }
        res.json(detailsJson);
    } catch (error) {
        console.error(`Error reading details for track '${trackName}':`, error);
        // If route.json doesn't exist, is empty, or is not valid JSON,
        // send a default structure to prevent frontend errors.
        res.json({ stops: [] });
    }
});

app.get('/', (req, res) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(port, () => {
    console.log(`BikePacker app listening on http://localhost:${port}`) // Added a log message
})