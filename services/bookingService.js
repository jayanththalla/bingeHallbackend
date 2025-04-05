// In bookingService.js
import { db } from './firebase';
import { ref, set, push, get, update, remove, onValue } from 'firebase/database';

// Add this utility function at the top of the file
const formatDate = (date) => {
    if (!date) return null;

    // Handle date string input
    const d = new Date(date);

    // Get UTC components to avoid timezone issues
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Save booking details to Firebase
export const saveBooking = async (bookingDetails) => {
    try {
        const { timeSlot, theaterId } = bookingDetails;
        // Ensure date is in correct format
        const date = formatDate(bookingDetails.date);

        // Create booking reference
        const bookingRef = push(ref(db, 'bookings'));

        // Format booking data
        const bookingData = {
            ...bookingDetails,
            date, // Use formatted date
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save booking data
        await set(bookingRef, bookingData);

        // Format time slot key correctly
        const timeSlotKey = `${theaterId}-${timeSlot}`;

        // Save time slot with correct structure
        await set(ref(db, `timeSlots/${date}/${timeSlotKey}/${theaterId}`), {
            bookingId: bookingRef.key,
            status: 'confirmed',
            bookedAt: new Date().toISOString(),
            paymentStatus: bookingData.paymentStatus || 'paid'
        });

        return bookingRef.key;
    } catch (error) {
        console.error('Error saving booking:', error);
        throw error;
    }
};

// Check if a time slot is available
export const checkTimeSlotAvailability = async (date, timeSlot, theaterId) => {
    try {
        const formattedDate = formatDate(date);
        const bookedSlots = await fetchBookedSlots(formattedDate, theaterId);
        const timeSlotKey = `${theaterId}-${timeSlot}`;
        return !bookedSlots.includes(timeSlotKey);
    } catch (error) {
        console.error('Error checking time slot availability:', error);
        throw error;
    }
};

// Reserve a time slot
export const reserveTimeSlot = async (date, timeSlot, theaterId, bookingId) => {
    try {
        const formattedDate = formatDate(date);
        const timeSlotKey = `${theaterId}-${timeSlot}`;

        await set(ref(db, `timeSlots/${formattedDate}/${timeSlotKey}/${theaterId}`), {
            bookingId,
            status: 'confirmed',
            bookedAt: new Date().toISOString(),
            paymentStatus: 'paid'
        });
    } catch (error) {
        console.error('Error reserving time slot:', error);
        throw error;
    }
};

export const releaseTimeSlot = async (date, timeSlot, theaterId) => {
    await remove(ref(db, `timeSlots/${date}/${timeSlot}/${theaterId}`));
};
// In bookingService.js
export const getAllBookings = async () => {
    const snapshot = await get(ref(db, 'bookings'));
    if (snapshot.exists()) {
        const bookings = snapshot.val();
        // Process each booking to ensure payment data structure
        Object.keys(bookings).forEach(key => {
            const booking = bookings[key];

            // Ensure paymentHistory is an array and has proper structure
            if (!Array.isArray(booking.paymentHistory)) {
                booking.paymentHistory = [];
            }

            // Ensure each payment has required fields
            booking.paymentHistory = booking.paymentHistory.map(payment => ({
                date: payment.date || new Date().toISOString(),
                amount: payment.amount || 0,
                method: payment.method || 'offline',
                type: payment.type || 'partial',
                status: payment.status || 'success',
                transactionId: payment.transactionId || null,
                receivedBy: payment.receivedBy || 'System',
                notes: payment.notes || '',
                ...payment
            }));

            // Calculate amount paid if not set
            if (typeof booking.amountPaid !== 'number') {
                booking.amountPaid = booking.paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
            }

            // Set payment status if not set
            if (!booking.paymentStatus) {
                booking.paymentStatus = booking.amountPaid >= booking.totalPrice ? 'paid' :
                    booking.amountPaid > 0 ? 'partial' : 'unpaid';
            }
        });
        return bookings;
    }
    return null;
};

// Fetch all booked slots for a specific theater and date
export const fetchBookedSlots = async (date, theaterId) => {
    try {
        // Format date should already be in YYYY-MM-DD format
        console.log('Fetching slots for date:', date);

        const timeSlotsSnapshot = await get(ref(db, `timeSlots/${date}`));
        const bookedSlots = [];

        if (timeSlotsSnapshot.exists()) {
            const slots = timeSlotsSnapshot.val();
            console.log('Raw slots data:', slots);

            // Loop through all time slots
            Object.keys(slots).forEach(key => {
                // Handle array structure
                if (Array.isArray(slots[key])) {
                    slots[key].forEach((booking, index) => {
                        if (booking && (booking.status === 'confirmed' || booking.paymentStatus === 'paid')) {
                            bookedSlots.push(key);
                        }
                    });
                }
                // Handle object structure
                else if (typeof slots[key] === 'object') {
                    Object.keys(slots[key]).forEach(slotTheaterId => {
                        if (slotTheaterId === theaterId.toString()) {
                            const booking = slots[key][slotTheaterId];
                            if (booking && (booking.status === 'confirmed' || booking.paymentStatus === 'paid')) {
                                bookedSlots.push(key);
                            }
                        }
                    });
                }
            });
        }

        console.log(`Booked slots for theater ${theaterId}:`, bookedSlots);
        return bookedSlots;
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        return [];
    }
};

export const updateBookingStatus = async (bookingId, newStatus) => {
    try {
        const bookingRef = ref(db, `bookings/${bookingId}`);
        await update(bookingRef, { status: newStatus });
        console.log(`Booking status updated to ${newStatus} for booking ID: ${bookingId}`);
    } catch (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }
};


export const deleteBooking = async (bookingId) => {
    try {
        const bookingRef = ref(db, `bookings/${bookingId}`);
        await remove(bookingRef);
    } catch (error) {
        console.error('Error deleting booking:', error);
        throw error;
    }
};

// Add this to your Firebase utility file (e.g., bookingService.js)
export const fetchBookingDetails = async (bookingId) => {
    const snapshot = await get(ref(db, `bookings/${bookingId}`));
    if (!snapshot.exists()) {
        throw new Error('Booking not found');
    }
    return snapshot.val();
};

export const updateBookingPayment = async (bookingId, status, amount, transactionId) => {
    try {
        const updates = {
            status: status === 'paid' ? 'confirmed' : 'pending',
            paymentStatus: status,
            amountPaid: amount,
            updatedAt: new Date().toISOString()
        };

        // Add transaction ID to payment history
        const bookingRef = ref(db, `bookings/${bookingId}`);
        const snapshot = await get(bookingRef);

        if (snapshot.exists()) {
            const booking = snapshot.val();
            const paymentHistory = booking.paymentHistory || [];

            // Update the latest payment entry with transaction ID
            if (paymentHistory.length > 0) {
                paymentHistory[0].transactionId = transactionId;
                updates.paymentHistory = paymentHistory;
            } else {
                updates.paymentHistory = [{
                    amount,
                    type: status === 'paid' ? 'full' : 'partial',
                    method: 'online',
                    date: new Date().toISOString(),
                    transactionId
                }];
            }
        }

        await update(ref(db, `bookings/${bookingId}`), updates);
        return updates;
    } catch (error) {
        console.error('Error updating booking payment:', error);
        throw error;
    }
};

// In bookingService.js
export const recordOfflinePayment = async (bookingId, amount, receivedBy) => {
    const bookingRef = ref(db, `bookings/${bookingId}`);
    const snapshot = await get(bookingRef);

    if (!snapshot.exists()) {
        throw new Error('Booking not found');
    }

    const booking = snapshot.val();
    const newAmountPaid = (booking.amountPaid || 0) + amount;
    const isFullyPaid = newAmountPaid >= booking.totalPrice;

    const updates = {
        amountPaid: newAmountPaid,
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        status: isFullyPaid ? 'confirmed' : booking.status,
        updatedAt: new Date().toISOString(),
        [`paymentHistory/${booking.paymentHistory?.length || 0}`]: {
            amount,
            type: isFullyPaid ? 'full' : 'partial',
            method: 'offline',
            date: new Date().toISOString(),
            receivedBy
        }
    };

    await update(bookingRef, updates);
    return updates;
};

// Add this to your bookingService.js
export const cleanupExpiredBookings = async () => {
    const bookingsRef = ref(db, 'bookings');
    const timeSlotsRef = ref(db, 'timeSlots');
    const [bookingsSnapshot, timeSlotsSnapshot] = await Promise.all([get(bookingsRef), get(timeSlotsRef)]);

    if (!bookingsSnapshot.exists()) return;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const updates = {};
    const timeSlotUpdates = {};

    Object.entries(bookingsSnapshot.val()).forEach(([id, booking]) => {
        if (booking.status === 'pending' && booking.createdAt < oneHourAgo) {
            // Mark booking as expired
            updates[`bookings/${id}/status`] = 'expired';

            // Release time slot if it was reserved
            if (booking.date && booking.timeSlot && booking.theaterId) {
                timeSlotUpdates[`timeSlots/${booking.date}/${booking.timeSlot}/${booking.theaterId}`] = null;
            }
        }
    });

    // Execute all updates in a single transaction
    if (Object.keys(updates).length > 0 || Object.keys(timeSlotUpdates).length > 0) {
        await update(ref(db), { ...updates, ...timeSlotUpdates });
    }
};

// Add this to your bookingService.js
export const subscribeToBookings = (callback) => {
    const bookingsRef = ref(db, 'bookings');

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
        const bookings = [];
        snapshot.forEach((childSnapshot) => {
            bookings.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        callback(bookings);
    });

    return unsubscribe;
};

