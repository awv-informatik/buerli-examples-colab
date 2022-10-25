import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useStore } from './store'
import { easing } from 'maath'
import { Avatar } from 'antd'

export function Others() {
  const ref = useRef()
  const [positions] = useState({})
  const number = useStore((state) => state.liveblocks.others.length)

  useEffect(() => {
    return useStore.subscribe((state) => {
      state.liveblocks.others.forEach((user, index) => {
        if (!positions[index]) positions[index] = [0, 0, 0]
        positions[index] = user?.presence?.cursor ?? [0, 0, 0]
      })
    })
  }, [])

  useFrame((state, delta) => {
    Object.values(positions).forEach((position, i) => {
      const mesh = ref.current.children[i]
      if (position && mesh) easing.damp3(mesh.position, position, 0.2, delta)
    })
  })

  return (
    <group ref={ref}>
      {Array.from({ length: number }, (_, index) => (
        <group>
          <Html center style={{ left: 50, whiteSpace: 'nowrap' }}>
            <Avatar src="https://joeschmoe.io/api/v1/random" />
          </Html>
        </group>
      ))}
    </group>
  )
}
