import http.server
import os
import socketserver

PORT = 3000
DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        req_path = self.path.split('?')[0]
        local_path = os.path.join(DIR, req_path.lstrip('/'))

        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()

        if os.path.isdir(local_path):
            index_path = os.path.join(local_path, 'index.html')
            if os.path.exists(index_path):
                self.path = req_path.rstrip('/') + '/index.html'
                return super().do_GET()

        self.path = '/index.html'
        return super().do_GET()

    def log_message(self, format, *args):
        print(f'[{self.command}] {args[0]}')

if __name__ == '__main__':
    with socketserver.TCPServer(('', PORT), SPAHandler) as httpd:
        print(f'SPA dev server running at http://localhost:{PORT}')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
