import re
import json
import os

md_path = r'd:\UDTTNT\hien_vat_bao_tang.md'
json_path = r'd:\UDTTNT\backend\data\knowledge_base\hien_vat_bao_tang.json'
txt_path = r'd:\UDTTNT\hien_vat_bao_tang.txt'

with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []
current_item = {}
content_lines = []
txt_content = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Check for title line
    title_match = re.match(r'^(\d+)\.\s+\*\*(.*?)\*\*\s+\((.*?)\)$', line)
    if title_match:
        if current_item and content_lines:
            current_item['content'] = ' '.join(content_lines)
            results.append(current_item)
            txt_content.append(f"Tiêu đề: {current_item['title']}")
            txt_content.append(f"Nội dung: {current_item['content']}\n")
        
        item_id = f"HVBT_{int(title_match.group(1)):03d}"
        title = title_match.group(2)
        date = title_match.group(3)
        current_item = {
            'id': item_id,
            'category': 'Hiện vật - Tư liệu',
            'title': title
        }
        content_lines = [f'[{date}]']
        continue
    
    # Check for image line
    if line.startswith('![img]('):
        continue
    
    # Check for Ghi chú
    if line.startswith('Ghi chú:'):
        content_lines.append(line.replace('Ghi chú:', '').strip())
        continue
    
    # Other lines
    if line.startswith('## Trang') or line.startswith('#') or line.startswith('Nguồn:'):
        continue
        
    if current_item:
        content_lines.append(line)

# Add last item
if current_item and content_lines:
    current_item['content'] = ' '.join(content_lines)
    results.append(current_item)
    txt_content.append(f"Tiêu đề: {current_item['title']}")
    txt_content.append(f"Nội dung: {current_item['content']}\n")

# Write JSON for current RAG system
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

# Write plain TXT file as requested
with open(txt_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(txt_content))

print(f"Thành công! Đã chuyển đổi {len(results)} hiện vật.")
print(f"- File JSON (tích hợp RAG): {json_path}")
print(f"- File TXT (thuần túy): {txt_path}")
