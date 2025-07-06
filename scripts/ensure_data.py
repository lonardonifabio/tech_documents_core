#!/usr/bin/env python3
"""
Ensure data files exist before build
"""

import os
import json
from pathlib import Path

def ensure_data_files():
    """Ensure data directory and files exist"""
    base_dir = Path.cwd()
    data_dir = base_dir / 'data'
    
    # Create data directory if it doesn't exist
    data_dir.mkdir(exist_ok=True)
    
    # Ensure documents.json exists
    documents_file = data_dir / 'documents.json'
    if not documents_file.exists():
        print("Creating empty documents.json")
        with open(documents_file, 'w') as f:
            json.dump([], f)
    
    # Ensure processed_files.json exists
    processed_file = data_dir / 'processed_files.json'
    if not processed_file.exists():
        print("Creating empty processed_files.json")
        with open(processed_file, 'w') as f:
            json.dump({}, f)
    
    print("Data files ensured")

if __name__ == "__main__":
    ensure_data_files()
