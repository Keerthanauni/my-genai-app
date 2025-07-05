require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const fetch = require('node-fetch'); // For making HTTP requests from Node.js
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' })); // Increase limit for image data
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to generate caption
app.post('/generate-caption', async (req, res) => {
    const { imageData } = req.body; // Expect base64 image data from client

    if (!imageData) {
        return res.status(400).json({ error: 'No image data provided.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Access API key from environment

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY not set in environment variables.");
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    try {
        const prompt = "Describe this image in a natural and concise way. Focus on the main subjects, actions, and overall scene.";

        const chatHistory = [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg", // Assuming JPEG, adjust if other types are handled
                            data: imageData
                        }
                    }
                ]
            }
        ];

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistory })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error:', errorData);
            return res.status(response.status).json({
                error: `API error: ${response.status} ${response.statusText} - ${errorData.error ? errorData.error.message : 'Unknown error'}`
            });
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const caption = result.candidates[0].content.parts[0].text;
            res.json({ caption }); // Send caption back to client
        } else {
            console.error('Unexpected API response structure from Gemini:', result);
            res.status(500).json({ error: 'Could not generate a caption. The API response was unexpected.' });
        }

    } catch (error) {
        console.error('Error generating caption on server:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open your browser at http://localhost:${PORT}`);
});