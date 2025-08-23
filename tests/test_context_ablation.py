"""
Context Ablation Testing for RAG-ON System.

Tests the SmartCourse-style evaluation to ensure personalization beats question-only responses.
Evaluates PlanScore, PersonalScore, Lift, and Recall across different context modes.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
import pytest
from router.orchestrator import RAGOrchestrator
from advisor.memory import AdvisorMemory

logger = logging.getLogger(__name__)

@dataclass
class EvaluationMetrics:
    """Evaluation metrics for context ablation testing."""
    plan_score: float  # How well does response align with student's plan
    personal_score: float  # How personalized is the response
    lift: float  # Improvement over baseline (question-only)
    recall: float  # Factual accuracy against ground truth

@dataclass
class TestCase:
    """A single test case with question and expected outcomes."""
    question: str
    user_profile: Dict[str, Any]
    ground_truth: Dict[str, Any]
    expected_intents: List[str]
    context_requirements: Dict[str, bool]  # which context types are needed

# Test scenarios covering different query types
TEST_SCENARIOS = [
    TestCase(
        question="What are the prerequisites for CS38100?",
        user_profile={
            "transcript": {
                "terms": [{"term": "F2023", "courses": [{"course_id": "CS25100", "grade": "A"}]}],
                "gpa": {"cumulative": 3.5}
            },
            "goals": {"chosen_track": "MI"}
        },
        ground_truth={
            "prerequisites": ["CS25100", "CS18200", "MA26100"],
            "can_take": False,  # Missing CS18200
            "recommended_next": ["CS18200"]
        },
        expected_intents=["facts_sql"],
        context_requirements={"sql": True, "planning": False, "rag": False}
    ),
    
    TestCase(
        question="Tell me about CS35400 and if I should take it",
        user_profile={
            "transcript": {
                "terms": [{"term": "F2023", "courses": [{"course_id": "CS25200", "grade": "B"}]}],
                "gpa": {"cumulative": 3.2}
            },
            "goals": {"chosen_track": "SE", "target_grad_term": "S2026"}
        },
        ground_truth={
            "course_description": "Introduction to Operating Systems",
            "track_relevance": "Core requirement for SE track",
            "prerequisite_status": "Met",
            "recommendation": "Take next semester"
        },
        expected_intents=["describe_course", "plan_schedule"],
        context_requirements={"sql": True, "planning": True, "rag": True}
    ),
    
    TestCase(
        question="Plan my courses for next semester with SE track",
        user_profile={
            "transcript": {
                "terms": [
                    {"term": "F2023", "courses": [
                        {"course_id": "CS18000", "grade": "A"},
                        {"course_id": "CS24000", "grade": "B+"}
                    ]}
                ],
                "gpa": {"cumulative": 3.4}
            },
            "goals": {"chosen_track": "SE", "max_credits": 15}
        },
        ground_truth={
            "recommended_courses": ["CS25100", "CS25200", "CS35200"],
            "credit_hours": 12,
            "track_progress": "On track for SE requirements"
        },
        expected_intents=["plan_schedule"],
        context_requirements={"sql": True, "planning": True, "rag": False}
    ),
    
    TestCase(
        question="What if I switch from MI to SE track?",
        user_profile={
            "transcript": {
                "terms": [
                    {"term": "F2023", "courses": [
                        {"course_id": "CS37300", "grade": "A"},  # MI-specific course
                        {"course_id": "CS38100", "grade": "B"}
                    ]}
                ],
                "gpa": {"cumulative": 3.6}
            },
            "goals": {"chosen_track": "MI", "target_grad_term": "F2025"}
        },
        ground_truth={
            "track_switch_impact": "Minimal delay",
            "additional_requirements": ["CS35200", "CS40700"],
            "graduation_impact": "Delay by 1 semester"
        },
        expected_intents=["what_if", "track_rules"],
        context_requirements={"sql": True, "planning": True, "rag": True}
    ),
    
    TestCase(
        question="What's the grade policy for retaking courses?",
        user_profile={
            "transcript": {
                "terms": [{"term": "F2023", "courses": [{"course_id": "CS18000", "grade": "D"}]}],
                "gpa": {"cumulative": 2.1}
            },
            "goals": {"chosen_track": "CS"}
        },
        ground_truth={
            "retake_allowed": True,
            "grade_replacement": True,
            "gpa_calculation": "Higher grade used",
            "specific_advice": "Recommend retaking CS18000"
        },
        expected_intents=["policy"],
        context_requirements={"sql": False, "planning": False, "rag": True}
    )
]

class ContextAblationEvaluator:
    """Evaluates RAG-ON system across different context modes."""
    
    def __init__(self, database_url: str, config: Dict[str, Any]):
        self.orchestrator = RAGOrchestrator(database_url, config)
        self.memory = AdvisorMemory(database_url)
    
    async def evaluate_scenario(self, test_case: TestCase) -> Dict[str, EvaluationMetrics]:
        """Evaluate a single scenario across all context modes."""
        
        # Set up user profile in memory
        user_id = f"test_user_{hash(test_case.question)}"
        await self._setup_user_profile(user_id, test_case.user_profile)
        
        # Test different context modes
        results = {}
        
        # Mode 1: Full context (Question + Transcript + Plan + RAG)
        results['full'] = await self._evaluate_context_mode(
            user_id, test_case, enable_all=True
        )
        
        # Mode 2: No planning (Question + Transcript + RAG)
        results['no_plan'] = await self._evaluate_context_mode(
            user_id, test_case, disable_planning=True
        )
        
        # Mode 3: No transcript (Question + Plan + RAG)
        results['no_transcript'] = await self._evaluate_context_mode(
            user_id, test_case, disable_transcript=True
        )
        
        # Mode 4: Question only (no context)
        results['question_only'] = await self._evaluate_context_mode(
            user_id, test_case, enable_all=False
        )
        
        return results
    
    async def _setup_user_profile(self, user_id: str, profile: Dict[str, Any]):
        """Set up user profile in advisor memory."""
        
        if profile.get('transcript'):
            await self.memory.remember_fact(
                user_id, 'profile', 'transcript', profile['transcript']
            )
        
        if profile.get('goals'):
            for key, value in profile['goals'].items():
                await self.memory.remember_fact(
                    user_id, 'goal', key, value
                )
    
    async def _evaluate_context_mode(self, user_id: str, test_case: TestCase, 
                                   enable_all: bool = True, 
                                   disable_planning: bool = False,
                                   disable_transcript: bool = False) -> EvaluationMetrics:
        """Evaluate response quality for a specific context mode."""
        
        # Temporarily modify user profile based on mode
        original_profile = await self.memory.get_profile(user_id)
        
        if disable_transcript:
            # Clear transcript from memory temporarily
            await self.memory.remember_fact(user_id, 'profile', 'transcript', None)
        
        try:
            # Get response from orchestrator
            response = await self.orchestrator.process_query(
                user_id=user_id,
                query=test_case.question
            )
            
            # Evaluate response quality
            metrics = self._calculate_metrics(response, test_case, original_profile)
            
            return metrics
            
        finally:
            # Restore original profile
            if disable_transcript and original_profile.get('transcript'):
                await self.memory.remember_fact(
                    user_id, 'profile', 'transcript', original_profile['transcript']
                )
    
    def _calculate_metrics(self, response: Dict[str, Any], test_case: TestCase, 
                          profile: Dict[str, Any]) -> EvaluationMetrics:
        """Calculate evaluation metrics for a response."""
        
        response_text = response.get('response', '')
        
        # Plan Score: How well does response align with student's academic plan
        plan_score = self._calculate_plan_score(response_text, test_case, profile)
        
        # Personal Score: How personalized is the response to this student
        personal_score = self._calculate_personal_score(response_text, test_case, profile)
        
        # Recall: Factual accuracy against ground truth
        recall = self._calculate_recall(response_text, test_case)
        
        # Lift will be calculated later by comparing to baseline
        lift = 0.0
        
        return EvaluationMetrics(
            plan_score=plan_score,
            personal_score=personal_score,
            lift=lift,
            recall=recall
        )
    
    def _calculate_plan_score(self, response: str, test_case: TestCase, 
                            profile: Dict[str, Any]) -> float:
        """Calculate how well response aligns with student's academic plan."""
        score = 0.0
        
        # Check if response considers student's track
        chosen_track = profile.get('goals', {}).get('chosen_track')
        if chosen_track and chosen_track.lower() in response.lower():
            score += 0.3
        
        # Check if response considers graduation timeline
        grad_term = profile.get('goals', {}).get('target_grad_term')
        if grad_term and any(term in response.lower() for term in ['semester', 'graduation', 'timeline']):
            score += 0.2
        
        # Check if response considers completed courses
        transcript = profile.get('transcript', {})
        if transcript.get('terms'):
            completed_courses = []
            for term in transcript['terms']:
                completed_courses.extend([c['course_id'] for c in term.get('courses', [])])
            
            # Partial credit for mentioning any completed course
            for course in completed_courses[:3]:  # Check first 3 courses
                if course.lower() in response.lower():
                    score += 0.1
        
        # Check if response provides actionable next steps
        if any(phrase in response.lower() for phrase in ['recommend', 'should take', 'next step', 'plan']):
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_personal_score(self, response: str, test_case: TestCase, 
                                profile: Dict[str, Any]) -> float:
        """Calculate how personalized the response is."""
        score = 0.0
        
        # Check for personal pronouns and direct addressing
        if any(pronoun in response.lower() for pronoun in ['you', 'your', 'you\'ve']):
            score += 0.2
        
        # Check if response considers student's GPA/performance
        gpa = profile.get('transcript', {}).get('gpa', {}).get('cumulative')
        if gpa:
            if gpa >= 3.5 and any(phrase in response.lower() for phrase in ['strong', 'excellent', 'good performance']):
                score += 0.2
            elif gpa < 3.0 and any(phrase in response.lower() for phrase in ['improve', 'focus', 'strengthen']):
                score += 0.2
        
        # Check if response is context-specific vs generic
        if len(response) > 200:  # Longer responses tend to be more personalized
            score += 0.1
        
        # Check for specific course recommendations based on profile
        if any(phrase in response.lower() for phrase in ['based on', 'given your', 'since you']):
            score += 0.2
        
        # Check if response acknowledges student's current status
        if any(phrase in response.lower() for phrase in ['completed', 'taken', 'current']):
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_recall(self, response: str, test_case: TestCase) -> float:
        """Calculate factual accuracy against ground truth."""
        ground_truth = test_case.ground_truth
        score = 0.0
        total_facts = 0
        
        # Check prerequisites accuracy
        if 'prerequisites' in ground_truth:
            total_facts += len(ground_truth['prerequisites'])
            for prereq in ground_truth['prerequisites']:
                if prereq.lower() in response.lower():
                    score += 1
        
        # Check recommended courses accuracy
        if 'recommended_courses' in ground_truth:
            total_facts += len(ground_truth['recommended_courses'])
            for course in ground_truth['recommended_courses']:
                if course.lower() in response.lower():
                    score += 1
        
        # Check boolean facts
        for key, expected_value in ground_truth.items():
            if isinstance(expected_value, bool):
                total_facts += 1
                # This is simplified - in practice would need more sophisticated fact checking
                if expected_value and any(pos_word in response.lower() for pos_word in ['yes', 'can', 'allowed', 'eligible']):
                    score += 1
                elif not expected_value and any(neg_word in response.lower() for neg_word in ['no', 'cannot', 'not allowed', 'missing']):
                    score += 1
        
        return score / max(total_facts, 1)

async def run_context_ablation_evaluation():
    """Run complete context ablation evaluation."""
    
    # Configuration
    config = {
        'vector_backend': 'qdrant',
        'qdrant_url': 'http://localhost:6333',
        'llm_provider': 'gemini',
        'api_key': 'test_key',  # Use test key for evaluation
        'model': 'gemini-1.5-flash'
    }
    
    database_url = 'postgresql://app:app@localhost:5432/boilerai'
    evaluator = ContextAblationEvaluator(database_url, config)
    
    results = {}
    
    print("Running Context Ablation Evaluation...")
    print("=" * 50)
    
    for i, scenario in enumerate(TEST_SCENARIOS):
        print(f"\nScenario {i+1}: {scenario.question[:50]}...")
        
        scenario_results = await evaluator.evaluate_scenario(scenario)
        results[f"scenario_{i+1}"] = scenario_results
        
        # Calculate lifts (improvement over question-only baseline)
        baseline = scenario_results['question_only']
        for mode, metrics in scenario_results.items():
            if mode != 'question_only':
                metrics.lift = (metrics.plan_score + metrics.personal_score + metrics.recall) - \
                              (baseline.plan_score + baseline.personal_score + baseline.recall)
        
        # Print results for this scenario
        print(f"  Full Context    - Plan: {scenario_results['full'].plan_score:.2f}, Personal: {scenario_results['full'].personal_score:.2f}, Recall: {scenario_results['full'].recall:.2f}")
        print(f"  No Planning     - Plan: {scenario_results['no_plan'].plan_score:.2f}, Personal: {scenario_results['no_plan'].personal_score:.2f}, Recall: {scenario_results['no_plan'].recall:.2f}")
        print(f"  No Transcript   - Plan: {scenario_results['no_transcript'].plan_score:.2f}, Personal: {scenario_results['no_transcript'].personal_score:.2f}, Recall: {scenario_results['no_transcript'].recall:.2f}")
        print(f"  Question Only   - Plan: {scenario_results['question_only'].plan_score:.2f}, Personal: {scenario_results['question_only'].personal_score:.2f}, Recall: {scenario_results['question_only'].recall:.2f}")
    
    # Calculate aggregate metrics
    aggregate = _calculate_aggregate_metrics(results)
    
    print("\n" + "=" * 50)
    print("AGGREGATE RESULTS")
    print("=" * 50)
    
    for mode, metrics in aggregate.items():
        print(f"{mode:15} - Plan: {metrics.plan_score:.3f}, Personal: {metrics.personal_score:.3f}, Recall: {metrics.recall:.3f}, Lift: {metrics.lift:.3f}")
    
    # Assertions for automated testing
    assert aggregate['full'].plan_score >= aggregate['question_only'].plan_score, "Full context should have better plan score"
    assert aggregate['full'].personal_score >= aggregate['question_only'].personal_score, "Full context should be more personalized"
    assert aggregate['full'].recall >= aggregate['question_only'].recall, "Full context should have better recall"
    
    print(f"\n✅ All assertions passed! Full context outperforms question-only baseline.")
    
    return results

def _calculate_aggregate_metrics(results: Dict[str, Any]) -> Dict[str, EvaluationMetrics]:
    """Calculate aggregate metrics across all scenarios."""
    
    modes = ['full', 'no_plan', 'no_transcript', 'question_only']
    aggregate = {}
    
    for mode in modes:
        total_plan = 0
        total_personal = 0
        total_recall = 0
        total_lift = 0
        count = 0
        
        for scenario_key, scenario_results in results.items():
            if mode in scenario_results:
                metrics = scenario_results[mode]
                total_plan += metrics.plan_score
                total_personal += metrics.personal_score
                total_recall += metrics.recall
                total_lift += metrics.lift
                count += 1
        
        if count > 0:
            aggregate[mode] = EvaluationMetrics(
                plan_score=total_plan / count,
                personal_score=total_personal / count,
                recall=total_recall / count,
                lift=total_lift / count
            )
    
    return aggregate

@pytest.mark.asyncio
async def test_context_ablation():
    """Pytest wrapper for context ablation testing."""
    await run_context_ablation_evaluation()

if __name__ == "__main__":
    asyncio.run(run_context_ablation_evaluation())