import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabBar from './bottomTabBar';

import { getProductIcon, getProductDisplayName } from './mainScreen/utils/productUtils';
import ProductIcon from './mainScreen/components/ProductIcon';

export default function ProductTypesScreen({ navigation }) {
  const [productNames, setProductNames] = useState([]);
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
          navigation.replace('Login');
        }
        setLoading(false);
        return;
      }

      // Đọc từ document "latest"
      const docRef = doc(db, 'product_counts', 'latest');

      firestoreUnsubscribe = onSnapshot(docRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const products = data.products || {};
          // Lấy danh sách tên sản phẩm (sắp xếp theo tên)
          const names = Object.keys(products).sort();
          setProductNames(names);
        } else {
          setProductNames([]);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to product types:', error);
        setProductNames([]);
        setLoading(false);
      });
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loại sản phẩm</Text>
        <Text style={styles.headerSubtitle}>Danh sách các loại sản phẩm</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {productNames.length > 0 ? (
          <View style={styles.productList}>
            {productNames.map((name, index) => (
              <View key={name} style={styles.productItem}>
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                  style={styles.productItemGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.productItemLeft}>
                    <View style={styles.productIconContainer}>
                      <LinearGradient
                        colors={['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.2)']}
                        style={styles.productIconGradient}
                      >
                        <ProductIcon 
                          productName={name}
                          size={24} 
                          color="#6366F1" 
                        />
                      </LinearGradient>
                    </View>
                    <Text style={styles.productName}>{getProductDisplayName(name)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6366F1" />
                </LinearGradient>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.emptyStateGradient}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="albums-outline" size={72} color="#6366F1" />
              </View>
              <Text style={styles.emptyText}>Chưa có loại sản phẩm</Text>
              <Text style={styles.emptySubtext}>
                Dữ liệu sẽ hiển thị khi AI phát hiện sản phẩm trên kệ
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
      <BottomTabBar navigation={navigation} currentRoute="Main" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  productList: {
    gap: 12,
  },
  productItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  productItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
  },
  productItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
  },
  emptyState: {
    marginTop: 40,
  },
  emptyStateGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});

