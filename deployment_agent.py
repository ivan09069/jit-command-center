#!/usr/bin/env python3
"""
Deployment Agent - Autonomous verification and deployment
"""

import subprocess
import requests
import json
import time
import sys
from datetime import datetime
from pathlib import Path

class DeploymentAgent:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.log = []
        
    def add_log(self, message: str, level: str = "INFO"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self.log.append(entry)
        print(f"[{level}] {message}")
    
    def run_command(self, cmd: list, timeout: int = 300, shell: bool = False):
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=shell
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def step_1_build_test(self):
        self.add_log("Step 1: Running build test...")
        result = self.run_command(['npm', 'run', 'build'], shell=True)
        
        if not result['success']:
            self.add_log(f"Build failed: {result.get('stderr', 'Unknown')}", "ERROR")
            return False
        
        self.add_log("Build succeeded [OK]", "SUCCESS")
        return True
    
    def step_2_validate_endpoints(self):
        self.add_log("Step 2: Starting dev server...")
        
        results = {"status_endpoint": False, "control_endpoint": False, "policy_gate": False}
        
        try:
            proc = subprocess.Popen(
                ['npm', 'run', 'dev'],
                cwd=self.project_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=True
            )
            
            self.add_log("Waiting for server...")
            time.sleep(15)
            
            # Test /api/status
            try:
                r = requests.get('http://localhost:3000/api/status', timeout=5)
                if r.status_code == 200:
                    results['status_endpoint'] = True
                    self.add_log("Status endpoint [OK]", "SUCCESS")
            except Exception as e:
                self.add_log(f"Status failed: {e}", "ERROR")
            
            # Test /api/control
            try:
                r = requests.post(
                    'http://localhost:3000/api/control',
                    json={"type": "deploy", "target": "test"},
                    timeout=5
                )
                if r.status_code == 403:
                    results['control_endpoint'] = True
                    self.add_log("Control endpoint [OK]", "SUCCESS")
                    if 'decision' in r.json():
                        results['policy_gate'] = True
                        self.add_log("Policy gate [OK]", "SUCCESS")
            except Exception as e:
                self.add_log(f"Control failed: {e}", "ERROR")
            
            proc.kill()
            proc.wait()
            
        except Exception as e:
            self.add_log(f"Server error: {e}", "ERROR")
        
        return results
    
    def run(self):
        self.add_log("=== DEPLOYMENT AGENT STARTED ===")
        start = time.time()
        
        if not self.step_1_build_test():
            return {"status": "FAILED", "reason": "BUILD_FAILED", "logs": self.log}
        
        validation = self.step_2_validate_endpoints()
        if not all(validation.values()):
            return {"status": "FAILED", "reason": "VALIDATION_FAILED", "logs": self.log}
        
        duration = time.time() - start
        self.add_log(f"=== COMPLETED IN {duration:.2f}s ===", "SUCCESS")
        
        return {
            "status": "SUCCESS",
            "duration_seconds": round(duration, 2),
            "validation": validation,
            "logs": self.log
        }

if __name__ == '__main__':
    project_path = sys.argv[1] if len(sys.argv) > 1 else '.'
    
    agent = DeploymentAgent(project_path)
    result = agent.run()
    
    report_path = Path(project_path) / 'deployment_report.json'
    with open(report_path, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\nReport: {report_path}")
    sys.exit(0 if result['status'] == 'SUCCESS' else 1)
