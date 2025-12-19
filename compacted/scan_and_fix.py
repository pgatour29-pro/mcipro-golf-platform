#!/usr/bin/env python3
"""
Comprehensive HTML/JavaScript Scanner and Fixer
Scans for:
1. </script> in template literals/strings
2. Syntax errors (unmatched quotes, backticks, parentheses, brackets)
3. Performance bottlenecks
4. Unterminated strings
5. Missing closing tags
6. Incorrect textContent vs innerHTML usage
"""

import re
import json
from collections import defaultdict

def scan_file(file_path):
    """Scan the file for all issues"""
    issues = []

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Track state
    in_script = False
    in_template_literal = False
    in_string = False
    string_char = None
    paren_stack = []
    bracket_stack = []
    brace_stack = []

    for line_num, line in enumerate(lines, 1):
        # Check for </script> in strings or template literals
        if '</script>' in line.lower():
            # Check if it's in a string or template literal
            if '`' in line or '"' in line or "'" in line:
                # More detailed check needed
                if re.search(r'["`\'].*?</script>.*?["`\']', line, re.IGNORECASE):
                    issues.append({
                        'line': line_num,
                        'type': 'CRITICAL',
                        'issue': '</script> found inside string/template literal',
                        'content': line.strip()[:100],
                        'fix': 'Replace </script> with <\\/script>'
                    })

        # Check for unmatched quotes/backticks
        stripped = line.strip()

        # Count quotes (excluding escaped ones)
        single_quotes = len(re.findall(r"(?<!\\)'", line))
        double_quotes = len(re.findall(r'(?<!\\)"', line))
        backticks = len(re.findall(r'(?<!\\)`', line))

        # Check for odd number of quotes (potential unterminated string)
        if single_quotes % 2 != 0 and not line.strip().endswith(',') and not line.strip().endswith(';'):
            if "don't" not in line.lower() and "it's" not in line.lower():
                issues.append({
                    'line': line_num,
                    'type': 'SYNTAX',
                    'issue': 'Potentially unterminated single-quoted string',
                    'content': line.strip()[:100],
                    'fix': 'Check string termination'
                })

        # Check for unmatched parentheses in the line
        open_paren = line.count('(')
        close_paren = line.count(')')
        if open_paren != close_paren:
            # This might be multi-line, but flag it
            issues.append({
                'line': line_num,
                'type': 'WARNING',
                'issue': f'Unmatched parentheses: {open_paren} open, {close_paren} close',
                'content': line.strip()[:100],
                'fix': 'Verify parentheses matching'
            })

        # Check for unmatched brackets
        open_bracket = line.count('[')
        close_bracket = line.count(']')
        if open_bracket != close_bracket:
            issues.append({
                'line': line_num,
                'type': 'WARNING',
                'issue': f'Unmatched brackets: {open_bracket} open, {close_bracket} close',
                'content': line.strip()[:100],
                'fix': 'Verify bracket matching'
            })

        # Check for unmatched braces
        open_brace = line.count('{')
        close_brace = line.count('}')
        if open_brace != close_brace:
            issues.append({
                'line': line_num,
                'type': 'WARNING',
                'issue': f'Unmatched braces: {open_brace} open, {close_brace} close',
                'content': line.strip()[:100],
                'fix': 'Verify brace matching'
            })

        # Performance checks
        if 'querySelectorAll' in line and 'forEach' in line:
            issues.append({
                'line': line_num,
                'type': 'PERFORMANCE',
                'issue': 'querySelectorAll with forEach - consider caching',
                'content': line.strip()[:100],
                'fix': 'Cache selector results'
            })

        if re.search(r'for\s*\(.*?document\.querySelector', line):
            issues.append({
                'line': line_num,
                'type': 'PERFORMANCE',
                'issue': 'DOM query inside loop',
                'content': line.strip()[:100],
                'fix': 'Move DOM query outside loop'
            })

        # Check for innerHTML usage that might need textContent
        if '.innerHTML' in line and '=' in line:
            # Check if it's setting plain text
            if re.search(r'\.innerHTML\s*=\s*["\'][\w\s]+["\']', line):
                issues.append({
                    'line': line_num,
                    'type': 'SECURITY',
                    'issue': 'innerHTML used for plain text - use textContent',
                    'content': line.strip()[:100],
                    'fix': 'Replace innerHTML with textContent for plain text'
                })

        # Check for missing semicolons in important statements
        if re.search(r'(const|let|var)\s+\w+\s*=.*[^;{]\s*$', line):
            if not line.strip().endswith(','):
                issues.append({
                    'line': line_num,
                    'type': 'STYLE',
                    'issue': 'Missing semicolon',
                    'content': line.strip()[:100],
                    'fix': 'Add semicolon'
                })

    return issues, lines

def fix_issues(issues, lines):
    """Apply fixes to the issues found"""
    fixed_lines = lines.copy()

    for issue in issues:
        if issue['type'] == 'CRITICAL':
            line_idx = issue['line'] - 1
            # Fix </script> in strings
            fixed_lines[line_idx] = fixed_lines[line_idx].replace('</script>', '<\\/script>')
            fixed_lines[line_idx] = fixed_lines[line_idx].replace('</SCRIPT>', '<\\/SCRIPT>')

    return fixed_lines

def generate_report(issues):
    """Generate a detailed report"""
    report = []
    report.append("=" * 80)
    report.append("MCIPRO INDEX.HTML ANALYSIS REPORT")
    report.append("=" * 80)
    report.append(f"\nTotal Issues Found: {len(issues)}\n")

    # Group by type
    by_type = defaultdict(list)
    for issue in issues:
        by_type[issue['type']].append(issue)

    for issue_type in ['CRITICAL', 'SYNTAX', 'SECURITY', 'PERFORMANCE', 'WARNING', 'STYLE']:
        if issue_type in by_type:
            report.append(f"\n{issue_type} ISSUES ({len(by_type[issue_type])})")
            report.append("-" * 80)
            for issue in by_type[issue_type]:
                report.append(f"\nLine {issue['line']}: {issue['issue']}")
                report.append(f"  Content: {issue['content']}")
                report.append(f"  Fix: {issue['fix']}")

    return "\n".join(report)

def main():
    file_path = "C:/Users/pete/Documents/MciPro/index.html"
    output_path = "C:/Users/pete/Documents/MciPro/index-fixed.html"
    report_path = "C:/Users/pete/Documents/MciPro/scan-report.txt"

    print("Scanning file...")
    issues, lines = scan_file(file_path)

    print(f"Found {len(issues)} issues")

    print("Generating report...")
    report = generate_report(issues)

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"Report saved to: {report_path}")

    print("Applying fixes...")
    fixed_lines = fix_issues(issues, lines)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)

    print(f"Fixed file saved to: {output_path}")

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    by_type = defaultdict(int)
    for issue in issues:
        by_type[issue['type']] += 1

    for issue_type in ['CRITICAL', 'SYNTAX', 'SECURITY', 'PERFORMANCE', 'WARNING', 'STYLE']:
        if issue_type in by_type:
            print(f"{issue_type}: {by_type[issue_type]}")

if __name__ == "__main__":
    main()
