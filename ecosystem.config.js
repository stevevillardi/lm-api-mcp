module.exports = {
  apps: [{
    name: 'lm-mcp-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001,
      LOG_LEVEL: 'debug'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    wait_ready: true,
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};