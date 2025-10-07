import 'dotenv/config'; // For environment variables like API_KEY
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs'; // For reading the image file
import pg from 'pg'; // --- NEW: Import the pg library ---

const { Pool } = pg;

const app = express();
const port = 3001;

// --- NEW: Set up PostgreSQL connection pool ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// --- IMPORTANT: Use a current vision model ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // Use a current vision model

// Helper to convert file to GoogleGenerativeAI.Part
async function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(await fs.readFile(path)).toString("base64"),
            mimeType
        },
    };
}

// POST endpoint to upload a bill, process it, and save it
app.post('/api/upload-bill', upload.single('billImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    try {
        const imagePart = await fileToGenerativePart(req.file.path, req.file.mimetype);

        const prompt = `
            Analyze this bill image. Extract the following information in a JSON format.
            Categorize the main total into one of these: "Food", "Shopping", "Utilities", "Transport", "Entertainment", "Other".
            If there are multiple distinct items with prices, list them as an array of objects with 'item' and 'price'.
            Example JSON format:
            {
                "totalAmount": 123.45,
                "category": "Food",
                "date": "YYYY-MM-DD",
                "vendor": "Store Name (if available)",
                "items": []
            }
            Provide only the JSON. The date should be a valid date format.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        await fs.unlink(req.file.path);

        let extractedData;
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            extractedData = JSON.parse(cleanText);
        } catch (jsonError) {
            console.error("Failed to parse Gemini's JSON output:", jsonError);
            return res.status(500).json({ error: "Could not parse bill data.", rawOutput: text });
        }

        // --- MODIFIED: Save extracted data to PostgreSQL ---
        const { vendor, category, totalAmount, date } = extractedData;
        
        // Basic validation before inserting
        if (!vendor || !category || !totalAmount || !date) {
             return res.status(400).json({ error: "Extracted data is missing required fields." });
        }

        const query = `
            INSERT INTO expenses (vendor, category, total_amount, expense_date)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [vendor, category, totalAmount, date];

        const dbResult = await pool.query(query, values);

        console.log('Saved to DB:', dbResult.rows[0]);
        // Send back the newly created database record
        res.status(201).json(dbResult.rows[0]);

    } catch (error) {
        console.error('Error processing bill:', error);
        if (req.file) {
            await fs.unlink(req.file.path).catch(e => console.error("Error deleting temp file:", e));
        }
        res.status(500).json({ error: 'Failed to process bill image.' });
    }
});

// --- NEW: GET endpoint to fetch all expenses for the dashboard ---
app.get('/api/expenses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses from database:', err);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});