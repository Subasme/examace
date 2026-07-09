from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Append project root to sys.path to allow importing from scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.sync_worker import get_supabase_client, process_email_queue, process_sheets_sync

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        output_logs = []
        
        # Capture print statement outcomes
        def custom_print(*args):
            output_logs.append(" ".join(map(str, args)))
            
        import builtins
        original_print = builtins.print
        builtins.print = custom_print
        
        try:
            print("=== KARNAN Vercel Sync Worker ===")
            sb = get_supabase_client()
            process_email_queue(sb)
            process_sheets_sync(sb)
            print("=== Worker Finished ===")
            
            response = {
                "status": "success",
                "logs": output_logs
            }
        except Exception as e:
            response = {
                "status": "error",
                "message": str(e),
                "logs": output_logs
            }
        finally:
            builtins.print = original_print
            
        self.wfile.write(json.dumps(response).encode('utf-8'))
