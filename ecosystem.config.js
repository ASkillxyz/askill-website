// pm2 生态配置文件
// 服务器上执行：pm2 start ecosystem.config.js
// 或重启：     pm2 reload askill

module.exports = {
  apps: [
    {
      name: 'askill',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/askill-website',   // ← 改成你服务器上的实际路径
      instances: 'max',                  // CPU 核心数，单核改为 1
      exec_mode: 'cluster',              // 多核模式，单核改为 'fork'
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
