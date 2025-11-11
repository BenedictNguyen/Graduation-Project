import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

export default function ProductItem({ name, qty }) {
  return (
    <View style={styles.productItem}>
      <View style={styles.productItemLeft}>
        <View style={styles.productDot} />
        <Text style={styles.productItemName}>{name}</Text>
      </View>
      <View style={styles.productQtyBadge}>
        <Text style={styles.productItemQty}>{qty}</Text>
      </View>
    </View>
  );
}

