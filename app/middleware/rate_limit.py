"""
Rate limiting middleware.
"""

import time
from collections import defaultdict
from typing import Callable, DefaultDict

from fastapi import HTTPException, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core import get_logger, get_settings

logger = get_logger(__name__)
settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""
    
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self.requests: DefaultDict[str, list[float]] = defaultdict(list)
        self.window_size = 60  # 1 minute window
        self.max_requests = settings.RATE_LIMIT_PER_MINUTE
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Use client IP as identifier
        if request.client:
            return request.client.host
        return "unknown"
    
    def _is_rate_limited(self, client_id: str) -> bool:
        """Check if client is rate limited."""
        now = time.time()
        window_start = now - self.window_size
        
        # Get client's request history
        client_requests = self.requests[client_id]
        
        # Remove old requests outside the window
        client_requests[:] = [req_time for req_time in client_requests if req_time > window_start]
        
        # Check if limit exceeded
        if len(client_requests) >= self.max_requests:
            return True
        
        # Add current request
        client_requests.append(now)
        return False
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)
        
        client_id = self._get_client_id(request)
        
        if self._is_rate_limited(client_id):
            logger.warning(
                "Rate limit exceeded",
                client_id=client_id,
                path=request.url.path,
                method=request.method,
            )
            
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {self.max_requests} requests per minute allowed",
                    "retry_after": self.window_size
                }
            )
        
        return await call_next(request)