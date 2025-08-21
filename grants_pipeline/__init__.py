#!/usr/bin/env python3
"""
NVCA Grants Pipeline - Modular grants data processing system
Author: Shiloh TD

A modular system for collecting, processing, and exporting grants data
from multiple sources with a pluggable architecture.
"""

from .core.models import Grant, ProcessingResult, SourceConfig
from .core.pipeline import GrantsPipeline, GrantsProcessor
from .config.settings import ConfigManager
from .outputs.json_exporter import JSONExporter
from .sources import registry

__version__ = '1.0.0'
__author__ = 'Shiloh TD'

__all__ = [
    'Grant',
    'ProcessingResult', 
    'SourceConfig',
    'GrantsPipeline',
    'GrantsProcessor',
    'ConfigManager',
    'JSONExporter',
    'registry'
]