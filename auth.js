// Enhanced NVCA Authentication Module with Login Screen
// Author: Shiloh TD
// This replaces the auth.js file to require login before viewing grants

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    // Hide main content initially
    const protectedContent = document.querySelector('.stats-section, .filters-section, .grants-section');
    if (protectedContent) {
        hideProtectedContent();
    }
    
    // Check authentication status
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            handleAuthChange(user);
        });
        
        window.netlifyIdentity.on('login', user => {
            handleAuthChange(user);
            window.netlifyIdentity.close();
        });
        
        window.netlifyIdentity.on('logout', () => {
            handleAuthChange(null);
        });
        
        // Initialize
        window.netlifyIdentity.init();
    } else {
        console.error('Netlify Identity widget not loaded');
        showLoginRequired();
    }
});

// Setup auth buttons
const authBtn = document.getElementById('auth-btn');
const logoutBtn = document.getElementById('logout-btn');

if (authBtn) {
    authBtn.addEventListener('click', () => {
        window.netlifyIdentity.open();
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            window.netlifyIdentity.logout();
        }
    });
}

// Handle authentication state changes
function handleAuthChange(user) {
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    
    if (user) {
        // User is logged in
        showProtectedContent();
        
        // Hide login button, show logout button
        if (authBtn) {
            authBtn.style.display = 'none';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
        
        if (userInfo) {
            userInfo.textContent = `Welcome, ${user.user_metadata.full_name || user.email}`;
            userInfo.style.display = 'inline';
        }
        
        // Load grants data after authentication
        if (typeof loadGrantsData === 'function') {
            loadGrantsData();
        }
    } else {
        // User is not logged in
        hideProtectedContent();
        showLoginRequired();
        
        // Show login button, hide logout button
        if (authBtn) {
            authBtn.style.display = 'inline-block';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }
}

// Hide protected content
function hideProtectedContent() {
    // Hide all main sections
    const sections = ['.stats-section', '.filters-section', '.grants-section'];
    sections.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Remove any existing login screen
    const existingLoginScreen = document.getElementById('login-screen');
    if (existingLoginScreen) {
        existingLoginScreen.remove();
    }
}

// Show protected content
function showProtectedContent() {
    // Show all main sections
    const sections = ['.stats-section', '.filters-section', '.grants-section'];
    sections.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = '';
        }
    });
    
    // Remove login screen
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.remove();
    }
}

// Show login required screen
function showLoginRequired() {
    // Remove any existing login screen
    const existingLoginScreen = document.getElementById('login-screen');
    if (existingLoginScreen) {
        existingLoginScreen.remove();
    }
    
    // Create login screen
    const loginScreen = document.createElement('div');
    loginScreen.id = 'login-screen';
    loginScreen.style.cssText = `
        padding: 4rem 2rem;
        text-align: center;
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    `;
    
    loginScreen.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: white; padding: 3rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #374C6C; margin-bottom: 1.5rem; font-size: 2rem;">
                    🔒 Authentication Required
                </h2>
                <p style="color: #595959; margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6;">
                    Welcome to the NVCA Federal Grants Database. This resource is exclusively available to authorized users.
                    Please login to access the grants database.
                </p>
                <button onclick="window.netlifyIdentity.open()" 
                        style="background: #5CB5B5; color: white; border: none; padding: 1rem 2rem; 
                               font-size: 1.1rem; border-radius: 4px; cursor: pointer; 
                               transition: background 0.3s ease;">
                    Login to Access Grants
                </button>
                <p style="margin-top: 2rem; color: #595959; font-size: 0.9rem;">
                    Don't have an account? Click login and select "Sign Up" to request access.
                </p>
            </div>
            
            <div style="margin-top: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
                <h3 style="color: #374C6C; margin-bottom: 1rem;">What's Inside?</h3>
                <ul style="text-align: left; color: #595959; line-height: 1.8;">
                    <li>Over 1,000 federal grant opportunities</li>
                    <li>Advanced search and filtering capabilities</li>
                    <li>Real-time funding statistics</li>
                    <li>Export functionality for qualified users</li>
                    <li>Daily updates from Grants.gov</li>
                </ul>
            </div>
        </div>
    `;
    
    // Insert after header
    const header = document.querySelector('.header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(loginScreen, header.nextSibling);
    } else {
        document.body.appendChild(loginScreen);
    }
}

// Auto-open login widget if not authenticated
setTimeout(() => {
    const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
    if (!user) {
        // Optionally auto-open the login widget
        // window.netlifyIdentity.open();
    }
}, 1000);