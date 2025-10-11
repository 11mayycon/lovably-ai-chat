module.exports = {
  apps: [{
    name: 'isa',
    script: 'npx',
    args: 'serve -s dist -l 3000',
    cwd: '/root/inovapro/isa',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/root/inovapro/isa/logs/err.log',
    out_file: '/root/inovapro/isa/logs/out.log',
    log_file: '/root/inovapro/isa/logs/combined.log',
    time: true
  }]
};