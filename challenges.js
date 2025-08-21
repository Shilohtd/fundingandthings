// Challenge.gov Integration JavaScript
// Handles the challenges tab functionality

let challengesData = [];
let filteredChallenges = [];
let currentChallengePage = 1;
const challengeItemsPerPage = 20;

// Initialize challenge functionality
function initializeChallenges() {
    setupTabNavigation();
    setupChallengeEventListeners();
    loadChallengesData();
}

// Setup tab navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load data for the active tab
            if (targetTab === 'challenges' && challengesData.length === 0) {
                loadChallengesData();
            }
        });
    });
}

// Setup challenge event listeners
function setupChallengeEventListeners() {
    // Search
    const searchBtn = document.getElementById('challenge-search-btn');
    const searchInput = document.getElementById('challenge-search-input');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', filterChallenges);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filterChallenges();
        });
    }
    
    // Filters
    const filterElements = [
        'challenge-filter-agency',
        'challenge-filter-status', 
        'challenge-filter-type',
        'challenge-filter-prize'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterChallenges);
        }
    });
    
    // Clear filters
    const clearBtn = document.getElementById('challenge-clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearChallengeFilters);
    }
    
    // Export
    const exportBtn = document.getElementById('challenge-export-results');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportChallenges);
    }
}

// Load challenges data
async function loadChallengesData() {
    try {
        // Try to load live data first, fall back to sample data
        try {
            const response = await fetch('challenges_data.json');
            if (response.ok) {
                challengesData = await response.json();
                console.log(`Loaded ${challengesData.length} live challenges`);
            } else {
                throw new Error('Live data not available');
            }
        } catch (liveDataError) {
            console.log('Live challenge data not available, using sample data');
            challengesData = getSampleChallenges();
            console.log(`Loaded ${challengesData.length} sample challenges`);
        }
        
        filteredChallenges = [...challengesData];
        
        updateChallengeStatistics();
        populateChallengeFilters();
        updateChallengeTable();
        updateChallengeResultsCount();
        
    } catch (error) {
        console.error('Error loading challenges data:', error);
        showError('Failed to load challenges data');
    }
}

// Get sample challenges data
function getSampleChallenges() {
    return [
        {
            id: "innovation_challenge_2025",
            title: "Federal Innovation Challenge 2025",
            agency: "General Services Administration",
            description: "Seeking innovative solutions to improve government services and citizen experience through technology.",
            source: "challenge.gov",
            status: "Active",
            submission_deadline: "2025-12-31",
            prize_total: 100000,
            prize_description: "$100,000 total prize pool",
            challenge_type: "Innovation",
            post_date: "2025-01-01",
            website_url: "https://www.challenge.gov/challenge/innovation-2025"
        },
        {
            id: "climate_solutions_competition",
            title: "Climate Solutions Competition",
            agency: "Department of Energy",
            description: "Competition for breakthrough technologies and approaches to address climate change and promote clean energy solutions.",
            source: "challenge.gov",
            status: "Active",
            submission_deadline: "2025-10-15",
            prize_total: 250000,
            prize_description: "$250,000 grand prize",
            challenge_type: "Technology",
            post_date: "2025-08-01",
            website_url: "https://www.challenge.gov/challenge/climate-solutions"
        },
        {
            id: "cybersecurity_challenge",
            title: "Cybersecurity Innovation Challenge",
            agency: "Department of Homeland Security",
            description: "Developing next-generation cybersecurity tools and techniques to protect critical infrastructure.",
            source: "challenge.gov",
            status: "Active",
            submission_deadline: "2025-09-30",
            prize_total: 150000,
            prize_description: "$150,000 in prizes",
            challenge_type: "Cybersecurity",
            post_date: "2025-07-15",
            website_url: "https://www.challenge.gov/challenge/cybersecurity"
        },
        {
            id: "smart_cities_design",
            title: "Smart Cities Design Challenge",
            agency: "Department of Transportation",
            description: "Design innovative solutions for urban transportation and infrastructure challenges in modern cities.",
            source: "challenge.gov",
            status: "Active",
            submission_deadline: "2025-11-20",
            prize_total: 75000,
            prize_description: "$75,000 in total awards",
            challenge_type: "Design",
            post_date: "2025-08-15",
            website_url: "https://www.challenge.gov/challenge/smart-cities"
        },
        {
            id: "ai_ethics_research",
            title: "AI Ethics Research Challenge",
            agency: "National Science Foundation",
            description: "Research projects focused on ethical considerations and frameworks for artificial intelligence development.",
            source: "challenge.gov",
            status: "Upcoming",
            submission_deadline: "2026-01-15",
            prize_total: 200000,
            prize_description: "$200,000 research funding",
            challenge_type: "Research",
            post_date: "2025-08-20",
            website_url: "https://www.challenge.gov/challenge/ai-ethics"
        }
    ];
}

// Update challenge statistics
function updateChallengeStatistics() {
    const total = challengesData.length;
    const active = challengesData.filter(c => c.status === 'Active').length;
    const agencies = [...new Set(challengesData.map(c => c.agency))].length;
    const totalPrizes = challengesData.reduce((sum, c) => sum + (c.prize_total || 0), 0);
    
    document.getElementById('challenge-stat-total').textContent = total.toLocaleString();
    document.getElementById('challenge-stat-active').textContent = active.toLocaleString();
    document.getElementById('challenge-stat-agencies').textContent = agencies.toLocaleString();
    document.getElementById('challenge-stat-prizes').textContent = '$' + totalPrizes.toLocaleString();
}

// Populate challenge filter dropdowns
function populateChallengeFilters() {
    // Agencies
    const agencies = [...new Set(challengesData.map(c => c.agency))].sort();
    const agencySelect = document.getElementById('challenge-filter-agency');
    if (agencySelect) {
        agencies.forEach(agency => {
            const option = document.createElement('option');
            option.value = agency;
            option.textContent = agency;
            agencySelect.appendChild(option);
        });
    }
    
    // Challenge types
    const types = [...new Set(challengesData.map(c => c.challenge_type).filter(Boolean))].sort();
    const typeSelect = document.getElementById('challenge-filter-type');
    if (typeSelect) {
        // Clear existing options except "All Types"
        const allOption = typeSelect.querySelector('option[value=""]');
        typeSelect.innerHTML = '';
        typeSelect.appendChild(allOption);
        
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });
    }
}

// Filter challenges
function filterChallenges() {
    const searchTerm = document.getElementById('challenge-search-input')?.value.toLowerCase() || '';
    const agencyFilter = document.getElementById('challenge-filter-agency')?.value || '';
    const statusFilter = document.getElementById('challenge-filter-status')?.value || '';
    const typeFilter = document.getElementById('challenge-filter-type')?.value || '';
    const prizeFilter = document.getElementById('challenge-filter-prize')?.value || '';

    filteredChallenges = challengesData.filter(challenge => {
        const matchesSearch = !searchTerm || 
            challenge.title.toLowerCase().includes(searchTerm) ||
            challenge.agency.toLowerCase().includes(searchTerm) ||
            (challenge.description && challenge.description.toLowerCase().includes(searchTerm));
        
        const matchesAgency = !agencyFilter || challenge.agency === agencyFilter;
        const matchesStatus = !statusFilter || challenge.status === statusFilter;
        const matchesType = !typeFilter || challenge.challenge_type === typeFilter;
        
        let matchesPrize = true;
        if (prizeFilter && challenge.prize_total) {
            const prize = challenge.prize_total;
            switch (prizeFilter) {
                case 'under-10k': matchesPrize = prize < 10000; break;
                case '10k-50k': matchesPrize = prize >= 10000 && prize < 50000; break;
                case '50k-100k': matchesPrize = prize >= 50000 && prize < 100000; break;
                case '100k-500k': matchesPrize = prize >= 100000 && prize < 500000; break;
                case 'over-500k': matchesPrize = prize >= 500000; break;
            }
        }
        
        return matchesSearch && matchesAgency && matchesStatus && matchesType && matchesPrize;
    });

    currentChallengePage = 1;
    updateChallengeTable();
    updateChallengeResultsCount();
}

// Clear challenge filters
function clearChallengeFilters() {
    document.getElementById('challenge-search-input').value = '';
    document.getElementById('challenge-filter-agency').value = '';
    document.getElementById('challenge-filter-status').value = '';
    document.getElementById('challenge-filter-type').value = '';
    document.getElementById('challenge-filter-prize').value = '';
    
    filteredChallenges = [...challengesData];
    currentChallengePage = 1;
    updateChallengeTable();
    updateChallengeResultsCount();
}

// Update challenge table
function updateChallengeTable() {
    const tbody = document.getElementById('challenges-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const startIndex = (currentChallengePage - 1) * challengeItemsPerPage;
    const endIndex = startIndex + challengeItemsPerPage;
    const pageItems = filteredChallenges.slice(startIndex, endIndex);
    
    pageItems.forEach(challenge => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${escapeHtml(challenge.title)}</strong></td>
            <td>${escapeHtml(challenge.agency)}</td>
            <td>${escapeHtml(challenge.challenge_type || 'N/A')}</td>
            <td><span class="status-${challenge.status.toLowerCase()}">${escapeHtml(challenge.status)}</span></td>
            <td class="award-amount">${formatAmount(challenge.prize_total)}</td>
            <td>${formatDate(challenge.submission_deadline)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewChallengeDetails('${challenge.id}')">
                    View Details
                </button>
            </td>
        `;
    });
    
    updateChallengePagination();
}

// Update challenge pagination
function updateChallengePagination() {
    const pagination = document.getElementById('challenge-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredChallenges.length / challengeItemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (currentChallengePage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentChallengePage - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentChallengePage) {
            paginationHTML += `<button class="pagination-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }
    
    // Next button
    if (currentChallengePage < totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentChallengePage + 1})">Next</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
}

// Change challenge page
function changePage(page) {
    currentChallengePage = page;
    updateChallengeTable();
}

// Update challenge results count
function updateChallengeResultsCount() {
    const resultsCount = document.getElementById('challenge-results-count');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredChallenges.length} challenges`;
    }
}

// View challenge details
function viewChallengeDetails(challengeId) {
    const challenge = challengesData.find(c => c.id === challengeId);
    if (!challenge) return;
    
    const modal = document.getElementById('grant-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <h2>${escapeHtml(challenge.title)}</h2>
            <div class="modal-section">
                <h3>Challenge Details</h3>
                <p><strong>Agency:</strong> ${escapeHtml(challenge.agency)}</p>
                <p><strong>Type:</strong> ${escapeHtml(challenge.challenge_type || 'N/A')}</p>
                <p><strong>Status:</strong> ${escapeHtml(challenge.status)}</p>
                <p><strong>Submission Deadline:</strong> ${formatDate(challenge.submission_deadline)}</p>
                <p><strong>Prize Amount:</strong> ${formatAmount(challenge.prize_total)}</p>
                ${challenge.prize_description ? `<p><strong>Prize Description:</strong> ${escapeHtml(challenge.prize_description)}</p>` : ''}
            </div>
            <div class="modal-section">
                <h3>Description</h3>
                <p>${escapeHtml(challenge.description)}</p>
            </div>
            ${challenge.website_url ? `
            <div class="modal-section">
                <a href="${challenge.website_url}" target="_blank" class="btn btn-primary">
                    View on Challenge.gov
                </a>
            </div>
            ` : ''}
        `;
        
        modal.style.display = 'block';
    }
}

// Export challenges
function exportChallenges() {
    const csvContent = convertChallengersToCsv(filteredChallenges);
    downloadCsv(csvContent, 'challenges.csv');
}

// Convert challenges to CSV
function convertChallengersToCsv(challenges) {
    const headers = ['Title', 'Agency', 'Type', 'Status', 'Prize Amount', 'Deadline', 'Description'];
    const csvRows = [headers.join(',')];
    
    challenges.forEach(challenge => {
        const row = [
            `"${challenge.title}"`,
            `"${challenge.agency}"`,
            `"${challenge.challenge_type || ''}"`,
            `"${challenge.status}"`,
            `"${formatAmount(challenge.prize_total)}"`,
            `"${formatDate(challenge.submission_deadline)}"`,
            `"${challenge.description.substring(0, 200)}..."`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeChallenges();
});

// Export functions for global access
window.changePage = changePage;
window.viewChallengeDetails = viewChallengeDetails;