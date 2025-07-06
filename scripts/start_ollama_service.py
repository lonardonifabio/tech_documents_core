#!/usr/bin/env python3
"""
Python script to safely start Ollama service by killing any existing instances first
This fixes the "address already in use" error
"""

import os
import sys
import time
import subprocess
import requests
import signal
import psutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def kill_process_on_port(port):
    """Kill any process using the specified port."""
    try:
        # Find processes using the port
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.info['connections'] or []:
                    if conn.laddr.port == port:
                        logger.info(f"Killing process {proc.info['pid']} ({proc.info['name']}) using port {port}")
                        proc.kill()
                        proc.wait(timeout=5)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.warning(f"Error killing processes on port {port}: {e}")

def kill_ollama_processes():
    """Kill all Ollama processes."""
    try:
        # Kill processes by name
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['name'] and 'ollama' in proc.info['name'].lower():
                    logger.info(f"Killing Ollama process {proc.info['pid']}")
                    proc.kill()
                    proc.wait(timeout=5)
                elif proc.info['cmdline']:
                    cmdline = ' '.join(proc.info['cmdline']).lower()
                    if 'ollama serve' in cmdline or 'ollama' in cmdline:
                        logger.info(f"Killing Ollama process {proc.info['pid']}")
                        proc.kill()
                        proc.wait(timeout=5)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.warning(f"Error killing Ollama processes: {e}")

def is_port_in_use(port):
    """Check if a port is in use."""
    try:
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                return True
        return False
    except Exception:
        return False

def is_ollama_running():
    """Check if Ollama service is running and responding."""
    try:
        response = requests.get('http://127.0.0.1:11434/api/tags', timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def start_ollama_service():
    """Start Ollama service safely."""
    logger.info("🔧 Checking for existing Ollama processes...")
    
    # Kill existing Ollama processes
    kill_ollama_processes()
    
    # Wait for processes to terminate
    time.sleep(2)
    
    # Kill any process using port 11434
    if is_port_in_use(11434):
        logger.info("🔧 Port 11434 is still in use. Killing process...")
        kill_process_on_port(11434)
        time.sleep(2)
    
    # Verify port is free
    if is_port_in_use(11434):
        logger.error("❌ Failed to free port 11434. Manual intervention required.")
        return False
    
    logger.info("✅ Port 11434 is now available")
    
    # Start Ollama service
    logger.info("🚀 Starting Ollama service...")
    try:
        # Start ollama serve in background
        process = subprocess.Popen(['ollama', 'serve'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Wait for service to start
        logger.info("⏳ Waiting for Ollama service to start...")
        for i in range(30):  # Wait up to 30 seconds
            time.sleep(1)
            if is_ollama_running():
                logger.info("✅ Ollama service started successfully")
                logger.info("🎉 Ollama service is ready!")
                return True
        
        logger.error("❌ Ollama service failed to start within timeout")
        return False
        
    except Exception as e:
        logger.error(f"❌ Failed to start Ollama service: {e}")
        return False

def main():
    """Main entry point."""
    if start_ollama_service():
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
