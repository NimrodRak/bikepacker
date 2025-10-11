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
        console.log(`[Debug] Checking for GPX files in: ${assetsPath}`);
        const files = await fs.readdir(assetsPath);
        console.log(`[Debug] Found files in assets directory: ${files.join(', ') || 'None'}`);
        const gpxFiles = files.filter(file => file.toLowerCase().endsWith('.gpx'));
        console.log(`[Debug] Filtered GPX files: ${gpxFiles.join(', ') || 'None'}`);
        res.json(gpxFiles);
    } catch (error) {
        console.error("Error reading assets directory:", error);
        res.status(500).json({ error: 'Could not list GPX files.' });
    }
});

app.get('/', (req, res) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(port, () => {
    console.log(`BikePacker app listening on http://localhost:${port}`) // Added a log message
})