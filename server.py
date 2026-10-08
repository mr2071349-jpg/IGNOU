import os
import sys
import http.server
import socketserver
import mimetypes

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Handle dynamic menu API call
        if self.path == '/api/menu/Top':
            menu_data = [
                ["1", "<i class='fa-solid fa-house'></i>", "Home"],
                ["2", "<i class='fa-solid fa-circle-info'></i>", "About us"],
                ["3", "<i class='fa-solid fa-users'></i>", "Employee Services"],
                ["4", "<i class='fa-solid fa-user-graduate'></i>", "Student Services"],
                ["5", "<i class='fa-solid fa-briefcase'></i>", "Career"],
                ["1", "<i class='fa-solid fa-bullhorn'></i>", "Announcements"],
                ["41", "<i class='fa-solid fa-photo-film'></i>", "Media"],
                ["1", "<i class='fa-solid fa-address-book'></i>", "Contact Us"],
                ["1", "<i class='fa-solid fa-award'></i>", "NIRF"]
            ]
            import json
            response = json.dumps(menu_data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Content-length', len(response))
            self.end_headers()
            self.wfile.write(response)
            return

        # Redirect root path or empty index to the IGNOU homepage directly
        if self.path in ['/', '/index.html', '/www.ignou.ac.in', '/www.ignou.ac.in/']:
            self.send_response(302)
            self.send_header('Location', '/www.ignou.ac.in/index.html')
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        full_path = super().translate_path(path)
        # If the file doesn't exist in the root directory, check inside www.ignou.ac.in
        if not os.path.exists(full_path):
            try:
                rel_path = os.path.relpath(full_path, DIRECTORY)
                if not rel_path.startswith('www.ignou.ac.in'):
                    alt_path = os.path.join(DIRECTORY, 'www.ignou.ac.in', rel_path)
                    if os.path.exists(alt_path) or os.path.isdir(alt_path):
                        return alt_path
            except ValueError:
                pass
        return full_path

    def guess_type(self, path):
        ctype = super().guess_type(path)
        ext = os.path.splitext(path)[1].lower()
        
        # HTTrack saved HTML files without extension or with .tmp / .aspx extension
        if not ext or ext in ['.tmp', '.aspx', '']:
            if os.path.isfile(path):
                try:
                    with open(path, 'rb') as f:
                        header = f.read(1024).lower()
                        if b'<!doctype html' in header or b'<html' in header or b'<!-- mirrored' in header or b'<head' in header:
                            return 'text/html; charset=utf-8'
                except Exception:
                    pass
                return 'text/html; charset=utf-8'
        
        if ctype == 'application/octet-stream':
            if os.path.isfile(path):
                try:
                    with open(path, 'rb') as f:
                        header = f.read(1024).lower()
                        if b'<!doctype html' in header or b'<html' in header or b'<!-- mirrored' in header or b'<head' in header:
                            return 'text/html; charset=utf-8'
                except Exception:
                    pass

        return ctype

def run():
    os.chdir(DIRECTORY)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.request_queue_size = 100
    print(f"IGNOU Website Server is running on http://localhost:{PORT}")
    print(f"Direct link to IGNOU homepage: http://localhost:{PORT}/www.ignou.ac.in/index.html")
    with socketserver.ThreadingTCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run()
