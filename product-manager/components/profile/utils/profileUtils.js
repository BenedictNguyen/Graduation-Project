// Utility functions for profile screen

/**
 * Generate a random protection code for admin accounts
 * @returns {string} 8-character alphanumeric code
 */
export const generateProtectionCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

