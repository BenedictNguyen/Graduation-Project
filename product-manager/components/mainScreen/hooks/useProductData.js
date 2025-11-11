import { useEffect, useState, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { checkConnectionStatus } from '../utils/productUtils';
import { checkProductChanges } from '../services/notificationService';

export const useProductData = (navigation) => {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  const previousProductsRef = useRef(null);

  useEffect(() => {
    let firestoreUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous firestore listener nếu có
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (!user) {
        const currentRoute = navigation.getState()?.routes[navigation.getState()?.index]?.name;
        if (currentRoute !== 'Login') {
          console.log('User not authenticated, redirecting to login...');
          navigation.replace('Login');
        }
        setLoading(false);
        return;
      }
      
      // Đọc từ document "latest" thay vì query collection (hiệu quả hơn)
      const docRef = doc(db, 'product_counts', 'latest');

      firestoreUnsubscribe = onSnapshot(docRef, (docSnapshot) => {
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
        setLoading(false);
        setConnectionStatus('waiting');
      });
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
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

