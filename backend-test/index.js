import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server } from 'socket.io';

// --- BASIC APP & DB SETUP ---
const { Pool } = pg;
const app = express();
const port = 3001;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// --- GEMINI MODEL SETUP (CORRECTED) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// This model is capable of processing both text and images.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(await fs.readFile(path)).toString("base64"),
            mimeType
        },
    };
}

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};


// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user. The email or username may already be taken.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const payload = {
            id: user.id,
            username: user.username
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, userId: user.id, username: user.username });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});


// --- USER-SPECIFIC EXPENSE ROUTES ---
app.post('/api/expenses/upload', authenticateToken, upload.single('billImage'), async (req, res) => {
    if (!req.file) return res.status(400).send('No image file uploaded.');
    const userId = req.user.id;
    try {
        const imagePart = await fileToGenerativePart(req.file.path, req.file.mimetype);
        const prompt = `Analyze this bill image. Extract vendor, category ("Food", "Shopping", etc.), totalAmount, and a YYYY-MM-DD date. Provide only a single, clean JSON object.`;
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanText);
        const { vendor, category, totalAmount, date } = extractedData;
        if (!vendor || !category || !totalAmount || !date) {
            return res.status(400).json({ error: "Extracted data is missing required fields." });
        }
        const query = `
            INSERT INTO personal_expenses (vendor, category, total_amount, expense_date, user_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const values = [vendor, category, totalAmount, date, userId];
        const dbResult = await pool.query(query, values);
        res.status(201).json(dbResult.rows[0]);
    } catch (error) {
        console.error('Error processing bill:', error);
        res.status(500).json({ error: 'Failed to process bill image.' });
    } finally {
        if (req.file) await fs.unlink(req.file.path).catch(e => console.error("Error deleting temp file:", e));
    }
});

app.get('/api/expenses', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query('SELECT * FROM personal_expenses WHERE user_id = $1 ORDER BY expense_date DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

app.post('/api/expenses/add-bulk', authenticateToken, async (req, res) => {
    const { items, vendor, category } = req.body;
    const userId = req.user.id;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "An array of items is required to add." });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = `
            INSERT INTO personal_expenses (user_id, vendor, category, total_amount, expense_date)
            VALUES ($1, $2, $3, $4, $5);
        `;
        for (const item of items) {
            const values = [
                userId,
                vendor || "Group Expense",
                category || "Group Purchase",
                item.price,
                new Date()
            ];
            await client.query(query, values);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Expenses added to your dashboard successfully!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulk adding expenses, transaction rolled back:', error);
        res.status(500).json({ message: 'Failed to add expenses due to a server error.' });
    } finally {
        client.release();
    }
});


// --- GROUP MANAGEMENT ROUTES ---
app.get('/api/groups', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT g.id, g.name FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.user_id = $1`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups.' });
    }
});

app.post('/api/groups/create', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    try {
        const newGroup = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *",
            [name, userId]
        );
        const groupId = newGroup.rows[0].id;
        await pool.query(
            "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
            [userId, groupId]
        );
        res.status(201).json(newGroup.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating group.' });
    }
});

app.post('/api/groups/split-bill', authenticateToken, upload.single('billImage'), async (req, res) => {
    if (!req.file) return res.status(400).send('No image file uploaded.');
    try {
        const imagePart = await fileToGenerativePart(req.file.path, req.file.mimetype);
        const prompt = `
            Analyze this bill image. Extract ONLY the individual line items and their prices.
            Ignore totals, taxes, tips, or any summary lines.
            Return the data as a clean JSON array of objects, where each object has an 'item' and a 'price' key.
            Example: [{"item": "Margherita Pizza", "price": 15.50}, {"item": "Coke", "price": 2.50}]
            Provide only the JSON array.
        `;
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const items = JSON.parse(cleanText);
        res.json({ items });
    } catch (error) {
        console.error('Error processing split bill:', error);
        res.status(500).json({ error: 'Failed to extract items from bill.' });
    } finally {
        if (req.file) await fs.unlink(req.file.path).catch(e => console.error("Error deleting temp file:", e));
    }
});

app.post('/api/users/search', authenticateToken, async (req, res) => {
    const { searchTerm } = req.body;
    const currentUserId = req.user.id;
    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term is required.' });
    }
    try {
        const result = await pool.query(
            "SELECT id, username FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 5",
            [`%${searchTerm}%`, currentUserId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ message: 'Error searching for users.' });
    }
});

app.get('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.id, u.username FROM users u
             JOIN group_members gm ON u.id = gm.user_id
             WHERE gm.group_id = $1`,
            [groupId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ message: 'Error fetching group members.' });
    }
});

app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
    const { groupId } = req.params;
    const { userIdToAdd } = req.body;
    if (!userIdToAdd) {
        return res.status(400).json({ message: 'User ID to add is required.' });
    }
    try {
        await pool.query(
            "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
            [userIdToAdd, groupId]
        );
        res.status(201).json({ message: 'User added to group successfully.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'This user is already in the group.' });
        }
        console.error('Error adding user to group:', error);
        res.status(500).json({ message: 'Error adding user to group.' });
    }
});

// --- HTTP SERVER & SOCKET.IO SETUP (CORRECTED) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // This origin now matches the default Vite development server port
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// --- REAL-TIME CHAT LOGIC ---
const userSocketMap = {};
io.on('connection', (socket) => {
    socket.on('joinRoom', ({ groupId, userId }) => {
        socket.join(groupId);
        userSocketMap[String(userId)] = socket.id;
    });

    socket.on('sendMessage', ({ groupId, message, username }) => {
        io.to(groupId).emit('message', {
            type: 'text',
            user: username,
            text: message,
            id: Date.now()
        });
    });

    socket.on('sendAssignments', ({ groupId, assignments, username }) => {
        for (const userId in assignments) {
            const assignedItems = assignments[userId];
            const targetSocketId = userSocketMap[userId];
            if (targetSocketId) {
                io.to(targetSocketId).emit('message', {
                    type: 'assignmentNotice',
                    fromUser: username,
                    items: assignedItems,
                    id: `assign-${Date.now()}-${userId}`
                });
            }
        }
    });

    socket.on('disconnect', () => {
        for (const userId in userSocketMap) {
            if (userSocketMap[userId] === socket.id) {
                delete userSocketMap[userId];
                break;
            }
        }
    });
});

// Use 'server.listen' to start both Express and Socket.io
server.listen(port, () => {
    console.log(`Backend server with chat listening on port ${port}`);
});

