#!/usr/bin/env python3
"""
Simple test script to verify RAG-ON setup without requiring API keys.
Tests basic database connectivity and data loading.
"""

import os
import sys
import psycopg2
from pathlib import Path

def test_database_connection():
    """Test database connection and basic queries."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="app",
            password="app",
            database="boilerai"
        )
        print("✅ Database connection successful")

        cursor = conn.cursor()

        # Test basic counts
        cursor.execute("SELECT count(*) FROM courses WHERE major_id='CS'")
        cs_courses = cursor.fetchone()[0]
        print(f"✅ CS courses loaded: {cs_courses}")

        cursor.execute("SELECT count(*) FROM tracks WHERE major_id='CS'")
        cs_tracks = cursor.fetchone()[0]
        print(f"✅ CS tracks loaded: {cs_tracks}")

        cursor.execute("SELECT count(*) FROM prereqs WHERE major_id='CS'")
        cs_prereqs = cursor.fetchone()[0]
        print(f"✅ CS prerequisites loaded: {cs_prereqs}")

        # Test course lookup
        cursor.execute("SELECT title, credits FROM courses WHERE course_id='CS18200'")
        course = cursor.fetchone()
        if course:
            print(f"✅ CS18200 found: {course[0]} ({course[1]} credits)")
        else:
            print("❌ CS18200 not found")

        # Test track lookup
        cursor.execute("SELECT track_name FROM tracks WHERE track_id='machine_intelligence'")
        track = cursor.fetchone()
        if track:
            print(f"✅ Machine Intelligence track found: {track[0]}")
        else:
            print("❌ Machine Intelligence track not found")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_document_structure():
    """Test that the document structure is correct."""
    docs_dir = Path("packs/CS/docs")

    if not docs_dir.exists():
        print("❌ packs/CS/docs directory not found")
        return False

    # Check core documents exist
    core_docs = [
        "cs_core.md",
        "track_mi.md",
        "track_se.md",
        "advising_policies.md"
    ]

    for doc in core_docs:
        doc_path = docs_dir / doc
        if doc_path.exists():
            print(f"✅ {doc} exists ({doc_path.stat().st_size} bytes)")
        else:
            print(f"❌ {doc} missing")

    # Check course_pages directory
    course_pages_dir = docs_dir / "course_pages"
    if course_pages_dir.exists():
        course_files = list(course_pages_dir.glob("*.md"))
        print(f"✅ course_pages directory exists with {len(course_files)} course files")

        # Check for some key courses
        key_courses = ["CS18000.md", "CS18200.md", "CS25200.md"]
        for course in key_courses:
            course_path = course_pages_dir / course
            if course_path.exists():
                print(f"✅ {course} exists")
            else:
                print(f"❌ {course} missing")
    else:
        print("❌ course_pages directory missing")

    return True

def test_rag_index():
    """Test that the RAG index was created."""
    index_path = Path("rag_index.json")

    if index_path.exists():
        print(f"✅ RAG index exists ({index_path.stat().st_size} bytes)")

        # Check index content
        import json
        try:
            with open(index_path, 'r') as f:
                index = json.load(f)

            docs_count = index.get('stats', {}).get('total_documents', 0)
            chunks_count = index.get('stats', {}).get('total_chunks', 0)
            tokens_count = index.get('stats', {}).get('total_tokens', 0)

            print(f"✅ Index contains {docs_count} documents")
            print(f"✅ Index contains {chunks_count} chunks")
            print(f"✅ Index contains {tokens_count:,} tokens")

            return True
        except Exception as e:
            print(f"❌ Error reading RAG index: {e}")
            return False
    else:
        print("❌ RAG index not found")
        return False

def test_services():
    """Test that required services are running."""
    import subprocess

    # Test PostgreSQL
    try:
        result = subprocess.run([
            "pg_isready", "-h", "localhost", "-U", "app", "-d", "boilerai"
        ], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ PostgreSQL service is running")
        else:
            print("❌ PostgreSQL service not accessible")
    except:
        print("❌ PostgreSQL connection test failed")

    # Test Qdrant (simple curl test)
    try:
        result = subprocess.run([
            "curl", "-f", "http://localhost:6333/health"
        ], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Qdrant service is running")
        else:
            print("❌ Qdrant service not accessible")
    except:
        print("❌ Qdrant connection test failed")

def main():
    """Run all tests."""
    print("=" * 50)
    print("🧪 RAG-ON SETUP VERIFICATION")
    print("=" * 50)

    tests = [
        ("Database Connection & Data Loading", test_database_connection),
        ("Document Structure", test_document_structure),
        ("RAG Index", test_rag_index),
        ("Service Availability", test_services),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        print("-" * 40)
        if test_func():
            passed += 1

    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("🎉 All tests passed! RAG-ON setup is complete.")
        print("\nNext steps:")
        print("1. Add your API keys to .env file")
        print("2. Run: python -m rag.indexer --dir packs/CS/docs")
        print("3. Start API: uvicorn api_gateway.main:app --host 127.0.0.1 --port 8001")
        print("4. Test with curl commands from the checklist")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
