#!/usr/bin/env python3
"""
Test that achievement recognition is persona-based, not hardcoded
"""

import requests
import json

def test_achievement_persona():
    """Test that the AI responds to achievements with natural advisor persona, not hardcoded patterns"""
    print("Testing Achievement Recognition Persona...")
    print("=" * 50)
    
    test_messages = [
        "I just completed CS 25100 and got an A!",
        "I finished my Data Structures project",
        "Just passed my linear algebra exam",
        "I'm done with MATH 26100"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n{i}. Testing: '{message}'")
        
        try:
            response = requests.post(
                "http://localhost:5003/chat",
                json={
                    "message": message,
                    "context": {
                        "userId": f"test_user_{i}"
                    }
                },
                timeout=15
            )
            
            if response.ok:
                data = response.json()
                ai_response = data.get("response", "")
                
                # Check if response sounds natural and persona-based
                natural_indicators = [
                    "congratulations", "great job", "well done", "awesome", "fantastic",
                    "proud", "excellent", "nice work", "way to go", "amazing"
                ]
                
                hardcoded_indicators = [
                    "CS 18200", "specific achievement", "exact achievement"
                ]
                
                has_natural_response = any(indicator.lower() in ai_response.lower() for indicator in natural_indicators)
                has_hardcoded_patterns = any(indicator in ai_response for indicator in hardcoded_indicators)
                
                print(f"   Response length: {len(ai_response)} characters")
                print(f"   Natural encouragement: {'Yes' if has_natural_response else 'No'}")
                print(f"   Hardcoded patterns: {'Found' if has_hardcoded_patterns else 'None'}")
                
                if has_natural_response and not has_hardcoded_patterns:
                    print("   ✓ SUCCESS: Natural persona-based response")
                elif has_hardcoded_patterns:
                    print("   ✗ ERROR: Still contains hardcoded patterns")
                else:
                    print("   ? WARNING: No clear encouragement detected")
                
                # Show sample of response
                print(f"   Sample: {ai_response[:150]}...")
                
            else:
                print(f"   ✗ Error: {response.status_code}")
                
        except Exception as e:
            print(f"   ✗ Test failed: {e}")

def main():
    print("Achievement Recognition Persona Test")
    print("=" * 60)
    print("Testing that AI uses natural advisor persona instead of hardcoded patterns...")
    
    test_achievement_persona()
    
    print("\n" + "=" * 60)
    print("Expected: Natural, warm advisor responses that celebrate achievements")
    print("Not Expected: Hardcoded patterns or 'CS 18200' references")

if __name__ == "__main__":
    main()