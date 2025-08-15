#!/usr/bin/env python3
"""
Simple validation script for Pure AI Logic Implementation
"""

import os
import sys
from pathlib import Path

def check_hardcoded_messages():
    """Check for hardcoded error messages in key files"""
    
    files_to_check = [
        "src/services/pureAIFallback.ts",
        "src/services/openaiChatService.ts", 
        "src/services/aiService.ts",
        "src/services/cliBridge/main.py",
        "src/services/cliBridge/simple_main.py",
        "src/services/cliBridge/pure_ai_fallback.py",
        "src/services/cliBridge/contextual_ai_system.py",
        "src/services/cliBridge/hybrid_ai_bridge.py"
    ]
    
    hardcoded_patterns = [
        "System temporarily unavailable",
        "Service experiencing difficulties", 
        "Please try again",
        "API key required",
        "Failed to",
        "Unable to process",
        "Connection error",
        "Invalid API key"
    ]
    
    issues_found = []
    
    for file_path in files_to_check:
        full_path = Path(file_path)
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for pattern in hardcoded_patterns:
                    if pattern in content and 'await handle_error_with_ai' not in content.split(pattern)[1][:100]:
                        # Found hardcoded pattern that's not using AI fallback
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if pattern in line and 'await handle_error_with_ai' not in line:
                                issues_found.append((file_path, i+1, line.strip()))
                                
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
        else:
            print(f"File not found: {file_path}")
    
    return issues_found

def check_ai_fallback_imports():
    """Check if files properly import AI fallback system"""
    
    python_files = [
        "src/services/cliBridge/main.py",
        "src/services/cliBridge/simple_main.py", 
        "src/services/cliBridge/contextual_ai_system.py",
        "src/services/cliBridge/hybrid_ai_bridge.py"
    ]
    
    typescript_files = [
        "src/services/pureAIFallback.ts",
        "src/services/openaiChatService.ts",
        "src/services/aiService.ts",
        "src/pages/AIAssistant.tsx"
    ]
    
    python_missing = []
    typescript_missing = []
    
    # Check Python files
    for file_path in python_files:
        full_path = Path(file_path)
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'python_pure_ai_fallback' not in content and 'handle_error_with_ai' not in content:
                    python_missing.append(file_path)
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    # Check TypeScript files
    for file_path in typescript_files:
        full_path = Path(file_path)
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'pureAIFallback' not in content:
                    typescript_missing.append(file_path)
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    return python_missing, typescript_missing

def main():
    """Main validation function"""
    print("Pure AI Logic Implementation Validation")
    print("=" * 50)
    
    # Check for hardcoded messages
    print("\nChecking for hardcoded messages...")
    issues = check_hardcoded_messages()
    
    if issues:
        print(f"Found {len(issues)} potential hardcoded messages:")
        for file_path, line_num, line_content in issues:
            print(f"  {file_path}:{line_num} - {line_content[:80]}")
    else:
        print("✓ No obvious hardcoded messages found")
    
    # Check for AI fallback imports
    print("\nChecking AI fallback system imports...")
    python_missing, typescript_missing = check_ai_fallback_imports()
    
    if python_missing:
        print("Python files missing AI fallback imports:")
        for file_path in python_missing:
            print(f"  {file_path}")
    else:
        print("✓ Python files have AI fallback imports")
    
    if typescript_missing:
        print("TypeScript files missing AI fallback imports:")
        for file_path in typescript_missing:
            print(f"  {file_path}")
    else:
        print("✓ TypeScript files have AI fallback imports")
    
    # Check if comprehensive AI fallback system exists
    ai_fallback_exists = Path("src/services/cliBridge/python_pure_ai_fallback.py").exists()
    
    print(f"\nComprehensive AI fallback system: {'✓ Present' if ai_fallback_exists else '✗ Missing'}")
    
    # Summary
    print("\n" + "=" * 30)
    print("VALIDATION SUMMARY")
    print("=" * 30)
    
    total_issues = len(issues) + len(python_missing) + len(typescript_missing)
    
    if total_issues == 0 and ai_fallback_exists:
        print("✓ VALIDATION PASSED: Pure AI logic implementation is complete!")
        print("✓ No hardcoded messages found")
        print("✓ All files use AI fallback system")
        print("✓ Comprehensive AI fallback system is present")
    else:
        print(f"✗ VALIDATION ISSUES: {total_issues} issues found")
        if issues:
            print(f"  - {len(issues)} hardcoded messages need AI replacement")
        if python_missing or typescript_missing:
            print(f"  - {len(python_missing + typescript_missing)} files missing AI imports")
        if not ai_fallback_exists:
            print("  - Comprehensive AI fallback system missing")

if __name__ == "__main__":
    main()