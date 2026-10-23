#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server.py - 倪海廈雙欄經方工作台本地極簡伺服器 (Pure Python Standard Library)
功能：
1. 靜態檔案托管 (GET /*: index.html, js/*, SKILL.md 等)
2. 檢索端點 (POST /api/retrieve): 子行程執行 scripts/nuwa_retriever.py
3. 反向代理端點 (POST /api/proxy): 轉發非 CORS 友善大模型 API 請求
零外部 pip 套件依賴，標準庫直接執行。
"""

import os
import sys
import json
import time
import threading
import webbrowser
import urllib.request
import urllib.error
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class WorkbenchHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # 允許跨域請求與即時快取控制
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, anthropic-dangerous-direct-browser-access")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/retrieve":
            self.handle_retrieve()
        elif self.path == "/api/proxy":
            self.handle_proxy()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_retrieve(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            query = payload.get("query", "").strip()

            if not query:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty query"}).encode("utf-8"))
                return

            # 調用原生 nuwa_retriever.py
            script_path = os.path.join(BASE_DIR, "scripts", "nuwa_retriever.py")
            cmd = [sys.executable, script_path, query, "--json"]
            proc = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, encoding="utf-8")

            if proc.returncode != 0:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Retriever execution failed",
                    "stderr": proc.stderr
                }).encode("utf-8"))
                return

            # 回傳檢索結果 JSON，並補上全文原文證據 (詞典未涵蓋主訴時仍可引用原文)
            result_json = proc.stdout
            try:
                result = json.loads(proc.stdout)
                try:
                    sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
                    import fulltext_evidence
                    result["fulltext_evidence"] = fulltext_evidence.search(query, top_n=4)
                except Exception as fe:
                    result["fulltext_evidence"] = []
                    result["fulltext_error"] = str(fe)
                result_json = json.dumps(result, ensure_ascii=False)
            except Exception:
                pass

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(result_json.encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def handle_proxy(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

            target_url = payload.get("url")
            headers = payload.get("headers", {})
            body_data = payload.get("body")

            if not target_url:
                self.send_error(400, "Missing target url")
                return

            # 注入真實瀏覽器 User-Agent，避免 Cloudflare WAF (如 Groq / Cloudflare 403 error 1010) 阻擋 Python-urllib
            client_ua = self.headers.get("User-Agent")
            if "User-Agent" not in headers and "user-agent" not in headers:
                headers["User-Agent"] = client_ua or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

            http_method = payload.get("method", "POST" if body_data is not None else "GET").upper()
            encoded_body = json.dumps(body_data).encode("utf-8") if (body_data is not None and http_method != "GET") else None
            req = urllib.request.Request(target_url, data=encoded_body, headers=headers, method=http_method)

            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ["content-length", "transfer-encoding", "access-control-allow-origin"]:
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp_data)

        except urllib.error.HTTPError as e:
            err_body = e.read()
            print(f"[Proxy HTTPError] {e.code}: {e.reason} - {err_body[:200]}")
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            print(f"[Proxy Exception] {str(e)}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e), "message": str(e)}).encode("utf-8"))


def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = ThreadingHTTPServer(server_address, WorkbenchHTTPHandler)
    print(f"================================================================")
    print(f"🌿 倪海廈雙欄經方臨證工作台 (NiHaiSha Web Workbench v3.2)")
    print(f"🚀 本地伺服器已就緒：http://localhost:{PORT}")
    print(f"📂 專案根目錄：{BASE_DIR}")
    print(f"🌐 正在自動呼叫預設瀏覽器開啟工作台...")
    print(f"🛑 按 Ctrl+C 即可終止伺服器")
    print(f"================================================================")

    def open_browser():
        time.sleep(0.8)
        try:
            webbrowser.open(f"http://localhost:{PORT}")
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n伺服器已安全停止。")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
