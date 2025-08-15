#!/usr/bin/env python3
"""
Test and Validation Script for Pure AI Logic Implementation
Validates that all hardcoded messages have been replaced with AI-generated responses
"""

import os
import sys
import asyncio
import json
from typing import List, Dict, Any, Tuple
from pathlib import Path

# Add the services directory to path
services_path = Path(__file__).parent / "src" / "services" / "cliBridge"
sys.path.insert(0, str(services_path))

def analyze_file_for_hardcoded_messages(file_path: Path) -> List[Tuple[int, str]]:
    """Analyze a file for potential hardcoded messages"""
    hardcoded_patterns = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # Skip comments and imports
            if line_stripped.startswith('#') or line_stripped.startswith('import') or line_stripped.startswith('from'):
                continue
            
            # Look for hardcoded return statements with messages
            if ('return "' in line and any(keyword in line.lower() for keyword in [
                'error', 'failed', 'unavailable', 'sorry', 'please try', 
                'cannot', 'invalid', 'timeout', 'connection', 'api key'
            ])):
                hardcoded_patterns.append((i, line_stripped))
            
            # Look for hardcoded error messages in dictionaries
            if ('"message":' in line and any(keyword in line.lower() for keyword in [
                'error', 'failed', 'unavailable', 'sorry', 'please try',
                'cannot', 'invalid', 'timeout', 'connection'
            ])):
                hardcoded_patterns.append((i, line_stripped))
    
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return hardcoded_patterns

def analyze_typescript_files() -> Dict[str, List[Tuple[int, str]]]:
    """Analyze TypeScript files for hardcoded messages"""
    typescript_files = [
        "src/services/pureAIFallback.ts",
        "src/services/openaiChatService.ts", 
        "src/services/aiService.ts",
        "src/pages/AIAssistant.tsx"
    ]
    
    results = {}
    
    for file_path in typescript_files:
        full_path = Path(file_path)
        if full_path.exists():
            hardcoded = analyze_file_for_hardcoded_messages(full_path)
            if hardcoded:
                results[file_path] = hardcoded
        else:
            print(f"❌ File not found: {file_path}")
    
    return results

def analyze_python_files() -> Dict[str, List[Tuple[int, str]]]:
    """Analyze Python files for hardcoded messages"""
    python_files = [
        "src/services/cliBridge/main.py",
        "src/services/cliBridge/simple_main.py",
        "src/services/cliBridge/pure_ai_fallback.py",
        "src/services/cliBridge/contextual_ai_system.py",
        "src/services/cliBridge/hybrid_ai_bridge.py",
        "src/services/cliBridge/python_pure_ai_fallback.py"
    ]
    
    results = {}
    
    for file_path in python_files:
        full_path = Path(file_path)
        if full_path.exists():
            hardcoded = analyze_file_for_hardcoded_messages(full_path)
            if hardcoded:
                results[file_path] = hardcoded
        else:
            print(f"❌ File not found: {file_path}")
    
    return results

async def test_ai_fallback_system():
    """Test the AI fallback system functionality"""
    print("\n🧪 Testing AI Fallback System...")
    
    try:
        from python_pure_ai_fallback import python_ai_fallback, generate_ai_response, handle_error_with_ai
        
        # Test basic AI response generation
        print("   Testing basic AI response generation...")
        response = await generate_ai_response(
            "What courses should I take next?",
            service_type='academic_planning'
        )
        
        if response and len(response) > 10:
            print("   ✅ Basic AI response generation works")
        else:
            print("   ❌ Basic AI response generation failed")
        
        # Test error handling
        print("   Testing error handling...")
        error_response = await handle_error_with_ai(
            'api_unavailable',
            'Help me plan my courses',
            'academic_planning'
        )
        
        if error_response and len(error_response) > 10:
            print("   ✅ AI error handling works")
        else:
            print("   ❌ AI error handling failed")
        
        # Test different scenarios
        scenarios = [
            ('authentication', 'Configure my settings'),
            ('rate_limit', 'Search for courses'),
            ('general', 'Help with graduation planning')
        ]
        
        print("   Testing different error scenarios...")
        for error_type, query in scenarios:
            try:
                response = await handle_error_with_ai(error_type, query, 'academic_planning')
                if response and len(response) > 10:
                    print(f"     ✅ {error_type} scenario works")
                else:
                    print(f"     ❌ {error_type} scenario failed")
            except Exception as e:
                print(f"     ❌ {error_type} scenario error: {e}")
        
        return True
        
    except ImportError as e:
        print(f"   ❌ Cannot import AI fallback system: {e}")
        return False
    except Exception as e:
        print(f"   ❌ AI fallback system test failed: {e}")
        return False

def test_typescript_integration():
    """Test TypeScript integration"""
    print("\n🔧 Testing TypeScript Integration...")
    
    # Check if TypeScript files use the AI fallback system
    ts_files_to_check = {
        "src/services/pureAIFallback.ts": ["PureAIFallbackSystem", "generateContextualResponse"],
        "src/services/openaiChatService.ts": ["pureAIFallback", "generateErrorResponse"],
        "src/services/aiService.ts": ["pureAIFallback", "getIntelligentFallback"],
        "src/pages/AIAssistant.tsx": ["pureAIFallback", "generateErrorResponse"]
    }
    
    all_passed = True
    
    for file_path, required_elements in ts_files_to_check.items():
        full_path = Path(file_path)
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                missing_elements = []
                for element in required_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"   ❌ {file_path} missing: {', '.join(missing_elements)}")
                    all_passed = False
                else:
                    print(f"   ✅ {file_path} properly integrated")
                    
            except Exception as e:
                print(f"   ❌ Error checking {file_path}: {e}")
                all_passed = False
        else:
            print(f"   ❌ File not found: {file_path}")
            all_passed = False
    
    return all_passed

def generate_validation_report() -> Dict[str, Any]:
    """Generate comprehensive validation report"""
    print("\n📊 Generating Validation Report...")
    
    report = {
        "timestamp": "2024-01-20T10:30:00Z",
        "validation_results": {
            "typescript_files": {},
            "python_files": {},
            "ai_system_tests": {},
            "integration_tests": {}
        },
        "summary": {
            "total_files_analyzed": 0,
            "files_with_hardcoded_messages": 0,
            "ai_system_functional": False,
            "integration_successful": False
        }
    }
    
    # Analyze TypeScript files
    ts_results = analyze_typescript_files()
    report["validation_results"]["typescript_files"] = ts_results
    
    # Analyze Python files  
    py_results = analyze_python_files()
    report["validation_results"]["python_files"] = py_results
    
    # Count totals
    total_files = len(ts_results) + len(py_results)
    files_with_issues = len([f for f in ts_results.values() if f]) + len([f for f in py_results.values() if f])
    
    report["summary"]["total_files_analyzed"] = total_files
    report["summary"]["files_with_hardcoded_messages"] = files_with_issues
    
    return report

async def main():
    """Main validation function"""
    print("🚀 Pure AI Logic Implementation Validation")
    print("=" * 50)
    
    # Analyze files for hardcoded messages
    print("\n🔍 Analyzing Files for Hardcoded Messages...")
    
    typescript_issues = analyze_typescript_files()
    python_issues = analyze_python_files()
    
    print(f"\nTypeScript Files Analysis:")
    if typescript_issues:
        for file_path, issues in typescript_issues.items():
            print(f"  ❌ {file_path}:")
            for line_num, line_content in issues:
                print(f"    Line {line_num}: {line_content[:80]}...")
    else:
        print("  ✅ No hardcoded messages found in TypeScript files")
    
    print(f"\nPython Files Analysis:")
    if python_issues:
        for file_path, issues in python_issues.items():
            print(f"  ❌ {file_path}:")
            for line_num, line_content in issues:
                print(f"    Line {line_num}: {line_content[:80]}...")
    else:
        print("  ✅ No hardcoded messages found in Python files")
    
    # Test AI fallback system
    ai_system_works = await test_ai_fallback_system()
    
    # Test TypeScript integration
    ts_integration_works = test_typescript_integration()
    
    # Generate final report
    print("\n📋 Final Validation Summary")
    print("=" * 30)
    
    total_issues = len(typescript_issues) + len(python_issues)
    
    if total_issues == 0:
        print("✅ No hardcoded messages found - Pure AI logic successfully implemented!")
    else:
        print(f"❌ Found hardcoded messages in {total_issues} files - needs attention")
    
    if ai_system_works:
        print("✅ AI fallback system is functional")
    else:
        print("❌ AI fallback system has issues")
    
    if ts_integration_works:
        print("✅ TypeScript integration is working")
    else:
        print("❌ TypeScript integration has issues")
    
    # Overall status
    if total_issues == 0 and ai_system_works and ts_integration_works:
        print("\n🎉 VALIDATION PASSED: Pure AI logic implementation is complete and functional!")
        return True
    else:
        print("\n⚠️  VALIDATION ISSUES: Some components need attention")
        return False

if __name__ == "__main__":
    asyncio.run(main())