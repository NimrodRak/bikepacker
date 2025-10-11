import express from 'express'
import path from 'path'; // Import the 'path' module
import { fileURLToPath } from 'url'; // Needed for __dirname in ES modules
import fs from 'fs/promises'; // Import the 'fs' module to read directory contents

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        console.log(`[Debug] Checking for track directories in: ${assetsPath}`);
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });
        const trackDirectories = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        console.log(`[Debug] Found track directories: ${trackDirectories.join(', ') || 'None'}`);
        res.json(trackDirectories);
    } catch (error) {
        console.error("Error reading assets directory:", error);
        res.status(500).json({ error: 'Could not list GPX files.' });
    }
});

// API endpoint to get the details from route.txt for a specific track
app.get('/api/track-details/:trackName', async (req, res) => {
    const trackName = req.params.trackName;
    // Basic sanitization to prevent directory traversal
    if (trackName.includes('..') || trackName.includes('/')) {
        return res.status(400).json({ error: 'Invalid track name.' });
    }
    const detailsPath = path.join(assetsPath, trackName, 'route.txt');

    try {
        const detailsContent = await fs.readFile(detailsPath, 'utf-8');
        res.send(detailsContent);
    } catch (error) {
        console.error(`Error reading details for track '${trackName}':`, error);
        // If route.txt doesn't exist, send an empty response instead of an error
        res.send('');
    }
});

app.get('/', (req, res) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(port, () => {
    console.log(`BikePacker app listening on http://localhost:${port}`) // Added a log message
})