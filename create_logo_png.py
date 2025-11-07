"""
Script để tạo logo PNG trực tiếp từ thiết kế
Sử dụng PIL/Pillow - không cần thư viện hệ thống
"""
from PIL import Image, ImageDraw, ImageFont
import math
import sys
from pathlib import Path

# Fix encoding cho Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def create_logo_png(output_path, size=512):
    """Tạo logo PNG với thiết kế mới"""
    # Tạo image với background trong suốt
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = size // 2, size // 2
    scale = size / 200  # Scale từ viewBox 200x200
    
    # Gradient colors
    product_color_start = (99, 102, 241)  # #6366F1
    product_color_end = (139, 92, 246)   # #8B5CF6
    ai_color_start = (16, 185, 129)      # #10B981
    ai_color_end = (59, 130, 246)        # #3B82F6
    
    # Vẽ background circle với gradient (đơn giản hóa)
    bg_radius = int(95 * scale)
    draw.ellipse(
        [center_x - bg_radius, center_y - bg_radius, 
         center_x + bg_radius, center_y + bg_radius],
        fill=(99, 102, 241, 25)  # Màu xanh tím với opacity thấp
    )
    
    # Vẽ AI nodes (neural network)
    node_positions = [
        (center_x, int(30 * scale)),           # Trên
        (center_x, int(170 * scale)),           # Dưới
        (int(30 * scale), center_y),            # Trái
        (int(170 * scale), center_y),            # Phải
        (int(50 * scale), int(50 * scale)),      # Góc trên trái
        (int(150 * scale), int(50 * scale)),    # Góc trên phải
        (int(50 * scale), int(150 * scale)),    # Góc dưới trái
        (int(150 * scale), int(150 * scale)),   # Góc dưới phải
    ]
    
    node_sizes = [8, 8, 8, 8, 6, 6, 6, 6]
    node_opacities = [255, 255, 255, 255, 180, 180, 180, 180]
    
    for i, (x, y) in enumerate(node_positions):
        radius = int(node_sizes[i] * scale)
        opacity = node_opacities[i]
        
        # Vẽ node với gradient (đơn giản hóa thành solid color)
        color = (
            int(ai_color_start[0] * 0.7 + ai_color_end[0] * 0.3),
            int(ai_color_start[1] * 0.7 + ai_color_end[1] * 0.3),
            int(ai_color_start[2] * 0.7 + ai_color_end[2] * 0.3),
            opacity
        )
        
        # Outer circle (glow effect)
        draw.ellipse(
            [x - radius, y - radius, x + radius, y + radius],
            fill=color
        )
        
        # Inner white circle
        inner_radius = int(radius * 0.5)
        draw.ellipse(
            [x - inner_radius, y - inner_radius, 
             x + inner_radius, y + inner_radius],
            fill=(255, 255, 255, opacity)
        )
    
    # Vẽ kết nối AI (đường thẳng)
    connections = [
        (center_x, int(30 * scale), center_x, int(70 * scale)),
        (center_x, int(130 * scale), center_x, int(170 * scale)),
        (int(30 * scale), center_y, int(70 * scale), center_y),
        (int(130 * scale), center_y, int(170 * scale), center_y),
    ]
    
    for x1, y1, x2, y2 in connections:
        draw.line([x1, y1, x2, y2], 
                 fill=(16, 185, 129, 77),  # AI color với opacity
                 width=int(1.5 * scale))
    
    # Vẽ hộp sản phẩm 3D ở giữa
    box_size = int(70 * scale)
    box_height = int(40 * scale)
    box_depth = int(15 * scale)
    
    # Mặt trước của hộp
    front_points = [
        (center_x - box_size//2, center_y - box_height//2),
        (center_x + box_size//2, center_y - box_height//2),
        (center_x + box_size//2, center_y + box_height//2),
        (center_x - box_size//2, center_y + box_height//2),
    ]
    draw.polygon(front_points, fill=(99, 102, 241, 242))  # Product color
    
    # Mặt trên của hộp
    top_points = [
        (center_x - box_size//2, center_y - box_height//2),
        (center_x - box_size//2 + box_depth, center_y - box_height//2 - box_depth),
        (center_x + box_size//2 + box_depth, center_y - box_height//2 - box_depth),
        (center_x + box_size//2, center_y - box_height//2),
    ]
    draw.polygon(top_points, fill=(99, 102, 241, 179))  # Lighter
    
    # Mặt bên phải
    side_points = [
        (center_x + box_size//2, center_y - box_height//2),
        (center_x + box_size//2 + box_depth, center_y - box_height//2 - box_depth),
        (center_x + box_size//2 + box_depth, center_y + box_height//2 - box_depth),
        (center_x + box_size//2, center_y + box_height//2),
    ]
    draw.polygon(side_points, fill=(99, 102, 241, 153))  # Darker
    
    # Vẽ dấu tích bên trong hộp
    checkmark_points = [
        (center_x - int(20 * scale), center_y),
        (center_x - int(5 * scale), center_y + int(10 * scale)),
        (center_x + int(20 * scale), center_y - int(10 * scale)),
    ]
    draw.line(
        [checkmark_points[0], checkmark_points[1], checkmark_points[2]],
        fill=(255, 255, 255, 230),
        width=int(4 * scale),
        joint='round'
    )
    
    # Vẽ icon AI (mạch điện) trên hộp
    ai_icon_x = center_x - int(10 * scale)
    ai_icon_y = center_y - int(30 * scale)
    for i in range(3):
        x = ai_icon_x + i * int(8 * scale)
        y = ai_icon_y
        radius = int(3 * scale)
        draw.ellipse(
            [x - radius, y - radius, x + radius, y + radius],
            fill=(16, 185, 129, 255)
        )
        if i < 2:
            draw.line(
                [x + radius, y, x + int(8 * scale) - radius, y],
                fill=(16, 185, 129, 255),
                width=int(1.5 * scale)
            )
    
    # Vẽ kết nối từ AI nodes đến hộp (đường đứt nét)
    dash_connections = [
        (center_x, int(38 * scale), center_x, int(80 * scale)),
        (center_x, int(120 * scale), center_x, int(162 * scale)),
        (int(38 * scale), center_y, int(80 * scale), center_y),
        (int(120 * scale), center_y, int(162 * scale), center_y),
    ]
    
    dash_length = int(3 * scale)
    gap_length = int(3 * scale)
    
    for x1, y1, x2, y2 in dash_connections:
        if x1 == x2:  # Vertical line
            current_y = y1
            while current_y < y2:
                end_y = min(current_y + dash_length, y2)
                draw.line([x1, current_y, x1, end_y], 
                         fill=(16, 185, 129, 51),
                         width=int(1 * scale))
                current_y = end_y + gap_length
        else:  # Horizontal line
            current_x = x1
            while current_x < x2:
                end_x = min(current_x + dash_length, x2)
                draw.line([current_x, y1, end_x, y1], 
                         fill=(16, 185, 129, 51),
                         width=int(1 * scale))
                current_x = end_x + gap_length
    
    # Lưu file
    img.save(output_path, 'PNG')
    print(f"Success: Da tao {output_path} (kich thuoc: {size}x{size})")

def main():
    base_dir = Path(__file__).parent
    png_path = base_dir / "product-manager" / "assets" / "logo.png"
    
    print(f"Dang tao logo PNG...")
    print(f"Dich: {png_path}")
    print()
    
    try:
        create_logo_png(str(png_path), size=512)
        print("\nHoan thanh!")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

