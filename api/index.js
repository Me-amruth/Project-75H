const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login/index.html'));
});

// Secret key for JWT
const SECRET_KEY = process.env.SECRET_KEY || 'DayTrackerByAMRUTH';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb+srv://amruth:A1M2R3U4T5H@amruth.wnylfrc.mongodb.net/?retryWrites=true&w=majority&appName=Amruth';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Task Schema (includes user reference)
const taskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    tasks: [
        { name: String, status: String }
    ]
});
const Task = mongoose.model('Task', taskSchema);

// Register route
app.post('/api/register', [
    body('username').not().isEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error(err); // Log the error for debugging
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to authenticate users using JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from 'Bearer <token>'
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user; // Attach the user to the request
        next();
    });
};

// API to handle task submission
app.post('/api/submit-tasks', authenticateToken, async (req, res) => {
    const { date, tasks } = req.body;

    try {
        if (!date || !tasks) {
            return res.status(400).json({ error: 'Date and tasks are required' });
        }

        // Use findOneAndUpdate with upsert option, and associate tasks with the authenticated user
        const existingTask = await Task.findOneAndUpdate(
            { user: req.user.userId, date },
            { tasks },
            { new: true, upsert: true }
        );

        res.json({ message: 'Tasks saved/updated successfully!', existingTask });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save or update tasks' });
    }
});

// Route to get all tasks (Only for authenticated users)
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.userId });
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
});

// Route to get tasks by specific date (Only for authenticated users)
app.get('/api/tasks/:date', authenticateToken, async (req, res) => {
    const dateParam = decodeURIComponent(req.params.date);
    try {
        const tasksForDate = await Task.findOne({ user: req.user.userId, date: dateParam });
        if (tasksForDate) {
            res.json(tasksForDate);
        } else {
            res.status(404).json({ error: 'No tasks found for this date' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve tasks for the date' });
    }
});

// Vercel specific code to start the server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export the app for use in serverless functions
module.exports = app;
