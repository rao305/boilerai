"""
SmartCourse Integration Testing Suite

Comprehensive testing of SmartCourse-inspired intelligence features:
- Contextual routing validation
- Recommendation evaluation metrics
- Context ablation studies
- Performance benchmarking
"""

import asyncio
import json
import time
from typing import Dict, List, Any
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from router.contextual_router import (
    contextual_router,
    create_student_context_from_profile,
    ContextMode,
    StudentContext
)

from advisor.recommendation_evaluator import (
    recommendation_evaluator,
    create_plan_context_from_profile,
    RecommendationSet,
    StudentPlanContext
)

from advisor.contextual_advisor import (
    contextual_advisor,
    create_enhanced_advisory_prompt
)

from api_gateway.smartcourse_handler import smartcourse_handler

# Test data inspired by SmartCourse paper
SAMPLE_STUDENT_PROFILES = {
    "strong_student": {
        "student": {"id": "test001", "gpa": 3.7},
        "major": "CS",
        "track_id": "machine_intelligence",
        "completed": [
            {"course_id": "CS18000", "grade": "A", "term": "F2023"},
            {"course_id": "CS18200", "grade": "A-", "term": "S2024"},
            {"course_id": "CS24000", "grade": "B+", "term": "F2024"},
            {"course_id": "CS25000", "grade": "B", "term": "S2024"},
            {"course_id": "MATH16100", "grade": "A", "term": "F2023"},
            {"course_id": "MATH16200", "grade": "B+", "term": "S2024"}
        ],
        "in_progress": [{"course_id": "CS25100"}],
        "outstanding_requirements": [
            "CS25200", "CS37300", "CS38100", "CS47100", "STAT41600",
            "CS31100", "CS41100"  # Need 2 electives
        ],
        "terms_enrolled": 4
    },
    
    "struggling_student": {
        "student": {"id": "test002", "gpa": 2.4},
        "major": "CS",
        "track_id": None,  # Track not declared yet
        "completed": [
            {"course_id": "CS18000", "grade": "C", "term": "F2023"},
            {"course_id": "CS18200", "grade": "D", "term": "S2024"},  # Low grade - retake needed
            {"course_id": "CS24000", "grade": "B-", "term": "F2024"},
            {"course_id": "MATH16100", "grade": "C-", "term": "F2023"},  # Low grade
            {"course_id": "MATH16200", "grade": "C", "term": "S2024"}
        ],
        "in_progress": [{"course_id": "CS25000"}],
        "outstanding_requirements": [
            "CS18200", "CS25100", "CS25200", "CS37300", "CS38100", 
            "CS47100", "STAT41600", "CS31100", "CS41100"
        ],
        "terms_enrolled": 3
    },
    
    "advanced_student": {
        "student": {"id": "test003", "gpa": 3.9},
        "major": "CS",
        "track_id": "machine_intelligence",
        "completed": [
            {"course_id": "CS18000", "grade": "A", "term": "F2022"},
            {"course_id": "CS18200", "grade": "A", "term": "S2023"},
            {"course_id": "CS24000", "grade": "A", "term": "F2023"},
            {"course_id": "CS25000", "grade": "A-", "term": "S2023"},
            {"course_id": "CS25100", "grade": "A", "term": "F2023"},
            {"course_id": "CS25200", "grade": "A", "term": "S2024"},
            {"course_id": "CS37300", "grade": "A", "term": "F2024"},
            {"course_id": "CS38100", "grade": "A-", "term": "S2024"},
            {"course_id": "MATH16100", "grade": "A", "term": "F2022"},
            {"course_id": "MATH16200", "grade": "A", "term": "S2023"},
            {"course_id": "STAT41600", "grade": "A", "term": "F2023"}
        ],
        "in_progress": [{"course_id": "CS47100"}],
        "outstanding_requirements": [
            "CS31100", "CS41100"  # Just need 2 electives
        ],
        "terms_enrolled": 6
    }
}

# Test queries inspired by SmartCourse evaluation
TEST_QUERIES = [
    "What elective courses should I choose next semester to strengthen my AI foundation?",
    "Which courses would best prepare me for a Ph.D. track in Machine Learning?",
    "I'm struggling with my GPA - what courses should I retake or focus on?",
    "What's the optimal course sequence for completing my track requirements?",
    "Which prerequisites do I need for advanced AI courses?",
    "How can I improve my academic performance and boost my GPA?",
    "What courses should I take to prepare for internships at tech companies?",
    "I need to declare a track - which one fits my completed coursework best?",
    "What are the graduation requirements I still need to complete?",
    "Which courses can I take this summer to stay on track for graduation?"
]

class SmartCourseTestSuite:
    """
    Comprehensive test suite for SmartCourse integration.
    """
    
    def __init__(self):
        self.test_results = {
            "contextual_routing": [],
            "recommendation_evaluation": [],
            "context_ablation": [],
            "performance_benchmarks": [],
            "integration_tests": []
        }
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run complete test suite"""
        
        print("🧪 Starting SmartCourse Integration Test Suite...")
        
        # Test 1: Contextual Routing
        print("\n1️⃣  Testing Contextual Routing...")
        self.test_contextual_routing()
        
        # Test 2: Recommendation Evaluation
        print("\n2️⃣  Testing Recommendation Evaluation...")
        self.test_recommendation_evaluation()
        
        # Test 3: Context Ablation Studies  
        print("\n3️⃣  Testing Context Ablation Studies...")
        self.test_context_ablation()
        
        # Test 4: Performance Benchmarks
        print("\n4️⃣  Running Performance Benchmarks...")
        self.test_performance_benchmarks()
        
        # Test 5: Integration Tests
        print("\n5️⃣  Testing API Integration...")
        asyncio.run(self.test_api_integration())
        
        # Generate summary report
        return self.generate_test_report()
    
    def test_contextual_routing(self):
        """Test contextual routing with different student profiles"""
        
        for profile_name, profile_data in SAMPLE_STUDENT_PROFILES.items():
            for query in TEST_QUERIES[:3]:  # Test with first 3 queries
                
                # Create student context
                student_context = create_student_context_from_profile(profile_data)
                
                # Test routing decision
                routing_decision = contextual_router.route_query(query, student_context)
                
                result = {
                    "profile": profile_name,
                    "query": query[:50] + "...",
                    "handler": routing_decision.handler,
                    "confidence": routing_decision.confidence,
                    "reasoning": routing_decision.reasoning,
                    "personalization_score": routing_decision.personalization_score,
                    "expected_metrics": routing_decision.expected_quality_metrics
                }
                
                self.test_results["contextual_routing"].append(result)
                
                print(f"   ✓ {profile_name}: {query[:30]}... → {routing_decision.handler} "
                      f"(conf: {routing_decision.confidence:.2f})")
    
    def test_recommendation_evaluation(self):
        """Test recommendation evaluation metrics"""
        
        # Mock recommendation sets for testing
        test_recommendations = [
            ["CS37300", "CS38100", "CS47100"],  # Track requirements
            ["CS18200", "MATH16100", "CS25000"],  # Mix of retakes and requirements
            ["CS31100", "CS41100", "CS43900"],  # Electives
            []  # Empty recommendations
        ]
        
        for profile_name, profile_data in SAMPLE_STUDENT_PROFILES.items():
            plan_context = create_plan_context_from_profile(profile_data)
            
            for i, recs in enumerate(test_recommendations):
                # Create recommendation set
                rec_set = RecommendationSet(
                    recommendations=recs,
                    query=f"Test query {i}",
                    student_id=profile_data["student"]["id"],
                    context_mode="full",
                    generated_at=time.time(),
                    response_time=1.5,
                    model_used="test_model"
                )
                
                # Evaluate recommendations
                metrics = recommendation_evaluator.evaluate_recommendations(rec_set, plan_context)
                
                result = {
                    "profile": profile_name,
                    "recommendations": recs,
                    "plan_score": metrics.plan_score,
                    "personal_score": metrics.personal_score,
                    "lift": metrics.lift,
                    "recall": metrics.recall,
                    "precision": metrics.precision
                }
                
                self.test_results["recommendation_evaluation"].append(result)
                
                print(f"   ✓ {profile_name} - {len(recs)} recs: "
                      f"PlanScore={metrics.plan_score:.2f}, "
                      f"PersonalScore={metrics.personal_score:.2f}, "
                      f"Lift={metrics.lift:.2f}")
    
    def test_context_ablation(self):
        """Test context ablation studies"""
        
        # Test with one profile and query
        profile_data = SAMPLE_STUDENT_PROFILES["strong_student"]
        test_query = TEST_QUERIES[0]
        
        context_modes = ["full", "no_transcript", "no_plan", "question_only"]
        
        for mode in context_modes:
            # Create student context with specific mode
            student_context = create_student_context_from_profile(profile_data)
            student_context.context_mode = ContextMode(mode)
            
            # Test routing under different context modes
            routing_decision = contextual_router.route_query(test_query, student_context)
            
            # Create enhanced prompt
            enhanced_prompt = create_enhanced_advisory_prompt(
                test_query, profile_data, mode
            )
            
            result = {
                "context_mode": mode,
                "handler": routing_decision.handler,
                "confidence": routing_decision.confidence,
                "expected_plan_score": routing_decision.expected_quality_metrics.get("expected_plan_score", 0),
                "expected_personal_score": routing_decision.expected_quality_metrics.get("expected_personal_score", 0),
                "prompt_length": len(enhanced_prompt),
                "personalization_score": routing_decision.personalization_score
            }
            
            self.test_results["context_ablation"].append(result)
            
            print(f"   ✓ {mode}: {routing_decision.handler} "
                  f"(expected PersonalScore: {result['expected_personal_score']:.2f})")
    
    def test_performance_benchmarks(self):
        """Test system performance under load"""
        
        # Benchmark routing performance
        routing_times = []
        for _ in range(100):
            profile = SAMPLE_STUDENT_PROFILES["strong_student"]
            query = TEST_QUERIES[0]
            
            start_time = time.time()
            student_context = create_student_context_from_profile(profile)
            contextual_router.route_query(query, student_context)
            routing_times.append(time.time() - start_time)
        
        # Benchmark evaluation performance
        evaluation_times = []
        for _ in range(100):
            profile = SAMPLE_STUDENT_PROFILES["strong_student"] 
            plan_context = create_plan_context_from_profile(profile)
            
            rec_set = RecommendationSet(
                recommendations=["CS37300", "CS38100"],
                query="test",
                student_id="test",
                context_mode="full",
                generated_at=time.time(),
                response_time=1.0,
                model_used="test"
            )
            
            start_time = time.time()
            recommendation_evaluator.evaluate_recommendations(rec_set, plan_context)
            evaluation_times.append(time.time() - start_time)
        
        result = {
            "routing_performance": {
                "mean_time": sum(routing_times) / len(routing_times),
                "max_time": max(routing_times),
                "min_time": min(routing_times)
            },
            "evaluation_performance": {
                "mean_time": sum(evaluation_times) / len(evaluation_times),
                "max_time": max(evaluation_times),
                "min_time": min(evaluation_times)
            }
        }
        
        self.test_results["performance_benchmarks"].append(result)
        
        print(f"   ✓ Routing avg: {result['routing_performance']['mean_time']*1000:.1f}ms")
        print(f"   ✓ Evaluation avg: {result['evaluation_performance']['mean_time']*1000:.1f}ms")
    
    async def test_api_integration(self):
        """Test API integration with SmartCourse handler"""
        
        try:
            # Test enhanced QA endpoint
            profile = SAMPLE_STUDENT_PROFILES["strong_student"]
            query = TEST_QUERIES[0]
            
            result = await smartcourse_handler.enhanced_qa_endpoint(
                question=query,
                profile_json=profile,
                context_mode="full",
                enable_metrics=True,
                llm_client=None  # Mock client
            )
            
            self.test_results["integration_tests"].append({
                "endpoint": "enhanced_qa",
                "success": True,
                "response_time": result.get("response_time", 0),
                "mode": result.get("mode"),
                "handler": result.get("routing", {}).get("handler"),
                "has_recommendations": len(result.get("recommendations", [])) > 0
            })
            
            print(f"   ✓ Enhanced QA: {result['mode']} mode, "
                  f"{result.get('response_time', 0):.2f}s")
            
            # Test context ablation endpoint
            ablation_result = await smartcourse_handler.context_ablation_study(
                question=query,
                profile_json=profile,
                llm_client=None
            )
            
            self.test_results["integration_tests"].append({
                "endpoint": "context_ablation",
                "success": True,
                "modes_tested": len(ablation_result.get("ablation_results", {})),
                "best_mode": ablation_result.get("analysis", {}).get("best_performing_mode"),
                "has_analysis": "analysis" in ablation_result
            })
            
            print(f"   ✓ Context Ablation: {len(ablation_result.get('ablation_results', {}))} modes tested")
            
            # Test quality insights endpoint
            insights = await smartcourse_handler.get_quality_insights("test001")
            
            self.test_results["integration_tests"].append({
                "endpoint": "quality_insights",
                "success": True,
                "has_performance_summary": "performance_summary" in insights,
                "has_routing_analytics": "routing_analytics" in insights,
                "has_recommendations_report": "recommendations_report" in insights
            })
            
            print(f"   ✓ Quality Insights: Available")
            
        except Exception as e:
            print(f"   ❌ API Integration failed: {e}")
            self.test_results["integration_tests"].append({
                "endpoint": "integration_test",
                "success": False,
                "error": str(e)
            })
    
    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        
        report = {
            "test_summary": {
                "total_tests": sum(len(results) for results in self.test_results.values()),
                "contextual_routing_tests": len(self.test_results["contextual_routing"]),
                "evaluation_tests": len(self.test_results["recommendation_evaluation"]),
                "ablation_tests": len(self.test_results["context_ablation"]),
                "performance_tests": len(self.test_results["performance_benchmarks"]),
                "integration_tests": len(self.test_results["integration_tests"])
            },
            "detailed_results": self.test_results,
            "key_findings": self.extract_key_findings(),
            "timestamp": time.time()
        }
        
        print("\n📊 Test Report Summary:")
        print(f"   • Total tests run: {report['test_summary']['total_tests']}")
        print(f"   • Contextual routing tests: {report['test_summary']['contextual_routing_tests']}")
        print(f"   • Evaluation metric tests: {report['test_summary']['evaluation_tests']}")
        print(f"   • Context ablation tests: {report['test_summary']['ablation_tests']}")
        print(f"   • Performance benchmarks: {report['test_summary']['performance_tests']}")
        print(f"   • API integration tests: {report['test_summary']['integration_tests']}")
        
        print("\n🔍 Key Findings:")
        for finding in report["key_findings"]:
            print(f"   • {finding}")
        
        return report
    
    def extract_key_findings(self) -> List[str]:
        """Extract key insights from test results"""
        
        findings = []
        
        # Analyze routing performance
        routing_results = self.test_results["contextual_routing"]
        if routing_results:
            avg_confidence = sum(r["confidence"] for r in routing_results) / len(routing_results)
            findings.append(f"Average routing confidence: {avg_confidence:.2f}")
            
            personalized_routes = [r for r in routing_results if "personalized" in r["handler"]]
            personalization_rate = len(personalized_routes) / len(routing_results)
            findings.append(f"Personalized routing rate: {personalization_rate:.1%}")
        
        # Analyze evaluation metrics
        eval_results = self.test_results["recommendation_evaluation"]
        if eval_results:
            avg_plan_score = sum(r["plan_score"] for r in eval_results) / len(eval_results)
            avg_personal_score = sum(r["personal_score"] for r in eval_results) / len(eval_results)
            findings.append(f"Average PlanScore: {avg_plan_score:.2f}")
            findings.append(f"Average PersonalScore: {avg_personal_score:.2f}")
        
        # Analyze context ablation
        ablation_results = self.test_results["context_ablation"]
        if ablation_results:
            full_context = next((r for r in ablation_results if r["context_mode"] == "full"), None)
            question_only = next((r for r in ablation_results if r["context_mode"] == "question_only"), None)
            
            if full_context and question_only:
                context_improvement = (full_context["expected_personal_score"] - 
                                     question_only["expected_personal_score"])
                findings.append(f"Context provides {context_improvement:.2f} quality improvement")
        
        # Analyze performance
        perf_results = self.test_results["performance_benchmarks"]
        if perf_results:
            routing_time = perf_results[0]["routing_performance"]["mean_time"] * 1000
            eval_time = perf_results[0]["evaluation_performance"]["mean_time"] * 1000
            findings.append(f"Routing latency: {routing_time:.1f}ms")
            findings.append(f"Evaluation latency: {eval_time:.1f}ms")
        
        return findings


def main():
    """Run the complete SmartCourse integration test suite"""
    
    print("🚀 SmartCourse Integration Testing")
    print("==================================")
    
    # Initialize test suite
    test_suite = SmartCourseTestSuite()
    
    # Run all tests
    report = test_suite.run_all_tests()
    
    # Save detailed report
    with open("smartcourse_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Testing complete! Detailed report saved to smartcourse_test_report.json")
    
    return report


if __name__ == "__main__":
    main()