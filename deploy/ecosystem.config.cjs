module.exports = {
  apps: [
    {
      name: 'dat-xe-ve-que-api',
      cwd: '/var/www/dat-xe-ve-que/backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      }
    }
  ]
};
