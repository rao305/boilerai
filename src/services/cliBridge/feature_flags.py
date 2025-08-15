#!/usr/bin/env python3
"""
Feature Flags System for Hybrid AI Bridge
Manages enabling/disabling experimental features like career networking
"""

import json
import os
from typing import Dict, Any
import logging

class FeatureFlagManager:
    """Manages feature flags for experimental features"""
    
    def __init__(self, config_file: str = "feature_flags.json"):
        self.config_file = config_file
        self.flags = self._load_flags()
        self.logger = logging.getLogger(__name__)
        
    def _load_flags(self) -> Dict[str, Any]:
        """Load feature flags from file or create defaults"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load feature flags: {e}")
                
        # Default flags
        default_flags = {
            "career_networking": {
                "enabled": False,
                "description": "Clado API integration for career networking and alumni discovery",
                "added_date": "2025-07-31",
                "experimental": True
            },
            "ai_enhanced_responses": {
                "enabled": True,
                "description": "Enhanced AI responses using contextual analysis",
                "added_date": "2025-07-31",
                "experimental": False
            },
            "sql_academic_analysis": {
                "enabled": True,
                "description": "SQL-powered academic analysis and recommendations",
                "added_date": "2025-07-31",
                "experimental": False
            },
            "version": "2.0.0",
            "last_updated": "2025-07-31"
        }
        
        self._save_flags(default_flags)
        return default_flags
        
    def _save_flags(self, flags: Dict[str, Any] = None):
        """Save feature flags to file"""
        flags_to_save = flags or self.flags
        try:
            with open(self.config_file, 'w') as f:
                json.dump(flags_to_save, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save feature flags: {e}")
            
    def is_enabled(self, flag_name: str) -> bool:
        """Check if a feature flag is enabled"""
        flag = self.flags.get(flag_name)
        if isinstance(flag, dict):
            return flag.get("enabled", False)
        return bool(flag)
        
    def enable_flag(self, flag_name: str) -> bool:
        """Enable a feature flag"""
        if flag_name in self.flags:
            if isinstance(self.flags[flag_name], dict):
                self.flags[flag_name]["enabled"] = True
            else:
                self.flags[flag_name] = True
            self._save_flags()
            return True
        return False
        
    def disable_flag(self, flag_name: str) -> bool:
        """Disable a feature flag"""
        if flag_name in self.flags:
            if isinstance(self.flags[flag_name], dict):
                self.flags[flag_name]["enabled"] = False
            else:
                self.flags[flag_name] = False
            self._save_flags()
            return True
        return False
        
    def get_flag_info(self, flag_name: str) -> Dict[str, Any]:
        """Get detailed information about a flag"""
        return self.flags.get(flag_name, {})
        
    def list_flags(self) -> Dict[str, Any]:
        """List all feature flags"""
        return {k: v for k, v in self.flags.items() if k not in ["version", "last_updated"]}
        
    def toggle_career_networking(self, enable: bool) -> str:
        """Toggle career networking feature specifically"""
        flag_name = "career_networking"
        
        if enable:
            success = self.enable_flag(flag_name)
            if success:
                return "✅ Career networking (Clado API) has been ENABLED. Students can now discover alumni and professional connections."
            else:
                return "❌ Failed to enable career networking feature."
        else:
            success = self.disable_flag(flag_name)
            if success:
                return "⚠️ Career networking (Clado API) has been DISABLED. Only academic advising features are active."
            else:
                return "❌ Failed to disable career networking feature."

    def get_career_networking_status(self) -> str:
        """Get current status of career networking feature"""
        is_enabled = self.is_enabled("career_networking")
        status = "ENABLED" if is_enabled else "DISABLED"
        
        flag_info = self.get_flag_info("career_networking")
        description = flag_info.get("description", "Career networking feature")
        
        return f"🔧 Career networking (Clado API) is currently: {status}\n   {description}"

def is_career_networking_enabled() -> bool:
    """Quick check if career networking is enabled"""
    try:
        return get_feature_manager().is_enabled("career_networking")
    except Exception:
        # If there's any error accessing feature flags, default to disabled for safety
        return False

# Global feature flag manager instance
_feature_manager = None

def get_feature_manager() -> FeatureFlagManager:
    """Get the global feature flag manager instance"""
    global _feature_manager
    if _feature_manager is None:
        _feature_manager = FeatureFlagManager()
    return _feature_manager