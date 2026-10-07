import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export default function CosmicBackground({
  className,
  intensity = 'medium',
  showNebula = true,
  showOrbs = true,
  showGrid = true,
  showConstellation = false,
}: {
  className?: string
  intensity?: 'low' | 'medium' | 'high'
  showNebula?: boolean
  showOrbs?: boolean
  showGrid?: boolean
  showConstellation?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const timeRef = useRef(0)

  const orbs = useRef([
    { x: 0.1, y: 0.2, r: 0.35, color: '262, 88%, 62%', speed: 0.15, phase: 0 },
    { x: 0.9, y: 0.8, r: 0.28, color: '41, 92%, 58%', speed: 0.12, phase: Math.PI },
    { x: 0.3, y: 0.7, r: 0.22, color: '262, 60%, 40%', speed: 0.18, phase: Math.PI / 2 },
    { x: 0.7, y: 0.3, r: 0.18, color: '280, 70%, 55%', speed: 0.1, phase: Math.PI * 1.5 },
    { x: 0.5, y: 0.5, r: 0.25, color: '300, 75%, 50%', speed: 0.08, phase: Math.PI / 4 },
  ])

  const stars = useRef(
    Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    }))
  )

  const connections = useRef<Array<{ from: number; to: number; opacity: number }>>([])

  useEffect(() => {
    if (showConstellation) {
      connections.current = []
      for (let i = 0; i < stars.current.length; i++) {
        for (let j = i + 1; j < stars.current.length; j++) {
          const dx = stars.current[i].x - stars.current[j].x
          const dy = stars.current[i].y - stars.current[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 0.15 && Math.random() < 0.3) {
            connections.current.push({ from: i, to: j, opacity: Math.random() * 0.3 + 0.1 })
          }
        }
      }
    }
  }, [showConstellation])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      const width = window.innerWidth || canvas.width / (window.devicePixelRatio || 1) || 800
      const height = window.innerHeight || canvas.height / (window.devicePixelRatio || 1) || 600
      if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, width, height)
      if (showNebula) drawNebula(ctx, width, height, t)
      if (showGrid) drawGrid(ctx, width, height, t)
      if (showConstellation) {
        drawConstellations(ctx, width, height, t)
        drawStars(ctx, width, height, t)
      }
      if (showOrbs) drawOrbs(ctx, width, height, t)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [showNebula, showOrbs, showGrid, showConstellation, intensity])

  const intensityMultiplier = intensity === 'high' ? 1 : intensity === 'low' ? 0.3 : 0.6

  function drawNebula(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
    const centerX = width * 0.5, centerY = height * 0.5
    const maxDim = Math.max(width, height)
    if (maxDim <= 0 || isNaN(maxDim)) return

    const r1 = Math.max(1, maxDim * 0.8)
    const g1 = ctx.createRadialGradient(
      centerX + Math.sin(t * 0.1) * 100,
      centerY + Math.cos(t * 0.08) * 80,
      0,
      centerX + Math.sin(t * 0.1) * 100,
      centerY + Math.cos(t * 0.08) * 80,
      r1
    )
    g1.addColorStop(0, `hsla(262, 88%, 62%, ${0.04 * intensityMultiplier})`)
    g1.addColorStop(0.3, `hsla(262, 88%, 62%, ${0.02 * intensityMultiplier})`)
    g1.addColorStop(1, 'hsla(262, 88%, 62%, 0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, width, height)

    const r2 = Math.max(1, maxDim * 0.6)
    const g2 = ctx.createRadialGradient(
      width * 0.2 + Math.cos(t * 0.07) * 150,
      height * 0.8 + Math.sin(t * 0.09) * 100,
      0,
      width * 0.2 + Math.cos(t * 0.07) * 150,
      height * 0.8 + Math.sin(t * 0.09) * 100,
      r2
    )
    g2.addColorStop(0, `hsla(41, 92%, 58%, ${0.03 * intensityMultiplier})`)
    g2.addColorStop(0.5, `hsla(41, 92%, 58%, ${0.01 * intensityMultiplier})`)
    g2.addColorStop(1, 'hsla(41, 92%, 58%, 0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, width, height)

    const r3 = Math.max(1, maxDim * 0.5)
    const g3 = ctx.createRadialGradient(
      width * 0.8 + Math.sin(t * 0.06) * 120,
      height * 0.2 + Math.cos(t * 0.1) * 90,
      0,
      width * 0.8 + Math.sin(t * 0.06) * 120,
      height * 0.2 + Math.cos(t * 0.1) * 90,
      r3
    )
    g3.addColorStop(0, `hsla(280, 70%, 55%, ${0.025 * intensityMultiplier})`)
    g3.addColorStop(1, 'hsla(280, 70%, 55%, 0)')
    ctx.fillStyle = g3
    ctx.fillRect(0, 0, width, height)
  }

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
    const gridSize = 80
    const opacity = 0.02 * (intensity === 'high' ? 1.5 : intensity === 'low' ? 0.5 : 1)
    ctx.strokeStyle = `hsla(262, 88%, 62%, ${opacity})`
    ctx.lineWidth = 0.5
    for (let x = -gridSize; x < width + gridSize; x += gridSize) {
      const offset = Math.sin(t * 0.5 + x * 0.01) * 2
      ctx.beginPath(); ctx.moveTo(x + offset, 0); ctx.lineTo(x + offset, height); ctx.stroke()
    }
    for (let y = -gridSize; y < height + gridSize; y += gridSize) {
      const offset = Math.cos(t * 0.5 + y * 0.01) * 2
      ctx.beginPath(); ctx.moveTo(0, y + offset); ctx.lineTo(width, y + offset); ctx.stroke()
    }
    const centerX = width * 0.5, centerY = height * 0.5
    const cg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(1, 200))
    cg.addColorStop(0, `hsla(262, 88%, 62%, ${0.03 * intensityMultiplier})`)
    cg.addColorStop(1, 'hsla(262, 88%, 62%, 0)')
    ctx.fillStyle = cg; ctx.fillRect(centerX - 200, centerY - 200, 400, 400)
  }

  function drawConstellations(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
    connections.current.forEach((conn) => {
      const from = stars.current[conn.from], to = stars.current[conn.to]
      if (!from || !to) return
      const x1 = from.x * width, y1 = from.y * height, x2 = to.x * width, y2 = to.y * height
      const opacity = conn.opacity * (0.5 + Math.sin(t * 2 + from.twinklePhase) * 0.3)
      if (isNaN(opacity) || opacity <= 0) return
      const g = ctx.createLinearGradient(x1, y1, x2, y2)
      g.addColorStop(0, `hsla(262, 88%, 62%, ${opacity})`)
      g.addColorStop(0.5, `hsla(41, 92%, 58%, ${opacity * 0.7})`)
      g.addColorStop(1, `hsla(262, 88%, 62%, ${opacity})`)
      ctx.strokeStyle = g; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    })
  }

  function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
    stars.current.forEach((star) => {
      const x = star.x * width, y = star.y * height
      const twinkle = Math.sin(t * star.twinkleSpeed * 100 + star.twinklePhase)
      const opacity = Math.max(0, star.opacity * (0.5 + twinkle * 0.5))
      const size = Math.max(0.1, star.size * (0.8 + twinkle * 0.4))
      ctx.fillStyle = `hsla(45, 40%, 96%, ${opacity})`
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
      if (star.opacity > 0.5) {
        const glowRadius = Math.max(1, size * 4)
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
        glow.addColorStop(0, `hsla(262, 88%, 62%, ${opacity * 0.3})`)
        glow.addColorStop(1, 'hsla(262, 88%, 62%, 0)')
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, glowRadius, 0, Math.PI * 2); ctx.fill()
      }
    })
  }

  function drawOrbs(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
    const orbIntensity = intensity === 'high' ? 1 : intensity === 'low' ? 0.4 : 0.7
    orbs.current.forEach((orb) => {
      orb.x += Math.sin(t * orb.speed + orb.phase) * 0.0003
      orb.y += Math.cos(t * orb.speed * 0.7 + orb.phase) * 0.0002
      if (orb.x < -orb.r) orb.x = 1 + orb.r
      if (orb.x > 1 + orb.r) orb.x = -orb.r
      if (orb.y < -orb.r) orb.y = 1 + orb.r
      if (orb.y > 1 + orb.r) orb.y = -orb.r
      const dx = mousePos.x - orb.x, dy = mousePos.y - orb.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.3 && dist > 0) {
        const influence = (1 - dist / 0.3) * 0.005
        orb.x -= dx * influence; orb.y -= dy * influence
      }
      const x = orb.x * width, y = orb.y * height
      const radius = Math.max(1, Math.min(width, height) * orb.r)
      const colorStr = orb.color.includes(',') ? orb.color : orb.color.replace(/\s+/g, ', ')
      const og = ctx.createRadialGradient(x, y, 0, x, y, radius)
      og.addColorStop(0, `hsla(${colorStr}, ${0.08 * orbIntensity})`)
      og.addColorStop(0.5, `hsla(${colorStr}, ${0.02 * orbIntensity})`)
      og.addColorStop(1, `hsla(${colorStr}, 0)`)
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
      const ir = Math.max(1, radius * 0.3)
      const ig = ctx.createRadialGradient(x, y, 0, x, y, ir)
      ig.addColorStop(0, `hsla(${colorStr}, ${0.15 * orbIntensity})`)
      ig.addColorStop(1, `hsla(${colorStr}, 0)`)
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(x, y, ir, 0, Math.PI * 2); ctx.fill()
    })
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 -z-10 w-full h-full pointer-events-none', className)}
      aria-hidden="true"
    />
  )
}