"""
YOLOv11 Product Detection + Firebase Integration
Phiên bản cải tiến với config file và error handling tốt hơn
"""
# Suppress gRPC warnings (Firebase/ALTS)
import os
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GLOG_minloglevel'] = '2'

from ultralytics import YOLO
import cv2
import time
from collections import Counter
import firebase_admin
from firebase_admin import credentials, firestore, db as rtdb
from pathlib import Path
import json
import numpy as np
import sys
import contextlib
from typing import Optional, Dict, Tuple, Any

# ============================================================================
# CONFIGURATION - Tách riêng để dễ quản lý
# ============================================================================

class Config:
    """Cấu hình hệ thống - có thể load từ file config.json"""
    
    # Firebase
    FIREBASE_CRED_PATH = "graduationproject-8fc97-firebase-adminsdk-fbsvc-b8be2051cd.json"
    FIREBASE_COLLECTION = "product_counts"
    
    # YOLO Model - Sử dụng relative path để portable hơn
    # Có thể override bằng config.json hoặc environment variable
    MODEL_PATH = "best.pt"  # Relative path - file cùng thư mục với script
    CONFIDENCE_THRESHOLD = 0.5

    # Camera
    CAMERA_INDEX = 2  # Thay đổi thành 0 nếu webcam mặc định
    CAMERA_WIDTH = 640   # Resolution chuẩn cho camera
    CAMERA_HEIGHT = 480
    
    # Data sending
    SEND_INTERVAL = 5  # Giây 
    UPDATE_MODE = True  # True: Update document "latest", False: Tạo document mới
    MIN_CHANGE_THRESHOLD = 0  # Chỉ update nếu tổng số sản phẩm thay đổi >= threshold này
    RESET_ON_START = True  # True: Reset Firebase về 0 khi khởi động, False: Tiếp tục từ dữ liệu hiện có
    
    # Display
    WINDOW_NAME = "YOLOv11 Product Detection"
    DISPLAY_FPS = True
    HEADLESS_MODE = False  # True: Không hiển thị cửa sổ (dành cho server không có màn hình)
    
    @classmethod
    def load_from_file(cls, config_path: str = 'config.json') -> None:
        """Load config từ file JSON (nếu tồn tại)
        
        Args:
            config_path: Đường dẫn đến file config JSON
        """
        if Path(config_path).exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                for key, value in config_data.items():
                    if hasattr(cls, key):
                        setattr(cls, key, value)
            print(f"✅ Loaded config from {config_path}")
        else:
            print(f"⚠️  Config file not found: {config_path}, using defaults")

# ============================================================================
# FIREBASE SETUP
# ============================================================================

def init_firebase() -> Optional[firestore.Client]:
    """Khởi tạo Firebase với error handling và suppress gRPC warnings
    
    Returns:
        Firestore client nếu thành công, None nếu thất bại
    """
    try:
        # Kiểm tra file credential
        if not Path(Config.FIREBASE_CRED_PATH).exists():
            raise FileNotFoundError(f"Firebase credential not found: {Config.FIREBASE_CRED_PATH}")
        
        # Khởi tạo Firebase (chỉ 1 lần) - suppress stderr để tránh gRPC warnings
        if not firebase_admin._apps:
            # Tạm thời redirect stderr để suppress gRPC/ALTS warnings
            with open(os.devnull, 'w') as devnull:
                with contextlib.redirect_stderr(devnull):
                    cred = credentials.Certificate(Config.FIREBASE_CRED_PATH)
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': 'https://graduationproject-8fc97-default-rtdb.firebaseio.com/'
                    })
            print("✅ Firebase initialized successfully (Firestore + Realtime Database)")
        
        db = firestore.client()
        return db
    
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("⚠️  Continuing without Firebase (data won't be sent)")
        return None

# ============================================================================
# YOLO MODEL SETUP
# ============================================================================

def init_model() -> Tuple[YOLO, Dict[int, str]]:
    """Khởi tạo YOLO model với error handling
    
    Returns:
        Tuple chứa (model, names dictionary)
        
    Raises:
        FileNotFoundError: Nếu không tìm thấy file model
        Exception: Các lỗi khác khi load model
    """
    try:
        # Kiểm tra file model
        if not Path(Config.MODEL_PATH).exists():
            raise FileNotFoundError(f"Model file not found: {Config.MODEL_PATH}")
        
        print(f"📦 Loading YOLO model: {Config.MODEL_PATH}")
        model = YOLO(Config.MODEL_PATH)
        
        # Lấy class names
        names = model.names
        print(f"✅ Model loaded successfully")
        print(f"📋 Detected classes: {list(names.values())}")
        
        return model, names
    
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        raise

# ============================================================================
# CAMERA SETUP
# ============================================================================

def init_camera() -> cv2.VideoCapture:
    """Khởi tạo camera với auto-detect và error handling
    
    Returns:
        cv2.VideoCapture object đã được khởi tạo
        
    Raises:
        RuntimeError: Nếu không thể mở bất kỳ camera nào
    """
    # Trên Windows, ưu tiên DSHOW backend (ổn định hơn với memory layout)
    backends_to_try = []
    if os.name == 'nt':  # Windows
        backends_to_try = [
            (cv2.CAP_DSHOW, "DSHOW"),  # DirectShow - ổn định nhất trên Windows
            (None, "Default")           # Backend mặc định
            # Bỏ MSMF vì thường gây memory layout errors
        ]
    else:
        backends_to_try = [(None, "Default")]
    
    cap = None
    used_backend = None
    
    # Thử các backend khác nhau
    for backend, backend_name in backends_to_try:
        # Thử camera index từ config
        if backend is not None:
            cap = cv2.VideoCapture(Config.CAMERA_INDEX, backend)
        else:
            cap = cv2.VideoCapture(Config.CAMERA_INDEX)
        
        if cap.isOpened():
            # Test đọc một frame để đảm bảo camera hoạt động
            ret, test_frame = cap.read()
            if ret and test_frame is not None:
                used_backend = backend_name
                print(f"✅ Camera {Config.CAMERA_INDEX} opened with {backend_name} backend")
                break
            else:
                cap.release()
                cap = None
        else:
            # Camera không mở được, release nếu có
            if cap is not None:
                cap.release()
                cap = None
    
    # Nếu không mở được với camera index từ config, thử camera 0
    if cap is None or not cap.isOpened():
        print(f"⚠️  Camera {Config.CAMERA_INDEX} không mở được, thử camera 0...")
        for backend, backend_name in backends_to_try:
            if backend is not None:
                cap = cv2.VideoCapture(0, backend)
            else:
                cap = cv2.VideoCapture(0)
            
            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret and test_frame is not None:
                    used_backend = backend_name
                    Config.CAMERA_INDEX = 0
                    print(f"✅ Camera 0 opened with {backend_name} backend")
                    break
                else:
                    cap.release()
                    cap = None
            else:
                # Camera không mở được, release nếu có
                if cap is not None:
                    cap.release()
                    cap = None
    
    # Thử các index khác
    if cap is None or not cap.isOpened():
        print("⚠️  Thử các camera index khác...")
        for idx in range(1, 5):
            for backend, backend_name in backends_to_try:
                if backend is not None:
                    cap = cv2.VideoCapture(idx, backend)
                else:
                    cap = cv2.VideoCapture(idx)
                
                if cap.isOpened():
                    ret, test_frame = cap.read()
                    if ret and test_frame is not None:
                        used_backend = backend_name
                        Config.CAMERA_INDEX = idx
                        print(f"✅ Found camera at index {idx} with {backend_name} backend")
                        break
                    else:
                        cap.release()
                        cap = None
                else:
                    # Camera không mở được, release nếu có
                    if cap is not None:
                        cap.release()
                        cap = None
                
                # Nếu đã mở thành công, thoát khỏi vòng lặp backend
                if cap is not None and cap.isOpened():
                    break
            
            if cap is not None and cap.isOpened():
                break
    
    if cap is None or not cap.isOpened():
        raise RuntimeError("❌ Không thể mở bất kỳ camera nào! Kiểm tra kết nối camera.")
    
    # Set camera properties để tránh memory layout issues
    try:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Chỉ giữ 1 frame trong buffer
        cap.set(cv2.CAP_PROP_FPS, 30)  # Set FPS cố định
        # Thêm các properties khác để ổn định camera
        if used_backend == "DSHOW":
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))  # MJPEG codec
    except Exception as e:
        print(f"⚠️  Could not set some camera properties: {e}")
    
    # Set resolution với nhiều lần thử
    for attempt in range(3):
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, Config.CAMERA_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, Config.CAMERA_HEIGHT)
        
        # Kiểm tra xem có set được không
        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        if actual_width == Config.CAMERA_WIDTH and actual_height == Config.CAMERA_HEIGHT:
            print(f"✅ Camera resolution set successfully: {actual_width}x{actual_height}")
            break
        else:
            print(f"⚠️  Attempt {attempt + 1}: Camera resolution mismatch - wanted {Config.CAMERA_WIDTH}x{Config.CAMERA_HEIGHT}, got {actual_width}x{actual_height}")
            time.sleep(0.5)
    
    # Nếu vẫn không đúng, thử các resolution phổ biến
    if actual_width != Config.CAMERA_WIDTH or actual_height != Config.CAMERA_HEIGHT:
        print("🔄 Trying common resolutions...")
        common_resolutions = [(640, 480), (800, 600), (1024, 768), (1280, 720)]
        
        for width, height in common_resolutions:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            
            test_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            test_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            if test_width == width and test_height == height:
                actual_width, actual_height = test_width, test_height
                print(f"✅ Using available resolution: {actual_width}x{actual_height}")
                break
    
    # Skip buffer flushing to avoid memory layout errors during initialization
    # The main loop will handle any initial bad frames
    print("⚠️  Skipping buffer flush to avoid memory layout errors")
    print("📝 Note: Initial frames may be corrupted but will be handled in main loop")
    
    # Just wait for camera to stabilize
    time.sleep(1.0)
    
    print(f"✅ Camera initialized: {actual_width}x{actual_height} (Backend: {used_backend})")
    
    return cap

# ============================================================================
# FIREBASE OPERATIONS
# ============================================================================

def clear_firebase_data(db: Optional[firestore.Client], delete_completely: bool = False) -> bool:
    """Xóa toàn bộ dữ liệu sản phẩm trên Firebase (Firestore + Realtime Database)
    
    Args:
        db: Firestore client (có thể là None)
        delete_completely: True để xóa hoàn toàn document, False để reset về trạng thái rỗng
    
    Returns:
        True nếu xóa thành công, False nếu thất bại
    """
    if db is None:
        print("❌ Firebase không khả dụng, không thể xóa dữ liệu")
        return False
    
    try:
        print("🗑️  Đang xóa dữ liệu Firebase...")
        
        # Xóa dữ liệu Firestore
        doc_ref = db.collection(Config.FIREBASE_COLLECTION).document("latest")
        
        if delete_completely:
            # Xóa hoàn toàn document "latest"
            doc_ref.delete()
            print("✅ Đã xóa hoàn toàn document 'latest' trong Firestore")
            
            # Xóa tất cả documents khác trong collection (nếu có)
            collection_ref = db.collection(Config.FIREBASE_COLLECTION)
            docs = collection_ref.stream()
            deleted_count = 0
            for doc in docs:
                doc.reference.delete()
                deleted_count += 1
            
            if deleted_count > 0:
                print(f"✅ Đã xóa thêm {deleted_count} documents khác trong collection")
        else:
            # Reset document về trạng thái rỗng
            empty_data = {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "products": {},
                "total": 0
            }
            doc_ref.set(empty_data)
            print("✅ Đã reset document 'latest' trong Firestore về trạng thái rỗng")
        
        # Xóa dữ liệu Realtime Database
        try:
            rtdb_ref = rtdb.reference('/product_counts')
            if delete_completely:
                # Xóa hoàn toàn node product_counts
                rtdb_ref.delete()
                print("✅ Đã xóa hoàn toàn node '/product_counts' trong Realtime Database")
            else:
                # Reset node latest về trạng thái rỗng
                empty_data = {
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "products": {},
                    "total": 0
                }
                rtdb_ref.child('latest').set(empty_data)
                print("✅ Đã reset node '/product_counts/latest' trong Realtime Database")
                
        except Exception as rtdb_error:
            print(f"⚠️  Lỗi khi xóa Realtime Database: {rtdb_error}")
            # Vẫn coi là thành công nếu Firestore OK
        
        action_text = "xóa hoàn toàn" if delete_completely else "reset"
        print(f"🎉 Đã {action_text} toàn bộ dữ liệu sản phẩm cũ!")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi xóa dữ liệu Firebase: {e}")
        import traceback
        traceback.print_exc()
        return False

def send_to_firestore(
    db: Optional[firestore.Client], 
    product_counts: Dict[str, int], 
    previous_total: Optional[int] = None
) -> Tuple[bool, int]:
    """Gửi dữ liệu lên Firestore với error handling và merge logic
    
    Logic merge:
    - Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
    - Giữ lại các sản phẩm không được phát hiện (không xóa khỏi danh sách)
    - Sản phẩm đã được nhận diện sẽ không bị xóa khi AI không phát hiện
    
    Args:
        db: Firestore client
        product_counts: Dictionary chứa số lượng sản phẩm được phát hiện trong frame hiện tại
        previous_total: Tổng số sản phẩm lần trước (để so sánh)
    
    Returns:
        tuple: (success: bool, current_total: int)
    """
    if db is None:
        return False, 0
    
    try:
        if Config.UPDATE_MODE:
            # Đọc dữ liệu hiện tại từ Firebase để merge
            doc_ref = db.collection(Config.FIREBASE_COLLECTION).document("latest")
            doc_snapshot = doc_ref.get()
            
            # Lấy dữ liệu cũ (nếu có)
            existing_products = {}
            if doc_snapshot.exists:
                existing_data = doc_snapshot.to_dict()
                existing_products = existing_data.get("products", {})
            
            # Merge logic: 
            # - Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
            # - Đặt số lượng = 0 cho các sản phẩm không được phát hiện (nhưng vẫn giữ trong danh sách)
            # - Giữ lại tất cả sản phẩm đã được nhận diện (không xóa)
            
            merged_products = {}
            
            # Bước 1: Đặt số lượng = 0 cho tất cả sản phẩm đã có (nếu không được phát hiện)
            for product_name in existing_products.keys():
                merged_products[product_name] = 0
            
            # Bước 2: Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
            for product_name, detected_qty in product_counts.items():
                merged_products[product_name] = detected_qty
            
            current_total = sum(merged_products.values())
            
            # Kiểm tra nếu có thay đổi đáng kể
            if previous_total is not None:
                change = abs(current_total - previous_total)
                if change < Config.MIN_CHANGE_THRESHOLD and merged_products == existing_products:
                    # Không có thay đổi gì, bỏ qua
                    return False, current_total
            
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            data = {
                "timestamp": timestamp,
                "products": merged_products,
                "total": current_total
            }
            
            # Cập nhật document "latest" trong Firestore
            doc_ref.set(data)
            
            # THÊM: Ghi vào Realtime Database
            try:
                rtdb_ref = rtdb.reference('/product_counts/latest')
                rtdb_ref.set(data)
                print(f"✅ Also updated Realtime Database")
            except Exception as rtdb_error:
                print(f"⚠️  Realtime Database update failed: {rtdb_error}")
                # Tiếp tục dù Realtime Database lỗi (Firestore vẫn OK)
            
            # Log thông tin chi tiết
            detected_str = ", ".join([f"{k}: {v}" for k, v in product_counts.items()]) if product_counts else "không có"
            print(f"📤 Updated Firestore document 'latest':")
            print(f"   - Detected in frame: {detected_str}")
            print(f"   - Total products in list: {len(merged_products)}")
            print(f"   - Total quantity: {current_total}")
            if len(merged_products) > 0:
                merged_str = ", ".join([f"{k}: {v}" for k, v in merged_products.items()])
                print(f"   - All products: {merged_str}")
            
            return True, current_total
        else:
            # Mode cũ: Tạo document mới (không merge)
            current_total = sum(product_counts.values())
            
            if previous_total is not None and current_total > 0:
                change = abs(current_total - previous_total)
                if change < Config.MIN_CHANGE_THRESHOLD:
                    print(f"⏭️  Skip update (change: {change} < threshold: {Config.MIN_CHANGE_THRESHOLD})")
                    return False, current_total
            
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            data = {
                "timestamp": timestamp,
                "products": product_counts,
                "total": current_total
            }
            
            db.collection(Config.FIREBASE_COLLECTION).add(data)
            
            # THÊM: Ghi vào Realtime Database
            try:
                rtdb_ref = rtdb.reference('/product_counts/latest')
                rtdb_ref.set(data)
                print(f"✅ Also updated Realtime Database")
            except Exception as rtdb_error:
                print(f"⚠️  Realtime Database update failed: {rtdb_error}")
            
            print(f"📤 Sent to Firestore: {data}")
            
            return True, current_total
    
    except Exception as e:
        print(f"❌ Failed to send to Firestore: {e}")
        import traceback
        traceback.print_exc()
        return False, 0

# ============================================================================
# FPS COUNTER
# ============================================================================

class FPSCounter:
    """Đếm FPS để monitor performance"""
    
    def __init__(self, avg_frames: int = 30) -> None:
        """Khởi tạo FPS counter
        
        Args:
            avg_frames: Số frame trung bình để tính FPS
        """
        self.frame_times: list[float] = []
        self.avg_frames: int = avg_frames
    
    def update(self) -> None:
        """Cập nhật frame time"""
        self.frame_times.append(time.time())
        if len(self.frame_times) > self.avg_frames:
            self.frame_times.pop(0)
    
    def get_fps(self) -> float:
        """Tính FPS trung bình
        
        Returns:
            FPS trung bình (float), 0 nếu chưa đủ dữ liệu
        """
        if len(self.frame_times) < 2:
            return 0.0
        
        time_diff = self.frame_times[-1] - self.frame_times[0]
        if time_diff > 0:
            return len(self.frame_times) / time_diff
        return 0.0

# ============================================================================
# MAIN DETECTION LOOP
# ============================================================================

def main() -> None:
    """Main detection loop - Entry point của ứng dụng"""
    
    print("\n" + "="*70)
    print("🚀 YOLOv11 PRODUCT DETECTION + FIREBASE")
    print("="*70)
    
    # Load config (nếu có)
    Config.load_from_file()
    
    # Initialize components
    print("\n📋 Initializing components...")
    
    try:
        model, names = init_model()
        db = init_firebase()
        cap = init_camera()
    except Exception as e:
        print(f"\n❌ Initialization failed: {e}")
        return
    
    # Setup
    fps_counter = FPSCounter()
    last_sent_time = 0  # Bắt đầu từ 0 để gửi ngay lần đầu
    frame_count = 0
    previous_total = None  # Lưu tổng số sản phẩm lần trước để so sánh
    consecutive_failures = 0  # Đếm số lần đọc frame thất bại liên tiếp
    max_consecutive_failures = 10  # Số lần thất bại tối đa trước khi reinit camera
    
    # Đọc dữ liệu hiện có từ Firebase (nếu có) hoặc reset nếu được cấu hình
    if db and Config.UPDATE_MODE:
        try:
            doc_ref = db.collection(Config.FIREBASE_COLLECTION).document("latest")
            doc_snapshot = doc_ref.get()
            
            if Config.RESET_ON_START:
                # Reset về trạng thái rỗng nếu được cấu hình
                print("🔄 Resetting Firebase document 'latest' to empty state...")
                empty_data = {
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "products": {},
                    "total": 0
                }
                doc_ref.set(empty_data)
                
                # THÊM: Reset Realtime Database
                try:
                    rtdb_ref = rtdb.reference('/product_counts/latest')
                    rtdb_ref.set(empty_data)
                    print("✅ Also reset Realtime Database")
                except Exception as rtdb_error:
                    print(f"⚠️  Realtime Database reset failed: {rtdb_error}")
                
                previous_total = 0
                print("✅ Firebase reset to empty state (total: 0)")
            elif doc_snapshot.exists:
                # Đọc dữ liệu hiện có và tiếp tục từ đó
                existing_data = doc_snapshot.to_dict()
                existing_products = existing_data.get("products", {})
                previous_total = existing_data.get("total", 0)
                
                if existing_products:
                    products_str = ", ".join([f"{k}: {v}" for k, v in existing_products.items()])
                    print(f"📥 Loaded existing data from Firebase:")
                    print(f"   - Products: {products_str}")
                    print(f"   - Total: {previous_total}")
                else:
                    print("📥 No existing products found in Firebase (starting fresh)")
                    previous_total = 0
            else:
                # Document chưa tồn tại, bắt đầu từ 0
                print("📥 No existing data in Firebase (starting fresh)")
                previous_total = 0
                
        except Exception as e:
            print(f"⚠️  Failed to load/reset Firebase data: {e}")
            previous_total = 0
    
    print(f"\n✅ System ready!")
    print(f"📊 Confidence threshold: {Config.CONFIDENCE_THRESHOLD}")
    print(f"⏱️  Send interval: {Config.SEND_INTERVAL}s")
    print(f"🔄 Update mode: {'ON (update document \"latest\")' if Config.UPDATE_MODE else 'OFF (create new documents)'}")
    print(f"📈 Min change threshold: {Config.MIN_CHANGE_THRESHOLD}")
    print(f"🔥 Firebase: {'Enabled' if db else 'Disabled'}")
    print(f"🖥️  Display mode: {'Headless (no window)' if Config.HEADLESS_MODE else 'GUI (with camera window)'}")
    print(f"\n🎥 Starting detection...")
    if not Config.HEADLESS_MODE:
        print("   Press 'q' to quit")
        print("   Press 's' to send data manually")
        print("   Press 'c' to clear console")
        print("   Press 'r' to reset/clear Firebase data")
    else:
        print("   Running in headless mode - use Ctrl+C to quit")
        print("   Detection results will be printed to console")
    print("="*70 + "\n")
    
    try:
        while True:
            # Read frame với retry logic cải thiện và error handling
            ret = False
            frame = None
            
            try:
                ret, frame = cap.read()
                
                # Nếu đọc thành công, kiểm tra frame ngay lập tức
                if ret and frame is not None:
                    # Kiểm tra cơ bản trước khi xử lý
                    if not hasattr(frame, 'shape') or len(frame.shape) < 2 or frame.size == 0:
                        ret = False
                        frame = None
                    else:
                        # Copy frame ngay để đảm bảo memory layout đúng
                        try:
                            frame = frame.copy()
                        except Exception as copy_error:
                            print(f"⚠️  Error copying frame: {copy_error}")
                            ret = False
                            frame = None
                            
            except cv2.error as e:
                # Bắt lỗi OpenCV khi đọc frame
                consecutive_failures += 1
                
                # Xử lý riêng cho lỗi _step >= minstep - skip nhanh hơn
                if "_step >= minstep" in str(e):
                    if consecutive_failures % 10 == 0:  # In ít hơn để tránh spam
                        print(f"❌ Memory layout error (attempt {consecutive_failures}): Skipping corrupted frames...")
                    
                    # Thử reinit nếu lỗi quá nhiều
                    if consecutive_failures >= 20:  # Tăng threshold để tránh reinit quá thường xuyên
                        print(f"\n⚠️  Too many memory layout errors, reinitializing camera...")
                        try:
                            cap.release()
                            time.sleep(2)
                            cap = init_camera()
                            consecutive_failures = 0
                            print("✅ Camera reinitialized successfully")
                            continue
                        except Exception as reinit_error:
                            print(f"❌ Failed to reinitialize camera: {reinit_error}")
                            print("⚠️  Continuing with retry...")
                    
                    # Skip nhanh hơn cho memory layout errors
                    time.sleep(0.05)  # Đợi rất ngắn
                    continue
                else:
                    if consecutive_failures % 5 == 0:
                        print(f"❌ OpenCV error reading frame: {e}")
                    
                    if consecutive_failures >= max_consecutive_failures:
                        print(f"\n⚠️  Camera failed {consecutive_failures} times, attempting to reinitialize...")
                        try:
                            cap.release()
                            time.sleep(1)
                            cap = init_camera()
                            consecutive_failures = 0
                            print("✅ Camera reinitialized successfully")
                            continue
                        except Exception as reinit_error:
                            print(f"❌ Failed to reinitialize camera: {reinit_error}")
                            print("⚠️  Continuing with retry...")
                
                # Đã xử lý wait_time trong phần memory layout error ở trên
                if "_step >= minstep" not in str(e):
                    wait_time = min(0.1 * (2 ** min(consecutive_failures // 3, 3)), 2.0)
                    time.sleep(wait_time)
                continue
                
            except Exception as e:
                # Bắt các lỗi khác (memory, etc.)
                consecutive_failures += 1
                if consecutive_failures % 5 == 0:
                    print(f"❌ Unexpected error reading frame: {e}")
                
                if consecutive_failures >= max_consecutive_failures:
                    print(f"\n⚠️  Camera failed {consecutive_failures} times, attempting to reinitialize...")
                    try:
                        cap.release()
                        time.sleep(1)
                        cap = init_camera()
                        consecutive_failures = 0
                        print("✅ Camera reinitialized successfully")
                        continue
                    except Exception as reinit_error:
                        print(f"❌ Failed to reinitialize camera: {reinit_error}")
                        print("⚠️  Continuing with retry...")
                
                wait_time = min(0.1 * (2 ** min(consecutive_failures // 3, 3)), 2.0)
                time.sleep(wait_time)
                continue
            
            # Kiểm tra frame có hợp lệ không
            if not ret or frame is None:
                consecutive_failures += 1
                
                # Nếu thất bại quá nhiều lần, thử reinit camera
                if consecutive_failures >= max_consecutive_failures:
                    print(f"\n⚠️  Camera failed {consecutive_failures} times, attempting to reinitialize...")
                    try:
                        cap.release()
                        time.sleep(1)  # Đợi camera giải phóng hoàn toàn
                        cap = init_camera()
                        consecutive_failures = 0
                        print("✅ Camera reinitialized successfully")
                        continue
                    except Exception as e:
                        print(f"❌ Failed to reinitialize camera: {e}")
                        print("⚠️  Continuing with retry...")
                
                # Exponential backoff: tăng thời gian chờ khi thất bại nhiều lần
                wait_time = min(0.1 * (2 ** min(consecutive_failures // 3, 3)), 2.0)
                if consecutive_failures % 5 == 0:  # Chỉ in mỗi 5 lần để tránh spam
                    print(f"⚠️  Cannot read frame (failures: {consecutive_failures}), retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
                continue
            
            # Frame đã được copy và validate trong phần đọc frame ở trên
            # Chỉ cần kiểm tra cuối cùng
            if frame is None or frame.size == 0:
                consecutive_failures += 1
                if consecutive_failures % 5 == 0:
                    print(f"⚠️  Invalid frame after processing")
                time.sleep(0.1)
                continue
            
            # Reset counter khi đọc thành công
            consecutive_failures = 0
            
            frame_count += 1
            
            # YOLO inference
            results = model(frame, conf=Config.CONFIDENCE_THRESHOLD, verbose=False)
            result = results[0]
            
            # Vẽ bounding boxes
            annotated_frame = result.plot()
            
            # Đếm sản phẩm
            product_list = []
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if conf >= Config.CONFIDENCE_THRESHOLD:
                    product_list.append(names[cls_id])
            
            product_counts = dict(Counter(product_list))
            
            # In ra console
            if product_counts:
                count_str = ", ".join([f"{k}: {v}" for k, v in product_counts.items()])
                print(f"[Frame {frame_count}] Detected: {count_str}")
            
            # Gửi dữ liệu định kỳ (luôn gửi kể cả khi không có sản phẩm để đảm bảo Firebase được cập nhật)
            current_time = time.time()
            if current_time - last_sent_time >= Config.SEND_INTERVAL:
                # Luôn gửi dữ liệu, kể cả khi product_counts rỗng (để hiển thị 0 khi không có sản phẩm)
                success, current_total = send_to_firestore(db, product_counts, previous_total)
                if success:
                    last_sent_time = current_time
                    previous_total = current_total
            
            # FPS counter
            fps_counter.update()
            fps = fps_counter.get_fps()
            
            # Display FPS
            if Config.DISPLAY_FPS:
                cv2.putText(annotated_frame, f"FPS: {fps:.1f}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Display frame (chỉ khi không ở chế độ headless)
            if not Config.HEADLESS_MODE:
                try:
                    # Tạo cửa sổ với các thuộc tính đặc biệt
                    cv2.namedWindow(Config.WINDOW_NAME, cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
                    
                    # Debug: In thông tin frame lần đầu
                    if frame_count == 1:
                        print(f"🖼️  Frame info: {annotated_frame.shape}, dtype: {annotated_frame.dtype}")
                        print(f"🪟 Tạo cửa sổ: {Config.WINDOW_NAME}")
                        print(f"💡 Nếu không thấy cửa sổ, hãy kiểm tra taskbar hoặc nhấn Alt+Tab")
                    
                    # Hiển thị frame
                    cv2.imshow(Config.WINDOW_NAME, annotated_frame)
                    
                    # Thử các cách để đảm bảo cửa sổ hiển thị
                    try:
                        # Đặt cửa sổ lên trên cùng tạm thời
                        cv2.setWindowProperty(Config.WINDOW_NAME, cv2.WND_PROP_TOPMOST, 1)
                        cv2.setWindowProperty(Config.WINDOW_NAME, cv2.WND_PROP_TOPMOST, 0)
                        
                        # Resize cửa sổ với tỷ lệ hợp lý (tăng gấp 1.5 lần)
                        display_width = int(Config.CAMERA_WIDTH * 1.5)
                        display_height = int(Config.CAMERA_HEIGHT * 1.5)
                        cv2.resizeWindow(Config.WINDOW_NAME, display_width, display_height)
                        
                        # Di chuyển cửa sổ về vị trí dễ nhìn
                        if frame_count == 1:
                            cv2.moveWindow(Config.WINDOW_NAME, 50, 50)
                            print(f"🖼️  Kích thước cửa sổ: {display_width}x{display_height}")
                    except:
                        pass  # Một số thuộc tính có thể không được hỗ trợ
                        
                except Exception as display_error:
                    print(f"⚠️  Lỗi hiển thị cửa sổ: {display_error}")
                    print("💡 Các giải pháp có thể thử:")
                    print("   1. Kiểm tra kết nối màn hình")
                    print("   2. Thử chạy với quyền Administrator")
                    print("   3. Kiểm tra driver màn hình")
                    print("   4. Thử kết nối màn hình khác")
                    print("🔄 Tiếp tục chạy mà không hiển thị cửa sổ...")
                    # Không tự động chuyển sang headless, chỉ bỏ qua lỗi hiển thị
            
            # Keyboard controls
            if Config.HEADLESS_MODE:
                key = 0xFF  # Không đọc phím trong headless mode
                time.sleep(0.03)  # Delay nhỏ để không làm quá tải CPU
            else:
                key = cv2.waitKey(30) & 0xFF  # Tăng delay từ 1ms lên 30ms để ổn định hơn
            
            if key == ord('q'):
                print("\n👋 Quitting...")
                break
            
            elif key == ord('s'):
                # Manual send (luôn gửi kể cả khi không có sản phẩm)
                print("\n📤 Manual send triggered...")
                success, current_total = send_to_firestore(db, product_counts, previous_total)
                if success:
                    previous_total = current_total
            
            elif key == ord('c'):
                # Clear console
                os.system('cls' if os.name == 'nt' else 'clear')
            
            elif key == ord('r'):
                # Reset/Clear Firebase data
                print("\n🗑️  Clearing Firebase data...")
                print("   1. Reset về trạng thái rỗng (khuyến nghị)")
                print("   2. Xóa hoàn toàn document 'latest'")
                print("   Chọn 1 (mặc định) hoặc 2...")
                
                # Đợi user chọn trong 3 giây, mặc định là reset
                import select
                import sys
                
                choice = "1"  # Mặc định
                try:
                    # Trên Windows, sử dụng msvcrt
                    if os.name == 'nt':
                        import msvcrt
                        start_time = time.time()
                        while time.time() - start_time < 3:
                            if msvcrt.kbhit():
                                choice = msvcrt.getch().decode('utf-8')
                                break
                            time.sleep(0.1)
                    else:
                        # Trên Linux/Mac
                        ready, _, _ = select.select([sys.stdin], [], [], 3)
                        if ready:
                            choice = sys.stdin.readline().strip()
                except:
                    choice = "1"  # Fallback
                
                delete_completely = (choice == "2")
                success = clear_firebase_data(db, delete_completely)
                if success:
                    previous_total = 0
                    action = "xóa hoàn toàn" if delete_completely else "reset"
                    print(f"✅ Firebase data đã được {action} thành công!")
                else:
                    print("❌ Failed to clear Firebase data")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    
    except Exception as e:
        print(f"\n❌ Error during detection: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        print("\n🧹 Cleaning up...")
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"📊 Final stats:")
        print(f"   Total frames processed: {frame_count}")
        print(f"   Average FPS: {fps_counter.get_fps():.1f}")
        print("\n✅ Program terminated successfully")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()