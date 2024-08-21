'use client'

import { motion, type PanInfo, useAnimation } from 'framer-motion'
import React, { useCallback, useState, useEffect } from 'react'

interface DragProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  initialX?: number
  initialY?: number
}

// ForwardRef component
export const Drag = ({ children, className, ...props }: DragProps) => {
  const controls = useAnimation()
  const [zIndex, setZIndex] = useState(0)

  const initial = React.useMemo(() => {
    return {
      x: Math.random() * (window.innerWidth - 100),
      y: Math.random() * (window.innerHeight - 100),
      rotation: () => {
        const isNegative = Math.random() < 0.5
        const angle = Math.floor(Math.random() * 60)
        return isNegative ? -angle : angle
      }
    }
  }, [])

  const updateZIndex = useCallback(() => {
    let maxZIndex = -Infinity
    const elements = document.querySelectorAll('.drag-elements')
    elements.forEach(el => {
      const zIndex = parseInt(window.getComputedStyle(el).getPropertyValue('z-index'), 10)
      if (!isNaN(zIndex) && zIndex > maxZIndex) maxZIndex = zIndex
    })

    setZIndex(maxZIndex + 1)
  }, [])

  const handleDragEnd = useCallback(
    (event: MouseEvent, info: PanInfo) => {
      const direction = info.offset.x > 0 ? 1 : -1
      const velocity = Math.min(Math.abs(info.velocity.x), 1)
      controls.start({
        rotate: Math.floor(initial.rotation() + velocity * 40 * direction),
        transition: {
          type: 'spring',
          stiffness: 10,
          damping: 30,
          mass: 1,
          restDelta: 0.001
        }
      })
    },
    [controls, initial.rotation()]
  )

  return (
    <motion.div
      drag
      dragElastic={0.2}
      className={`select-none w-fit h-fit drag-elements absolute ${className}`}
      dragTransition={{ power: 0.2, timeConstant: 200 }}
      onMouseDown={updateZIndex}
      onTouchStart={updateZIndex}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ rotate: initial.rotation(), x: initial.x, y: initial.y }}
      style={{ zIndex, ...props.style }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
