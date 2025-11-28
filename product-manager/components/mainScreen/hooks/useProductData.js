import { useEffect, useState, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { checkConnectionStatus } from '../utils/productUtils';
import { checkProductChanges } from '../services/notificationService';

/**
 * Hook để lấy dữ liệu sản phẩm mới nhất từ Firebase
 * Có thêm logic kiểm tra connection status và notification
 * 
 * @param {Object} navigation - Navigation object từ React Navigation
 * @returns {Object} { latestData, loading, connectionStatus }
 */
export const useProductData = (navigation) => {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  const previousProductsRef = useRef(null);
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
      
      // Đọc từ document "latest" thay vì query collection (hiệu quả hơn)
      const docRef = doc(db, 'product_counts', 'latest');

      const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
        // Kiểm tra component chưa bị unmount trước khi setState
        if (isUnmountedRef.current) {
          return;
        }

        if (docSnapshot.exists()) {
          const data = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          };
          
          // Kiểm tra thay đổi và tạo thông báo
          if (previousProductsRef.current) {
            checkProductChanges(previousProductsRef.current, data.products, user.uid);
          }
          
          setLatestData(data);
          previousProductsRef.current = data.products;
          
          // Kiểm tra trạng thái kết nối dựa trên timestamp
          const status = checkConnectionStatus(data.timestamp);
          setConnectionStatus(status);
        } else {
          setLatestData(null);
          setConnectionStatus('waiting');
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to latest data:', error);
        if (!isUnmountedRef.current) {
          setLoading(false);
          setConnectionStatus('waiting');
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

  // Kiểm tra lại trạng thái kết nối định kỳ
  useEffect(() => {
    if (latestData?.timestamp) {
      const interval = setInterval(() => {
        const status = checkConnectionStatus(latestData.timestamp);
        setConnectionStatus(status);
      }, 3000); // Kiểm tra mỗi 3 giây

      return () => clearInterval(interval);
    }
  }, [latestData?.timestamp]);

  return { latestData, loading, connectionStatus };
};

