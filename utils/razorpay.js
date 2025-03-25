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

export const openRazorpayPayment = async (orderDetails, onSuccess, onFailure) => {
    try {
        await waitForRazorpay();

        // Create a Razorpay order by calling the backend
        const createOrderResponse = await fetch('http://localhost:5000/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: orderDetails.amount,
                currency: orderDetails.currency || 'INR',
                receipt: orderDetails.receipt || `order_${Date.now()}`,
                notes: {
                    bookingId: orderDetails.bookingId,
                },
            }),
        });

        if (!createOrderResponse.ok) {
            throw new Error('Failed to create order');
        }

        const order = await createOrderResponse.json();

        if (!order.id) {
            throw new Error('Invalid order response');
        }

        // Initialize Razorpay payment modal
        const options = {
            key: process.env.VITE_RAZORPAY_KEY_ID, // Ensure this environment variable is set
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            name: 'Binge-n-Bash',
            description: 'Booking Payment',
            image: 'https://your-logo-url.com/logo.png',
            handler: async function (response) {
                try {
                    // Verify the payment on the backend
                    const verifyResponse = await fetch('http://localhost:5000/api/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingId: orderDetails.bookingId,
                        }),
                    });

                    const verificationResult = await verifyResponse.json();

                    if (verificationResult.verified) {
                        onSuccess(response);
                    } else {
                        onFailure(new Error('Payment verification failed'));
                    }
                } catch (error) {
                    console.error('Error verifying payment:', error);
                    onFailure(error);
                }
            },
            prefill: {
                name: orderDetails.customerName,
                email: orderDetails.customerEmail,
                contact: orderDetails.customerPhone,
            },
            theme: {
                color: '#9f1d21',
            },
            modal: {
                ondismiss: function () {
                    onFailure(new Error('Payment cancelled by user'));
                },
            },
        };

        const paymentModal = new window.Razorpay(options);
        paymentModal.on('payment.failed', function (response) {
            onFailure(response.error);
        });

        paymentModal.open();
    } catch (error) {
        console.error('Error in payment process:', error);
        onFailure(error);
    }
};