// src/utils/firestore.js
import { db } from '../services/firebase'; // Ensure Firebase is initialized
import { collection, addDoc } from 'firebase/firestore';

export const addBooking = async (bookingDetails) => {
    try {
        const docRef = await addDoc(collection(db, 'bookings'), bookingDetails);
        console.log("Booking added with ID: ", docRef.id);
        return docRef.id; // Return the document ID
    } catch (error) {
        console.error("Error adding booking: ", error);
        throw error; // Rethrow the error for handling in the component
    }
};