import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProductDisplayName } from '../utils/productUtils';
import ProductIcon from './ProductIcon';
import { productStyles } from '../styles';

export default function ProductList({ products, maxProducts, fadeAnim, slideAnim }) {
  if (!products || Object.keys(products).length === 0) {
    return (
      <Animated.View 
        style={[
          productStyles.emptyState,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
          style={productStyles.emptyStateGradient}
        >
          <View style={productStyles.emptyIconContainer}>
            <Ionicons name="cube-outline" size={72} color="#6366F1" />
          </View>
          <Text style={productStyles.emptyText}>Chưa có dữ liệu sản phẩm</Text>
          <Text style={productStyles.emptySubtext}>
            Dữ liệu sẽ hiển thị khi AI phát hiện sản phẩm trên kệ
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        productStyles.productList,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {Object.entries(products)
        .sort((a, b) => {
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
        .map(([name, qty]) => {
          const isOutOfStock = qty === 0;
          const progressPercentage = (qty / maxProducts) * 100;
          return (
            <Animated.View 
              key={name} 
              style={[
                productStyles.productCard,
                isOutOfStock && productStyles.productCardOutOfStock,
                {
                  transform: [{ 
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50],
                    })
                  }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.8}>
                <LinearGradient
                  colors={isOutOfStock 
                    ? ['rgba(100, 116, 139, 0.08)', 'rgba(71, 85, 105, 0.04)']
                    : ['rgba(99, 102, 241, 0.12)', 'rgba(139, 92, 246, 0.08)', 'rgba(167, 139, 250, 0.04)']
                  }
                  style={productStyles.productCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[productStyles.productIconContainer, isOutOfStock && productStyles.productIconContainerOutOfStock]}>
                    <LinearGradient
                      colors={isOutOfStock
                        ? ['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)']
                        : ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.2)']
                      }
                      style={productStyles.productIconGradient}
                    >
                      <ProductIcon 
                        productName={name}
                        size={26} 
                        color={isOutOfStock ? "#64748B" : "#6366F1"} 
                      />
                    </LinearGradient>
                  </View>
                  <View style={productStyles.productInfo}>
                    <View style={productStyles.productNameRow}>
                      <Text 
                        style={[productStyles.productName, isOutOfStock && productStyles.productNameOutOfStock]}
                        numberOfLines={1}
                      >
                        {getProductDisplayName(name)}
                      </Text>
                      {isOutOfStock && (
                        <View style={productStyles.outOfStockBadge}>
                          <Text style={productStyles.outOfStockText}>Hết hàng</Text>
                        </View>
                      )}
                    </View>
                    <View style={productStyles.productQtyRow}>
                      <Text style={[productStyles.productQtyInline, isOutOfStock && productStyles.productQtyInlineOutOfStock]}>
                        {qty}
                      </Text>
                      <Text style={[productStyles.productSubtext, isOutOfStock && productStyles.productSubtextOutOfStock]}>
                        {' '}đơn vị
                      </Text>
                    </View>
                    {!isOutOfStock && (
                      <View style={productStyles.productProgressContainer}>
                        <View style={productStyles.productProgressBar}>
                          <Animated.View 
                            style={[
                              productStyles.productProgressFill,
                              { 
                                width: `${Math.min(progressPercentage, 100)}%`,
                              }
                            ]} 
                          />
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={productStyles.productArrow}>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={isOutOfStock ? "#64748B" : "#6366F1"} 
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
    </Animated.View>
  );
}

