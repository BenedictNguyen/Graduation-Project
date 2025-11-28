import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProductIcon } from '../utils/productUtils';

/**
 * Component hiển thị icon cho sản phẩm
 * Sử dụng MaterialCommunityIcons làm fallback nếu không có SVG
 */
export default function ProductIcon({ 
  productName, 
  size = 26, 
  color = "#6366F1",
  style 
}) {
  // Lấy icon name từ MaterialCommunityIcons
  const iconName = getProductIcon(productName);
  
  return (
    <View style={style}>
      <MaterialCommunityIcons 
        name={iconName} 
        size={size} 
        color={color} 
      />
    </View>
  );
}

