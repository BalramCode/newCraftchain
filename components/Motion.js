'use client'
import { motion } from 'framer-motion'

export function Reveal({ children, delay = 0, y = 20, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >{children}</motion.div>
  )
}

import { useEffect, useState } from 'react'
export function CountUp({ value, duration = 1.2, prefix = '', suffix = '', decimals = 0 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf, start
    const from = 0, to = Number(value) || 0
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - p, 3)
      setN(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-IN')
  return <span>{prefix}{shown}{suffix}</span>
}
