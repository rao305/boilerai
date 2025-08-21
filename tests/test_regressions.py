"""
Regression tests to prevent freeform prose responses in BoilerAI
These tests should FAIL with current implementation and PASS after fix
"""
import pytest
import requests
import json
from typing import Dict, Any

BACKEND_URL = "http://localhost:3001/api/advisor"
API_GATEWAY_URL = "http://localhost:8000"

class TestStructuredResponsesRequired:
    """Test that all academic queries return structured responses, not freeform prose"""
    
    def test_cs_program_question_should_be_structured(self):
        """
        FAILING TEST: Generic CS program questions should return structured data
        Current: Returns marketing prose
        Expected: Returns mode + ast/sql + rows OR planner response
        """
        response = requests.post(
            f"{BACKEND_URL}/chat",
            json={"message": "so tell me more about the computer science program"},
            headers={"Content-Type": "application/json", "X-LLM-Provider": "test", "X-LLM-Api-Key": "test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should NOT contain freeform prose
        response_text = data.get('data', {}).get('response', '')
        assert "highly regarded" not in response_text.lower()
        assert "cutting-edge" not in response_text.lower()
        assert "world-class faculty" not in response_text.lower()
        
        # Should contain structured data indicators
        assert any(key in data for key in ['mode', 'ast', 'sql', 'rows', 'plan'])
    
    def test_cs_courses_question_should_be_structured(self):
        """
        FAILING TEST: CS courses questions should query database
        Current: Returns generic prose about courses
        Expected: Returns t2sql mode with course data
        """
        response = requests.post(
            f"{BACKEND_URL}/chat", 
            json={"message": "tell me more about computer science courses"},
            headers={"Content-Type": "application/json", "X-LLM-Provider": "test", "X-LLM-Api-Key": "test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be t2sql mode with database results
        assert data.get('mode') == 't2sql'
        assert 'ast' in data
        assert 'sql' in data  
        assert 'rows' in data
        assert len(data['rows']) > 0  # Should have actual course data
    
    def test_specific_course_should_return_db_data(self):
        """
        FAILING TEST: Specific course queries should return database records
        Current: May return prose about the course
        Expected: Returns course details from database
        """
        response = requests.post(
            f"{BACKEND_URL}/chat",
            json={"message": "tell me more about cs 180"},
            headers={"Content-Type": "application/json", "X-LLM-Provider": "test", "X-LLM-Api-Key": "test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should contain actual course data, not prose
        assert data.get('mode') == 't2sql'
        rows = data.get('rows', [])
        assert len(rows) > 0
        
        # Should have course database fields
        course = rows[0]
        assert 'id' in course or 'course_id' in course
        assert 'title' in course or 'name' in course

class TestIntentClassification:
    """Test that questions are properly classified and routed"""
    
    def test_course_questions_classified_as_course_facts(self):
        """
        FAILING TEST: Course-related questions should be classified as course_facts
        Current: No intent classification exists
        Expected: Intent classification routes to t2sql
        """
        # This would need to test the intent classifier directly
        # For now, test via endpoint behavior
        response = requests.post(
            f"{API_GATEWAY_URL}/qa",
            json={"question": "tell me about CS 240"}
        )
        
        # This will likely fail because API gateway isn't running
        # but documents the expected behavior
        assert response.status_code == 200
        data = response.json()
        assert data.get('mode') == 't2sql'
    
    def test_planning_questions_classified_as_planner(self):
        """
        FAILING TEST: Planning questions should be classified as planner_query
        Current: No intent classification exists  
        Expected: Intent classification routes to planner
        """
        response = requests.post(
            f"{API_GATEWAY_URL}/qa",
            json={
                "question": "help me plan my schedule for next semester",
                "profile_json": {"major": "CS", "completed_courses": []}
            }
        )
        
        # This will likely fail because API gateway isn't running
        assert response.status_code == 200
        data = response.json()
        assert data.get('mode') == 'planner'
        assert 'plan' in data

class TestNoGenericResponses:
    """Test that system never returns generic marketing prose"""
    
    @pytest.mark.parametrize("question", [
        "so tell me more about the computer science program",
        "tell me more about computer science courses", 
        "what can you tell me about purdue cs",
        "tell me about the cs program",
        "how good is purdue computer science"
    ])
    def test_no_marketing_prose_responses(self, question: str):
        """
        FAILING TESTS: These questions currently return marketing prose
        Expected: All should return structured responses or explicit "not modeled" errors
        """
        response = requests.post(
            f"{BACKEND_URL}/chat",
            json={"message": question},
            headers={"Content-Type": "application/json", "X-LLM-Provider": "test", "X-LLM-Api-Key": "test"}
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('data', {}).get('response', '')
            
            # Should NOT contain marketing language
            marketing_phrases = [
                "highly regarded",
                "cutting-edge", 
                "world-class faculty",
                "prestigious program",
                "renowned for",
                "leading institution"
            ]
            
            for phrase in marketing_phrases:
                assert phrase not in response_text.lower(), f"Found marketing phrase: {phrase}"
            
            # Should either be structured OR explicit error
            has_structure = any(key in data for key in ['mode', 'ast', 'sql', 'rows', 'plan'])
            has_explicit_error = 'not modeled' in response_text.lower() or 'unsupported' in response_text.lower()
            
            assert has_structure or has_explicit_error, "Response should be structured or explicit error"
        else:
            # Error responses are acceptable - better than generic prose
            assert response.status_code in [400, 404, 501]
            error_data = response.json()
            assert 'error' in error_data

class TestServiceIntegration:
    """Test that proper services are running and integrated"""
    
    def test_api_gateway_is_running(self):
        """
        FAILING TEST: API gateway should be running on port 8000
        Current: Not running
        Expected: Health check passes
        """
        response = requests.get(f"{API_GATEWAY_URL}/healthz")
        assert response.status_code == 200
        assert response.json().get('ok') == True
    
    def test_database_connectivity(self):
        """
        FAILING TEST: Database should be accessible for queries
        Current: PostgreSQL role doesn't exist
        Expected: Can query courses table
        """
        # Test via API gateway query endpoint
        response = requests.post(
            f"{API_GATEWAY_URL}/sql/query",
            json={
                "ast": {
                    "table": "courses",
                    "select": ["id", "title"],
                    "limit": 1
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'rows' in data
        assert len(data['rows']) >= 0  # Even empty result means DB is connected

if __name__ == "__main__":
    # Run the tests to demonstrate current failures
    pytest.main([__file__, "-v", "--tb=short"])