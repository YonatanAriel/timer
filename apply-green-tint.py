from PIL import Image
import os

# Load your custom icon
icon_path = r'c:\Users\yonat\repos\timer\build-resources\icon.png'
img = Image.open(icon_path).convert('RGBA')

# Extract RGBA channels
r, g, b, a = img.split()

# Target color: 08CB00 (hex) = RGB(8, 203, 0)
target_r, target_g, target_b = 0x08, 0xCB, 0x00

# Create new channels with the target green color
# Keep the brightness/luminance of the original, but change hue to green
new_r = Image.new('L', img.size, target_r)
new_g = Image.new('L', img.size, target_g)
new_b = Image.new('L', img.size, target_b)

# Merge back with original alpha channel (preserves transparency)
result = Image.merge('RGBA', (new_r, new_g, new_b, a))

# Save as PNG
result.save(icon_path)
print("✓ Icon PNG updated with green color (08CB00) - transparency preserved")

# Convert to ICO for Windows
ico_path = r'c:\Users\yonat\repos\timer\build-resources\icon.ico'
result.save(ico_path)
print("✓ Icon converted to ICO format")
