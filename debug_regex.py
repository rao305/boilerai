#!/usr/bin/env python3

import re

KEYWORDS_SQL = r'(prereq|prerequisite|credits?|offered|term pattern|tell me about|description|outcomes?|campus|schedule types?|track|electives?|what class|what course|class.*[a-z]{2,3}\d{3}|course.*[a-z]{2,3}\d{3}|[a-z]{2,3}\d{3}|what.*[a-z]{2,3}\d{3})'

test_queries = [
    'what is cs 250',
    'cs 251 course', 
    'what is CS 250',
    'cs 251',
    'what class is cs251',
    'what course is CS 250'
]

print('=== Regex Pattern Analysis ===')
print('KEYWORDS_SQL pattern:', KEYWORDS_SQL)
print()

for query in test_queries:
    match = re.search(KEYWORDS_SQL, query.lower())
    print(f"Query: '{query}'")
    print(f"  Lowercased: '{query.lower()}'")
    print(f"  Match: {bool(match)}")
    if match:
        print(f"  Matched part: '{match.group()}'")
    print()