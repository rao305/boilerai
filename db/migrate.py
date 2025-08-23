#!/usr/bin/env python3
"""
Database Migration Runner for Boiler AI
Applies SQL migration files in order
"""

import os
import psycopg2
import logging
from pathlib import Path
from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_migration_files(migrations_dir: str) -> List[str]:
    """Get migration files sorted by name"""
    migration_files = []
    for file in os.listdir(migrations_dir):
        if file.endswith('.sql'):
            migration_files.append(file)
    return sorted(migration_files)

def apply_migration(conn, migration_file: str, migrations_dir: str):
    """Apply a single migration file"""
    migration_path = os.path.join(migrations_dir, migration_file)
    
    with open(migration_path, 'r') as f:
        sql_content = f.read()
    
    try:
        with conn.cursor() as cur:
            # Split by semicolon to handle multiple statements
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            for statement in statements:
                if statement:
                    cur.execute(statement)
            
            conn.commit()
            logger.info(f"✅ Applied migration: {migration_file}")
            
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Failed to apply migration {migration_file}: {e}")
        raise

def run_migrations():
    """Run all pending migrations"""
    dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
    
    try:
        conn = psycopg2.connect(dsn)
        logger.info("Connected to database")
        
        # Get migrations directory
        current_dir = Path(__file__).parent
        migrations_dir = current_dir / "migrations"
        
        if not migrations_dir.exists():
            logger.error(f"Migrations directory not found: {migrations_dir}")
            return
        
        # Get all migration files
        migration_files = get_migration_files(str(migrations_dir))
        logger.info(f"Found {len(migration_files)} migration files")
        
        # Apply each migration
        for migration_file in migration_files:
            logger.info(f"Applying migration: {migration_file}")
            apply_migration(conn, migration_file, str(migrations_dir))
        
        logger.info("🎉 All migrations completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migrations()


