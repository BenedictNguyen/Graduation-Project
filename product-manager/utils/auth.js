// utils/auth.js (Firebase version)
import { auth, db } from "./firebaseConfig";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, collection, query, where, getDocs 
} from "firebase/firestore";

// === Tạo mã khóa bảo vệ ===
const generateProtectionCode = () => {
  // Tạo mã 8 ký tự gồm chữ và số
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// === Kiểm tra có Admin nào trong hệ thống không ===
const hasAnyAdmin = async () => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking admin:", error);
    return false;
  }
};

// === Kiểm tra mã khóa bảo vệ ===
export const verifyAdminProtectionCode = async (code) => {
  try {
    // Tìm tất cả Admin trong Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);
    
    // Kiểm tra xem có Admin nào có mã khóa khớp không
    let found = false;
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.adminProtectionCode === code) {
        found = true;
      }
    });
    
    return found;
  } catch (error) {
    console.error("Error verifying protection code:", error);
    return false;
  }
};

// === Đăng ký ===
export const handleSignup = async (email, password, role = "employee", protectionCode = null) => {
  try {
    // Nếu đăng ký Admin, kiểm tra mã khóa bảo vệ
    if (role === "admin") {
      const hasAdmin = await hasAnyAdmin();
      
      // Nếu đã có Admin trong hệ thống, bắt buộc phải có mã khóa
      if (hasAdmin) {
        if (!protectionCode) {
          return { success: false, message: "Vui lòng nhập mã khóa bảo vệ để đăng ký Admin!" };
        }
        
        const isValidCode = await verifyAdminProtectionCode(protectionCode);
        if (!isValidCode) {
          return { success: false, message: "Mã khóa bảo vệ không đúng! Vui lòng kiểm tra lại." };
        }
      }
      // Nếu chưa có Admin nào, cho phép đăng ký Admin đầu tiên mà không cần mã khóa
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Tạo mã khóa bảo vệ cho Admin mới
    const adminProtectionCode = role === "admin" ? generateProtectionCode() : null;

    // Lưu thêm dữ liệu vào Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      role,
      employeeId: role === "admin" ? "ADMIN" + Date.now() : "EMP" + Date.now(),
      createdAt: new Date().toISOString(),
      ...(adminProtectionCode && { adminProtectionCode }),
    });

    return { success: true, user, adminProtectionCode };
  } 
  catch (error) {
    return { success: false, message: error.message };
  }
};

// === Đăng nhập ===
export const handleLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    // Nếu user chưa có document, tạo một document mặc định
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email || email,
        role: "employee",
        employeeId: "EMP" + Date.now(),
        createdAt: new Date().toISOString(),
      });
      return { success: true, user: { uid: user.uid, email: user.email || email, role: "employee" } };
    }

    const userData = userDoc.data();
    return { success: true, user: { uid: user.uid, ...userData } };
  } 
  catch (error) {
    let message = 'Bạn đã nhập sai tài khoản hoặc mật khẩu, vui lòng kiểm tra lại!';
    
    if (error.code === 'auth/invalid-email') {
      message = 'Địa chỉ email không hợp lệ!';
    } else if (error.code === 'auth/user-not-found') {
      message = 'Tài khoản không tồn tại!';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Bạn đã nhập sai tài khoản hoặc mật khẩu, vui lòng kiểm tra lại!';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau!';
    }
    
    return { success: false, message };
  }
};

// === Đăng xuất ===
export const clearUserSession = async () => {
  await signOut(auth);
};

// === Quên mật khẩu ===
export const handleForgotPassword = async (email) => {
  try {
    if (!email) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email!' };
    }

    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: 'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.' 
    };
  } catch (error) {
    let message = 'Có lỗi xảy ra khi gửi email đặt lại mật khẩu!';
    
    if (error.code === 'auth/invalid-email') {
      message = 'Địa chỉ email không hợp lệ!';
    } else if (error.code === 'auth/user-not-found') {
      message = 'Không tìm thấy tài khoản với email này!';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau!';
    }
    
    return { success: false, message };
  }
};

// === Session (Firestore thay vì global) ===
export const getUserSession = () => auth.currentUser;

// === Kiểm tra vai trò ===
export const isAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  const docSnap = await getDoc(doc(db, "users", user.uid));
  return docSnap.exists() && docSnap.data().role === "admin";
};

// === Lấy thông tin role của user hiện tại ===
export const getUserRole = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      return docSnap.data().role || "employee";
    }
    return "employee";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "employee";
  }
};

// === Kiểm tra có phải employee không ===
export const isEmployee = async () => {
  const role = await getUserRole();
  return role === "employee";
};

// === Lấy thông tin user đầy đủ ===
export const getUserInfo = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      return {
        uid: user.uid,
        email: user.email,
        ...docSnap.data(),
      };
    }
    return {
      uid: user.uid,
      email: user.email,
      role: "employee",
    };
  } catch (error) {
    console.error("Error getting user info:", error);
    return null;
  }
};
