import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.VITE_RAZORPAY_KEY_SECRET,
});

// Initialize email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Function to format booking details in HTML
const generateBookingEmailHTML = (booking, isAdmin = false) => {
    const paymentType = booking.amountPaid === booking.totalPrice ? 'Full Payment' : 'Advance Payment';
    const balanceDue = Math.max(0, booking.totalPrice - booking.amountPaid);

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #9f1d21; text-align: center;">
                ${isAdmin ? '🎉 New Booking Notification' : '🎉 Your Booking is Confirmed!'}
            </h2>
            
            <div style="background: #f8f8f8; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #9f1d21; margin-top: 0;">Booking Details</h3>
                <p><strong>Booking ID:</strong> ${booking.id}</p>
                <p><strong>Theater:</strong> ${booking.theaterName}</p>
                <p><strong>Date:</strong> ${booking.date}</p>
                <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
                
                <h3 style="color: #9f1d21; margin-top: 20px;">Payment Information</h3>
                <p><strong>Total Amount:</strong> ₹${booking.totalPrice}</p>
                <p><strong>Payment Type:</strong> ${paymentType}</p>
                <p><strong>Amount Paid:</strong> ₹${booking.amountPaid}</p>
                ${balanceDue > 0 ? `<p><strong>Balance Due:</strong> ₹${balanceDue}</p>` : ''}
                <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'Online'}</p>
                ${booking.transactionId ? `<p><strong>Transaction ID:</strong> ${booking.transactionId}</p>` : ''}
            </div>

            ${isAdmin ? `
                <div style="background: #edf2f7; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: #9f1d21; margin-top: 0;">Customer Details</h3>
                    <p><strong>Name:</strong> ${booking.userDetails.name}</p>
                    <p><strong>Email:</strong> ${booking.userDetails.email}</p>
                    <p><strong>Phone:</strong> ${booking.userDetails.phone}</p>
                </div>
            ` : `
                <p style="text-align: center; color: #666;">
                    If you have any questions, please contact us at:<br>
                    Email: bingehall08@gmail.com<br>
                    Phone: +91 9100111403
                </p>
            `}
        </div>
    `;
};

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

// Verify payment and send emails
app.post('/api/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails
        } = req.body;

        // Verify payment signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.VITE_RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature === razorpay_signature) {
            // Send confirmation emails
            try {
                // Send customer email
                await transporter.sendMail({
                    from: '"BingeHall" <bingehallinfo@gmail.com>',
                    to: bookingDetails.userDetails.email,
                    subject: '🎉 Your Booking Confirmation - BingeHall',
                    html: generateBookingEmailHTML(bookingDetails)
                });

                // Send admin email
                await transporter.sendMail({
                    from: '"BingeHall System" <bingehallinfo@gmail.com>',
                    to: 'bingehall08@gmail.com',
                    subject: '📌 New Booking Notification',
                    html: generateBookingEmailHTML(bookingDetails, true)
                });

                res.status(200).json({
                    verified: true,
                    paymentId: razorpay_payment_id,
                    emailsSent: true
                });
            } catch (emailError) {
                console.error('Error sending confirmation emails:', emailError);
                res.status(200).json({
                    verified: true,
                    paymentId: razorpay_payment_id,
                    emailsSent: false,
                    emailError: emailError.message
                });
            }
        } else {
            res.status(400).json({ verified: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error in payment verification:', error);
        res.status(500).json({ verified: false, error: 'Payment verification failed' });
    }
});

// Add endpoint for offline booking emails
app.post('/api/send-offline-booking-confirmation', async (req, res) => {
    try {
        const { bookingDetails } = req.body;

        await Promise.all([
            // Send customer email
            transporter.sendMail({
                from: '"BingeHall" <bingehallinfo@gmail.com>',
                to: bookingDetails.userDetails.email,
                subject: '🎉 Your Booking Confirmation - BingeHall',
                html: generateBookingEmailHTML(bookingDetails)
            }),
            // Send admin email
            transporter.sendMail({
                from: '"BingeHall System" <bingehallinfo@gmail.com>',
                to: 'bingehall08@gmail.com',
                subject: '📌 New Offline Booking Notification',
                html: generateBookingEmailHTML(bookingDetails, true)
            })
        ]);

        res.status(200).json({ success: true, message: 'Confirmation emails sent' });
    } catch (error) {
        console.error('Error sending offline booking emails:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Add endpoint for online booking emails
app.post('/api/send-online-booking-confirmation', async (req, res) => {
    try {
        const { bookingDetails } = req.body;

        await Promise.all([
            // Send customer email
            transporter.sendMail({
                from: '"BingeHall" <bingehallinfo@gmail.com>',
                to: bookingDetails.userDetails.email,
                subject: '🎉 Your Online Booking Confirmation - BingeHall',
                html: generateBookingEmailHTML(bookingDetails)
            }),
            // Send admin email
            transporter.sendMail({
                from: '"BingeHall System" <bingehallinfo@gmail.com>',
                to: 'bingehall08@gmail.com',
                subject: '📌 New Online Booking Notification',
                html: generateBookingEmailHTML(bookingDetails, true)
            })
        ]);

        res.status(200).json({ success: true, message: 'Confirmation emails sent' });
    } catch (error) {
        console.error('Error sending online booking emails:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default app;