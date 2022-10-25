import { useRef, useLayoutEffect, useState, memo } from 'react'
import { Html } from '@react-three/drei'
import { useStore } from './store'
import { CloseOutlined } from '@ant-design/icons'
import { Avatar, Comment } from 'antd'

export function Annotations() {
  const ref = useRef()
  const [filter, setFilter] = useState(null)
  const annotations = useStore((state) => state.annotations)
  useLayoutEffect(() => {
    setFilter(ref.current.parent.name)
  }, [])
  return (
    <group ref={ref}>
      {filter && annotations.filter((item) => item.parent === filter).map((item, index) => <Annotation key={index} {...item} />)}
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
