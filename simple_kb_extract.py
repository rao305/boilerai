#!/usr/bin/env python3
"""
Simple Knowledge Base Extractor - Shows AI system data
"""

def extract_ai_context():
    """Extract what AI system actually sees"""
    try:
        with open('src/services/cliBridge/pure_ai_main.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("KNOWLEDGE BASE EXTRACTION")
        print("=" * 80)
        print("This is EXACTLY what the AI system sees:")
        print()
        
        # Find the progression context
        start = content.find('comprehensive_progression_context = """')
        if start != -1:
            start += len('comprehensive_progression_context = """')
            end = content.find('"""', start)
            if end != -1:
                ai_context = content[start:end]
                print("AI SYSTEM CONTEXT:")
                print("-" * 40)
                print(ai_context)
                print("-" * 40)
            else:
                print("ERROR: End marker not found")
        else:
            print("ERROR: AI context not found")
            
    except Exception as e:
        print(f"ERROR: {e}")

def extract_csv_data():
    """Show course data from CSV"""
    try:
        print("\nCOURSE DATA FROM CSV:")
        print("=" * 80)
        
        with open('neo4j_courses.csv', 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Print header
        if lines:
            print(lines[0].strip())
            print("-" * 80)
        
        # Print CS, MA, STAT, PHIL courses
        for line in lines[1:]:
            if line.startswith(('CS ', 'MA ', 'STAT ', 'PHIL ')):
                print(line.strip())
                
    except Exception as e:
        print(f"ERROR reading CSV: {e}")

if __name__ == "__main__":
    extract_ai_context()
    extract_csv_data()
    
    print("\n" + "=" * 80)
    print("REVIEW INSTRUCTIONS:")
    print("=" * 80)
    print("1. Check the AI SYSTEM CONTEXT above - this is what AI sees")
    print("2. Check the COURSE DATA - this is timing/prerequisite data")
    print("3. Tell me what's wrong so I can fix the knowledge base directly")
    print("4. This avoids testing AI responses - we fix the source data!")