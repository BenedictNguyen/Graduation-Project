// Danh sách avatar tượng trưng
export const AVATARS = [
  // Nam
  {
    id: 'male1',
    name: 'Nam 1',
    gender: 'male',
    icon: 'person',
    colors: ['#6366F1', '#8B5CF6'], // Tím
  },
  {
    id: 'male2',
    name: 'Nam 2',
    gender: 'male',
    icon: 'person-outline',
    colors: ['#3B82F6', '#2563EB'], // Xanh dương
  },
  {
    id: 'male3',
    name: 'Nam 3',
    gender: 'male',
    icon: 'person-circle',
    colors: ['#10B981', '#059669'], // Xanh lá
  },
  // Nữ
  {
    id: 'female1',
    name: 'Nữ 1',
    gender: 'female',
    icon: 'person',
    colors: ['#EC4899', '#DB2777'], // Hồng
  },
  {
    id: 'female2',
    name: 'Nữ 2',
    gender: 'female',
    icon: 'person-outline',
    colors: ['#F59E0B', '#D97706'], // Cam
  },
  {
    id: 'female3',
    name: 'Nữ 3',
    gender: 'female',
    icon: 'person-circle',
    colors: ['#EF4444', '#DC2626'], // Đỏ
  },
];

// Lấy thông tin avatar từ avatarId
export const getAvatarById = (avatarId) => {
  if (!avatarId) return null;
  return AVATARS.find(avatar => avatar.id === avatarId) || null;
};

// Lấy avatar mặc định (nếu không có avatarId)
export const getDefaultAvatar = () => {
  return {
    id: null,
    name: 'Mặc định',
    icon: 'person',
    colors: ['#6366F1', '#8B5CF6'],
  };
};

