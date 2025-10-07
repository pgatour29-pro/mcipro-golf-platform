#!/usr/bin/env python3
"""
Deep HTML/JavaScript Scanner - Advanced Analysis
"""

import re
from collections import defaultdict

class CodeAnalyzer:
    def __init__(self):
        self.issues = []
        self.fixes_applied = 0

    def analyze_file(self, file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')

        self.check_script_tags_in_strings(lines)
        self.check_syntax_errors(lines, content)
        self.check_performance_issues(lines)
        self.check_security_issues(lines)
        self.check_html_structure(lines)

        return self.issues, lines, content

    def check_script_tags_in_strings(self, lines):
        """Check for </script> tags inside template literals or strings"""
        for i, line in enumerate(lines, 1):
            # Look for </script> in template literals (between backticks)
            if re.search(r'`[^`]*</script>[^`]*`', line, re.IGNORECASE):
                self.issues.append({
                    'line': i,
                    'type': 'CRITICAL',
                    'category': '</script> in template literal',
                    'issue': '</script> tag found inside template literal - breaks HTML parsing',
                    'content': line.strip()[:150],
                    'fix': 'Replace </script> with <\\/script>',
                    'severity': 10
                })

            # Look for </script> in strings
            if re.search(r'["\'][^"\']*</script>[^"\']*["\']', line, re.IGNORECASE):
                self.issues.append({
                    'line': i,
                    'type': 'CRITICAL',
                    'category': '</script> in string',
                    'issue': '</script> tag found inside string - breaks HTML parsing',
                    'content': line.strip()[:150],
                    'fix': 'Replace </script> with <\\/script>',
                    'severity': 10
                })

    def check_syntax_errors(self, lines, content):
        """Check for real syntax errors"""
        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            # Check for unterminated template literals (very basic)
            backtick_count = line.count('`')
            if backtick_count == 1 and not stripped.endswith(',') and not stripped.endswith('+'):
                # Could be start or end of multi-line template literal
                # More sophisticated check needed
                pass

            # Check for common typos
            if re.search(r'\.textcontent\s*=', line, re.IGNORECASE):
                if 'textContent' not in line:
                    self.issues.append({
                        'line': i,
                        'type': 'SYNTAX',
                        'category': 'Incorrect property name',
                        'issue': 'textcontent should be textContent (capital C)',
                        'content': line.strip()[:150],
                        'fix': 'Change to textContent',
                        'severity': 8
                    })

            # Check for addEventListener typos
            if re.search(r'addeventlistener', line, re.IGNORECASE):
                if 'addEventListener' not in line:
                    self.issues.append({
                        'line': i,
                        'type': 'SYNTAX',
                        'category': 'Incorrect method name',
                        'issue': 'addEventListener has incorrect casing',
                        'content': line.strip()[:150],
                        'fix': 'Use correct casing: addEventListener',
                        'severity': 9
                    })

    def check_performance_issues(self, lines):
        """Check for performance bottlenecks"""
        for i, line in enumerate(lines, 1):
            # DOM queries in loops
            if re.search(r'for\s*\([^)]*\)\s*\{[^}]*document\.(querySelector|getElementById)', line):
                self.issues.append({
                    'line': i,
                    'type': 'PERFORMANCE',
                    'category': 'DOM query in loop',
                    'issue': 'DOM query inside loop - cache the result',
                    'content': line.strip()[:150],
                    'fix': 'Move querySelector outside loop',
                    'severity': 6
                })

            # Multiple querySelectorAll on same selector
            if '.querySelectorAll' in line and '.forEach' in line:
                self.issues.append({
                    'line': i,
                    'type': 'PERFORMANCE',
                    'category': 'Uncached selector',
                    'issue': 'querySelectorAll result not cached',
                    'content': line.strip()[:150],
                    'fix': 'Cache the NodeList',
                    'severity': 5
                })

            # Inefficient string concatenation in loops
            if re.search(r'(for|while)\s*\([^)]*\).*\+=\s*["\']', line):
                self.issues.append({
                    'line': i,
                    'type': 'PERFORMANCE',
                    'category': 'String concatenation in loop',
                    'issue': 'String concatenation in loop - use array.join()',
                    'content': line.strip()[:150],
                    'fix': 'Use array push and join instead',
                    'severity': 6
                })

    def check_security_issues(self, lines):
        """Check for security issues"""
        for i, line in enumerate(lines, 1):
            # innerHTML with user input
            if '.innerHTML' in line and '=' in line:
                # Check if it's a simple string assignment
                if re.search(r'\.innerHTML\s*=\s*["\'][^<>"\']*["\']', line):
                    # Plain text - should use textContent
                    if '<' not in line or '`' in line:
                        self.issues.append({
                            'line': i,
                            'type': 'SECURITY',
                            'category': 'innerHTML misuse',
                            'issue': 'innerHTML used for plain text - potential XSS risk',
                            'content': line.strip()[:150],
                            'fix': 'Use textContent instead of innerHTML',
                            'severity': 7
                        })

            # eval usage
            if re.search(r'\beval\s*\(', line):
                self.issues.append({
                    'line': i,
                    'type': 'SECURITY',
                    'category': 'eval() usage',
                    'issue': 'eval() is a security risk',
                    'content': line.strip()[:150],
                    'fix': 'Avoid eval(), use safer alternatives',
                    'severity': 9
                })

    def check_html_structure(self, lines):
        """Check HTML structure issues"""
        tag_stack = []
        for i, line in enumerate(lines, 1):
            # Find opening tags
            opening_tags = re.findall(r'<(\w+)(?:\s|>|/)', line)
            # Find closing tags
            closing_tags = re.findall(r'</(\w+)>', line)

            for tag in opening_tags:
                if tag.lower() not in ['br', 'hr', 'img', 'input', 'meta', 'link']:
                    # Check if it's self-closing
                    if not re.search(r'<' + tag + r'[^>]*/>', line):
                        tag_stack.append((tag, i))

            for tag in closing_tags:
                if tag_stack and tag_stack[-1][0] == tag:
                    tag_stack.pop()
                elif tag_stack:
                    # Mismatched tag
                    self.issues.append({
                        'line': i,
                        'type': 'HTML',
                        'category': 'Mismatched tag',
                        'issue': f'Closing tag </{tag}> doesn\'t match opening tag <{tag_stack[-1][0]}>',
                        'content': line.strip()[:150],
                        'fix': f'Verify tag matching',
                        'severity': 8
                    })

def apply_critical_fixes(lines, issues):
    """Apply fixes for critical issues"""
    fixed_lines = lines.copy()
    fixes_applied = 0

    for issue in issues:
        if issue['type'] == 'CRITICAL' and issue['severity'] >= 9:
            line_idx = issue['line'] - 1
            if line_idx < len(fixed_lines):
                # Fix </script> in strings and template literals
                original = fixed_lines[line_idx]
                fixed = original.replace('</script>', '<\\/script>')
                fixed = fixed.replace('</SCRIPT>', '<\\/SCRIPT>')
                if original != fixed:
                    fixed_lines[line_idx] = fixed
                    fixes_applied += 1

    return fixed_lines, fixes_applied

def generate_detailed_report(issues):
    """Generate comprehensive report"""
    report = []
    report.append("=" * 100)
    report.append("MCIPRO INDEX.HTML - COMPREHENSIVE ANALYSIS REPORT")
    report.append("=" * 100)
    report.append(f"\nTotal Issues Found: {len(issues)}\n")

    # Sort by severity
    issues_sorted = sorted(issues, key=lambda x: x['severity'], reverse=True)

    # Group by type
    by_type = defaultdict(list)
    for issue in issues_sorted:
        by_type[issue['type']].append(issue)

    # Summary by type
    report.append("\nSUMMARY BY TYPE:")
    report.append("-" * 100)
    for issue_type in ['CRITICAL', 'SYNTAX', 'SECURITY', 'PERFORMANCE', 'HTML']:
        if issue_type in by_type:
            report.append(f"  {issue_type}: {len(by_type[issue_type])} issues")

    # Detailed issues
    for issue_type in ['CRITICAL', 'SYNTAX', 'SECURITY', 'PERFORMANCE', 'HTML']:
        if issue_type in by_type:
            report.append(f"\n\n{'=' * 100}")
            report.append(f"{issue_type} ISSUES ({len(by_type[issue_type])})")
            report.append("=" * 100)

            for issue in by_type[issue_type]:
                report.append(f"\n  Line {issue['line']} [Severity: {issue['severity']}/10]")
                report.append(f"  Category: {issue['category']}")
                report.append(f"  Issue: {issue['issue']}")
                report.append(f"  Content: {issue['content']}")
                report.append(f"  Fix: {issue['fix']}")
                report.append("  " + "-" * 96)

    return "\n".join(report)

def main():
    file_path = "C:/Users/pete/Documents/MciPro/index.html"
    output_path = "C:/Users/pete/Documents/MciPro/index-fixed.html"
    report_path = "C:/Users/pete/Documents/MciPro/detailed-scan-report.txt"

    print("Starting deep analysis...")
    analyzer = CodeAnalyzer()
    issues, lines, content = analyzer.analyze_file(file_path)

    print(f"Found {len(issues)} issues")

    # Apply critical fixes
    print("Applying critical fixes...")
    fixed_lines, fixes_applied = apply_critical_fixes(lines, issues)

    # Save fixed file
    with open(output_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(fixed_lines))

    print(f"Applied {fixes_applied} critical fixes")
    print(f"Fixed file saved to: {output_path}")

    # Generate report
    print("Generating detailed report...")
    report = generate_detailed_report(issues)

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"Report saved to: {report_path}")

    # Print summary
    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)

    by_type = defaultdict(int)
    by_severity = defaultdict(int)

    for issue in issues:
        by_type[issue['type']] += 1
        by_severity[issue['severity']] += 1

    print("\nBy Type:")
    for issue_type in ['CRITICAL', 'SYNTAX', 'SECURITY', 'PERFORMANCE', 'HTML']:
        if issue_type in by_type:
            print(f"  {issue_type}: {by_type[issue_type]}")

    print("\nBy Severity (10 = Critical, 1 = Minor):")
    for severity in sorted(by_severity.keys(), reverse=True):
        print(f"  Severity {severity}: {by_severity[severity]} issues")

    print(f"\nCritical fixes applied: {fixes_applied}")
    print("=" * 100)

if __name__ == "__main__":
    main()
