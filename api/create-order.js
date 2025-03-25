import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.VITE_RAZORPAY_KEY_SECRET,
});

// Create a Razorpay order
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency, receipt, notes } = req.body;

        const order = await razorpay.orders.create({
            amount: amount, // Amount in paise (e.g., 50000 paise = ₹500)
            currency: currency || 'INR',
            receipt: receipt || `order_${Date.now()}`,
            notes: notes,
        });

        res.status(200).json(order);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Razorpay payment
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Create the HMAC SHA256 signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.VITE_RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Compare the generated signature with the received signature
        if (generatedSignature === razorpay_signature) {
            res.status(200).json({ verified: true, paymentId: razorpay_payment_id });
        } else {
            res.status(400).json({ verified: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ verified: false, error: 'Payment verification failed' });
    }
});

export default app;