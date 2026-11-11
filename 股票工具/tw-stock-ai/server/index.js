import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, loadConfig } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const app = createApp({ config, distDir: config.isProd ? path.resolve(__dirname, '../dist') : undefined });

app.listen(config.port, config.host, () => {
  console.log(`[server] 代理已啟動 http://${config.host}:${config.port}（${config.isProd ? '正式' : '開發'}模式）`);
  console.log(`[server] 伺服器金鑰：${config.serverKey ? '已設定' : '未設定'}；允許前端自帶金鑰：${config.allowClientKey ? '是' : '否'}`);
});
