#!/usr/bin/env python3
"""
Simple Clado API Client - Works with just Clado API key
Direct WebSocket connection without OpenAI processing
"""

import asyncio
import json
import websockets
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class SimpleCladoClient:
    """Simple Clado API client using WebSocket connection"""
    
    def __init__(self, clado_api_key: str):
        self.clado_api_key = clado_api_key
        self.websocket_url = "wss://api.clado.ai/api/search/ws"
        self.timeout = 30  # seconds
    
    async def search_professionals(self, query: str) -> str:
        """Search for professionals using Clado API"""
        
        try:
            logger.info(f"🔍 Searching for: {query}")
            
            # Execute search via WebSocket
            raw_results = await self._execute_websocket_search(query)
            
            # Format results simply
            return self._format_results(raw_results, query)
            
        except Exception as e:
            logger.error(f"Clado search error: {e}")
            return self._handle_search_error(query, str(e))
    
    async def _execute_websocket_search(self, query: str) -> List[Dict]:
        """Execute search via Clado WebSocket API"""
        
        try:
            headers = [
                ("Authorization", f"Bearer {self.clado_api_key}"),
                ("Content-Type", "application/json")
            ]
            
            async with websockets.connect(
                self.websocket_url,
                additional_headers=headers
            ) as websocket:
                
                # Send search request
                search_message = {
                    "type": "search",
                    "query": query,
                    "filters": {
                        "limit": 10,
                        "include_profile": True
                    }
                }
                
                await websocket.send(json.dumps(search_message))
                
                # Wait for response
                response = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=self.timeout
                )
                
                result = json.loads(response)
                
                # Extract results from response
                if result.get("type") == "search_results":
                    return result.get("data", [])
                elif result.get("type") == "error":
                    raise Exception(f"Clado API error: {result.get('message', 'Unknown error')}")
                else:
                    return []
                    
        except asyncio.TimeoutError:
            raise Exception("Search request timed out")
        except websockets.exceptions.ConnectionClosed:
            raise Exception("Connection to Clado API was closed")
        except Exception as e:
            raise Exception(f"WebSocket search failed: {str(e)}")
    
    def _format_results(self, raw_results: List[Dict], query: str) -> str:
        """Format search results into a readable response"""
        
        if not raw_results:
            return f"""I searched for professionals matching your query "{query}" but didn't find specific matches in the database right now. 

This could mean:
• The specific combination of criteria is rare
• Try broadening your search terms
• Consider related fields or companies

For immediate networking, I recommend:
• LinkedIn search for Purdue CS alumni
• Attending CS department networking events
• Reaching out to professors for industry connections
• Joining Purdue CS professional groups"""

        # Format results
        result_count = len(raw_results)
        response = f"I found {result_count} professional{'s' if result_count != 1 else ''} matching your search for '{query}':\n\n"
        
        for i, person in enumerate(raw_results[:5], 1):  # Show top 5
            name = person.get('name', 'Professional')
            title = person.get('title', 'Professional')
            company = person.get('company', 'Company')
            location = person.get('location', 'Location')
            
            response += f"{i}. {name}\n"
            response += f"   {title} at {company}\n"
            response += f"   Location: {location}\n"
            
            if person.get('profile_url'):
                response += f"   Profile: {person['profile_url']}\n"
            response += "\n"
        
        if result_count > 5:
            response += f"... and {result_count - 5} more professionals available.\n\n"
        
        response += "💡 Next steps:\n"
        response += "• Review their profiles and background\n"
        response += "• Look for common connections or interests\n"
        response += "• Craft personalized connection requests\n"
        response += "• Mention your Purdue CS connection when reaching out"
        
        return response
    
    def _handle_search_error(self, query: str, error_msg: str) -> str:
        """Handle search errors gracefully"""
        
        return f"""I encountered an issue while searching for professionals matching "{query}". 

Technical details: {error_msg}

This might be due to:
• Temporary connectivity issues with the professional database
• High search volume or rate limiting
• API service maintenance

Please try:
• Rephrasing your search query
• Trying again in a few minutes
• Using more general search terms

In the meantime, you can also:
• Search LinkedIn for Purdue CS alumni
• Contact the CS Career Services office
• Attend upcoming department networking events"""

def create_simple_clado_client() -> Optional[SimpleCladoClient]:
    """Create simple Clado client if API key is available"""
    
    clado_api_key = os.environ.get("CLADO_API_KEY")
    
    if not clado_api_key:
        return None
    
    return SimpleCladoClient(clado_api_key)

def search_professionals_simple(query: str) -> str:
    """Simple synchronous wrapper for professional search"""
    
    client = create_simple_clado_client()
    if not client:
        return "Career networking is currently unavailable because the Clado API key isn't configured. Please contact support for assistance."
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(client.search_professionals(query))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Simple Clado search error: {e}")
        return f"I encountered an issue while searching for professionals. Error: {str(e)}. Please try rephrasing your query or check back in a few minutes."