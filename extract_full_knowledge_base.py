#!/usr/bin/env python3
"""
Direct Knowledge Base Extractor
Shows EXACTLY what data the AI system has access to
"""

import json
import csv
import re

def extract_from_comprehensive_kb():
    """Extract data from comprehensive_unified_knowledge_base.js"""
    try:
        with open('src/data/comprehensive_unified_knowledge_base.js', 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("🎯 COMPUTER SCIENCE MAJOR PROGRESSION:")
        print("=" * 60)
        
        # Extract CS progression
        cs_match = re.search(r'"Computer Science":\s*{.*?recommended_sequence:\s*{(.*?)}.*?}.*?},', content, re.DOTALL)
        if cs_match:
            sequence_text = cs_match.group(1)
            print("FOUND CS PROGRESSION:")
            print(sequence_text)
        else:
            print("❌ CS progression not found")
        
        print("\n🎯 DATA SCIENCE MAJOR PROGRESSION:")
        print("=" * 60)
        
        # Extract DS progression  
        ds_match = re.search(r'"Data Science":\s*{.*?recommended_sequence:\s*{(.*?)}.*?}.*?},', content, re.DOTALL)
        if ds_match:
            sequence_text = ds_match.group(1)
            print("FOUND DS PROGRESSION:")
            print(sequence_text)
        else:
            print("❌ DS progression not found")
            
        print("\n🎯 AI MAJOR PROGRESSION:")
        print("=" * 60)
        
        # Extract AI progression
        ai_match = re.search(r'"Artificial Intelligence":\s*{.*?recommended_sequence:\s*{(.*?)}.*?}.*?}', content, re.DOTALL)
        if ai_match:
            sequence_text = ai_match.group(1)
            print("FOUND AI PROGRESSION:")
            print(sequence_text)
        else:
            print("❌ AI progression not found")
        
        return content
        
    except Exception as e:
        print(f"❌ Error reading comprehensive KB: {e}")
        return ""

def extract_from_csv():
    """Extract course timing data from CSV"""
    try:
        with open('neo4j_courses.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            courses = list(reader)
        
        print("\n🎯 COURSE TIMING DATA FROM CSV:")
        print("=" * 60)
        print("| Course | Typical Semester | Offered | Credits | Type |")
        print("|--------|------------------|---------|---------|------|")
        
        for course in courses:
            if course.get('code', '').startswith(('CS ', 'MA ', 'STAT ', 'PHIL ')):
                code = course.get('code', '')
                typical = course.get('typical_semester', '')
                offered = course.get('offered_semesters', '')
                credits = course.get('credits', '')
                course_type = course.get('course_type', '')
                print(f"| {code} | {typical} | {offered} | {credits} | {course_type} |")
                
        return courses
        
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return []

def extract_from_knowledge_graph():
    """Extract from comprehensive_knowledge_graph.json"""
    try:
        with open('comprehensive_knowledge_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print("\n🎯 KNOWLEDGE GRAPH DATA:")
        print("=" * 60)
        
        if 'courses' in data:
            print("📚 COURSES:")
            for code, course_data in list(data['courses'].items())[:10]:  # First 10
                print(f"  {code}: {course_data.get('title', 'No title')}")
        
        if 'prerequisite_chains' in data:
            print("\n⛓️ PREREQUISITE CHAINS:")
            for course, prereqs in list(data['prerequisite_chains'].items())[:10]:  # First 10
                print(f"  {course}: {prereqs}")
        
        return data
        
    except Exception as e:
        print(f"❌ Error reading knowledge graph: {e}")
        return {}

def extract_ai_system_context():
    """Extract what the AI system actually uses"""
    try:
        with open('src/services/cliBridge/pure_ai_main.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("\n🤖 AI SYSTEM CONTEXT (What AI Actually Sees):")
        print("=" * 60)
        
        # Find the progression context
        context_match = re.search(r'comprehensive_progression_context = """(.*?)"""', content, re.DOTALL)
        if context_match:
            ai_context = context_match.group(1)
            print("CURRENT AI CONTEXT:")
            print(ai_context)
        else:
            print("❌ AI context not found")
            
        return content
        
    except Exception as e:
        print(f"❌ Error reading AI system: {e}")
        return ""

def main():
    """Main extraction function"""
    print("🔍 COMPREHENSIVE KNOWLEDGE BASE EXTRACTION")
    print("=" * 80)
    print("This shows EXACTLY what data your AI system has access to")
    print()
    
    # Extract from all sources
    kb_data = extract_from_comprehensive_kb()
    csv_data = extract_from_csv()
    graph_data = extract_from_knowledge_graph()
    ai_context = extract_ai_system_context()
    
    print("\n" + "=" * 80)
    print("✅ EXTRACTION COMPLETE")
    print("=" * 80)
    print("Review the above data and tell me:")
    print("1. Which progressions are wrong?")
    print("2. Which courses are in wrong semesters?") 
    print("3. Which prerequisites are incorrect?")
    print("4. What's missing or needs to be added?")
    print()
    print("This way we can fix the knowledge base directly instead of testing AI responses!")

if __name__ == "__main__":
    main()