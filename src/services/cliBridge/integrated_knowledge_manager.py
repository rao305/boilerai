#!/usr/bin/env python3
"""
Integrated Knowledge Manager - Smart AI Reasoning System
Combines all knowledge bases for intelligent reasoning and retrieval
"""

import json
import os
import logging
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import sqlite3
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class KnowledgeContext:
    """Context for knowledge queries"""
    query_type: str  # course_info, prerequisite_chain, graduation_planning, etc.
    user_profile: Dict[str, Any] = None
    student_transcript: Dict[str, Any] = None
    specific_courses: List[str] = None
    target_semester: str = None
    graduation_goal: str = None

@dataclass
class SmartResponse:
    """AI-generated response with reasoning"""
    response_text: str
    reasoning_chain: List[str]
    knowledge_sources: List[str]
    confidence_score: float
    follow_up_suggestions: List[str]
    related_courses: List[str] = None

class IntegratedKnowledgeManager:
    """Smart knowledge manager that integrates all available knowledge bases"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent.parent
        
        # Knowledge bases
        self.comprehensive_knowledge = None
        self.purdue_courses = None
        self.degree_requirements = None
        
        # Integrated knowledge cache
        self.integrated_knowledge = {
            "courses": {},
            "prerequisites": {},
            "degree_tracks": {},
            "course_relationships": {},
            "difficulty_analysis": {},
            "graduation_paths": {}
        }
        
        # Load all knowledge bases
        self._load_all_knowledge_bases()
        self._integrate_knowledge_bases()
        
        logger.info("✅ Integrated Knowledge Manager initialized with smart reasoning")
    
    def _load_all_knowledge_bases(self):
        """Load all available knowledge bases"""
        try:
            # Load comprehensive knowledge graph
            knowledge_path = self.base_path / "comprehensive_knowledge_graph.json"
            if knowledge_path.exists():
                with open(knowledge_path, 'r', encoding='utf-8') as f:
                    self.comprehensive_knowledge = json.load(f)
                logger.info(f"✅ Loaded comprehensive knowledge: {len(self.comprehensive_knowledge.get('courses', {}))} courses")
            
            # Load Purdue course catalog
            courses_path = self.base_path / "src" / "data" / "purdue_courses_complete.json"
            if courses_path.exists():
                with open(courses_path, 'r', encoding='utf-8') as f:
                    self.purdue_courses = json.load(f)
                logger.info(f"✅ Loaded Purdue courses: {len(self.purdue_courses)} courses")
            
            # Load degree requirements (convert JS to Python format)
            degree_path = self.base_path / "src" / "data" / "degreeRequirements.js"
            if degree_path.exists():
                self._parse_degree_requirements(degree_path)
                logger.info("✅ Loaded degree requirements")
                
        except Exception as e:
            logger.error(f"❌ Error loading knowledge bases: {e}")
    
    def _parse_degree_requirements(self, file_path: Path):
        """Parse JavaScript degree requirements file"""
        try:
            # Read the JS file and extract JSON-like data
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple extraction - in a real implementation you might want to use a JS parser
            # For now, we'll create a structured representation
            self.degree_requirements = {
                "computer_science": {
                    "tracks": ["machine_intelligence", "software_engineering", "general"],
                    "foundation_courses": ["CS 18000", "CS 18200", "CS 24000", "CS 25000", "CS 25100", "CS 25200"],
                    "core_courses": ["CS 30700", "CS 35200", "CS 38100", "CS 40700", "CS 42200", "CS 44300"],
                    "math_requirements": ["MA 16100", "MA 16200", "MA 26100", "MA 35100", "STAT 35000"],
                    "science_requirements": ["Physics or Chemistry sequence"],
                    "total_credits": 120,
                    "cs_credits_required": 40
                }
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Could not parse degree requirements: {e}")
            self.degree_requirements = {}
    
    def _integrate_knowledge_bases(self):
        """Integrate all knowledge bases into unified structure"""
        try:
            # Integrate comprehensive knowledge graph
            if self.comprehensive_knowledge:
                courses = self.comprehensive_knowledge.get("courses", {})
                for course_code, course_data in courses.items():
                    self.integrated_knowledge["courses"][course_code] = {
                        "code": course_code,
                        "title": course_data.get("title", ""),
                        "credits": course_data.get("credits", 0),
                        "description": course_data.get("description", ""),
                        "prerequisites": course_data.get("prerequisites", []),
                        "difficulty": course_data.get("difficulty", 0),
                        "workload_hours": course_data.get("workload_hours", 0),
                        "typical_semester": course_data.get("typical_semester", ""),
                        "course_type": course_data.get("course_type", ""),
                        "required": course_data.get("required", False),
                        "source": "comprehensive_knowledge"
                    }
            
            # Enhance with Purdue course catalog data
            if self.purdue_courses:
                for course in self.purdue_courses:
                    course_code = course.get("full_course_code", "")
                    if course_code and (course_code.startswith("CS ") or 
                                      course_code.startswith("MA ") or 
                                      course_code.startswith("MATH ") or 
                                      course_code.startswith("STAT ")):
                        
                        # Update existing course or create new entry
                        if course_code in self.integrated_knowledge["courses"]:
                            # Enhance existing course with catalog data
                            existing = self.integrated_knowledge["courses"][course_code]
                            existing.update({
                                "official_title": course.get("course_title", existing.get("title", "")),
                                "official_credits": float(course.get("credit_hours", existing.get("credits", 0))),
                                "term_offered": course.get("term", ""),
                                "course_level": course.get("course_level", ""),
                                "catalog_url": course.get("url", ""),
                                "enhanced": True
                            })
                        else:
                            # Create new course entry from catalog
                            self.integrated_knowledge["courses"][course_code] = {
                                "code": course_code,
                                "title": course.get("course_title", ""),
                                "credits": float(course.get("credit_hours", 0)),
                                "description": course.get("description", ""),
                                "prerequisites": [],  # Would need to parse from description
                                "course_level": course.get("course_level", ""),
                                "term_offered": course.get("term", ""),
                                "catalog_url": course.get("url", ""),
                                "source": "purdue_catalog"
                            }
            
            # Build prerequisite chains
            self._build_prerequisite_chains()
            
            # Analyze course relationships
            self._analyze_course_relationships()
            
            # Build graduation paths
            self._build_graduation_paths()
            
            logger.info(f"✅ Knowledge integration complete: {len(self.integrated_knowledge['courses'])} courses integrated")
            
        except Exception as e:
            logger.error(f"❌ Error integrating knowledge bases: {e}")
    
    def _build_prerequisite_chains(self):
        """Build comprehensive prerequisite chains"""
        for course_code, course_data in self.integrated_knowledge["courses"].items():
            prerequisites = course_data.get("prerequisites", [])
            if prerequisites:
                # Build recursive prerequisite chain
                chain = self._get_prerequisite_chain(course_code, set())
                self.integrated_knowledge["prerequisites"][course_code] = {
                    "direct_prerequisites": prerequisites,
                    "full_chain": list(chain),
                    "chain_length": len(chain),
                    "blocking_factor": self._calculate_blocking_factor(course_code)
                }
    
    def _get_prerequisite_chain(self, course_code: str, visited: Set[str]) -> Set[str]:
        """Recursively get all prerequisites for a course"""
        if course_code in visited:
            return set()  # Avoid circular dependencies
        
        visited.add(course_code)
        chain = set()
        
        course_data = self.integrated_knowledge["courses"].get(course_code, {})
        prerequisites = course_data.get("prerequisites", [])
        
        for prereq in prerequisites:
            chain.add(prereq)
            # Recursively add prerequisites of prerequisites
            chain.update(self._get_prerequisite_chain(prereq, visited.copy()))
        
        return chain
    
    def _calculate_blocking_factor(self, course_code: str) -> float:
        """Calculate how many other courses this course blocks"""
        blocking_count = 0
        for other_course, other_data in self.integrated_knowledge["courses"].items():
            if course_code in other_data.get("prerequisites", []):
                blocking_count += 1
        
        total_courses = len(self.integrated_knowledge["courses"])
        return blocking_count / total_courses if total_courses > 0 else 0.0
    
    def _analyze_course_relationships(self):
        """Analyze relationships between courses"""
        for course_code, course_data in self.integrated_knowledge["courses"].items():
            relationships = {
                "enables": [],  # Courses this course enables
                "similar_level": [],  # Courses at similar difficulty/level
                "same_track": [],  # Courses in same track/area
                "complementary": []  # Courses that complement this one
            }
            
            # Find courses this course enables
            for other_course, other_data in self.integrated_knowledge["courses"].items():
                if course_code in other_data.get("prerequisites", []):
                    relationships["enables"].append(other_course)
                
                # Find similar level courses (similar difficulty/credits)
                if (abs(course_data.get("difficulty", 0) - other_data.get("difficulty", 0)) < 0.5 and
                    course_code != other_course):
                    relationships["similar_level"].append(other_course)
            
            self.integrated_knowledge["course_relationships"][course_code] = relationships
    
    def _build_graduation_paths(self):
        """Build optimal graduation paths for different scenarios"""
        if not self.degree_requirements:
            return
        
        for major, major_data in self.degree_requirements.items():
            for track in major_data.get("tracks", ["general"]):
                path_key = f"{major}_{track}"
                
                # Create graduation path with semester-by-semester recommendations
                graduation_path = {
                    "major": major,
                    "track": track,
                    "total_semesters": 8,
                    "semester_plans": self._generate_semester_plans(major_data),
                    "critical_path": self._identify_critical_path(major_data),
                    "flexibility_points": self._identify_flexibility_points(major_data)
                }
                
                self.integrated_knowledge["graduation_paths"][path_key] = graduation_path
    
    def _generate_semester_plans(self, major_data: Dict) -> List[Dict]:
        """Generate semester-by-semester course plans"""
        # This is a simplified implementation - could be much more sophisticated
        foundation_courses = major_data.get("foundation_courses", [])
        core_courses = major_data.get("core_courses", [])
        
        semester_plans = []
        
        # Freshman year - foundation courses
        semester_plans.extend([
            {"semester": "Fall 1", "courses": foundation_courses[:3], "focus": "Foundation"},
            {"semester": "Spring 1", "courses": foundation_courses[3:6], "focus": "Foundation"},
        ])
        
        # Sophomore year - more foundation + early core
        semester_plans.extend([
            {"semester": "Fall 2", "courses": core_courses[:2] + ["Math requirement"], "focus": "Core Introduction"},
            {"semester": "Spring 2", "courses": core_courses[2:4] + ["Science requirement"], "focus": "Core Development"},
        ])
        
        return semester_plans
    
    def _identify_critical_path(self, major_data: Dict) -> List[str]:
        """Identify the critical path courses that can't be delayed"""
        foundation_courses = major_data.get("foundation_courses", [])
        # Critical path typically includes foundation courses with long prerequisite chains
        return foundation_courses[:4]  # Simplified
    
    def _identify_flexibility_points(self, major_data: Dict) -> List[Dict]:
        """Identify points where students have course selection flexibility"""
        return [
            {"semester": 3, "flexibility_type": "elective_choice", "options": 3},
            {"semester": 5, "flexibility_type": "track_specialization", "options": 5},
            {"semester": 7, "flexibility_type": "capstone_project", "options": 4}
        ]
    
    def smart_query(self, query: str, context: KnowledgeContext = None) -> SmartResponse:
        """Process queries with intelligent reasoning across all knowledge bases"""
        try:
            # Analyze query intent
            query_analysis = self._analyze_query_intent(query, context)
            
            # Generate response based on query type
            if query_analysis["type"] == "course_info":
                return self._handle_course_info_query(query, query_analysis, context)
            elif query_analysis["type"] == "prerequisite_planning":
                return self._handle_prerequisite_query(query, query_analysis, context)
            elif query_analysis["type"] == "graduation_planning":
                return self._handle_graduation_query(query, query_analysis, context)
            elif query_analysis["type"] == "course_comparison":
                return self._handle_comparison_query(query, query_analysis, context)
            elif query_analysis["type"] == "academic_strategy":
                return self._handle_strategy_query(query, query_analysis, context)
            else:
                return self._handle_general_query(query, query_analysis, context)
                
        except Exception as e:
            logger.error(f"❌ Error processing smart query: {e}")
            return SmartResponse(
                response_text="I encountered an error processing your query. Please try rephrasing or providing more context.",
                reasoning_chain=[f"Error: {str(e)}"],
                knowledge_sources=["error_handler"],
                confidence_score=0.0,
                follow_up_suggestions=["Please try rephrasing your question", "Provide more specific details"]
            )
    
    def _analyze_query_intent(self, query: str, context: KnowledgeContext) -> Dict[str, Any]:
        """Analyze query to determine intent and extract key information"""
        query_lower = query.lower()
        
        # Extract mentioned courses
        mentioned_courses = []
        for course_code in self.integrated_knowledge["courses"].keys():
            if course_code.lower() in query_lower:
                mentioned_courses.append(course_code)
        
        # Determine query type based on keywords and patterns
        if any(word in query_lower for word in ["prerequisite", "prereq", "before taking", "need to take first"]):
            query_type = "prerequisite_planning"
        elif any(word in query_lower for word in ["graduation", "graduate", "degree plan", "timeline", "semester"]):
            query_type = "graduation_planning"
        elif any(word in query_lower for word in ["compare", "vs", "versus", "difference", "better", "choose between"]):
            query_type = "course_comparison"
        elif any(word in query_lower for word in ["strategy", "advice", "recommend", "should i", "best way"]):
            query_type = "academic_strategy"
        elif mentioned_courses or any(word in query_lower for word in ["course", "class", "credits", "difficulty"]):
            query_type = "course_info"
        else:
            query_type = "general"
        
        return {
            "type": query_type,
            "mentioned_courses": mentioned_courses,
            "key_terms": self._extract_key_terms(query_lower),
            "context_indicators": self._extract_context_indicators(query_lower)
        }
    
    def _extract_key_terms(self, query_lower: str) -> List[str]:
        """Extract key academic terms from query"""
        academic_terms = [
            "gpa", "credits", "semester", "difficulty", "prerequisite", "track", 
            "major", "graduation", "elective", "core", "foundation", "capstone",
            "machine intelligence", "software engineering", "internship", "coop"
        ]
        
        found_terms = []
        for term in academic_terms:
            if term in query_lower:
                found_terms.append(term)
        
        return found_terms
    
    def _extract_context_indicators(self, query_lower: str) -> Dict[str, bool]:
        """Extract context indicators that affect response"""
        return {
            "urgent": any(word in query_lower for word in ["urgent", "asap", "immediately", "this semester"]),
            "planning": any(word in query_lower for word in ["plan", "schedule", "future", "next year"]),
            "struggling": any(word in query_lower for word in ["struggling", "difficult", "failing", "help"]),
            "advanced": any(word in query_lower for word in ["advanced", "graduate", "research", "phd"])
        }
    
    def _handle_course_info_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle queries about specific courses"""
        mentioned_courses = analysis["mentioned_courses"]
        
        if not mentioned_courses:
            return SmartResponse(
                response_text="I'd be happy to help with course information! Could you specify which course you're asking about?",
                reasoning_chain=["No specific course mentioned in query"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.3,
                follow_up_suggestions=["Ask about a specific course like 'CS 18000'", "Browse the course catalog"]
            )
        
        # Focus on the first mentioned course
        target_course = mentioned_courses[0]
        course_data = self.integrated_knowledge["courses"].get(target_course, {})
        
        if not course_data:
            return SmartResponse(
                response_text=f"I don't have detailed information about {target_course} in my knowledge base. This might be a course outside my specialty area or it might not be offered.",
                reasoning_chain=[f"Course {target_course} not found in integrated knowledge base"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.2,
                follow_up_suggestions=["Check the official Purdue course catalog", "Verify the course code spelling"]
            )
        
        # Build comprehensive course information
        response_parts = [
            f"**{target_course}: {course_data.get('title', 'Unknown Title')}**\n",
        ]
        
        # Basic information
        if course_data.get('credits'):
            response_parts.append(f"• **Credits:** {course_data['credits']}")
        
        if course_data.get('description'):
            response_parts.append(f"• **Description:** {course_data['description']}")
        
        # Prerequisites
        prerequisites = course_data.get('prerequisites', [])
        if prerequisites:
            response_parts.append(f"• **Prerequisites:** {', '.join(prerequisites)}")
            
            # Show prerequisite chain if complex
            prereq_data = self.integrated_knowledge["prerequisites"].get(target_course, {})
            if prereq_data.get('chain_length', 0) > 1:
                response_parts.append(f"• **Total Prerequisite Chain:** {prereq_data['chain_length']} courses deep")
        
        # Difficulty and workload
        if course_data.get('difficulty'):
            difficulty_desc = self._get_difficulty_description(course_data['difficulty'])
            response_parts.append(f"• **Difficulty:** {difficulty_desc} ({course_data['difficulty']}/5.0)")
        
        if course_data.get('workload_hours'):
            response_parts.append(f"• **Expected Workload:** {course_data['workload_hours']} hours/week")
        
        # Course relationships
        relationships = self.integrated_knowledge["course_relationships"].get(target_course, {})
        if relationships.get('enables'):
            enabled_courses = relationships['enables'][:3]  # Show first 3
            response_parts.append(f"• **Enables:** {', '.join(enabled_courses)}")
        
        # Strategic importance
        if course_data.get('required'):
            response_parts.append(f"• **Status:** Required course for CS major")
        
        if course_data.get('course_type') == 'foundation':
            response_parts.append(f"• **Type:** Foundation course - essential for degree progression")
        
        response_text = "\n".join(response_parts)
        
        # Build reasoning chain
        reasoning_chain = [
            f"Found {target_course} in integrated knowledge base",
            f"Retrieved data from {course_data.get('source', 'multiple sources')}",
            "Analyzed prerequisites and course relationships",
            "Provided comprehensive course overview"
        ]
        
        # Follow-up suggestions
        follow_up_suggestions = [
            f"Ask about prerequisites for {target_course}",
            "Compare this course with similar options",
            "Ask about the best semester to take this course"
        ]
        
        if relationships.get('enables'):
            follow_up_suggestions.append(f"Learn about courses enabled by {target_course}")
        
        return SmartResponse(
            response_text=response_text,
            reasoning_chain=reasoning_chain,
            knowledge_sources=["integrated_knowledge", "prerequisite_chains", "course_relationships"],
            confidence_score=0.9,
            follow_up_suggestions=follow_up_suggestions,
            related_courses=relationships.get('similar_level', [])[:3]
        )
    
    def _get_difficulty_description(self, difficulty_score: float) -> str:
        """Convert difficulty score to descriptive text"""
        if difficulty_score >= 4.5:
            return "Very Challenging"
        elif difficulty_score >= 3.5:
            return "Challenging"
        elif difficulty_score >= 2.5:
            return "Moderate"
        elif difficulty_score >= 1.5:
            return "Manageable"
        else:
            return "Introductory"
    
    def _handle_prerequisite_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle prerequisite-related queries"""
        mentioned_courses = analysis["mentioned_courses"]
        
        if not mentioned_courses:
            return SmartResponse(
                response_text="To help with prerequisite planning, please specify which course you're interested in taking.",
                reasoning_chain=["Prerequisite query detected but no target course specified"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.3,
                follow_up_suggestions=["Ask about prerequisites for a specific course"]
            )
        
        target_course = mentioned_courses[0]
        prereq_data = self.integrated_knowledge["prerequisites"].get(target_course, {})
        
        if not prereq_data:
            course_data = self.integrated_knowledge["courses"].get(target_course, {})
            if course_data:
                simple_prereqs = course_data.get("prerequisites", [])
                if simple_prereqs:
                    return SmartResponse(
                        response_text=f"**Prerequisites for {target_course}:**\n• Direct prerequisites: {', '.join(simple_prereqs)}\n\nI don't have detailed prerequisite chain analysis for this course.",
                        reasoning_chain=["Found basic prerequisite info", "No detailed chain analysis available"],
                        knowledge_sources=["integrated_knowledge"],
                        confidence_score=0.6,
                        follow_up_suggestions=["Ask about specific prerequisite courses"]
                    )
            
            return SmartResponse(
                response_text=f"I don't have prerequisite information for {target_course} in my knowledge base.",
                reasoning_chain=[f"No prerequisite data found for {target_course}"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.2,
                follow_up_suggestions=["Check official course catalog", "Verify course code"]
            )
        
        # Build comprehensive prerequisite analysis
        direct_prereqs = prereq_data.get("direct_prerequisites", [])
        full_chain = prereq_data.get("full_chain", [])
        chain_length = prereq_data.get("chain_length", 0)
        
        response_parts = [
            f"**Prerequisite Analysis for {target_course}**\n"
        ]
        
        if direct_prereqs:
            response_parts.append(f"**Direct Prerequisites:**")
            for prereq in direct_prereqs:
                prereq_info = self.integrated_knowledge["courses"].get(prereq, {})
                prereq_title = prereq_info.get('title', 'Unknown')
                response_parts.append(f"• {prereq}: {prereq_title}")
        
        if chain_length > 1:
            response_parts.append(f"\n**Full Prerequisite Chain ({chain_length} courses deep):**")
            # Organize prerequisites by likely semester order
            organized_prereqs = self._organize_prerequisites_by_level(full_chain)
            for level, courses in organized_prereqs.items():
                if courses:
                    response_parts.append(f"• **{level}:** {', '.join(courses)}")
        
        # Add strategic advice
        response_parts.append(f"\n**Strategic Notes:**")
        
        if chain_length >= 3:
            response_parts.append(f"• This course has a long prerequisite chain - plan early!")
            response_parts.append(f"• Consider taking prerequisites across multiple semesters")
        
        blocking_factor = prereq_data.get("blocking_factor", 0)
        if blocking_factor > 0.1:
            response_parts.append(f"• High-priority course - blocks access to many other courses")
        
        # Timeline estimate
        min_semesters = max(2, (chain_length + 1) // 2)
        response_parts.append(f"• **Estimated timeline:** {min_semesters}+ semesters to reach {target_course}")
        
        reasoning_chain = [
            f"Analyzed prerequisite chain for {target_course}",
            f"Found {len(direct_prereqs)} direct prerequisites",
            f"Identified {chain_length} courses in full chain",
            "Provided strategic planning advice"
        ]
        
        follow_up_suggestions = [
            "Ask about the best order to take these prerequisites",
            f"Learn about courses that {target_course} enables",
            "Get a personalized semester-by-semester plan"
        ]
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=reasoning_chain,
            knowledge_sources=["prerequisite_chains", "course_relationships", "strategic_analysis"],
            confidence_score=0.9,
            follow_up_suggestions=follow_up_suggestions,
            related_courses=direct_prereqs
        )
    
    def _organize_prerequisites_by_level(self, prereq_chain: List[str]) -> Dict[str, List[str]]:
        """Organize prerequisites by typical academic level"""
        levels = {
            "Foundation (100-200 level)": [],
            "Intermediate (200-300 level)": [],
            "Advanced (300-400 level)": []
        }
        
        for course in prereq_chain:
            # Simple level detection based on course number
            if any(course.startswith(f"CS 1") or course.startswith(f"MA 1") or course.startswith(f"MATH 1") for course in [course]):
                levels["Foundation (100-200 level)"].append(course)
            elif any(course.startswith(f"CS 2") or course.startswith(f"MA 2") or course.startswith(f"MATH 2") for course in [course]):
                levels["Foundation (100-200 level)"].append(course)
            elif any(course.startswith(f"CS 3") for course in [course]):
                levels["Intermediate (200-300 level)"].append(course)
            else:
                levels["Advanced (300-400 level)"].append(course)
        
        return levels
    
    def _handle_graduation_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle graduation planning queries"""
        # Extract graduation context
        query_lower = query.lower()
        
        # Determine time frame
        time_indicators = {
            "early": any(word in query_lower for word in ["early", "ahead", "fast", "accelerated", "3 years"]),
            "normal": any(word in query_lower for word in ["4 years", "normal", "typical", "regular"]),
            "extended": any(word in query_lower for word in ["5 years", "extended", "part-time", "slower"])
        }
        
        # Determine track interest
        track_indicators = {
            "machine_intelligence": any(word in query_lower for word in ["machine intelligence", "ai", "ml", "artificial"]),
            "software_engineering": any(word in query_lower for word in ["software engineering", "se", "development"]),
            "general": not any(track_indicators.values())
        }
        
        target_track = "general"
        for track, indicated in track_indicators.items():
            if indicated:
                target_track = track
                break
        
        # Get graduation path
        path_key = f"computer_science_{target_track}"
        graduation_path = self.integrated_knowledge["graduation_paths"].get(path_key, {})
        
        if not graduation_path:
            return SmartResponse(
                response_text="I can provide general graduation guidance, but I need more specific information about your major and track preferences.",
                reasoning_chain=["No specific graduation path found"],
                knowledge_sources=["degree_requirements"],
                confidence_score=0.4,
                follow_up_suggestions=["Specify your major and track", "Ask about CS degree requirements"]
            )
        
        # Build graduation planning response
        response_parts = [
            f"**Graduation Planning for Computer Science - {target_track.replace('_', ' ').title()}**\n"
        ]
        
        # Timeline analysis
        if time_indicators["early"]:
            response_parts.append("**Accelerated Timeline (3-3.5 years):**")
            response_parts.append("• Requires 15-18 credits per semester + summer courses")
            response_parts.append("• Focus on high-priority courses first")
            response_parts.append("• Limited flexibility for electives or course repeats")
        elif time_indicators["extended"]:
            response_parts.append("**Extended Timeline (5+ years):**")
            response_parts.append("• Allows 12-15 credits per semester")
            response_parts.append("• More time for internships and co-ops")
            response_parts.append("• Flexibility to retake courses if needed")
        else:
            response_parts.append("**Standard Timeline (4 years):**")
            response_parts.append("• Typical course load: 15-16 credits per semester")
            response_parts.append("• Balanced progression through requirements")
            response_parts.append("• Moderate flexibility for electives")
        
        # Critical path courses
        critical_path = graduation_path.get("critical_path", [])
        if critical_path:
            response_parts.append(f"\n**Critical Path Courses (take early):**")
            for course in critical_path[:4]:
                course_info = self.integrated_knowledge["courses"].get(course, {})
                title = course_info.get('title', 'Unknown')
                response_parts.append(f"• {course}: {title}")
        
        # Semester planning example
        semester_plans = graduation_path.get("semester_plans", [])
        if semester_plans:
            response_parts.append(f"\n**Sample Semester Progression:**")
            for plan in semester_plans[:4]:  # Show first 4 semesters
                semester = plan.get("semester", "Unknown")
                focus = plan.get("focus", "General")
                courses = plan.get("courses", [])
                response_parts.append(f"• **{semester}** ({focus}): {', '.join(courses[:3])}")
        
        # Strategic advice based on track
        response_parts.append(f"\n**Track-Specific Advice:**")
        if target_track == "machine_intelligence":
            response_parts.append("• Strong math foundation is critical (statistics, linear algebra)")
            response_parts.append("• Consider research opportunities early")
            response_parts.append("• Python and data science skills are valuable")
        elif target_track == "software_engineering":
            response_parts.append("• Focus on software design and architecture courses")
            response_parts.append("• Gain experience with large codebases")
            response_parts.append("• Industry internships are highly valuable")
        else:
            response_parts.append("• Keep options open until sophomore year")
            response_parts.append("• Take courses from both tracks to explore interests")
            response_parts.append("• Talk to faculty and upperclassmen about track selection")
        
        reasoning_chain = [
            "Analyzed graduation timeline preferences",
            f"Selected {target_track} track guidance",
            "Retrieved graduation path from knowledge base",
            "Provided strategic planning advice"
        ]
        
        follow_up_suggestions = [
            "Ask about specific course sequences",
            "Get advice on internship timing",
            "Learn about track selection criteria",
            "Request a personalized semester plan"
        ]
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=reasoning_chain,
            knowledge_sources=["graduation_paths", "degree_requirements", "strategic_analysis"],
            confidence_score=0.8,
            follow_up_suggestions=follow_up_suggestions,
            related_courses=critical_path
        )
    
    def _handle_comparison_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle course comparison queries"""
        mentioned_courses = analysis["mentioned_courses"]
        
        if len(mentioned_courses) < 2:
            return SmartResponse(
                response_text="To compare courses, please specify at least two courses you'd like me to analyze.",
                reasoning_chain=["Comparison query detected but insufficient courses specified"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.3,
                follow_up_suggestions=["Ask to compare specific courses like 'CS 25000 vs CS 25100'"]
            )
        
        course1, course2 = mentioned_courses[0], mentioned_courses[1]
        course1_data = self.integrated_knowledge["courses"].get(course1, {})
        course2_data = self.integrated_knowledge["courses"].get(course2, {})
        
        if not course1_data or not course2_data:
            missing = course1 if not course1_data else course2
            return SmartResponse(
                response_text=f"I don't have enough information about {missing} to make a detailed comparison.",
                reasoning_chain=[f"Missing data for {missing}"],
                knowledge_sources=["integrated_knowledge"],
                confidence_score=0.3,
                follow_up_suggestions=["Verify course codes", "Ask about courses I have more data on"]
            )
        
        # Build comparison response
        response_parts = [
            f"**Course Comparison: {course1} vs {course2}**\n"
        ]
        
        # Basic information comparison
        response_parts.append("**Basic Information:**")
        response_parts.append(f"• **{course1}:** {course1_data.get('title', 'Unknown')} ({course1_data.get('credits', 0)} credits)")
        response_parts.append(f"• **{course2}:** {course2_data.get('title', 'Unknown')} ({course2_data.get('credits', 0)} credits)")
        
        # Difficulty comparison
        diff1 = course1_data.get('difficulty', 0)
        diff2 = course2_data.get('difficulty', 0)
        if diff1 and diff2:
            response_parts.append(f"\n**Difficulty:**")
            response_parts.append(f"• **{course1}:** {self._get_difficulty_description(diff1)} ({diff1}/5.0)")
            response_parts.append(f"• **{course2}:** {self._get_difficulty_description(diff2)} ({diff2}/5.0)")
            
            if abs(diff1 - diff2) > 0.5:
                harder = course1 if diff1 > diff2 else course2
                response_parts.append(f"• **{harder} is notably more challenging**")
        
        # Prerequisites comparison
        prereq1 = self.integrated_knowledge["prerequisites"].get(course1, {})
        prereq2 = self.integrated_knowledge["prerequisites"].get(course2, {})
        
        if prereq1 or prereq2:
            response_parts.append(f"\n**Prerequisites:**")
            chain1 = prereq1.get('chain_length', 0)
            chain2 = prereq2.get('chain_length', 0)
            response_parts.append(f"• **{course1}:** {chain1} courses in prerequisite chain")
            response_parts.append(f"• **{course2}:** {chain2} courses in prerequisite chain")
            
            if chain1 != chain2:
                easier_access = course1 if chain1 < chain2 else course2
                response_parts.append(f"• **{easier_access} has fewer prerequisites (easier to access)**")
        
        # Course relationships and impact
        rel1 = self.integrated_knowledge["course_relationships"].get(course1, {})
        rel2 = self.integrated_knowledge["course_relationships"].get(course2, {})
        
        enables1 = len(rel1.get('enables', []))
        enables2 = len(rel2.get('enables', []))
        
        if enables1 or enables2:
            response_parts.append(f"\n**Future Impact:**")
            response_parts.append(f"• **{course1}:** Enables {enables1} future courses")
            response_parts.append(f"• **{course2}:** Enables {enables2} future courses")
            
            if enables1 != enables2:
                more_impact = course1 if enables1 > enables2 else course2
                response_parts.append(f"• **{more_impact} unlocks more future opportunities**")
        
        # Recommendation logic
        response_parts.append(f"\n**Recommendation:**")
        
        # Simple recommendation logic based on multiple factors
        factors = []
        
        if context and context.user_profile:
            gpa = context.user_profile.get('gpa', 3.0)
            if gpa < 3.0 and abs(diff1 - diff2) > 0.5:
                easier = course1 if diff1 < diff2 else course2
                factors.append(f"Given your GPA, consider starting with {easier} (less challenging)")
        
        if prereq1 and prereq2:
            if abs(chain1 - chain2) >= 2:
                accessible = course1 if chain1 < chain2 else course2
                factors.append(f"Take {accessible} first due to shorter prerequisite chain")
        
        if enables1 != enables2 and abs(enables1 - enables2) >= 2:
            impactful = course1 if enables1 > enables2 else course2
            factors.append(f"Prioritize {impactful} as it unlocks more future courses")
        
        if factors:
            response_parts.extend([f"• {factor}" for factor in factors])
        else:
            response_parts.append("• Both courses appear similarly accessible and valuable")
            response_parts.append("• Consider your personal interests and career goals")
            response_parts.append("• You might benefit from both courses eventually")
        
        reasoning_chain = [
            f"Compared {course1} and {course2}",
            "Analyzed difficulty, prerequisites, and course relationships",
            "Considered user context for personalized recommendation",
            "Provided strategic comparison analysis"
        ]
        
        follow_up_suggestions = [
            f"Ask about the best semester to take {course1} or {course2}",
            "Learn more about courses enabled by each option",
            "Get advice on managing course difficulty",
            "Ask about professor recommendations for these courses"
        ]
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=reasoning_chain,
            knowledge_sources=["course_comparison", "prerequisite_analysis", "strategic_planning"],
            confidence_score=0.85,
            follow_up_suggestions=follow_up_suggestions,
            related_courses=[course1, course2]
        )
    
    def _handle_strategy_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle academic strategy and advice queries"""
        key_terms = analysis["key_terms"]
        context_indicators = analysis["context_indicators"]
        
        # Determine the type of strategic advice needed
        if "gpa" in key_terms or context_indicators.get("struggling"):
            return self._provide_gpa_strategy(query, context)
        elif "internship" in key_terms or "coop" in key_terms:
            return self._provide_career_strategy(query, context)
        elif "track" in key_terms:
            return self._provide_track_selection_strategy(query, context)
        elif "semester" in key_terms or "schedule" in key_terms:
            return self._provide_scheduling_strategy(query, context)
        else:
            return self._provide_general_strategy(query, context)
    
    def _provide_gpa_strategy(self, query: str, context: KnowledgeContext) -> SmartResponse:
        """Provide GPA improvement strategies"""
        response_parts = [
            "**Academic Performance Strategy**\n",
            "**Immediate Actions:**",
            "• Focus on understanding over memorization",
            "• Attend office hours regularly - professors want to help",
            "• Form study groups with classmates",
            "• Use campus tutoring resources (free at most universities)",
            "",
            "**Course Selection Strategy:**",
            "• Balance difficult courses with easier ones each semester",
            "• Take foundational courses seriously - they build essential skills",
            "• Consider audit/pass-fail options for non-major requirements (if allowed)",
            "",
            "**Long-term Planning:**",
            "• Track your GPA trend, not just overall GPA",
            "• Understand grade replacement policies",
            "• Plan retakes strategically if needed"
        ]
        
        # Add personalized advice if we have transcript data
        if context and context.student_transcript:
            courses = context.student_transcript.get('courses', [])
            struggling_courses = [c for c in courses if c.get('gradePoints', 4.0) < 2.0]
            
            if struggling_courses:
                response_parts.extend([
                    "",
                    "**Based on Your Transcript:**",
                    f"• I notice challenges in {len(struggling_courses)} courses",
                    "• Consider reviewing foundational concepts in those areas",
                    "• These courses might benefit from retaking or additional support"
                ])
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=["Identified GPA/performance concern", "Provided multi-level strategy", "Included personalized advice"],
            knowledge_sources=["academic_strategy", "student_context"],
            confidence_score=0.8,
            follow_up_suggestions=[
                "Ask about specific courses you're struggling with",
                "Get advice on course load balancing",
                "Learn about campus academic support resources"
            ]
        )
    
    def _provide_track_selection_strategy(self, query: str, context: KnowledgeContext) -> SmartResponse:
        """Provide track selection strategy"""
        response_parts = [
            "**Computer Science Track Selection Strategy**\n",
            "**Machine Intelligence Track:**",
            "• **Best for:** Students interested in AI, machine learning, data science",
            "• **Key strengths needed:** Strong math skills, analytical thinking",
            "• **Career paths:** AI engineer, data scientist, research scientist",
            "• **Challenging courses:** Advanced algorithms, machine learning theory",
            "",
            "**Software Engineering Track:**",
            "• **Best for:** Students who love building large-scale systems",
            "• **Key strengths needed:** System thinking, collaborative skills",
            "• **Career paths:** Software developer, system architect, product manager",
            "• **Challenging courses:** Software architecture, project management",
            "",
            "**General Track:**",
            "• **Best for:** Students who want maximum flexibility",
            "• **Allows:** Sampling from both tracks, creating custom focus",
            "• **Trade-off:** Less specialized depth, but broader exposure"
        ]
        
        # Add personalized recommendations based on transcript
        if context and context.student_transcript:
            courses = context.student_transcript.get('courses', [])
            math_performance = [c for c in courses if c.get('courseCode', '').startswith(('MA', 'MATH', 'STAT'))]
            cs_performance = [c for c in courses if c.get('courseCode', '').startswith('CS')]
            
            avg_math_gpa = sum(c.get('gradePoints', 0) for c in math_performance) / len(math_performance) if math_performance else 0
            avg_cs_gpa = sum(c.get('gradePoints', 0) for c in cs_performance) / len(cs_performance) if cs_performance else 0
            
            response_parts.extend([
                "",
                "**Based on Your Academic Performance:**"
            ])
            
            if avg_math_gpa >= 3.5:
                response_parts.append("• Your strong math performance suggests Machine Intelligence could be a good fit")
            elif avg_cs_gpa >= 3.5:
                response_parts.append("• Your solid CS performance suggests either track would work well")
            
            if len(cs_performance) >= 3:
                response_parts.append("• You have enough CS experience to make an informed track decision")
            else:
                response_parts.append("• Consider taking more CS courses before committing to a track")
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=["Analyzed track selection query", "Provided comprehensive track overview", "Added personalized recommendations"],
            knowledge_sources=["track_analysis", "career_guidance", "academic_performance"],
            confidence_score=0.9,
            follow_up_suggestions=[
                "Ask about specific courses in each track",
                "Learn about career outcomes by track",
                "Get advice on track switching policies"
            ]
        )
    
    def _provide_scheduling_strategy(self, query: str, context: KnowledgeContext) -> SmartResponse:
        """Provide course scheduling strategy"""
        response_parts = [
            "**Course Scheduling Strategy**\n",
            "**General Principles:**",
            "• **Balance difficulty:** Mix challenging and manageable courses",
            "• **Consider prerequisites:** Plan sequences 2-3 semesters ahead",
            "• **Account for workload:** Don't overload with high-time-commitment courses",
            "• **Plan for failure:** Have backup options if you need to drop/retake",
            "",
            "**Semester Planning:**",
            "• **15-16 credits:** Standard full-time load",
            "• **12-14 credits:** Light load (good if working/struggling)",
            "• **17+ credits:** Heavy load (only if you're performing well)",
            "",
            "**Strategic Timing:**",
            "• **Fall semesters:** More course options, better professor selection",
            "• **Spring semesters:** Some courses only offered in spring",
            "• **Summer courses:** Good for catching up or getting ahead",
            ""
        ]
        
        # Add specific CS scheduling advice
        foundation_courses = ["CS 18000", "CS 18200", "CS 24000", "CS 25000", "CS 25100", "CS 25200"]
        
        response_parts.extend([
            "**CS-Specific Scheduling:**",
            "• **Priority order for foundation courses:**"
        ])
        
        for i, course in enumerate(foundation_courses[:4]):
            course_data = self.integrated_knowledge["courses"].get(course, {})
            title = course_data.get('title', 'Unknown')
            semester_rec = "freshman" if i < 2 else "sophomore"
            response_parts.append(f"  {i+1}. {course}: {title} ({semester_rec} year)")
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=["Identified scheduling strategy need", "Provided general and CS-specific advice", "Included practical guidelines"],
            knowledge_sources=["scheduling_strategy", "cs_curriculum", "academic_planning"],
            confidence_score=0.8,
            follow_up_suggestions=[
                "Get a personalized semester-by-semester plan",
                "Ask about specific course combinations",
                "Learn about summer course options"
            ]
        )
    
    def _provide_general_strategy(self, query: str, context: KnowledgeContext) -> SmartResponse:
        """Provide general academic strategy"""
        response_parts = [
            "**General Academic Strategy for CS Students**\n",
            "**Academic Excellence:**",
            "• Master the fundamentals - they appear everywhere",
            "• Practice coding regularly, not just for assignments", 
            "• Understand concepts deeply rather than memorizing",
            "• Build projects outside of coursework",
            "",
            "**Career Preparation:**",
            "• Start building a GitHub portfolio early",
            "• Seek internships after sophomore year",
            "• Network with faculty, upperclassmen, and industry professionals",
            "• Join relevant clubs and organizations",
            "",
            "**Long-term Success:**",
            "• Develop both technical and communication skills",
            "• Stay updated with industry trends",
            "• Consider research opportunities if interested in graduate school",
            "• Build relationships - they're crucial for career success"
        ]
        
        return SmartResponse(
            response_text="\n".join(response_parts),
            reasoning_chain=["Provided comprehensive academic strategy", "Included career and long-term perspectives"],
            knowledge_sources=["general_strategy", "career_guidance"],
            confidence_score=0.7,
            follow_up_suggestions=[
                "Ask about specific areas like internships or research",
                "Get advice on building a strong portfolio",
                "Learn about networking opportunities at your school"
            ]
        )
    
    def _handle_general_query(self, query: str, analysis: Dict, context: KnowledgeContext) -> SmartResponse:
        """Handle general queries that don't fit specific categories"""
        return SmartResponse(
            response_text="I'm here to help with your computer science academic planning! I can provide information about courses, prerequisites, graduation planning, and academic strategy. What specific aspect would you like to discuss?",
            reasoning_chain=["General query detected", "Provided overview of capabilities"],
            knowledge_sources=["general_guidance"],
            confidence_score=0.6,
            follow_up_suggestions=[
                "Ask about specific courses you're interested in",
                "Request help with graduation planning",
                "Get advice on course selection strategy",
                "Learn about prerequisite chains for advanced courses"
            ]
        )
    
    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get statistics about the integrated knowledge base"""
        return {
            "total_courses": len(self.integrated_knowledge["courses"]),
            "courses_with_prerequisites": len(self.integrated_knowledge["prerequisites"]),
            "graduation_paths": len(self.integrated_knowledge["graduation_paths"]),
            "knowledge_sources": [
                "comprehensive_knowledge_graph.json",
                "purdue_courses_complete.json", 
                "degreeRequirements.js"
            ],
            "last_updated": datetime.now().isoformat()
        }

# Global instance for the FastAPI app
integrated_knowledge_manager = None

def get_integrated_knowledge_manager():
    """Get or create the integrated knowledge manager instance"""
    global integrated_knowledge_manager
    if integrated_knowledge_manager is None:
        integrated_knowledge_manager = IntegratedKnowledgeManager()
    return integrated_knowledge_manager