// services/promoService.js
import { db } from './firebase';
import { ref, push, get, update, remove, set } from 'firebase/database';

export const getAllPromos = async () => {
    try {
        const promosRef = ref(db, 'promos');
        const snapshot = await get(promosRef);
        if (snapshot.exists()) {
            const promos = [];
            snapshot.forEach((child) => {
                promos.push({ id: child.key, ...child.val() });
            });
            return promos;
        }
        return [];
    } catch (error) {
        console.error('Error fetching promos:', error);
        throw error;
    }
};

export const addPromo = async (promo) => {
    try {
        const promosRef = ref(db, 'promos');
        const newPromoRef = push(promosRef);
        await set(newPromoRef, {
            text: promo.text,
            isActive: promo.isActive,
            createdAt: new Date().toISOString()
        });
        return newPromoRef.key;
    } catch (error) {
        console.error('Error adding promo:', error);
        throw error;
    }
};

export const updatePromo = async (id, promo) => {
    try {
        const promoRef = ref(db, `promos/${id}`);
        await update(promoRef, {
            text: promo.text,
            isActive: promo.isActive,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating promo:', error);
        throw error;
    }
};

export const deletePromo = async (id) => {
    try {
        const promoRef = ref(db, `promos/${id}`);
        await remove(promoRef);
    } catch (error) {
        console.error('Error deleting promo:', error);
        throw error;
    }
};