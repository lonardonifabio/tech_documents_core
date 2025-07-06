#!/usr/bin/env python3
"""
Ollama Port Manager - Utility to manage Ollama port conflicts
"""

import os
import sys
import time
import random
import subprocess
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OllamaPortManager:
    def __init__(self):
        self.default_port = 11434
        self.port_range_start = 11434
        self.port_range_end = 12434
    
    def is_port_in_use(self, port: int) -> bool:
        """Check if a port is currently in use"""
        try:
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'], 
                capture_output=True, 
                text=True
            )
            return result.returncode == 0 and result.stdout.strip()
        except FileNotFoundError:
            # lsof not available, try netstat
            try:
                result = subprocess.run(
                    ['netstat', '-tlnp'], 
                    capture_output=True, 
                    text=True
                )
                return f':{port}' in result.stdout
            except FileNotFoundError:
                logger.warning("Neither lsof nor netstat available, assuming port is free")
                return False
    
    def kill_processes_on_port(self, port: int) -> bool:
        """Kill all processes using the specified port"""
        try:
            # Get PIDs using the port
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'], 
                capture_output=True, 
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        logger.info(f"Killing process {pid} on port {port}")
                        subprocess.run(['kill', '-9', pid], capture_output=True)
                
                # Wait a moment for processes to die
                time.sleep(2)
                return True
            
            return True  # No processes to kill
            
        except FileNotFoundError:
            # Try with fuser if lsof not available
            try:
                subprocess.run(['fuser', '-k', f'{port}/tcp'], capture_output=True)
                time.sleep(2)
                return True
            except FileNotFoundError:
                logger.warning("Neither lsof nor fuser available for port cleanup")
                return False
    
    def find_free_port(self, start_port: Optional[int] = None) -> int:
        """Find a free port starting from start_port or random port in range"""
        if start_port is None:
            start_port = random.randint(self.port_range_start, self.port_range_end)
        
        # Try the suggested port first
        if not self.is_port_in_use(start_port):
            return start_port
        
        # Try random ports in range
        for _ in range(100):  # Try up to 100 random ports
            port = random.randint(self.port_range_start, self.port_range_end)
            if not self.is_port_in_use(port):
                return port
        
        # Fallback: sequential search
        for port in range(self.port_range_start, self.port_range_end):
            if not self.is_port_in_use(port):
                return port
        
        # If all else fails, use a high random port
        return random.randint(20000, 30000)
    
    def cleanup_ollama_processes(self) -> bool:
        """Clean up all Ollama processes"""
        try:
            logger.info("Cleaning up existing Ollama processes...")
            
            # Kill by process name
            subprocess.run(['pkill', '-f', 'ollama'], capture_output=True)
            subprocess.run(['pkill', '-9', '-f', 'ollama'], capture_output=True)
            subprocess.run(['killall', 'ollama'], capture_output=True)
            subprocess.run(['killall', '-9', 'ollama'], capture_output=True)
            
            # Wait for cleanup
            time.sleep(3)
            
            # Clean up default port
            self.kill_processes_on_port(self.default_port)
            
            logger.info("Ollama process cleanup completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cleanup Ollama processes: {e}")
            return False
    
    def setup_ollama_with_port(self, port: int) -> bool:
        """Setup environment variables for Ollama with specified port"""
        try:
            host = f"127.0.0.1:{port}"
            
            # Set environment variables
            os.environ['OLLAMA_HOST'] = host
            os.environ['OLLAMA_ORIGINS'] = "*"
            
            # Also export for shell commands
            with open('/tmp/ollama_env.sh', 'w') as f:
                f.write(f'export OLLAMA_HOST="{host}"\n')
                f.write(f'export OLLAMA_ORIGINS="*"\n')
                f.write(f'export OLLAMA_PORT="{port}"\n')
            
            logger.info(f"Configured Ollama to use host: {host}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup Ollama environment: {e}")
            return False
    
    def get_safe_ollama_port(self) -> int:
        """Get a safe port for Ollama, cleaning up conflicts if necessary"""
        # First, cleanup any existing Ollama processes
        self.cleanup_ollama_processes()
        
        # Find a free port
        port = self.find_free_port()
        
        # Setup environment
        self.setup_ollama_with_port(port)
        
        logger.info(f"Selected port {port} for Ollama")
        return port

def main():
    """Main entry point for port manager"""
    manager = OllamaPortManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "cleanup":
            success = manager.cleanup_ollama_processes()
            sys.exit(0 if success else 1)
        
        elif command == "find-port":
            port = manager.find_free_port()
            print(port)
            sys.exit(0)
        
        elif command == "setup":
            port = manager.get_safe_ollama_port()
            print(f"OLLAMA_HOST=127.0.0.1:{port}")
            print(f"OLLAMA_PORT={port}")
            sys.exit(0)
        
        elif command == "check":
            port = int(sys.argv[2]) if len(sys.argv) > 2 else manager.default_port
            in_use = manager.is_port_in_use(port)
            print(f"Port {port} is {'in use' if in_use else 'free'}")
            sys.exit(0 if not in_use else 1)
    
    else:
        print("Usage: python ollama_port_manager.py [cleanup|find-port|setup|check [port]]")
        sys.exit(1)

if __name__ == "__main__":
    main()
