# NVCA Federal Grants Database

**Author:** Shiloh TD  
**Generated:** August 11, 2025

## Overview

This is a static site generator for federal grant opportunities with NVCA branding and comprehensive filtering capabilities.

## Statistics

- **Total Grants:** 1018
- **Open Grants:** 1018
- **Forecasted Grants:** 0
- **Total Agencies:** 106

### Funding Distribution
- Under $100K: 46
- $100K - $500K: 135
- $500K - $1M: 79
- $1M - $5M: 95
- $5M - $10M: 27
- Over $10M: 50
- Unspecified: 586

## Features

- **Comprehensive Search**: Search by title, agency, description, opportunity number
- **Advanced Filters**: Filter by agency, category, status, funding range, type, deadline, cost sharing, CFDA number
- **Real-time Statistics**: Dynamic dashboard showing total grants, open opportunities, agencies, and total funding
- **Responsive Design**: Mobile-friendly interface with NVCA brand colors
- **Export Functionality**: Download filtered results as CSV
- **Sortable Columns**: Click column headers to sort
- **Pagination**: Navigate through large datasets efficiently
- **Detailed Views**: Modal windows with complete grant information
- **Authentication**: Netlify Identity integration for user management

## Data Source

The site loads grant data from the CSV file: `grants_database_20250811_035951_10000_records.csv`
Only grants with future close dates are included in the database.

## Deployment

### GitHub Pages
1. Push the generated files to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Select the branch and folder containing the site

### Netlify
1. Connect your GitHub repository to Netlify
2. Set build settings if using the generator script
3. Enable Netlify Identity for authentication features

### Local Testing
1. Run the generator: `python nvca_grants_generator.py`
2. Navigate to the output directory: `cd github-grants-site`
3. Start a local server: `python -m http.server 8000`
4. Open in browser: `http://localhost:8000`

## Technical Stack

- **Backend**: Python 3.x with dataclasses
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: Netlify Identity (optional)
- **Hosting**: GitHub Pages or Netlify

## File Structure

```
nvca_grants_generator.py     # Main generator script
grants_database_*.csv         # Source data file
github-grants-site/          # Generated output
├── index.html               # Main application
├── styles.css               # NVCA-branded styles
├── app.js                   # Grant database logic
├── auth.js                  # Authentication handler
├── grants_data.json         # All grant data
└── README.md               # This file
```

## License

© 2025 NVCA. All rights reserved.
