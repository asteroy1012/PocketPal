import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import pg from 'pg';
import bcrypt from 'bcryptjs'; // For password hashing
import jwt from 'jsonwebtoken'; // For authentication tokens
import http from 'http'; // Required for Socket.io
import { Server } from 'socket.io'; // For real-time chat

// --- BASIC APP & DB SETUP (Your existing code) ---
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

// --- IMPORTANT: Use a current vision model ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(await fs.readFile(path)).toString("base64"),
            mimeType
        },
    };
}

// --- SECTION: AUTHENTICATION MIDDLEWARE ---
// This function will protect routes. It checks for a valid token in the request header.
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if the token is no longer valid
        req.user = user; // Attach user payload (e.g., user id) to the request
        next();
    });
};


// --- SECTION: AUTHENTICATION ROUTES ---

// POST /api/auth/register - Create a new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
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

// POST /api/auth/login - Log in a user and get a token
app.post('/api/auth/login', async (req, res) => {
    // 1. Destructure email and password from the request body
    const { email, password } = req.body;

    try {
        // 2. Find the user in the database by their unique email
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        // 3. If no user is found, send a generic "Invalid credentials" message for security
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 4. Compare the submitted password with the hashed password stored in the database
        const isValid = await bcrypt.compare(password, user.password_hash);

        // 5. If the passwords do not match, send the same generic error message
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // --- THIS IS THE CORRECTED PART ---
        // 6. Create the JWT payload, ensuring it includes the username
        const payload = {
            id: user.id,
            username: user.username // This makes the username available on the frontend
        };

        // 7. Sign the token with your secret key, setting it to expire in 1 day
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 8. Send the token and user details back to the frontend upon successful login
        res.json({ token, userId: user.id, username: user.username });

    } catch (error) {
        // 9. If any unexpected server error occurs, log it and send a 500 response
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
});


// --- SECTION: USER-SPECIFIC EXPENSE ROUTES (Protected) ---
// These routes now use the authenticateToken middleware to identify the user.

// POST /api/expenses/upload - Upload a bill for a specific user
app.post('/api/expenses/upload', authenticateToken, upload.single('billImage'), async (req, res) => {
    if (!req.file) return res.status(400).send('No image file uploaded.');
    const userId = req.user.id; // Get user ID from the authenticated token

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

        // Note the table is now 'personal_expenses' and includes 'user_id'
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

// GET /api/expenses - Fetch all expenses for the logged-in user
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


// --- SECTION: GROUP MANAGEMENT ROUTES (Protected) ---

// GET /api/groups - Get all groups for the logged-in user
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

// POST /api/groups/create - Create a new group
app.post('/api/groups/create', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    try {
        const newGroup = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *",
            [name, userId]
        );
        const groupId = newGroup.rows[0].id;
        // Add the creator as the first member
        await pool.query(
            "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
            [userId, groupId]
        );
        res.status(201).json(newGroup.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating group.' });
    }
});

// POST /api/groups/split-bill - The Gemini endpoint specifically for splitting bills
app.post('/api/groups/split-bill', authenticateToken, upload.single('billImage'), async (req, res) => {
    if (!req.file) return res.status(400).send('No image file uploaded.');

    try {
        const imagePart = await fileToGenerativePart(req.file.path, req.file.mimetype);
        // This prompt is different: it focuses ONLY on line items.
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
        // This endpoint does NOT save to the DB. It just returns the items for confirmation.
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
        // Find users whose username is similar to the search term
        // Exclude the user who is currently searching
        // Limit results for performance
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

// NEW: GET /api/groups/:groupId/members - Get all members of a specific group
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


// NEW: POST /api/groups/:groupId/members - Add a new user to a group
app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
    const { groupId } = req.params;
    const { userIdToAdd } = req.body; // The ID of the user being added

    if (!userIdToAdd) {
        return res.status(400).json({ message: 'User ID to add is required.' });
    }

    try {
        // The primary key on the group_members table will automatically prevent duplicates
        await pool.query(
            "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
            [userIdToAdd, groupId]
        );
        res.status(201).json({ message: 'User added to group successfully.' });
    } catch (error) {
        // This specific error code means a duplicate key was attempted (user already in group)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'This user is already in the group.' });
        }
        console.error('Error adding user to group:', error);
        res.status(500).json({ message: 'Error adding user to group.' });
    }
});

app.post('/api/expenses/add-bulk', authenticateToken, async (req, res) => {
    // Expects a body like: { "items": [{ "item": "Coffee", "price": 4.50 }], "vendor": "Cafe", "category": "Food" }
    const { items, vendor, category } = req.body;
    const userId = req.user.id; // Get the user ID from the authenticated token

    // --- 1. Validation ---
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "An array of items is required to add." });
    }

    // --- 2. Database Transaction ---
    const client = await pool.connect(); // Get a client from the connection pool

    try {
        // Start the transaction
        await client.query('BEGIN');
        console.log(`Starting bulk insert for user ${userId}.`);

        const query = `
            INSERT INTO personal_expenses (user_id, vendor, category, total_amount, expense_date)
            VALUES ($1, $2, $3, $4, $5);
        `;

        // --- 3. Loop and Insert Each Item ---
        // Use a for...of loop to ensure operations are sequential (important for transactions)
        for (const item of items) {
            const values = [
                userId,
                vendor || "Group Expense",       // Provide a default vendor if none is specified
                category || "Group Purchase",    // Provide a default category
                item.price,
                new Date()                       // Use the current date for the expense
            ];
            await client.query(query, values);
            console.log(`Inserted item "${item.item}" for user ${userId}.`);
        }

        // --- 4. Commit the Transaction ---
        // If all insertions were successful, commit the changes to the database
        await client.query('COMMIT');
        console.log(`Bulk insert successful for user ${userId}.`);
        res.status(201).json({ message: 'Expenses added to your dashboard successfully!' });

    } catch (error) {
        // --- 5. Rollback on Error ---
        // If any error occurred during the try block, roll back all changes
        await client.query('ROLLBACK');
        console.error('Error in bulk adding expenses, transaction rolled back:', error);
        res.status(500).json({ message: 'Failed to add expenses due to a server error.' });
    } finally {
        // --- 6. Release the Client ---
        // ALWAYS release the client back to the pool, whether the transaction succeeded or failed
        client.release();
    }
});

// --- SECTION: HTTP SERVER & SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Your React app's address
        methods: ["GET", "POST"]
    }
});

// --- SECTION: REAL-TIME CHAT LOGIC ---
const userSocketMap = {};

io.on('connection', (socket) => {
    console.log('A user connected with socket id:', socket.id);

    // MODIFIED: 'joinRoom' now reliably tracks the user with a STRING key
    socket.on('joinRoom', ({ groupId, userId }) => {
        socket.join(groupId);
        // Coerce userId to a string to ensure consistent key types for lookups
        userSocketMap[String(userId)] = socket.id;
        console.log(`User ${userId} (Socket ${socket.id}) joined group ${groupId}`);
        // Log the current state of the map whenever someone joins
        console.log('UPDATED userSocketMap:', userSocketMap);
    });

    // UNCHANGED: Normal messages are correctly broadcast to the entire group
    socket.on('sendMessage', ({ groupId, message, username }) => {
        io.to(groupId).emit('message', {
            type: 'text',
            user: username,
            text: message,
            id: Date.now()
        });
    });

    // MODIFIED: Added detailed logging for debugging
    socket.on('sendAssignments', ({ groupId, assignments, username }) => {
        console.log('--- Received sendAssignments event ---');
        console.log('Assignments Payload:', assignments);
        console.log('Current userSocketMap state:', userSocketMap);

        for (const userId in assignments) { // 'userId' here is a string
            const assignedItems = assignments[userId];
            
            console.log(`Attempting to find socket for userId: "${userId}" (type: ${typeof userId})`);
            
            // Look up the socket ID from our reliable server-side map using a string key
            const targetSocketId = userSocketMap[userId];

            if (targetSocketId) {
                console.log(`SUCCESS: Found socket ${targetSocketId} for user ${userId}. Sending notice.`);
                // Send a private, personalized message ONLY to that user's socket
                io.to(targetSocketId).emit('message', {
                    type: 'assignmentNotice',
                    fromUser: username,
                    items: assignedItems,
                    id: `assign-${Date.now()}-${userId}`
                });
            } else {
                // This is the error point. The logs above will tell us why.
                console.error(`FAILURE: Could not find an active socket for user ${userId}. They may not be in the chat window.`);
            }
        }
    });

    // MODIFIED: Clean up the map correctly when a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const userId in userSocketMap) { // 'userId' here is a string
            if (userSocketMap[userId] === socket.id) {
                delete userSocketMap[userId];
                console.log(`Removed user ${userId} from userSocketMap.`);
                console.log('UPDATED userSocketMap:', userSocketMap);
                break;
            }
        }
    });
});

// Use 'server.listen' instead of 'app.listen' to start the server with Socket.io
server.listen(port, () => {
    console.log(`Backend server with chat listening on port ${port}`);
});