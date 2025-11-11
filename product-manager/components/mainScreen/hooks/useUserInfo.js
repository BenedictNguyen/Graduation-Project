import { useEffect, useState } from 'react';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';

export const useUserInfo = (userId) => {
  const [userRole, setUserRole] = useState('employee');
  const [userName, setUserName] = useState('');
  const [userAvatarId, setUserAvatarId] = useState(null);

  // Check user info on mount
  const checkUserInfo = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role || 'employee');
        setUserAvatarId(data.avatarId || null);
        // Format tên: viết hoa chữ cái đầu của mỗi từ
        // Ưu tiên displayName, sau đó name, cuối cùng là email
        const name = data.displayName || data.name || data.email?.split('@')[0] || 'User';
        const formattedName = name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        setUserName(formattedName);
      }
    }
  };

  // Lắng nghe thay đổi avatar của user
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserAvatarId(data.avatarId || null);
        if (data.role) setUserRole(data.role);
        // Ưu tiên displayName, sau đó name, cuối cùng là email
        if (data.displayName || data.name || data.email) {
          const name = data.displayName || data.name || data.email?.split('@')[0] || 'User';
          const formattedName = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          setUserName(formattedName);
        }
      }
    }, (error) => {
      console.error('Error listening to user info:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  return { userRole, userName, userAvatarId, checkUserInfo };
};

