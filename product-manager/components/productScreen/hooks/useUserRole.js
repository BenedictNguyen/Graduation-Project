import { useState, useEffect } from 'react';
import { auth } from '../../../utils/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../utils/firebaseConfig';

export function useUserRole() {
  const [userRole, setUserRole] = useState('employee');

  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'employee');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }
    };

    checkUserRole();
  }, []);

  return userRole;
}

