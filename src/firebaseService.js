import { database } from './firebaseConfig';
import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove,
  onValue,
  off
} from 'firebase/database';

// Helper class for Firebase Realtime Database operations
class FirebaseService {
  // Get all data from a path
  async get(path) {
    try {
      const dbRef = ref(database, path);
      const snapshot = await get(dbRef);
      
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Firebase get error:', error);
      return { success: false, error: error.message };
    }
  }

  // Set data at a path (overwrites existing data)
  async set(path, data) {
    try {
      const dbRef = ref(database, path);
      await set(dbRef, data);
      return { success: true };
    } catch (error) {
      console.error('Firebase set error:', error);
      return { success: false, error: error.message };
    }
  }

  // Push data to a path (creates unique key)
  async push(path, data) {
    try {
      const dbRef = ref(database, path);
      const newRef = await push(dbRef, data);
      return { success: true, key: newRef.key };
    } catch (error) {
      console.error('Firebase push error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update specific fields at a path
  async update(path, data) {
    try {
      const dbRef = ref(database, path);
      await update(dbRef, data);
      return { success: true };
    } catch (error) {
      console.error('Firebase update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete data at a path
  async delete(path) {
    try {
      const dbRef = ref(database, path);
      await remove(dbRef);
      return { success: true };
    } catch (error) {
      console.error('Firebase delete error:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen to real-time changes
  subscribe(path, callback) {
    const dbRef = ref(database, path);
    
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ success: true, data: snapshot.val() });
      } else {
        callback({ success: true, data: null });
      }
    }, (error) => {
      console.error('Firebase subscription error:', error);
      callback({ success: false, error: error.message });
    });

    // Return unsubscribe function
    return () => {
      off(dbRef);
    };
  }
}

export default new FirebaseService();
