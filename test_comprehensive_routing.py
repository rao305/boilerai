#!/usr/bin/env python3

"""
Comprehensive test to verify the routing fix works for various query types
without breaking other functionality.
"""

import sys
sys.path.append('.')

from router.intent import classify_intent
from router.router import route_to_handler

def test_comprehensive_routing():
    test_cases = [
        # Course queries (should go to t2sql)
        ("what class is cs251", "t2sql"),
        ("what is cs 250", "t2sql"), 
        ("what is CS 250", "t2sql"),
        ("cs 251 course", "t2sql"),
        ("tell me about CS251", "t2sql"),
        ("describe ma261", "t2sql"),
        ("what course is stat355", "t2sql"),
        ("cs240 credits", "t2sql"),
        ("prereqs for cs381", "t2sql"),
        ("what are the prerequisites for MA261", "t2sql"),
        ("ECE 264 description", "t2sql"),
        ("what class ECE264", "t2sql"),
        ("EE 270 outcomes", "t2sql"),
        
        # Planning queries (should go to planner)
        ("when should I take CS251", "planner"),
        ("help me plan my schedule", "planner"),
        ("what if I switch to CE track", "planner"),
        ("when can I graduate", "planner"),
        ("plan my semester", "planner"),
        
        # General chat (should stay as general_chat) 
        ("hello how are you", "general_chat"),
        ("what's the weather like", "general_chat"),
        ("help me with my homework", "general_chat"),
        ("what is computer science", "general_chat"),
        ("tell me a joke", "general_chat"),
        
        # Edge cases that could be confusing
        ("what is the best programming language", "general_chat"),
        ("how do I register for classes", "general_chat"),
        ("what is purdue", "general_chat"),
    ]
    
    print("=== Comprehensive Routing Test ===")
    print("Testing various query types to ensure routing works correctly\n")
    
    correct = 0
    total = len(test_cases)
    
    for query, expected_dest in test_cases:
        intent = classify_intent(query)
        actual_dest = route_to_handler(intent, query)
        
        status = "✅" if actual_dest == expected_dest else "❌"
        if actual_dest == expected_dest:
            correct += 1
        
        print(f"{status} '{query}'")
        print(f"   Intent: {intent} → Destination: {actual_dest} (expected: {expected_dest})")
        if actual_dest != expected_dest:
            print(f"   *** MISMATCH ***")
        print()
    
    print(f"=== Results ===")
    print(f"Correct: {correct}/{total} ({100*correct/total:.1f}%)")
    
    if correct == total:
        print("🎉 All tests passed!")
    else:
        print(f"⚠️  {total-correct} tests failed")

if __name__ == "__main__":
    test_comprehensive_routing()