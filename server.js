const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'password123', 
    database: 'deep_diary'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Database query failed:', err.stack);
            res.status(500).send('An error occurred while processing your request.');
            return;
        }
        if (results.length > 0) {
            console.log('User found, updating status to active');
            const user = results[0];
            const updateStatusQuery = 'UPDATE users SET status = "active" WHERE email = ?';
            db.query(updateStatusQuery, [email], (err, updateResults) => {
                if (err) {
                    console.error('Database update failed:', err.stack);
                    res.status(500).send('An error occurred while updating the status.');
                    return;
                }
                console.log('Status updated to active for user:', email);
                res.status(200).send({ message: 'Login successful', redirect: 'home.html', email: email, userId: user.id });
            });
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

// Endpoint to get user and passcode
app.get('/user/passcode/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = 'SELECT passcode FROM users WHERE id = ?';
    db.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Database query failed:', error.stack);
            res.status(500).json({ error: 'Database error' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json({ passcode: results[0].passcode });
        }
    });
});

// Register endpoint
app.post('/register', (req, res) => {
    const { username, email, password, passcode } = req.body;
    const query = 'INSERT INTO users (username, email, password, passcode, status) VALUES (?, ?, ?, ?, "inactive")';
    db.query(query, [username, email, password, passcode], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).send('Email already exists');
            } else {
                res.status(500).send('An error occurred while processing your request.');
            }
            return;
        }
        res.send('User registered successfully');
    });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    const { email } = req.body;
    const updateStatusQuery = 'UPDATE users SET status = "inactive" WHERE email = ?';
    db.query(updateStatusQuery, [email], (err, results) => {
        if (err) {
            console.error('Database update failed:', err.stack);
            res.status(500).send('An error occurred while updating the status.');
            return;
        }
        console.log('Status updated to inactive for user:', email);
        res.status(200).send({ message: 'Logout successful', redirect: 'index.html' });
    });
});

// Fetch notes
app.get('/notes', (req, res) => {
    const userId = req.query.user_id;
    const query = 'SELECT * FROM notes WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database query failed:', err.stack);
            res.status(500).send('An error occurred while fetching notes.');
            return;
        }
        res.status(200).send(results);
    });
});

// Add a new note
app.post('/notes', (req, res) => {
    const { user_id, title, content, isEncrypted } = req.body;
    const insertQuery = 'INSERT INTO notes (user_id, title, content, isEncrypted) VALUES (?, ?, ?, ?)';
    db.query(insertQuery, [user_id, title, content, isEncrypted], (err, result) => {
        if (err) {
            console.error('Error inserting note:', err);
            res.status(500).json({ message: 'Failed to add note' }); 
            return;
        }
        console.log('Note added successfully');
        res.status(200).json({ message: 'Note added successfully', noteId: result.insertId }); 
    });
});

// Update an existing note
app.put('/notes/:id', (req, res) => {
    // Your note update logic
    const { title, content, isEncrypted } = req.body;
    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }
    // Perform update operation
    // Catch and handle any errors
    try {
        // Update operation
        res.status(200).json({ message: 'Note updated successfully' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Delete a note
app.delete('/notes/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM notes WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database query failed:', err.stack);
            res.status(500).send('An error occurred while deleting the note.');
            return;
        }
        res.status(200).send({ message: 'Note deleted successfully' });
    });
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
