import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

/**
 * GET /dashboard - Protected dashboard page
 */
router.get('/dashboard', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Purdue Auth</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: #f8f9fa;
                color: #333;
                line-height: 1.6;
            }
            
            .header {
                background: linear-gradient(135deg, #DAA520 0%, #B8860B 100%);
                color: white;
                padding: 1rem 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .header-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .logo {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.2rem;
                font-weight: 600;
            }
            
            .user-menu {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .user-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 1.1rem;
            }
            
            .logout-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s ease;
            }
            
            .logout-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem 1rem;
            }
            
            .welcome-section {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .welcome-title {
                font-size: 1.8rem;
                color: #DAA520;
                margin-bottom: 0.5rem;
            }
            
            .welcome-subtitle {
                color: #666;
                font-size: 1.1rem;
                margin-bottom: 1.5rem;
            }
            
            .cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            }
            
            .card:hover {
                transform: translateY(-2px);
            }
            
            .card h3 {
                color: #DAA520;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .card-content {
                color: #666;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .info-label {
                font-size: 0.85rem;
                color: #888;
                font-weight: 500;
            }
            
            .info-value {
                font-weight: 600;
                color: #333;
            }
            
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            
            .status-active {
                background: #d4edda;
                color: #155724;
            }
            
            .footer {
                text-align: center;
                padding: 2rem 1rem;
                color: #666;
                font-size: 0.9rem;
            }
            
            @media (max-width: 768px) {
                .header-content {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .container {
                    padding: 1rem;
                }
                
                .welcome-section {
                    padding: 1.5rem;
                }
            }
        </style>
    </head>
    <body>
        <header class="header">
            <div class="header-content">
                <div class="logo">
                    🚀 Purdue Auth Dashboard
                </div>
                <div class="user-menu">
                    <div class="user-info">
                        <div class="avatar">
                            ${user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <div>
                            <div style="font-weight: 500;">${user.name || 'User'}</div>
                            <div style="font-size: 0.85rem; opacity: 0.9;">${user.email}</div>
                        </div>
                    </div>
                    <button class="logout-btn" onclick="logout()">Sign Out</button>
                </div>
            </div>
        </header>

        <main class="container">
            <div class="welcome-section">
                <h1 class="welcome-title">Welcome back, ${user.name?.split(' ')[0] || 'User'}! 👋</h1>
                <p class="welcome-subtitle">
                    You're successfully authenticated with Purdue University's secure sign-in system.
                </p>
                <div class="status-indicator status-active">
                    ✅ Authenticated
                </div>
            </div>

            <div class="cards-grid">
                <div class="card">
                    <h3>📋 Your Profile</h3>
                    <div class="card-content">
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Email</span>
                                <span class="info-value">${user.email}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Role</span>
                                <span class="info-value">${user.profile?.role || 'Student'}</span>
                            </div>
                            ${user.profile?.department ? `
                            <div class="info-item">
                                <span class="info-label">Department</span>
                                <span class="info-value">${user.profile.department}</span>
                            </div>
                            ` : ''}
                            ${user.profile?.year ? `
                            <div class="info-item">
                                <span class="info-label">Year</span>
                                <span class="info-value">${user.profile.year}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>🔐 Security Info</h3>
                    <div class="card-content">
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Last Sign-in</span>
                                <span class="info-value">
                                    ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'First time'}
                                </span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Account Created</span>
                                <span class="info-value">
                                    ${new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Auth Provider</span>
                                <span class="info-value">Microsoft Azure AD</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3>🛠️ Quick Actions</h3>
                    <div class="card-content">
                        <p>Manage your authentication settings and preferences.</p>
                        <div style="margin-top: 1rem;">
                            <button onclick="updateProfile()" style="background: #DAA520; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-right: 0.5rem;">
                                Update Profile
                            </button>
                            <button onclick="viewAuditLog()" style="background: #0078d4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                                View Activity
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="footer">
            <p>🔒 Secured by Purdue University Authentication Service</p>
            <p style="margin-top: 0.5rem; font-size: 0.8rem;">
                This system is for authorized users only. All activity is monitored and logged.
            </p>
        </footer>

        <script>
            async function logout() {
                try {
                    const response = await fetch('/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        window.location.href = '/auth/signin';
                    } else {
                        alert('Error during logout. Please try again.');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Error during logout. Please try again.');
                }
            }

            function updateProfile() {
                alert('Profile update functionality would be implemented here.');
            }

            function viewAuditLog() {
                alert('Audit log viewing functionality would be implemented here.');
            }

            // Check authentication status periodically
            setInterval(async () => {
                try {
                    const response = await fetch('/auth/status', {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    
                    if (!data.authenticated) {
                        window.location.href = '/auth/signin';
                    }
                } catch (error) {
                    console.error('Auth check error:', error);
                }
            }, 5 * 60 * 1000); // Check every 5 minutes
        </script>
    </body>
    </html>
  `);
});

/**
 * GET / - Root redirect to dashboard or signin
 */
router.get('/', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/signin');
  }
});

export default router;