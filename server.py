#!/usr/bin/env python3
"""本地服务器：提供静态文件服务 + API 代理（多镜像容错）"""
import http.server
import urllib.request
import os
import json

PORT = 8765
# 60s API 多镜像域名，按速度排序
API_MIRRORS = [
    'https://60s.viki.moe/v2/duanzi',
    'https://60s-api.viki.moe/v2/duanzi',
    'https://60s.b23.run/v2/duanzi',
]
WEB_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/duanzi'):
            self.proxy_api()
        else:
            super().do_GET()

    def end_headers(self):
        # 禁止缓存 HTML，确保 CSS/JS 修改即时生效
        if self.path.endswith('.html') or self.path == '/' or self.path.endswith('/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def proxy_api(self):
        """代理 API 请求：多镜像容错 + 系统代理"""
        proxy_url = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
        if proxy_url:
            proxy_handler = urllib.request.ProxyHandler({
                'http': proxy_url,
                'https': proxy_url,
            })
            opener = urllib.request.build_opener(proxy_handler)
        else:
            opener = urllib.request.build_opener()

        # 逐个尝试镜像直到成功
        for i, target in enumerate(API_MIRRORS):
            try:
                req = urllib.request.Request(target)
                req.add_header('User-Agent', 'Mozilla/5.0')
                response = opener.open(req, timeout=8)
                data = response.read()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
                return
            except Exception as e:
                # 尝试下一个镜像
                continue

        # 所有镜像都失败
        self.send_response(502)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({
            "code": 500,
            "message": "所有镜像均不可用",
            "data": None
        }).encode())


if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), Handler)
    print(f'Server running at http://localhost:{PORT}')
    server.serve_forever()
