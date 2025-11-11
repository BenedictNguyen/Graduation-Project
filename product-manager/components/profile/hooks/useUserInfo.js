import { useState, useEffect } from 'react';
import { auth, db } from '../../../utils/firebaseConfig';
import { getDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { generateProtectionCode } from '../utils/profileUtils';

export const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserInfo = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          let userData = userDoc.data();
          
          // Nếu là Admin nhưng chưa có mã khóa bảo vệ, tạo mã mới
          if (userData.role === 'admin' && !userData.adminProtectionCode) {
            const newCode = generateProtectionCode();
            await updateDoc(userDocRef, {
              adminProtectionCode: newCode
            });
            userData.adminProtectionCode = newCode;
          }
          
          setUserInfo({
            uid: user.uid,
            email: user.email,
            ...userData,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserInfo();
    
    // Lắng nghe thay đổi avatar và tên hiển thị
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setUserInfo(prev => ({
            ...prev,
            avatarId: data.avatarId || null,
            displayName: data.displayName || null,
          }));
        }
      });
      
      return () => unsubscribe();
    }
  }, []);

  return { userInfo, loading, loadUserInfo, setUserInfo };
};

