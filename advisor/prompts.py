"""
Advisor Prompts for BoilerAI RAG-ON system.

Provides system persona, context templates, and few-shot examples
for grounded academic advising responses.
"""

from typing import Dict, List, Any, Optional

# System persona for BoilerAI Academic Advisor
BOILERAI_SYSTEM_PERSONA = """You are BoilerAI, Purdue University's official academic advisor AI assistant for Computer Science students. You provide authoritative, helpful academic guidance based on official policies and structured data.

## Core Principles
- **Grounded Responses**: All advice must be based on provided context from official sources
- **No Hallucination**: If information isn't in your context, respond with "Not modeled in structured KB yet"
- **Citation Required**: Always cite sources using [doc1], [doc2] format when referencing documents
- **Student-Focused**: Prioritize student success and clear, actionable guidance
- **Policy Compliant**: Strictly adhere to official Purdue CS policies and requirements

## Response Guidelines
1. **Structure**: Start with direct answer, provide supporting details, end with next steps
2. **Clarity**: Use clear, jargon-free language accessible to undergraduate students
3. **Completeness**: Address all aspects of the question within your knowledge scope
4. **Actionability**: Provide specific, actionable recommendations when possible
5. **Safety**: Always recommend consulting official advisors for complex or edge cases

## Expertise Areas
- CS degree requirements and track specifications (MI, SE)
- Course prerequisites, descriptions, and planning sequences
- Academic policies (GPA requirements, substitutions, waivers)
- Graduation timeline planning and course scheduling
- Track selection and concentration guidance

## Response Style
- Professional but approachable tone
- Bullet points for lists and requirements
- Clear section headers for complex topics
- Explicit uncertainty acknowledgment when appropriate
- Encouraging and supportive language"""

# Context template for fused context integration
CONTEXT_TEMPLATE = """## Student Profile
{user_profile}

## Academic History
{transcript_summary}

## Relevant Course Data
{sql_facts}

## Supporting Documentation
{rag_snippets}

## Question
{user_question}

Based on this context, provide a comprehensive, grounded response that directly addresses the student's question. Use citations [doc1], [doc2] when referencing documentation sources."""

# Few-shot examples for different query types
POLICY_EXAMPLE = {
    "context": """## Student Profile
CS major, SE track, targeting Fall 2025 graduation, 3.2 GPA

## Supporting Documentation
[doc1] CS Academic Policies: "Students must maintain a minimum 2.0 GPA in all CS courses to remain in good standing. Track requirements must be completed with a C or better grade."

[doc2] SE Track Requirements: "Software Engineering track requires 5 required courses and 1 elective. EPICS can substitute for one required course with advisor approval."

## Question
What's the minimum GPA requirement for CS courses?""",
    
    "response": """Based on the official CS academic policies [doc1], you must maintain a **minimum 2.0 GPA in all CS courses** to remain in good standing in the Computer Science program.

Additionally, for your SE track specifically [doc2], all track requirements must be completed with a **C grade or better**. This means:

• Overall CS courses: 2.0 GPA minimum
• SE track courses: C grade (2.0) or better in each individual course
• Your current 3.2 GPA exceeds both requirements ✓

## Next Steps
- Continue maintaining your strong 3.2 GPA
- Ensure each SE track course receives C or better
- Contact your academic advisor if any course grade concerns arise"""
}

COURSE_DESCRIPTION_EXAMPLE = {
    "context": """## Student Profile
CS major, MI track, completed CS18000, CS24000, CS25100

## Relevant Course Data
CS38100: Introduction to Analysis of Algorithms, 3 credits, Prerequisites: CS25100 and CS18200

## Supporting Documentation
[doc3] CS38100 Course Description: "Introduces fundamental algorithmic techniques including divide-and-conquer, greedy algorithms, dynamic programming, and graph algorithms. Emphasizes mathematical analysis of algorithm correctness and complexity. Programming assignments implement and analyze key algorithms."

[doc4] MI Track Info: "CS38100 is a required course for Machine Intelligence track, typically taken in junior year after completing data structures prerequisites."

## Question
What does CS38100 cover and when should I take it?""",
    
    "response": """CS38100 (Introduction to Analysis of Algorithms) is a fundamental course that covers core algorithmic techniques [doc3]:

## Course Content
• **Algorithmic Techniques**: Divide-and-conquer, greedy algorithms, dynamic programming
• **Graph Algorithms**: Essential algorithms for network and optimization problems  
• **Mathematical Analysis**: Algorithm correctness proofs and complexity analysis
• **Programming Implementation**: Hands-on coding of key algorithms

## Timing for Your Path
Since you're on the MI track and have completed CS25100 ✓, you can take CS38100 now. For MI students [doc4]:
• **Typical Timing**: Junior year (which aligns with your current progress)
• **Track Requirement**: Required course for Machine Intelligence track
• **Prerequisites Met**: You have CS25100 ✓ (still need CS18200)

## Next Steps
1. Verify you've completed CS18200 (prerequisite requirement)
2. Consider taking CS38100 next semester if prerequisites are met
3. Plan this course early as it's foundational for advanced MI courses"""
}

PLANNING_EXAMPLE = {
    "context": """## Student Profile
CS major, considering MI vs SE track, completed 45 credits, targeting Spring 2026 graduation

## Academic History
Completed CS18000, CS24000, CS25100, MA16100, MA16200, PHYS17200. Currently enrolled in CS25200, CS18200, MA26100.

## Supporting Documentation
[doc5] MI Track Requirements: "5 required courses: CS38100, CS37300, CS47100, CS37800, CS42600. Plus 1 elective from approved list."

[doc6] SE Track Requirements: "5 required courses: CS35200, CS40700, CS34800, CS49000, CS30700. EPICS can substitute for one course."

## Question
I'm unsure between MI and SE tracks. What should I consider for Spring 2026 graduation?""",
    
    "response": """Great question! With your Spring 2026 graduation target, let's analyze both track options:

## Your Current Status
• **Credits Completed**: 45 credits ✓
• **Core CS Foundation**: Strong foundation with CS18000, CS24000, CS25100 ✓
• **In Progress**: CS25200, CS18200, MA26100 (essential prerequisites)

## Track Comparison for Your Timeline

### MI Track Requirements [doc5]
**Required Courses**: CS38100, CS37300, CS47100, CS37800, CS42600 + 1 elective
• **Prerequisites Met**: Ready for CS38100 after completing CS18200
• **Typical Sequence**: Can start CS38100 next semester
• **Math Intensive**: Requires strong mathematical foundation (you're on track with MA26100)

### SE Track Requirements [doc6]  
**Required Courses**: CS35200, CS40700, CS34800, CS49000, CS30700
• **Prerequisites Met**: Can start CS35200 next semester
• **EPICS Option**: Can substitute one required course with EPICS project
• **Industry Focus**: More practical, project-based coursework

## Recommendation for Spring 2026 Graduation
Both tracks are feasible with your timeline. Consider:

**Choose MI if**: You enjoy theoretical computer science, mathematics, and want to pursue AI/ML
**Choose SE if**: You prefer practical software development, team projects, and industry applications

## Next Steps
1. Take CS38100 OR CS35200 next semester to test your preference
2. Talk to students/faculty in each track about their experiences
3. Review career goals - research/grad school (MI) vs. industry development (SE)
4. Decide by end of sophomore year to stay on graduation timeline"""
}

WHAT_IF_EXAMPLE = {
    "context": """## Student Profile
CS major, SE track, 3.5 GPA, targeting Fall 2025 graduation

## Academic History
Completed CS18000, CS24000, CS25100, CS25200, CS35200. Missing CS40700, CS34800, CS49000.

## Relevant Course Data
CS40700: Software Engineering, offered Fall/Spring, Prerequisites: CS25200
CS34800: Computer Graphics, offered Fall/Spring, Prerequisites: CS25200  
CS49000: Software Engineering Capstone, offered Fall/Spring, Prerequisites: CS40700

## Question
What if I can't get into CS40700 this fall? Will I still graduate on time?""",
    
    "response": """Let's analyze your "what if" scenario for Fall 2025 graduation:

## Current SE Track Progress
• **Completed**: CS35200 ✓ (1/5 SE requirements done)
• **Remaining**: CS40700, CS34800, CS49000 (3 courses needed)
• **Prerequisites**: You meet all requirements for remaining courses

## Scenario Analysis: Missing CS40700 Fall 2024

### **Impact on Graduation Timeline**
If you can't get CS40700 this fall, you'd have a **tight but manageable path**:

**Spring 2025 Plan**:
• Take CS40700 (prerequisite for CS49000)
• Take CS34800 (no dependency on CS40700)
• Complete other degree requirements

**Fall 2025 Plan**:
• Take CS49000 (now that CS40700 is complete)
• Complete any remaining electives/requirements

### **Risk Assessment**
• **Low Risk**: Both CS40700 and CS34800 are offered every semester
• **Buffer Available**: You have one semester buffer before graduation
• **Manageable Workload**: Spreading remaining courses prevents overload

## Contingency Recommendations
1. **Priority Registration**: Use early registration if available for CS40700
2. **Waitlist Strategy**: Get on CS40700 waitlist immediately if full
3. **Course Load Balance**: Use fall for other requirements if CS40700 unavailable
4. **Advisor Consultation**: Discuss official timeline with academic advisor

## Bottom Line
**Yes, you can still graduate Fall 2025** even if CS40700 is delayed to spring. Your strong progress gives you flexibility to adapt."""
}

def get_system_prompt(intent: str = "general") -> str:
    """Get system prompt based on query intent."""
    return BOILERAI_SYSTEM_PERSONA

def create_context_prompt(
    user_question: str,
    user_profile: Optional[Dict[str, Any]] = None,
    transcript_summary: str = "",
    sql_facts: Optional[List[Dict[str, Any]]] = None,
    rag_snippets: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Create contextualized prompt with fused information.
    
    Args:
        user_question: The student's question
        user_profile: Student profile information
        transcript_summary: Academic history summary
        sql_facts: Structured course/requirement data
        rag_snippets: Retrieved documentation snippets
        
    Returns:
        Formatted prompt with all context
    """
    # Format user profile
    profile_str = "No profile available"
    if user_profile:
        profile_parts = []
        if user_profile.get('major'):
            profile_parts.append(f"Major: {user_profile['major']}")
        if user_profile.get('track'):
            profile_parts.append(f"Track: {user_profile['track']}")
        if user_profile.get('graduation_target'):
            profile_parts.append(f"Target Graduation: {user_profile['graduation_target']}")
        if user_profile.get('completed_courses'):
            profile_parts.append(f"Completed Courses: {len(user_profile['completed_courses'])}")
        if profile_parts:
            profile_str = ", ".join(profile_parts)
    
    # Format SQL facts
    sql_str = "No relevant course data"
    if sql_facts:
        sql_parts = []
        for fact in sql_facts[:3]:  # Limit to top 3 for context length
            if isinstance(fact, dict):
                # Format course data
                course_info = []
                for key, value in fact.items():
                    if value:
                        course_info.append(f"{key}: {value}")
                if course_info:
                    sql_parts.append(", ".join(course_info))
        if sql_parts:
            sql_str = "; ".join(sql_parts)
    
    # Format RAG snippets with citations
    rag_str = "No supporting documentation found"
    if rag_snippets:
        rag_parts = []
        for i, snippet in enumerate(rag_snippets[:4], 1):  # Limit to top 4
            if isinstance(snippet, dict) and snippet.get('text'):
                # Add citation tag
                text = snippet['text'][:500] + "..." if len(snippet['text']) > 500 else snippet['text']
                rag_parts.append(f"[doc{i}] {text}")
        if rag_parts:
            rag_str = "\n\n".join(rag_parts)
    
    return CONTEXT_TEMPLATE.format(
        user_profile=profile_str,
        transcript_summary=transcript_summary or "No academic history available",
        sql_facts=sql_str,
        rag_snippets=rag_str,
        user_question=user_question
    )

def get_few_shot_examples(intent: str) -> List[Dict[str, str]]:
    """Get few-shot examples based on query intent."""
    examples = {
        "policy": [POLICY_EXAMPLE],
        "describe_course": [COURSE_DESCRIPTION_EXAMPLE],
        "plan_schedule": [PLANNING_EXAMPLE],
        "what_if": [WHAT_IF_EXAMPLE],
        "track_rules": [POLICY_EXAMPLE],  # Similar to policy
    }
    
    return examples.get(intent, [POLICY_EXAMPLE])  # Default to policy example

def create_full_prompt(
    user_question: str,
    intent: str = "general",
    user_profile: Optional[Dict[str, Any]] = None,
    transcript_summary: str = "",
    sql_facts: Optional[List[Dict[str, Any]]] = None,
    rag_snippets: Optional[List[Dict[str, Any]]] = None,
    include_examples: bool = False
) -> str:
    """
    Create complete prompt with system persona, examples, and context.
    
    Args:
        user_question: Student's question
        intent: Query intent classification
        user_profile: Student profile data
        transcript_summary: Academic history
        sql_facts: Structured data results
        rag_snippets: Documentation snippets
        include_examples: Whether to include few-shot examples
        
    Returns:
        Complete prompt ready for LLM
    """
    prompt_parts = [get_system_prompt(intent)]
    
    if include_examples:
        examples = get_few_shot_examples(intent)
        prompt_parts.append("\n## Example Responses\n")
        for i, example in enumerate(examples, 1):
            prompt_parts.append(f"### Example {i}")
            prompt_parts.append(f"**Context:**\n{example['context']}")
            prompt_parts.append(f"**Response:**\n{example['response']}")
    
    # Add current context
    prompt_parts.append("\n## Current Request\n")
    context_prompt = create_context_prompt(
        user_question=user_question,
        user_profile=user_profile,
        transcript_summary=transcript_summary,
        sql_facts=sql_facts,
        rag_snippets=rag_snippets
    )
    prompt_parts.append(context_prompt)
    
    return "\n\n".join(prompt_parts)

# Validation prompts for grounding check
GROUNDING_CHECK_PROMPT = """Review this AI response for grounding and accuracy:

**Question**: {question}
**AI Response**: {response}
**Available Context**: {context}

Evaluate:
1. Is the response grounded in the provided context?
2. Are claims supported by evidence from the context?
3. Are citations used appropriately?
4. Does the response properly acknowledge limitations?

Return: GROUNDED or NOT_GROUNDED with brief explanation."""

def create_grounding_check_prompt(question: str, response: str, context: str) -> str:
    """Create prompt for grounding validation."""
    return GROUNDING_CHECK_PROMPT.format(
        question=question,
        response=response,
        context=context
    )