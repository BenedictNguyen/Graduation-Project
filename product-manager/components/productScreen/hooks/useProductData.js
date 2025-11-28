import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook để lấy dữ liệu sản phẩm mới nhất từ Firebase
 * Sử dụng document "latest" thay vì query collection để đảm bảo consistency
 * và performance tốt hơn
 * 
 * @param {Object} navigation - Navigation object từ React Navigation
 * @returns {Object} { latestProduct, loading }
 */
export function useProductData(navigation) {
  const [latestProduct, setLatestProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const isUnmountedRef = useRef(false);
  const firestoreUnsubscribeRef = useRef(null);

  useEffect(() => {
    isUnmountedRef.current = false;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous firestore listener nếu có (tránh race condition)
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      if (!user) {
        const currentRoute = navigation.getState()?.routes[navigation.getState()?.index]?.name;
        if (currentRoute !== 'Login') {
          console.log('User not authenticated, redirecting to login...');
          navigation.replace('Login');
        }
        if (!isUnmountedRef.current) {
          setLoading(false);
        }
        return;
      }

      // Đọc từ document "latest" thay vì query collection (hiệu quả hơn và đúng logic)
      // Đảm bảo consistency với mainScreen hook
      const docRef = doc(db, 'product_counts', 'latest');

      const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
        // Kiểm tra component chưa bị unmount trước khi setState
        if (isUnmountedRef.current) {
          return;
        }

        if (docSnapshot.exists()) {
          setLatestProduct({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          });
        } else {
          setLatestProduct(null);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to latest product:', error);
        if (!isUnmountedRef.current) {
          setLoading(false);
          setLatestProduct(null);
        }
      });

      firestoreUnsubscribeRef.current = unsubscribe;
    });

    return () => {
      isUnmountedRef.current = true;
      authUnsubscribe();
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
    };
  }, [navigation]);

  return { latestProduct, loading };
}

