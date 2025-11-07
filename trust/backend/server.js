require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Base route
app.get('/', (req, res) => {
    res.send('Welcome to the backend server!');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));



// start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

