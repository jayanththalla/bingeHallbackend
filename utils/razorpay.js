import { useBookings } from '../context/BookingContext';

const waitForRazorpay = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.Razorpay) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
};
const RAZORPAY_LOAD_TIMEOUT = 5000; // 5 seconds

export const openRazorpayPayment = async (orderDetails, onSuccess, onFailure, onLoading) => {
    try {
        if (typeof onLoading === 'function') onLoading();
        await waitForRazorpay();
        const razorpayLoadPromise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Payment gateway timeout. Please try again.'));
            }, RAZORPAY_LOAD_TIMEOUT);

            const check = () => {
                if (window.Razorpay) {
                    clearTimeout(timer);
                    resolve();
                }
            };

            // Check immediately in case it's already loaded
            check();

            // Then check periodically
            const interval = setInterval(check, 100);
        });

        await razorpayLoadPromise;
        if (!window.Razorpay) {
            // If not loaded, load it dynamically
            const script = document.createElement('script');
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        }

        // Validate amount (e.g., ₹1 = 100 paise)
        if (orderDetails.currency === 'INR' && orderDetails.amount < 100) {
            throw new Error('Amount must be at least ₹1 (100 paise)');
        }

        // Create order
        const createOrderResponse = await fetch('https://bingehallbackend.onrender.com/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: orderDetails.amount,
                currency: orderDetails.currency || 'INR',
                receipt: orderDetails.receipt || `order_${Date.now()}`,
                notes: { bookingId: orderDetails.bookingId },
            }),
        });

        if (!createOrderResponse.ok) throw new Error('Failed to create order');
        const order = await createOrderResponse.json();
        if (!order.id) throw new Error('Invalid order response');

        // Initialize Razorpay
        const paymentModal = new window.Razorpay({
            key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use Vite env or hardcode
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            name: 'BingeHall',
            description: 'Booking Payment',
            image: '/assets/logo.png',
            prefill: {
                name: orderDetails.customerName,
                email: orderDetails.customerEmail,
                contact: orderDetails.customerPhone,
            },
            theme: { color: '#9f1d21' },
            handler: async (response) => {
                try {
                    const verifyResponse = await fetch('https://bingehallbackend.onrender.com/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingId: orderDetails.bookingId,
                        }),
                    });
                    const result = await verifyResponse.json();
                    if (result.verified) onSuccess(response);
                    else onFailure(new Error('Payment verification failed'));
                } catch (error) {
                    onFailure(error);
                }
            },
            modal: {
                ondismiss: () => onFailure(new Error('USER_CLOSED_MODAL')),
            },
        });

        paymentModal.on('payment.failed', (response) => {
            onFailure(new Error(`PAYMENT_FAILED: ${response.error.description}`));
        });

        paymentModal.open();
    } catch (error) {
        onFailure(error);
    }
};

export const handlePaymentSuccess = async (response, bookingDetails) => {
    const { addBooking } = useBookings();
    try {
        // ...existing payment verification code...

        // Add the new booking to context
        addBooking(bookingDetails);

        // ...rest of success handling code...
    } catch (error) {
        console.error('Payment verification failed:', error);
        throw error;
    }
};

// For offline bookings:
export const sendOfflineBookingConfirmation = async (bookingDetails) => {
    try {
        const response = await fetch('http://localhost:5000/api/send-offline-booking-confirmation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookingDetails }),
        });

        if (!response.ok) throw new Error('Failed to send confirmation emails');

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// For online bookings:
export const sendOnlineBookingConfirmation = async (bookingDetails) => {
    try {
        const response = await fetch('http://localhost:5000/api/send-online-booking-confirmation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookingDetails }),
        });

        if (!response.ok) throw new Error('Failed to send confirmation emails');

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};