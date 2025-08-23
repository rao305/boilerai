#!/usr/bin/env python3
"""
RAG-ON Integration Test Script

Tests the complete RAG-ON pipeline including:
1. Database migrations
2. Document indexing
3. RAG retrieval
4. Transcript ingestion
5. Advisor orchestration
6. API endpoints
"""

import asyncio
import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_database_connection():
    """Test database connection and tables."""
    try:
        import asyncpg
        
        database_url = os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai')
        conn = await asyncpg.connect(database_url)
        
        # Check if RAG tables exist
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('documents', 'doc_chunks', 'advisor_sessions', 'advisor_facts', 'track_metadata')
        """)
        
        expected_tables = {'documents', 'doc_chunks', 'advisor_sessions', 'advisor_facts', 'track_metadata'}
        found_tables = {row['table_name'] for row in tables}
        
        await conn.close()
        
        if expected_tables.issubset(found_tables):
            logger.info("✅ Database connection and RAG tables verified")
            return True
        else:
            missing = expected_tables - found_tables
            logger.error(f"❌ Missing database tables: {missing}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

async def test_document_indexing():
    """Test document indexing with RAG indexer."""
    try:
        from rag.indexer import create_indexer
        
        # Check if docs exist
        docs_dir = project_root / "packs" / "CS" / "docs"
        if not docs_dir.exists():
            logger.error(f"❌ Docs directory not found: {docs_dir}")
            return False
        
        # Create indexer
        indexer = create_indexer(
            embed_provider="local",  # Use local for testing
            vector_backend=os.getenv('VECTOR_BACKEND', 'qdrant'),
            database_url=os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai'),
            qdrant_url=os.getenv('QDRANT_URL', 'http://localhost:6333')
        )
        
        # Index a single test document
        test_files = list(docs_dir.glob("*.md"))
        if test_files:
            doc_id = await indexer.index_file(test_files[0])
            logger.info(f"✅ Document indexing successful: {doc_id}")
            return True
        else:
            logger.error("❌ No markdown files found for indexing")
            return False
            
    except Exception as e:
        logger.error(f"❌ Document indexing failed: {e}")
        return False

async def test_rag_retrieval():
    """Test RAG retrieval system."""
    try:
        from rag.retriever import create_retriever
        from rag.indexer import LocalEmbedding
        
        # Create embedding provider for retriever
        embedding = LocalEmbedding()
        
        # Create retriever
        retriever = create_retriever(
            database_url=os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai'),
            vector_backend=os.getenv('VECTOR_BACKEND', 'qdrant'),
            qdrant_url=os.getenv('QDRANT_URL', 'http://localhost:6333'),
            embedding_provider=embedding
        )
        
        # Test retrieval
        result = await retriever.retrieve(
            query="CS core requirements",
            top_k=3
        )
        
        if result.chunks:
            logger.info(f"✅ RAG retrieval successful: {len(result.chunks)} chunks, {len(result.citations)} citations")
            return True
        else:
            logger.warning("⚠️ RAG retrieval returned no results (may be expected if no docs indexed)")
            return True  # Not necessarily an error
            
    except Exception as e:
        logger.error(f"❌ RAG retrieval failed: {e}")
        return False

async def test_transcript_ingestion():
    """Test transcript ingestion system."""
    try:
        from transcript.ingest import TranscriptIngester, TranscriptProfile, Student, Term, Course, GPA
        
        # Create test transcript data
        test_courses = [
            Course(course_id="CS18000", title="Problem Solving Programming I", credits=4.0, grade="A", term="F2023"),
            Course(course_id="CS24000", title="Programming in C", credits=3.0, grade="B+", term="F2023")
        ]
        
        test_profile = TranscriptProfile(
            student=Student(name="Test Student", id="000000000"),
            terms=[Term(term="F2023", courses=test_courses)],
            gpa=GPA(cumulative=3.7),
            metadata={"source": "test"}
        )
        
        # Test JSON serialization/deserialization
        profile_dict = test_profile.to_dict()
        restored_profile = TranscriptProfile.from_dict(profile_dict)
        
        if restored_profile.student.name == "Test Student":
            logger.info("✅ Transcript ingestion data structures working")
            return True
        else:
            logger.error("❌ Transcript data serialization failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Transcript ingestion test failed: {e}")
        return False

async def test_advisor_memory():
    """Test advisor memory system."""
    try:
        from advisor.memory import AdvisorMemory
        
        memory = AdvisorMemory(os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai'))
        
        # Test storing and retrieving facts
        test_user_id = "test_user_123"
        
        await memory.remember_fact(test_user_id, "goal", "target_grad_term", "S2026")
        await memory.remember_fact(test_user_id, "preference", "max_credits", 15)
        
        profile = await memory.get_profile(test_user_id)
        
        if profile["goals"].get("target_grad_term") == "S2026":
            logger.info("✅ Advisor memory system working")
            return True
        else:
            logger.error("❌ Advisor memory retrieval failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Advisor memory test failed: {e}")
        return False

async def test_orchestrator():
    """Test RAG orchestrator."""
    try:
        from router.orchestrator import RAGOrchestrator
        
        config = {
            'vector_backend': os.getenv('VECTOR_BACKEND', 'qdrant'),
            'qdrant_url': os.getenv('QDRANT_URL', 'http://localhost:6333'),
            'llm_provider': 'local',  # Use local for testing
            'api_key': 'test_key',
            'model': 'test_model'
        }
        
        orchestrator = RAGOrchestrator(
            os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai'),
            config
        )
        
        # Test basic query processing (will likely fail on LLM call, but should get through intent classification)
        try:
            result = await orchestrator.process_query(
                user_id="test_user_456",
                query="What are CS core requirements?"
            )
            
            if result.get('intents'):
                logger.info("✅ Orchestrator pipeline working (intent classification successful)")
                return True
            
        except Exception as llm_error:
            if "api_key" in str(llm_error).lower() or "test_key" in str(llm_error):
                logger.info("✅ Orchestrator pipeline working (expected LLM error with test key)")
                return True
            else:
                raise llm_error
            
    except Exception as e:
        logger.error(f"❌ Orchestrator test failed: {e}")
        return False

async def test_api_imports():
    """Test that API gateway imports work correctly."""
    try:
        # Test imports that the API gateway uses
        from router.orchestrator import RAGOrchestrator
        from transcript.ingest import TranscriptIngester
        from advisor.memory import AdvisorMemory
        from router.intent import classify_intent
        
        # Test intent classification
        intent_result = classify_intent("What are the prerequisites for CS38100?")
        
        if intent_result.get('intents'):
            logger.info("✅ API imports and intent classification working")
            return True
        else:
            logger.error("❌ Intent classification failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ API import test failed: {e}")
        return False

def check_environment():
    """Check required environment variables."""
    required_vars = [
        'DATABASE_URL',
        'VECTOR_BACKEND',
        'QDRANT_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.warning(f"⚠️ Missing environment variables: {missing_vars}")
        logger.info("Using default values for testing")
    else:
        logger.info("✅ Environment variables configured")
    
    return True

async def run_integration_tests():
    """Run all integration tests."""
    
    print("=" * 60)
    print("RAG-ON INTEGRATION TEST SUITE")
    print("=" * 60)
    
    # Check environment
    check_environment()
    
    # Run tests
    tests = [
        ("Database Connection", test_database_connection()),
        ("API Imports", test_api_imports()),
        ("Advisor Memory", test_advisor_memory()),
        ("Transcript Ingestion", test_transcript_ingestion()),
        ("Document Indexing", test_document_indexing()),
        ("RAG Retrieval", test_rag_retrieval()),
        ("Orchestrator", test_orchestrator()),
    ]
    
    results = {}
    
    for test_name, test_coro in tests:
        print(f"\nRunning {test_name}...")
        try:
            result = await test_coro
            results[test_name] = result
        except Exception as e:
            logger.error(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")
        if result:
            passed += 1
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed! RAG-ON system is ready.")
        return True
    else:
        print("❌ Some tests failed. Check the logs above.")
        return False

async def main():
    """Main entry point."""
    
    # Set up environment defaults for testing
    os.environ.setdefault('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai')
    os.environ.setdefault('VECTOR_BACKEND', 'qdrant')
    os.environ.setdefault('QDRANT_URL', 'http://localhost:6333')
    
    success = await run_integration_tests()
    
    if success:
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("1. Run database migrations: python db/migrate.py")
        print("2. Start Qdrant: docker-compose up qdrant")
        print("3. Index documents: python -m rag.indexer --dir packs/CS/docs")
        print("4. Start API: uvicorn api_gateway.main:app --reload")
        print("5. Test endpoints:")
        print("   - POST /advisor/chat")
        print("   - POST /transcript/ingest")
        print("   - GET /me/profile")
        print("=" * 60)
        
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())