"""Dev server that serves static files and accepts log posts."""
import http.server
import json
import os

LOG_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'game.log')
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

class LogHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/log':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            with open(LOG_FILE, 'w') as f:
                f.write(body)
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))
    server = http.server.HTTPServer(('', 8080), LogHandler)
    print('Server running on http://localhost:8080')
    server.serve_forever()
