import React, { useState } from 'react';
import { useMicrosoftAuth } from '@/contexts/MicrosoftAuthContext';
import { sessionManager } from '@/utils/sessionManager';

/**
 * USER SESSION CONTROL COMPONENT
 * Provides secure user switching and session management controls
 * Ensures clean data isolation between different user sessions
 */

export const UserSessionControl: React.FC = () => {
  const { user, logout, switchUser, sessionId } = useMicrosoftAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!user || !sessionId) {
    return null;
  }

  const handleSwitchUser = async () => {
    setIsConfirming(false);
    setIsMenuOpen(false);
    await switchUser();
  };

  const handleLogout = async () => {
    setIsConfirming(false);
    setIsMenuOpen(false);
    await logout();
  };

  const getSessionInfo = () => {
    const session = sessionManager.getCurrentSession();
    if (!session) return null;
    
    return {
      createdAt: new Date(session.createdAt).toLocaleString(),
      lastActivity: new Date(session.lastActivity).toLocaleString(),
      sessionId: session.sessionId.substring(0, 8) + '...',
    };
  };

  const sessionInfo = getSessionInfo();

  return (
    <div className="relative">
      {/* User Avatar/Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <div className="text-xs text-green-600 mt-1">✅ Secure Session Active</div>
              </div>
            </div>
          </div>

          {/* Session Information */}
          {sessionInfo && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Session Information</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Session ID: <span className="font-mono">{sessionInfo.sessionId}</span></div>
                <div>Created: {sessionInfo.createdAt}</div>
                <div>Last Activity: {sessionInfo.lastActivity}</div>
              </div>
            </div>
          )}

          {/* Security Features */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-xs font-medium text-gray-700 mb-2">🔒 Security Features Active</h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>✅ Encrypted session storage</li>
              <li>✅ Isolated user data</li>
              <li>✅ Automatic session cleanup</li>
              <li>✅ Cross-user data protection</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => setIsConfirming('switch')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Switch User</span>
            </button>
            
            <button
              onClick={() => setIsConfirming('logout')}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isConfirming === 'switch' ? 'Switch User' : 'Sign Out'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isConfirming === 'switch' 
                    ? 'This will securely clear your current session and allow you to sign in as a different user. All your data will remain isolated and secure.'
                    : 'This will end your session and clear all your data from this device. You will need to sign in again to access your account.'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <div>🔒 Your session data will be securely cleared</div>
              <div>🛡️ No data will be shared with other users</div>
              <div>♻️ Fresh session will be created for next login</div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsConfirming(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={isConfirming === 'switch' ? handleSwitchUser : handleLogout}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                {isConfirming === 'switch' ? 'Switch User' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default UserSessionControl;