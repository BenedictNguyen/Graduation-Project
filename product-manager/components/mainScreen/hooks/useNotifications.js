import { useEffect, useState } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../../utils/firebaseConfig';

export const useNotifications = (userId) => {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Lắng nghe số lượng thông báo chưa đọc
  useEffect(() => {
    if (!userId) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationCount(snapshot.size);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  return { unreadNotificationCount };
};

