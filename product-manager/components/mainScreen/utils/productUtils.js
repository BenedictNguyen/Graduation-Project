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

// Mapping tên sản phẩm (tiếng Việt) sang đường dẫn icon SVG
export const getProductIconPath = (productName) => {
  const iconMap = {
    'but xoa': require('../../../assets/icons/but_xoa.svg'),
    'cay but': require('../../../assets/icons/cay_but.svg'),
    'keo dan': require('../../../assets/icons/keo_dan.svg'),
    'tra den': require('../../../assets/icons/tra_den.svg'),
    'tra nhau': require('../../../assets/icons/tra_nhau.svg'),
    'tra dao': require('../../../assets/icons/tra_dao.svg'),
    'tra dau': require('../../../assets/icons/tra_dau.svg'),
    'bot rau ma': require('../../../assets/icons/bot_rau_ma.svg'),
  };
  
  // Trả về đường dẫn icon tương ứng
  return iconMap[productName.toLowerCase()] || null;
};

// Hàm mapping tên sản phẩm sang icon MaterialCommunityIcons (fallback)
export const getProductIcon = (productName) => {
  const iconMap = {
    'but xoa': 'pencil-remove', // Bút xóa
    'cay but': 'pen', // Cây bút
    'keo dan': 'bottle-tonic', // Keo dán
    'tra den': 'cup', // Trà đen
    'tra nhau': 'cup-outline', // Trà nhàu
    'tra dao': 'cup-outline', // Trà đào
    'tra dau': 'cup-outline', // Trà dâu
    'bot rau ma': 'bottle-tonic-outline', // Bột rau má
    // Fallback cho tên tiếng Anh (nếu có)
    'erasable pen': 'pencil-remove',
    'ballpoint pen': 'pen',
    'glue': 'bottle-tonic',
    'black tea': 'cup',
    'noni tea': 'cup-outline',
  };
  
  // Trả về icon tương ứng hoặc icon mặc định
  return iconMap[productName.toLowerCase()] || 'cube-outline';
};

// Lấy tên hiển thị đẹp cho sản phẩm
export const getProductDisplayName = (productName) => {
  const displayNames = {
    'but xoa': 'Bút xóa',
    'cay but': 'Cây bút',
    'keo dan': 'Keo dán',
    'tra den': 'Trà đen',
    'tra nhau': 'Trà nhàu',
    'tra dao': 'Trà đào',
    'tra dau': 'Trà dâu',
    'bot rau ma': 'Bột rau má',
  };
  
  return displayNames[productName.toLowerCase()] || productName;
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

