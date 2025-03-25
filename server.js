import 'dotenv/config';
import process from 'process'
import app from './api/create-order.js';
import cors from 'cors';

const PORT = process.env.PORT || 5000;
app.use(cors({
    origin: 'https://bingehall.onrender.com/',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});