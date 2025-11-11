import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { processChartData } from '../utils/productUtils';

export function useProductData(navigation, showChart, period) {
  const [latestProduct, setLatestProduct] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let firestoreUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
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

      // Query cho bản ghi mới nhất
      const latestQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      // Query cho biểu đồ
      const chartQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      // Lắng nghe bản ghi mới nhất
      const latestUnsubscribe = onSnapshot(latestQuery, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setLatestProduct({
            id: doc.id,
            ...doc.data(),
          });
        } else {
          setLatestProduct(null);
        }
      }, (error) => {
        console.error('Error listening to latest product:', error);
        setLatestProduct(null);
      });

      // Lắng nghe dữ liệu cho biểu đồ
      const chartUnsubscribe = onSnapshot(chartQuery, (snapshot) => {
        setLoading(false);
      }, (error) => {
        console.error('Error listening to chart product data:', error);
        setLoading(false);
        setChartData(null);
      });

      firestoreUnsubscribe = () => {
        latestUnsubscribe();
        chartUnsubscribe();
      };
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [navigation]);

  // useEffect để xử lý lại dữ liệu khi period thay đổi
  useEffect(() => {
    if (showChart) {
      const chartQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      
      const unsubscribe = onSnapshot(chartQuery, (snapshot) => {
        const allData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        processChartData(allData, period, setChartData);
      }, (error) => {
        console.error('Error listening to chart data:', error);
        setChartData(null);
      });

      return () => unsubscribe();
    } else {
      setChartData(null);
    }
  }, [period, showChart]);

  return { latestProduct, chartData, loading };
}

