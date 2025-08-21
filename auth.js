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
    // Hide all tab content - everything requires login by default
    // This will work for any new tabs added in the future
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Disable all tab buttons - this will work for any new tabs
    const allTabButtons = document.querySelectorAll('.tab-button');
    allTabButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.title = 'Login required to access this section';
    });
    
    // Hide the tab navigation section entirely when not logged in
    const tabNavigation = document.querySelector('.tab-navigation');
    if (tabNavigation) {
        tabNavigation.style.display = 'none';
    }
    
    // Hide the statistics section
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsSection.style.display = 'none';
    }
    
    // Remove any existing login screen
    const existingLoginScreen = document.getElementById('login-screen');
    if (existingLoginScreen) {
        existingLoginScreen.remove();
    }
}

// Show protected content
function showProtectedContent() {
    // Show all tab content - this will work for any new tabs added in the future
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(tab => {
        tab.style.display = '';
    });
    
    // Enable all tab buttons - this will work for any new tabs
    const allTabButtons = document.querySelectorAll('.tab-button');
    allTabButtons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.title = '';
    });
    
    // Show the tab navigation section
    const tabNavigation = document.querySelector('.tab-navigation');
    if (tabNavigation) {
        tabNavigation.style.display = '';
    }
    
    // Show the statistics section
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsSection.style.display = '';
    }
    
    // Switch to grants tab by default when logging in
    const grantsTab = document.getElementById('grants-tab');
    const grantsButton = document.querySelector('[data-tab="grants"]');
    if (grantsTab && grantsButton) {
        // Hide other tabs
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        
        // Show grants tab
        grantsTab.classList.add('active');
        grantsButton.classList.add('active');
    }
    
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
                    Welcome to the NVCA Federal Funding Database. This comprehensive resource is exclusively available 
                    to authorized NVCA members and partners. Please login to access the complete funding database.
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
                <h3 style="color: #374C6C; margin-bottom: 1rem;">Complete Federal Funding Platform</h3>
                <ul style="text-align: left; color: #595959; line-height: 1.8;">
                    <li><strong>Federal Grants:</strong> 1,000+ grant opportunities from Grants.gov</li>
                    <li><strong>Government Challenges:</strong> Innovation competitions and prize challenges</li>
                    <li><strong>SBIR/STTR Programs:</strong> Small business innovation research awards, companies, and solicitations</li>
                    <li>Advanced search and filtering capabilities across all funding types</li>
                    <li>Real-time funding statistics and analytics dashboard</li>
                    <li>Cross-linking between related opportunities and organizations</li>
                    <li>Export functionality for qualified users</li>
                    <li>Daily automated updates from federal sources</li>
                </ul>
                <p style="margin-top: 1rem; color: #374C6C; font-weight: 500;">
                    🔐 All content requires authentication to ensure data security and access control.
                </p>
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