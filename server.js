import 'dotenv/config';
import process from 'process'
import app from './api/create-order.js';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Single CORS configuration
app.use(cors({
    origin: 'https://bingehall.onrender.com/',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Validate email credentials exist
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials missing from environment variables');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    logger: true,
    debug: true
});
// Add email validation function
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

app.post('/api/send-offline-booking-confirmation', async (req, res) => {
    try {
        const { bookingDetails } = req.body;
        // Validate email
        if (!isValidEmail(bookingDetails.userDetails.email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        // Send customer email
        await transporter.sendMail({
            from: `"BingeHall" <${process.env.EMAIL_USER}>`,
            to: bookingDetails.userDetails.email,
            subject: '🎉 Your Booking Confirmation - BingeHall',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #9f1d21;">Booking Confirmed!</h2>
                    <p>Dear ${bookingDetails.userDetails.name},</p>
                    <p>Your booking details:</p>
                    <ul>
                        <li>Theater: ${bookingDetails.theaterName}</li>
                        <li>Date: ${bookingDetails.date}</li>
                        <li>Time: ${bookingDetails.timeSlot}</li>
                        <li>Amount Paid: ₹${bookingDetails.amountPaid}</li>
                    </ul>
                    <p>For any queries, contact us at bingehall08@gmail.com</p>
                </div>
            `
        });

        // Send admin notification
        await transporter.sendMail({
            from: '"BingeHall System" <bingehallinfo@gmail.com>',
            to: 'bingehall08@gmail.com',
            subject: '📌 New Offline Booking',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #9f1d21;">New Offline Booking</h2>
                    <h3>Customer Details:</h3>
                    <ul>
                        <li>Name: ${bookingDetails.userDetails.name}</li>
                        <li>Email: ${bookingDetails.userDetails.email}</li>
                        <li>Phone: ${bookingDetails.userDetails.phone}</li>
                    </ul>
                    <h3>Booking Details:</h3>
                    <ul>
                        <li>Theater: ${bookingDetails.theaterName}</li>
                        <li>Date: ${bookingDetails.date}</li>
                        <li>Time: ${bookingDetails.timeSlot}</li>
                        <li>Amount Paid: ₹${bookingDetails.amountPaid}</li>
                        <li>Payment Status: ${bookingDetails.paymentStatus}</li>
                    </ul>
                </div>
            `
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to send online booking confirmation email
app.post('/api/send-online-booking-confirmation', async (req, res) => {
    try {
        const { bookingDetails } = req.body;

        // Validate email
        if (!isValidEmail(bookingDetails.userDetails.email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Send customer email
        const customerMailOptions = {
            from: `"BingeHall" <${process.env.EMAIL_USER}>`,
            to: bookingDetails.userDetails.email,
            subject: '🎉 Your Online Booking Confirmation - BingeHall',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #9f1d21;">Booking Confirmed!</h2>
                    <p>Dear ${bookingDetails.userDetails.name},</p>
                    <p>Thank you for your booking. Here are your booking details:</p>
                    
                    <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #9f1d21; margin-top: 0;">Booking Summary</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li><strong>Theater:</strong> ${bookingDetails.theaterName}</li>
                            <li><strong>Date:</strong> ${bookingDetails.date}</li>
                            <li><strong>Time:</strong> ${bookingDetails.timeSlot}</li>
                            <li><strong>Number of Guests:</strong> ${bookingDetails.guestCount || 2}</li>
                            ${bookingDetails.decorations?.length > 0 ? `
                                <li><strong>Decorations:</strong> ${bookingDetails.decorations.map(id => {
                const eventType = decorationOptions.find(d => d.id === id);
                if (eventType) return eventType.name;
                const addon = decorations.find(d => d.id === id);
                return addon ? addon.name : 'None';
            }).join(', ')}</li>
                            ` : ''}
                            ${bookingDetails.cake?.id ? `
                                <li><strong>Cake:</strong> ${cakeOptions.find(c => c.id === bookingDetails.cake.id)?.name || 'None'}</li>
                                ${bookingDetails.cake.message ? `
                                    <li><strong>Cake Message:</strong> "${bookingDetails.cake.message}"</li>
                                ` : ''}
                            ` : ''}
                            ${bookingDetails.addOns?.rose ? `
                                <li><strong>Rose Package:</strong> ${roses.find(r => r.id === bookingDetails.addOns.rose)?.name || 'None'}</li>
                            ` : ''}
                            ${bookingDetails.addOns?.photography ? `
                                <li><strong>Photography:</strong> ${photography.find(p => p.id === bookingDetails.addOns.photography)?.name || 'None'}</li>
                            ` : ''}
                        </ul>
                        
                        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
                            <h4 style="color: #9f1d21; margin-bottom: 10px;">Price Breakdown</h4>
                            <ul style="list-style: none; padding: 0;">
                                <li>Base Price: ₹${bookingDetails.totalPrice}</li>
                                <li style="font-weight: bold; margin-top: 10px;">Total Amount Paid: ₹${bookingDetails.amountPaid}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <p><strong>Transaction ID:</strong> ${bookingDetails.transactionId || 'N/A'}</p>
                        <p><strong>Payment Status:</strong> ${bookingDetails.paymentStatus}</p>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="margin: 0;"><strong>Important Notes:</strong></p>
                        <ul>
                            <li>Please arrive 15 minutes before your scheduled time</li>
                            <li>Bring a valid ID proof</li>
                            <li>Show this email at reception</li>
                        </ul>
                    </div>
                </div>
            `
        };

        // Send admin notification
        const adminMailOptions = {
            from: '"BingeHall System" <bingehallinfo@gmail.com>',
            to: 'bingehall08@gmail.com',
            subject: '📌 New Online Booking',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #9f1d21;">New Online Booking</h2>
                    <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0;">Customer Details:</h3>
                        <ul>
                            <li>Name: ${bookingDetails.userDetails.name}</li>
                            <li>Email: ${bookingDetails.userDetails.email}</li>
                            <li>Phone: ${bookingDetails.userDetails.phone}</li>
                        </ul>
                    </div>
                    <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px;">
                        <h3 style="margin-top: 0;">Booking Details:</h3>
                        <ul>
                            <li>Theater: ${bookingDetails.theaterName}</li>
                            <li>Date: ${bookingDetails.date}</li>
                            <li>Time: ${bookingDetails.timeSlot}</li>
                            <li>Amount Paid: ₹${bookingDetails.amountPaid}</li>
                            <li>Transaction ID: ${bookingDetails.transactionId || 'N/A'}</li>
                            <li>Payment Status: ${bookingDetails.paymentStatus}</li>
                            <li>Booking Time: ${new Date().toLocaleString('en-IN')}</li>
                        </ul>
                    </div>
                </div>
            `
        };

        // Send both emails
        await Promise.all([
            transporter.sendMail(customerMailOptions),
            transporter.sendMail(adminMailOptions)
        ]);

        res.status(200).json({
            success: true,
            message: 'Booking confirmation emails sent successfully'
        });

    } catch (error) {
        console.error('Error sending online booking emails:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
