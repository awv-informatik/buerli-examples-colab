import * as THREE from 'three'
import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, PivotControls, OrbitControls, Center } from '@react-three/drei'
import { easing } from 'maath'
import { useControls } from 'leva'
import debounce from 'lodash-es/debounce'
import { create, solid } from './buerli/index'
import { useStore, Room, Others, Annotations, Cursor } from './liveblocks'

const { cache } = create(solid, 'wss://01.service.classcad.ch')

function Part() {
  const setPart = useStore((state) => state.setPart)
  const { width, cut1, cut2, offset } = useStore((state) => state.part)
  const [, setLeva] = useControls(
    () => ({
      width: { value: 100, min: 50, max: 150, step: 10, onChange: debounce((v) => setPart({ width: v }), 100) },
      cut1: { value: 40, min: 10, max: 40, step: 10, onChange: debounce((v) => setPart({ cut1: v }), 100) },
      cut2: { value: 40, min: 10, max: 50, step: 10, onChange: debounce((v) => setPart({ cut2: v }), 100) },
      offset: { value: 1, min: 0, max: 2, step: 0.1, onChange: debounce((v) => setPart({ offset: v }), 100) }
    }),
    {}
  )

  useEffect(() => {
    return useStore.subscribe(
      (part) => setLeva(part),
      (state) => state.part
    )
  }, [])

  console.log(width, cut1, cut2, offset)
  const geometry = cache(
    async (api, width, cut1, cut2, offset) => {
      console.log('recalc', width, cut1, cut2, offset)
      const points = [[0, 0], [100, 0], [100, 20], [20, 20], [20, 50], [10, 50], [10, 100], [0, 100], [0, 0]] // prettier-ignore
      const shape = new THREE.Shape(points.map((xy) => new THREE.Vector2(...xy)))
      const basicBody = api.extrude([0, 0, width], shape)
      const edges1 = api.pick(basicBody, 'edge', [100, 10, 0], [100, 10, 100], [5, 100, 100], [5, 100, 0])
      const edges2 = api.pick(basicBody, 'edge', [10, 50, 50], [0, 0, 50], [20, 20, 50])
      api.fillet(5, edges1)
      api.fillet(5, edges2)
      const cyl1 = api.cylinder(300, cut1)
      api.moveTo(cyl1, [-50, 50, 50])
      api.rotateTo(cyl1, [0, Math.PI / 2, 0])
      const cyl2 = api.cylinder(300, cut2)
      api.moveTo(cyl2, [55, 50, 50])
      api.rotateTo(cyl2, [Math.PI / 2, 0, 0])
      api.subtract(basicBody, false, cyl1, cyl2)
      const id = api.offset(basicBody, offset)
      return await api.createBufferGeometry(id)
    },
    [width, cut1, cut2, offset]
  )
  return (
    <Shape name="buerli" scale={0.01} geometry={geometry}>
      <meshStandardMaterial color="orange" />
    </Shape>
  )
}

export default function App() {
  return (
    <Room>
      <Canvas eventSource={document.getElementById('container')} eventPrefix="client" camera={{ position: [-10, 10, 10], fov: 20 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        <Shape name="box">
          <boxGeometry />
          <meshStandardMaterial />
        </Shape>
        <Shape name="sphere" position={[4, 0, 0]}>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial />
        </Shape>
        <OrbitControls makeDefault />
        <Cursor />
        <Others />
        <Suspense fallback={null}>
          <Part />
        </Suspense>
        <Environment preset="warehouse" />
      </Canvas>
    </Room>
  )
}

function Shape({ children, name, anchor = [1, 1, 1], ...props }) {
  const ref = useRef()
  const setMatrix = useStore((state) => state.setMatrix)
  const [dragging, drag] = useState(false)
  const [mat] = useState(() => new THREE.Matrix4())
  useEffect(
    () =>
      useStore.subscribe(
        (objects) => objects[name] && mat.fromArray(objects[name]),
        (state) => state.objects
      ),
    []
  )
  useFrame((state, delta) => easing.dampM(ref.current.matrix, mat, dragging ? 0 : 0.1, delta))
  return (
    <PivotControls
      ref={ref}
      autoTransform={false}
      onDragStart={() => drag(true)}
      onDragEnd={() => drag(false)}
      onDrag={(matrix) => setMatrix(name, [...matrix.elements])}
      anchor={anchor}
      rotation={[Math.PI, -Math.PI / 2, 0]}>
      <Center>
        <mesh name={name} {...props}>
          {children}
          <Annotations />
        </mesh>
      </Center>
    </PivotControls>
  )
}
