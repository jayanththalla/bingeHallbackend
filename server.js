import 'dotenv/config';
import process from 'process'
import app from './api/create-order.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});