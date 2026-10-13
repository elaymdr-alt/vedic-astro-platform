// One command for dev: finds a free port for the API and for Vite, starts both,
// opens the browser on the port Vite really got, and stops both on Ctrl+C.
import { spawn } from 'node:child_process'
import net from 'node:net'

const free = (start) =>
  new Promise((resolve) => {
    const tryPort = (p) => {
      const s = net.createServer()
      s.once('error', () => tryPort(p + 1))
      s.once('listening', () => s.close(() => resolve(p)))
      s.listen(p, '127.0.0.1')
    }
    tryPort(start)
  })

const apiPort = await free(8030)
const run = (cmd, args, opts = {}) =>
  spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })

const api = run('python', ['-m', 'uvicorn', 'backend.main:app', '--port', String(apiPort)])
const web = run('npm', ['--prefix', 'frontend', 'run', 'dev'], {
  env: { ...process.env, API_URL: `http://127.0.0.1:${apiPort}` },
})

const stop = () => {
  api.kill()
  web.kill()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
web.on('exit', stop)
console.log(`\nAPI on :${apiPort} — the browser opens on the port Vite picks.\n`)
