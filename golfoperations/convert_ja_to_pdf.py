#!/usr/bin/env python3
"""
Convert Japanese markdown files to PDF format with proper Japanese font support
"""
import os
import sys
from pathlib import Path
import markdown
from xhtml2pdf import pisa
from io import BytesIO

# File mappings: (source_path, output_path)
FILES = [
    ("general-manager/README_ja.md", "general-manager/README_ja.pdf"),
    ("general-manager/QUICK_START_CHECKLIST_ja.md", "general-manager/QUICK_START_CHECKLIST_ja.pdf"),
    ("staff-registration/HOW_TO_REGISTER_ja.md", "staff-registration/HOW_TO_REGISTER_ja.pdf"),
    ("staff-registration/VISUAL_WALKTHROUGH_ja.md", "staff-registration/VISUAL_WALKTHROUGH_ja.pdf"),
    ("caddies/CADDY_DASHBOARD_GUIDE_ja.md", "caddies/CADDY_DASHBOARD_GUIDE_ja.pdf"),
    ("pro-shop/PRO_SHOP_GUIDE_ja.md", "pro-shop/PRO_SHOP_GUIDE_ja.pdf"),
    ("fnb-restaurant/FNB_STAFF_GUIDE_ja.md", "fnb-restaurant/FNB_STAFF_GUIDE_ja.pdf"),
    ("security-policies/SECURITY_ARCHITECTURE_ja.md", "security-policies/SECURITY_ARCHITECTURE_ja.pdf"),
    ("troubleshooting/COMMON_ISSUES_ja.md", "troubleshooting/COMMON_ISSUES_ja.pdf"),
    ("README_ja.md", "README_ja.pdf"),
]

BASE_DIR = Path("C:/Users/pete/Documents/MciPro/golfoperations")
SOURCE_DIR = BASE_DIR / "ja"
OUTPUT_DIR = BASE_DIR / "pdf" / "ja"

# HTML template with CSS for styling with Japanese font support
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}

        body {{
            font-family: "MS Gothic", "Yu Gothic", "Meiryo", "MS UI Gothic", sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }}

        h1 {{
            font-size: 24pt;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-top: 20px;
            margin-bottom: 15px;
        }}

        h2 {{
            font-size: 20pt;
            color: #34495e;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 8px;
            margin-top: 18px;
            margin-bottom: 12px;
        }}

        h3 {{
            font-size: 16pt;
            color: #555;
            margin-top: 15px;
            margin-bottom: 10px;
        }}

        h4 {{
            font-size: 14pt;
            color: #666;
            margin-top: 12px;
            margin-bottom: 8px;
        }}

        code {{
            font-family: "Consolas", "Courier New", monospace;
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10pt;
        }}

        pre {{
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 12px;
            overflow-x: auto;
            margin: 15px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }}

        pre code {{
            background-color: transparent;
            padding: 0;
        }}

        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
        }}

        th, td {{
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }}

        th {{
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }}

        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}

        ul, ol {{
            margin: 10px 0;
            padding-left: 30px;
        }}

        li {{
            margin: 5px 0;
        }}

        blockquote {{
            border-left: 4px solid #3498db;
            margin: 15px 0;
            padding-left: 15px;
            color: #555;
            font-style: italic;
        }}

        a {{
            color: #3498db;
            text-decoration: none;
        }}

        img {{
            max-width: 100%;
            height: auto;
        }}
    </style>
</head>
<body>
{content}
</body>
</html>
"""

def convert_markdown_to_pdf(source_file, output_file):
    """Convert a single markdown file to PDF"""
    try:
        # Read markdown file
        with open(source_file, 'r', encoding='utf-8') as f:
            md_content = f.read()

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'codehilite',
            'toc',
            'nl2br',
            'sane_lists'
        ])
        html_content = md.convert(md_content)

        # Create full HTML document
        full_html = HTML_TEMPLATE.format(
            title=source_file.stem,
            content=html_content
        )

        # Convert HTML to PDF
        with open(output_file, 'wb') as pdf_file:
            pisa_status = pisa.CreatePDF(
                full_html.encode('utf-8'),
                dest=pdf_file,
                encoding='utf-8'
            )

        if pisa_status.err:
            return False, f"Pisa error code: {pisa_status.err}"

        return True, None
    except Exception as e:
        return False, str(e)

def main():
    """Main conversion function"""
    print("Starting Japanese Markdown to PDF conversion...")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Files to convert: {len(FILES)}")
    print("-" * 80)

    results = []
    success_count = 0
    error_count = 0

    for source_rel, output_rel in FILES:
        source_path = SOURCE_DIR / source_rel
        output_path = OUTPUT_DIR / output_rel

        print(f"\nConverting: {source_rel}")

        if not source_path.exists():
            print(f"  ERROR: Source file not found!")
            error_count += 1
            results.append({
                'source': str(source_path),
                'output': str(output_path),
                'status': 'ERROR',
                'message': 'Source file not found',
                'size': 0
            })
            continue

        success, error_msg = convert_markdown_to_pdf(source_path, output_path)

        if success:
            file_size = output_path.stat().st_size
            file_size_kb = file_size / 1024
            print(f"  SUCCESS: Created {output_path.name} ({file_size_kb:.2f} KB)")
            success_count += 1
            results.append({
                'source': str(source_path),
                'output': str(output_path),
                'status': 'SUCCESS',
                'message': 'Converted successfully',
                'size': file_size
            })
        else:
            print(f"  ERROR: {error_msg}")
            error_count += 1
            results.append({
                'source': str(source_path),
                'output': str(output_path),
                'status': 'ERROR',
                'message': error_msg,
                'size': 0
            })

    # Summary
    print("\n" + "=" * 80)
    print("CONVERSION SUMMARY")
    print("=" * 80)
    print(f"Total files: {len(FILES)}")
    print(f"Successful: {success_count}")
    print(f"Errors: {error_count}")
    print("\nGenerated PDF files:")

    total_size = 0
    for result in results:
        if result['status'] == 'SUCCESS':
            size_kb = result['size'] / 1024
            total_size += result['size']
            print(f"  - {result['output']} ({size_kb:.2f} KB)")

    print(f"\nTotal size: {total_size / 1024:.2f} KB ({total_size / (1024*1024):.2f} MB)")

    return success_count == len(FILES)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
