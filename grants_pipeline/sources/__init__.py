#!/usr/bin/env python3
"""
Data sources module for the grants pipeline
"""

from .base import DataSource, FileBasedSource, APIBasedSource, WebScrapingSource, registry

# Import and register sources
try:
    from .grants_gov import GrantsGovSource
    registry.register(GrantsGovSource)
except ImportError as e:
    print(f"Warning: Could not import grants_gov source: {e}")

try:
    from .grants_gov_xml import GrantsGovXMLSource
    registry.register(GrantsGovXMLSource)
except ImportError as e:
    print(f"Warning: Could not import grants_gov_xml source: {e}")

__all__ = [
    'DataSource',
    'FileBasedSource', 
    'APIBasedSource',
    'WebScrapingSource',
    'registry'
]