// Product utility functions

// Calculate total products
export const calculateTotal = (products) => {
  if (!products) return 0;
  return Object.values(products).reduce((sum, qty) => sum + qty, 0);
};

// Get product count (number of different products)
export const getProductCount = (products) => {
  if (!products) return 0;
  return Object.keys(products).length;
};

// Hàm mapping tên sản phẩm sang icon tượng trưng
export const getProductIcon = (productName) => {
  const iconMap = {
    'erasable pen': 'pencil-remove', // Bút xóa được
    'ballpoint pen': 'pen', // Bút bi
    'glue': 'bottle-tonic', // Keo dán
    'black tea': 'cup', // Trà đen
    'noni tea': 'cup-outline', // Trà noni
  };
  
  // Trả về icon tương ứng hoặc icon mặc định
  return iconMap[productName.toLowerCase()] || 'cube-outline';
};

// Check connection status based on timestamp
export const checkConnectionStatus = (timestamp) => {
  if (!timestamp) {
    return 'waiting';
  }

  try {
    // Parse timestamp (format: "YYYY-MM-DD HH:MM:SS")
    const timestampDate = new Date(timestamp.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2'));
    const now = new Date();
    const diffSeconds = (now - timestampDate) / 1000;

    // Nếu dữ liệu cập nhật trong vòng 10 giây thì coi như đã kết nối
    // (chương trình Python gửi mỗi 5 giây)
    if (diffSeconds <= 10) {
      return 'connected';
    } else {
      return 'waiting';
    }
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return 'waiting';
  }
};

