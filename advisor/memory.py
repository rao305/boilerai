"""
Advisor Memory System for contextual awareness.
"""

import asyncio
import asyncpg
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

class AdvisorMemory:
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    async def remember_fact(self, user_id: str, kind: str, key: str, value: Any, 
                           confidence: float = 1.0, source: str = "user") -> bool:
        """Store or update a fact about the user."""
        conn = await asyncpg.connect(self.database_url)
        try:
            await conn.execute("""
                INSERT INTO advisor_facts (user_id, kind, key, value, confidence, source)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, kind, key) DO UPDATE SET
                    value = EXCLUDED.value,
                    confidence = EXCLUDED.confidence,
                    source = EXCLUDED.source,
                    updated_at = now()
            """, user_id, kind, key, json.dumps(value), confidence, source)
            return True
        except Exception as e:
            print(f"Error storing fact: {e}")
            return False
        finally:
            await conn.close()
    
    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        """Get complete user profile including transcript and goals."""
        conn = await asyncpg.connect(self.database_url)
        try:
            # Get all facts for user
            rows = await conn.fetch("""
                SELECT kind, key, value, confidence, updated_at
                FROM advisor_facts
                WHERE user_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            
            profile = {
                "user_id": user_id,
                "transcript": None,
                "goals": {},
                "preferences": {},
                "facts": {}
            }
            
            for row in rows:
                kind = row['kind']
                key = row['key']
                value = json.loads(row['value']) if row['value'] else None
                
                if kind == "transcript":
                    profile["transcript"] = value
                elif kind == "goal":
                    profile["goals"][key] = value
                elif kind == "preference":
                    profile["preferences"][key] = value
                else:
                    if kind not in profile["facts"]:
                        profile["facts"][kind] = {}
                    profile["facts"][kind][key] = value
            
            return profile
            
        finally:
            await conn.close()
    
    async def session_rollup(self, session_id: str, delta: Dict[str, Any]) -> str:
        """Create session summary from conversation delta."""
        # Simple summary - in production would use LLM
        summary_parts = []
        
        if delta.get('topics_discussed'):
            summary_parts.append(f"Topics: {', '.join(delta['topics_discussed'])}")
        
        if delta.get('questions_asked'):
            summary_parts.append(f"Questions: {len(delta['questions_asked'])}")
        
        if delta.get('new_facts'):
            summary_parts.append(f"New facts learned: {len(delta['new_facts'])}")
        
        summary = "; ".join(summary_parts) if summary_parts else "General conversation"
        
        # Store session summary
        conn = await asyncpg.connect(self.database_url)
        try:
            await conn.execute("""
                UPDATE advisor_sessions 
                SET summary = $1, ended_at = now()
                WHERE id = $2
            """, summary, session_id)
        except Exception:
            pass
        finally:
            await conn.close()
        
        return summary