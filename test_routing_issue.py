#!/usr/bin/env python3

"""
Test script to reproduce the AI assistant routing issue where course queries
are going to general chat instead of t2sql pipeline.
"""

import sys
sys.path.append('.')

# Test the intent classification for problematic queries
from router.intent import classify_intent
from router.router import route_to_handler

def test_query_routing():
    # Test cases that should go to t2sql but are going to general_chat
    test_queries = [
        "what class is cs251",
        "what is cs 250", 
        "what class is CS251",
        "what course is CS 250",
        "tell me about cs251",
        "what is CS251",
        "describe CS251",
        "what class cs251",
        "cs251 class info",
        "cs 251 course"
    ]
    
    print("=== Query Routing Analysis ===")
    print("Testing queries that should go to t2sql but may be going to general_chat\n")
    
    for query in test_queries:
        intent = classify_intent(query)
        destination = route_to_handler(intent, query)
        
        expected = "t2sql" if any(keyword in query.lower() for keyword in ["what class", "what course", "what is", "tell me about", "describe", "cs", "CS"]) else "general_chat"
        status = "✅ CORRECT" if destination == "t2sql" else "❌ INCORRECT"
        
        print(f"Query: '{query}'")
        print(f"  Intent: {intent}")
        print(f"  Destination: {destination}")
        print(f"  Expected: t2sql")
        print(f"  Status: {status}")
        print()

if __name__ == "__main__":
    test_query_routing()