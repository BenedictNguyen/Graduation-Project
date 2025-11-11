import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProductItem from './ProductItem';
import { formatTimestamp } from '../utils/productUtils';
import { styles } from '../styles';

export default function HistoryCard({ latestProduct, userRole }) {
  if (!latestProduct) return null;

  const sortedProducts = latestProduct.products 
    ? Object.entries(latestProduct.products).sort((a, b) => {
        const [, qtyA] = a;
        const [, qtyB] = b;
        const isInStockA = qtyA > 0;
        const isInStockB = qtyB > 0;
        
        // Sản phẩm còn hàng lên đầu
        if (isInStockA && !isInStockB) return -1;
        if (!isInStockA && isInStockB) return 1;
        
        // Nếu cả hai đều còn hàng hoặc cả hai đều hết hàng, sắp xếp theo số lượng giảm dần
        return qtyB - qtyA;
      })
    : [];

  return (
    <View style={styles.historyCard}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.05)']}
        style={styles.historyCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.latestBadge}>
          <Ionicons name="flash" size={12} color="#FCD34D" />
          <Text style={styles.latestText}>Mới nhất</Text>
        </View>
        
        <View style={styles.historyHeader}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color="#6366F1" />
            <Text style={styles.timeText}>
              {formatTimestamp(latestProduct.timestamp)}
            </Text>
          </View>
          {userRole === 'admin' && (
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.productsGrid}>
          {sortedProducts.map(([name, qty]) => (
            <ProductItem key={name} name={name} qty={qty} />
          ))}
        </View>

        {userRole === 'admin' && (
          <View style={styles.adminInfo}>
            <Ionicons name="key-outline" size={12} color="#64748B" />
            <Text style={styles.adminInfoText}>
              ID: {latestProduct.id.substring(0, 12)}...
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

