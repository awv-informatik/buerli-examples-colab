import * as THREE from 'three'
import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { easing } from 'maath'
import { RightOutlined } from '@ant-design/icons'
import { v4 } from 'uuid'
import { useStore } from './store'

export function Cursor() {
  const ref = useRef()
  const { size, camera, scene } = useThree()
  const [hovered, setHovered] = useState(null)
  const [ready, setReady] = useState(false)
  const [text, setText] = useState('')
  const setCursor = useStore((state) => state.setCursor)
  const addAnnotation = useStore((state) => state.addAnnotation)
  const lastVec = useRef([0, 0, 0])
  const lastVecLocal = useRef([0, 0, 0])
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const vec = new THREE.Vector3() // create once and reuse
    const pos = new THREE.Vector3() // create once and reuse

    function pointermove(e) {
      vec.set((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1, 0)
      raycaster.setFromCamera(vec, camera)
      const intersects = raycaster.intersectObject(scene, true)
      if (intersects.length && intersects[0].object.name) {
        const entry = intersects[0]
        setHovered(entry.object.name)
        setCursor((lastVec.current = entry.point.toArray()))
        lastVecLocal.current = entry.object.worldToLocal(entry.point).toArray()
      } else {
        setHovered(null)
        vec.z = 0.5
        vec.unproject(camera)
        vec.sub(camera.position).normalize()
        const distance = camera.position.distanceTo(vec)
        pos.copy(camera.position).add(vec.multiplyScalar(distance))
        setCursor((lastVec.current = pos.toArray()))
      }
    }

    function keyup({ key, code }) {
      if (hovered) {
        if (key === '/') {
          setReady(true)
        } else if (code === 'Escape') {
          setText('')
          setReady(false)
        } else if (code === 'Enter') {
          addAnnotation(v4(), lastVecLocal.current, text, hovered)
          setText('')
          setReady(false)
        } else if (code === 'Backspace') {
          if (text.length <= 1) setReady(false)
          setText((text) => text.slice(0, -1))
        } else if (key.length === 1) {
          setText((text) => text + key)
        }
      } else {
        setText('')
        setReady(false)
      }
    }

    window.addEventListener('pointermove', pointermove, { passive: true })
    window.addEventListener('keyup', keyup, { passive: true })
    return () => {
      window.removeEventListener('pointermove', pointermove)
      window.removeEventListener('keyup', keyup)
    }
  }, [text, size, camera, scene, hovered])

  useFrame((state, delta) => {
    easing.damp3(ref.current.position, lastVec.current, 0, delta)
  })

  return (
    <group visible={ready} ref={ref}>
      <Html style={{ userSelect: 'none', left: 10, top: -10, width: 300, visibility: hovered || ready ? 'visible' : 'hidden' }}>
        <RightOutlined style={{ marginRight: 10, color: hovered && ready ? '#20ff60' : hovered ? '#20af60' : ready ? 'black' : 'gray' }} />
        {text}
      </Html>
    </group>
  )
}
