import express from 'express'
import path from 'path'; // Import the 'path' module
import { fileURLToPath } from 'url'; // Needed for __dirname in ES modules

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the assets directory (one level up from src)
const assetsPath = path.join(__dirname, '../assets');
console.log(`Serving static files from: ${assetsPath}`); // Log the assets path
// Define the path to the src directory itself for serving map.js etc.
const srcPath = __dirname;


const app = express()
const port = 3000

app.get('/', (req, res) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, 'index.html'));
})

// Serve static files from the 'assets' directory
app.use('/assets', express.static(assetsPath));
// Serve map.js specifically
app.get('/map.js', (req, res) => {
    res.sendFile(path.join(srcPath, 'map.js'), { headers: { 'Content-Type': 'application/javascript' } });
});


app.listen(port, () => {
    console.log(`BikePacker app listening on http://localhost:${port}`) // Added a log message
})