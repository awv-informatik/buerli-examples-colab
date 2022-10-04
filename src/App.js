import * as THREE from 'three'
import React, { useRef, useEffect, useState, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PivotControls, OrbitControls, Html } from '@react-three/drei'
import { Room, useStore } from './liveblocks'
import { easing } from 'maath'
import { CloseOutlined, RightOutlined } from '@ant-design/icons'
import { Avatar, Comment } from 'antd'
import { v4 } from 'uuid'
import { solid } from '@buerli.io/headless'
import { init, SocketIOClient } from '@buerli.io/classcad'
import { useBuerli, BuerliGeometry } from '@buerli.io/react'


init((id) => {
  const client = new SocketIOClient('ws://localhost:9091/', id)
  console.info(id)
  return client
}, {
  config: {
    geometry: {
      disabled: false,
      edges: { hidden: false, opacity: 1.0, color: 'black' },
      points: { hidden: true, opacity: 1.0, color: 'black' },
      meshes: { hidden: false, opacity: 1.0, wireframe: false },
    }
  }
})

export default function App() {
  return (
    <>
      <Room />
      <Canvas eventSource={document.getElementById('root')} eventPrefix="client" camera={{ position: [-10, 10, 10], fov: 20 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Shape name="box">
          <boxGeometry />
          <Annotations />
        </Shape>
        <Shape name="sphere" position={[4, 0, 0]}>
          <sphereGeometry args={[0.5]} />
          <Annotations />
        </Shape>
        <Part />
        <OrbitControls makeDefault />
        <Cursor />
        <Others />
        <Annotations global />
      </Canvas>
    </>
  )
}

function Part() {
  const drawingId = useBuerli(state => state.drawing.active)
  const cad = new solid()
  useEffect(() => {
    cad.init(async api => {
      try {
        await create(api)
      } catch (error) {
        console.error('Something went wrong: ', error)
      }
    })
    return () => {
      //
    }
  }, [])
  return <group>
    {drawingId && <BuerliGeometry drawingId={drawingId} />}
  </group>
}

const create = async(api) => {
  const shape = new THREE.Shape()
  shape.lineTo(100, 0)
  shape.lineTo(100, 20)
  shape.lineTo(20, 20)
  shape.lineTo(20, 50)
  shape.lineTo(10, 50)
  shape.lineTo(10, 100)
  shape.lineTo(0, 100)
  shape.lineTo(0, 0)
  const basicBody = api.extrude([0, 0, 100], shape)
  const edges1 = api.pick(
    basicBody,
    'edge',
    [100, 10, 0],
    [100, 10, 100],
    [5, 100, 100],
    [5, 100, 0],
  )
  const edges2 = api.pick(basicBody, 'edge', [10, 50, 50], [0, 0, 50], [20, 20, 50])
  api.fillet(5, edges1)
  api.fillet(5, edges2)
  const cyl1 = api.cylinder(200, 40)
  api.moveTo(cyl1, [-50, 50, 50])
  api.rotateTo(cyl1, [0, Math.PI / 2, 0])
  const cyl2 = api.cylinder(200, 40)
  api.moveTo(cyl2, [55, 50, 50])
  api.rotateTo(cyl2, [Math.PI / 2, 0, 0])
  api.subtract(basicBody, false, cyl1, cyl2)
  api.offset(basicBody, 1)
  return
}

function Cursor() {
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
        setCursor((lastVecLocal.current = entry.object.worldToLocal(entry.point).toArray()))
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
      if (key === '/') {
        setReady(true)
      } else if (code === 'Escape') {
        setText('')
        setReady(false)
      } else if (code === 'Enter') {
        addAnnotation(v4(), hovered ? lastVecLocal.current : lastVec.current, text, hovered)
        setText('')
        setReady(false)
      } else if (code === 'Backspace') {
        if (text.length <= 1) setReady(false)
        setText((text) => text.slice(0, -1))
      } else if (key.length === 1) {
        setText((text) => text + key)
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

function Annotations({ global }) {
  const ref = useRef()
  const [filter, setFilter] = useState('')
  const annotations = useStore((state) => state.annotations)
  useEffect(() => {
    setFilter(ref.current.parent.name)
  }, [])
  return (
    <group ref={ref}>
      {annotations
        .filter((item) => (global ? !item.parent : item.parent === filter))
        .map((item, index) => (
          <Annotation key={index} {...item} />
        ))}
    </group>
  )
}

const Annotation = memo(({ id, position, text, parent }) => {
  const ref = useRef()
  const removeAnnotation = useStore((state) => state.removeAnnotation)
  return (
    <group ref={ref} position={position}>
      <Html className="annotation">
        <Comment
          author={<a>User</a>}
          avatar={<Avatar src="https://joeschmoe.io/api/v1/random" />}
          content={<p>{text}</p>}
          datetime={
            <>
              <span>8 hours ago</span>
              <CloseOutlined style={{ marginLeft: 10 }} onClick={() => removeAnnotation(id)} />
            </>
          }
        />
      </Html>
    </group>
  )
})

function Others() {
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
        <group key={index}>
          <Html center style={{ left: 50, whiteSpace: 'nowrap' }}>
            <Avatar src="https://joeschmoe.io/api/v1/random" />
          </Html>
        </group>
      ))}
    </group>
  )
}

function Shape({ children, name, ...props }) {
  const ref = useRef()
  const setMatrix = useStore((state) => state.setMatrix)
  const [dragging, drag] = useState(false)
  const [mat] = useState(() => new THREE.Matrix4())
  useEffect(
    () =>
      useStore.subscribe((state) => {
        if (state.objects[name]) mat.fromArray(state.objects[name])
      }),
    []
  )
  useFrame((state, delta) => {
    easing.dampM(ref.current.matrix, mat, dragging ? 0 : 0.1, delta)
  })
  return (
    <PivotControls
      ref={ref}
      autoTransform={false}
      onDragStart={() => drag(true)}
      onDragEnd={() => drag(false)}
      onDrag={(matrix) => setMatrix(name, [...matrix.elements])}
      anchor={[1, 1, 1]}
      rotation={[Math.PI, -Math.PI / 2, 0]}>
      <mesh name={name} {...props}>
        {children}
        <meshStandardMaterial />
      </mesh>
    </PivotControls>
  )
}
