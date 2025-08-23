#!/usr/bin/env python3
"""
Test the full RAG pipeline with mock API keys to identify remaining issues.
"""

import os
import sys
import json
import tempfile
import subprocess

def test_with_mock_keys():
    """Test RAG indexer with mock API keys."""

    # Create temporary env file with mock keys
    env_content = """
DATABASE_URL=postgresql://app:app@localhost:5432/boilerai
ENABLE_RAG=1
STRICT_INGEST=1
LLM_PROVIDER=gemini
GEMINI_API_KEY=test_key_placeholder
EMBED_PROVIDER=gemini
EMBED_MODEL=text-embedding-004
VECTOR_BACKEND=qdrant
QDRANT_URL=http://localhost:6333
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
        f.write(env_content)
        temp_env = f.name

    print("🔍 Testing RAG indexer with mock API keys...")
    print(f"Using temp env file: {temp_env}")

    # Set environment
    os.environ['DATABASE_URL'] = 'postgresql://app:app@localhost:5432/boilerai'
    os.environ['ENABLE_RAG'] = '1'
    os.environ['LLM_PROVIDER'] = 'gemini'
    os.environ['GEMINI_API_KEY'] = 'test_key_placeholder'
    os.environ['EMBED_PROVIDER'] = 'gemini'
    os.environ['EMBED_MODEL'] = 'text-embedding-004'
    os.environ['VECTOR_BACKEND'] = 'qdrant'
    os.environ['QDRANT_URL'] = 'http://localhost:6333'

    try:
        # Try to run the indexer with a single file first
        result = subprocess.run([
            sys.executable, '-m', 'rag.indexer', '--dir', 'packs/CS/docs',
            '--pattern', 'cs_core.md'
        ], capture_output=True, text=True, timeout=30)

        print(f"Return code: {result.returncode}")
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)

        if result.returncode == 0:
            print("✅ RAG indexer ran successfully with mock keys")
        else:
            print("❌ RAG indexer failed")

        return result.returncode == 0

    except Exception as e:
        print(f"❌ Exception during test: {e}")
        return False
    finally:
        # Cleanup
        os.unlink(temp_env)

def test_api_endpoints():
    """Test API endpoints without starting the server."""

    # Check if we can import the API modules
    try:
        sys.path.insert(0, '.')
        from api_gateway import main
        print("✅ API gateway module imports successfully")

        # Check for common import issues
        try:
            import psycopg2
            print("✅ psycopg2 available")
        except ImportError as e:
            print(f"❌ psycopg2 import error: {e}")

        try:
            import fastapi
            print("✅ FastAPI available")
        except ImportError as e:
            print(f"❌ FastAPI import error: {e}")

        try:
            import qdrant_client
            print("✅ qdrant_client available")
        except ImportError as e:
            print(f"❌ qdrant_client import error: {e}")

        return True

    except Exception as e:
        print(f"❌ API import test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 50)
    print("🔍 TESTING REMAINING RAG-ON ISSUES")
    print("=" * 50)

    tests = [
        ("API Dependencies", test_api_endpoints),
        ("RAG Indexer with Mock Keys", test_with_mock_keys),
    ]

    passed = 0
    for test_name, test_func in tests:
        print(f"\n🧪 Testing: {test_name}")
        print("-" * 40)
        if test_func():
            passed += 1
            print(f"✅ {test_name} passed")
        else:
            print(f"❌ {test_name} failed")

    print("\n" + "=" * 50)
    print("📊 SUMMARY OF REMAINING ISSUES")
    print("=" * 50)

    if passed == len(tests):
        print("🎉 All dependency tests passed!")
        print("\n📋 Remaining steps for full functionality:")
        print("1. Add real API keys to .env")
        print("2. Run: python -m rag.indexer --dir packs/CS/docs")
        print("3. Start API: uvicorn api_gateway.main:app --host 127.0.0.1 --port 8001")
        print("4. Test with curl commands")
    else:
        print("⚠️  Some tests still failing - check output above")

    return passed == len(tests)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
