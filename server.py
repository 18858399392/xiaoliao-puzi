#!/usr/bin/env python3
"""本地服务器：提供静态文件服务 + API 代理（多镜像容错）"""
import http.server
import urllib.request
import os
import json
import urllib.parse
from starter_data import save as save_starter

PORT = 8765
# 支持的内容分类：代理路径后缀 → 上游 API 路径
API_PATHS = {
    'duanzi': 'duanzi',        # 搞笑段子
    'dad-joke': 'dad-joke',    # 冷笑话
    'hitokoto': 'hitokoto',    # 随机一言
    'changya': 'changya',      # 随机唱歌音频
}
# 60s API 多镜像域名
MIRROR_HOSTS = [
    'https://60s.viki.moe',
    'https://60s-api.viki.moe',
    'https://60s.b23.run',
]
WEB_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        # /api/<category>[?...]
        if self.path.startswith('/api/'):
            category = self.path.split('?', 1)[0].rsplit('/', 1)[-1]
            if category in API_PATHS:
                self.proxy_api(API_PATHS[category])
                return
            self.send_error(404, 'Unknown category')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path!='/starter-selection':
            self.send_error(404)
            return
        origin=self.headers.get('Origin','')
        allowed={f'http://localhost:{self.server.server_port}',f'http://127.0.0.1:{self.server.server_port}'}
        if self.client_address[0] not in {'127.0.0.1','::1'} or origin not in allowed:
            self.send_error(403)
            return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=1_000_000 or 'application/json' not in self.headers.get('Content-Type',''):
                raise ValueError('选择包格式或大小不正确')
            result=save_starter(json.loads(self.rfile.read(length)))
            self.send_response(200)
            body=json.dumps(result,ensure_ascii=False).encode('utf-8')
        except (ValueError,TypeError,json.JSONDecodeError) as error:
            self.send_response(400)
            body=json.dumps({'error':str(error)},ensure_ascii=False).encode('utf-8')
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # 禁止缓存 HTML，确保 CSS/JS 修改即时生效
        if self.path.split('?',1)[0].endswith(('.html','.js','.json')) or self.path == '/' or self.path.endswith('/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def proxy_api(self, api_path):
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

        params=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        index=params.get('id',[''])[0]
        suffix=('?id='+urllib.parse.quote(index)) if index.isdigit() else ''
        targets = [f'{host}/v2/{api_path}{suffix}' for host in MIRROR_HOSTS]

        # 逐个尝试镜像直到成功
        for target in targets:
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
            except Exception:
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
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Server running at http://localhost:{PORT}')
    server.serve_forever()
