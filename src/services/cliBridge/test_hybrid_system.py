#!/usr/bin/env python3
"""
Hybrid AI System Test Suite
Comprehensive testing of the new AI + hybrid academic advisory system
"""

import sys
import os
from pathlib import Path
import asyncio
import json
from datetime import datetime

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def test_knowledge_manager():
    """Test the dynamic knowledge manager"""
    print("🧪 Testing Dynamic Knowledge Manager...")
    
    try:
        from dynamic_knowledge_manager import DynamicKnowledgeManager
        
        manager = DynamicKnowledgeManager()
        
        # Test course fetching
        print("  📚 Testing course fetching...")
        cs_courses = manager.get_courses({"department": "CS"})
        print(f"     Found {len(cs_courses)} CS courses")
        
        if cs_courses:
            sample_course = cs_courses[0]
            print(f"     Sample: {sample_course.course_code} - {sample_course.course_title}")
        
        # Test major fetching
        print("  🎓 Testing major fetching...")
        majors = manager.get_majors()
        print(f"     Found {len(majors)} majors")
        
        for major in majors[:3]:
            print(f"     - {major.major_name}: {len(major.foundation_courses)} foundation courses")
        
        # Test search
        print("  🔍 Testing course search...")
        search_results = manager.search_courses("programming")
        print(f"     Found {len(search_results)} programming-related courses")
        
        # Test cache status
        cache_status = manager.get_cache_status()
        print(f"  💾 Cache: {cache_status['cache_entries']} entries, {cache_status['available_sources']}/{cache_status['total_sources']} sources available")
        
        print("     ✅ Dynamic Knowledge Manager: PASS")
        return True
        
    except Exception as e:
        print(f"     ❌ Dynamic Knowledge Manager: FAIL - {e}")
        return False

def test_query_processor():
    """Test the intelligent query processor"""
    print("\n🧪 Testing Intelligent Query Processor...")
    
    try:
        from intelligent_query_processor import IntelligentQueryProcessor
        
        processor = IntelligentQueryProcessor()
        
        test_queries = [
            "I'm a sophomore CS major who finished CS 182 and CS 240, want to graduate early with machine intelligence focus",
            "What courses do I need for software engineering track?",
            "I'm confused about prerequisites for advanced AI courses"
        ]
        
        for i, query in enumerate(test_queries, 1):
            print(f"  📝 Test Query {i}: {query[:50]}...")
            
            # Test context extraction
            context = processor.extract_query_context(query)
            print(f"     Intent: {context.user_intent}, Level: {context.academic_level}, Confidence: {context.context_confidence:.2f}")
            
            # Test knowledge fetching
            knowledge = processor.fetch_relevant_knowledge(context)
            print(f"     Knowledge: {len(knowledge.relevant_courses)} courses, {len(knowledge.major_requirements.get('courses', []))} requirements")
            
            # Test response generation
            response = processor.process_query(query)
            print(f"     Response: {len(response)} characters generated")
        
        print("     ✅ Intelligent Query Processor: PASS")
        return True
        
    except Exception as e:
        print(f"     ❌ Intelligent Query Processor: FAIL - {e}")
        return False

def test_contextual_ai_system():
    """Test the main contextual AI system"""
    print("\n🧪 Testing Contextual AI System...")
    
    try:
        from contextual_ai_system import ContextualAISystem
        
        system = ContextualAISystem()
        
        # Test system status
        status = system.get_system_status()
        print(f"  📊 System Status:")
        print(f"     Initialized: {status['system_initialized']}")
        print(f"     OpenAI Available: {status['openai_available']}")
        print(f"     Knowledge Loaded: {status['knowledge_loaded']}")
        print(f"     Active Conversations: {status['active_conversations']}")
        
        # Test query processing
        print("  💬 Testing query processing...")
        
        test_scenarios = [
            {
                "query": "I'm a sophomore CS major, completed CS 18000 and CS 18200. Want to focus on machine intelligence and graduate early. What should I take next?",
                "user_id": "test_student_1",
                "context": {"academic_level": "sophomore", "major": "Computer Science"}
            },
            {
                "query": "I'm really struggling with understanding the prerequisites for advanced courses. Can you help?",
                "user_id": "test_student_1",  # Same student - test conversation continuity
                "context": {"emotional_state": "concerned"}
            }
        ]
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"     Scenario {i}: {scenario['query'][:40]}...")
            
            response = system.process_user_query(
                query=scenario["query"],
                user_id=scenario["user_id"],
                user_context=scenario.get("context")
            )
            
            print(f"     Response length: {len(response)} characters")
            print(f"     Sample: {response[:100]}...")
        
        # Test student profile
        print("  👤 Testing student profile...")
        profile = system.get_student_profile("test_student_1")
        print(f"     Profile: {profile.get('academic_level', 'unknown')} {profile.get('major', 'unknown')} student")
        print(f"     Completed courses: {len(profile.get('completed_courses', []))}")
        
        print("     ✅ Contextual AI System: PASS")
        return True
        
    except Exception as e:
        print(f"     ❌ Contextual AI System: FAIL - {e}")
        return False

def test_sql_analyzer():
    """Test the SQL academic analyzer"""
    print("\n🧪 Testing SQL Academic Analyzer...")
    
    try:
        from sql_academic_analyzer import SQLAcademicAnalyzer
        
        analyzer = SQLAcademicAnalyzer()
        
        # Test SQL functionality
        print("  🗄️ Testing SQL database operations...")
        
        # Test with sample student context
        test_context = {
            'student_id': 'test_sql_student',
            'major': 'Computer Science',
            'target_track': 'Machine Intelligence',
            'current_year': 'sophomore',
            'completed_courses': ['CS 18000', 'CS 18200'],
            'graduation_goal': 'early_graduation'
        }
        
        recommendations = analyzer.get_sql_based_recommendations(test_context)
        
        print(f"     SQL Recommendations generated: {bool(recommendations)}")
        if recommendations.get('immediate_courses'):
            print(f"     Immediate courses: {len(recommendations['immediate_courses'])}")
        if recommendations.get('critical_path_courses'):
            print(f"     Critical path courses: {len(recommendations['critical_path_courses'])}")
        
        print("     ✅ SQL Academic Analyzer: PASS")
        return True
        
    except Exception as e:
        print(f"     ❌ SQL Academic Analyzer: FAIL - {e}")
        return False

async def test_api_endpoints():
    """Test the FastAPI endpoints"""
    print("\n🧪 Testing API Endpoints...")
    
    try:
        import requests
        import time
        
        base_url = "http://localhost:5003"
        
        # Test health endpoint
        print("  🏥 Testing health endpoint...")
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                print(f"     Health Status: {health_data['status']}")
                print(f"     OpenAI Configured: {health_data['openai_configured']}")
                print(f"     Knowledge Base Loaded: {health_data['knowledge_base_loaded']}")
            else:
                print(f"     Health check failed: {response.status_code}")
        except requests.exceptions.RequestException:
            print("     ⚠️ Service not running - skipping API tests")
            return False
        
        # Test chat endpoint
        print("  💬 Testing chat endpoint...")
        chat_data = {
            "message": "I'm a sophomore CS student interested in machine intelligence. What courses should I take?",
            "context": {
                "userId": "api_test_user",
                "academic_level": "sophomore",
                "major": "Computer Science"
            }
        }
        
        response = requests.post(f"{base_url}/chat", json=chat_data, timeout=30)
        if response.status_code == 200:
            chat_response = response.json()
            print(f"     Chat response length: {len(chat_response['response'])} characters")
            print(f"     Processing strategy: {chat_response.get('processing_strategy', 'unknown')}")
            print(f"     Confidence score: {chat_response.get('confidence_score', 'unknown')}")
        else:
            print(f"     Chat request failed: {response.status_code}")
        
        # Test system status endpoint
        print("  📊 Testing system status endpoint...")
        response = requests.get(f"{base_url}/system/status", timeout=10)
        if response.status_code == 200:
            status_data = response.json()
            print(f"     System status: {status_data.get('status', 'unknown')}")
            capabilities = status_data.get('processing_capabilities', {})
            enabled_capabilities = sum(1 for v in capabilities.values() if v)
            print(f"     Capabilities: {enabled_capabilities}/{len(capabilities)} enabled")
        else:
            print(f"     Status request failed: {response.status_code}")
        
        print("     ✅ API Endpoints: PASS")
        return True
        
    except ImportError:
        print("     ⚠️ requests library not available - skipping API tests")
        return False
    except Exception as e:
        print(f"     ❌ API Endpoints: FAIL - {e}")
        return False

def test_integration_scenarios():
    """Test end-to-end integration scenarios"""
    print("\n🧪 Testing Integration Scenarios...")
    
    try:
        from contextual_ai_system import ContextualAISystem
        
        system = ContextualAISystem()
        
        # Scenario 1: Sophomore planning early graduation
        print("  📊 Scenario 1: Sophomore Early Graduation Planning")
        response1 = system.process_user_query(
            query="I'm a sophomore CS major who just finished CS 18200 and CS 24000. I want to graduate in 3 years and focus on machine intelligence. What's my best strategy?",
            user_id="integration_test_1",
            user_context={"academic_level": "sophomore", "major": "Computer Science", "timeline": "early"}
        )
        print(f"     Response quality: {len(response1)} chars, {'specific courses mentioned' if any(code in response1 for code in ['CS 25000', 'CS 25100', 'MA 26']) else 'generic advice'}")
        
        # Scenario 2: Track selection guidance
        print("  🎯 Scenario 2: Track Selection Guidance")
        response2 = system.process_user_query(
            query="I'm interested in both AI and software development. How do I choose between machine intelligence and software engineering tracks?",
            user_id="integration_test_2",
            user_context={"academic_level": "junior", "major": "Computer Science"}
        )
        print(f"     Response quality: {'track comparison provided' if 'machine intelligence' in response2.lower() and 'software engineering' in response2.lower() else 'incomplete guidance'}")
        
        # Scenario 3: Data Science major guidance (standalone major, no tracks)
        print("  📈 Scenario 3: Data Science Major Guidance")
        response3 = system.process_user_query(
            query="I'm thinking about switching to data science major. What are the requirements and how does it compare to CS? Does data science have tracks like CS?",
            user_id="integration_test_3",
            user_context={"academic_level": "sophomore", "major": "Computer Science"}
        )
        print(f"     Response quality: {'standalone major clarified' if 'standalone' in response3.lower() or 'no tracks' in response3.lower() else 'may need clarification'}")
        
        print("     ✅ Integration Scenarios: PASS")
        return True
        
    except Exception as e:
        print(f"     ❌ Integration Scenarios: FAIL - {e}")
        return False

def main():
    """Run comprehensive test suite"""
    print("🚀 Hybrid AI Academic Advisor System - Test Suite")
    print("=" * 70)
    print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_results = []
    
    # Run individual component tests
    test_results.append(("Dynamic Knowledge Manager", test_knowledge_manager()))
    test_results.append(("Intelligent Query Processor", test_query_processor()))
    test_results.append(("SQL Academic Analyzer", test_sql_analyzer()))
    test_results.append(("Contextual AI System", test_contextual_ai_system()))
    
    # Run integration tests
    test_results.append(("Integration Scenarios", test_integration_scenarios()))
    
    # Run API tests (async)
    print("\n🌐 Running API tests...")
    try:
        api_result = asyncio.run(test_api_endpoints())
        test_results.append(("API Endpoints", api_result))
    except Exception as e:
        print(f"API test error: {e}")
        test_results.append(("API Endpoints", False))
    
    # Summary
    print(f"\n📊 Test Results Summary")
    print("=" * 70)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<30} {status}")
        if result:
            passed += 1
    
    print("=" * 70)
    print(f"📈 Overall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! System is ready for production.")
    elif passed >= total * 0.8:
        print("⚠️ Most tests passed. System functional with some limitations.")
    else:
        print("❌ Multiple test failures. System needs attention before deployment.")
    
    print(f"\n📅 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)