import { useEffect } from 'react'
import { createClient } from '@liveblocks/client'
import { middleware } from '@liveblocks/zustand'
import create from 'zustand'

const client = createClient({ publicApiKey: 'pk_live_U6LmOYf1xVSUvCB1_t7EE7Vy' })

const useStore = create(
  middleware(
    (set) => ({
      annotations: [],
      cursor: [0, 0, 0],
      objects: {},
      setCursor: (cursor) => set({ cursor }),
      setMatrix: (name, matrix) => set((state) => ({ objects: { ...state.objects, [name]: matrix } })),
      addAnnotation: (id, position, text, parent) =>
        set((state) => ({ ...state, annotations: [...state.annotations, { id, position, text, parent }] })),
      removeAnnotation: (id) => set((state) => ({ ...state, annotations: state.annotations.filter((o) => o.id !== id) }))
    }),
    {
      client,
      presenceMapping: { cursor: true },
      storageMapping: { objects: true, annotations: true }
    }
  )
)

const Room = ({ id = 'buerli-meta-8', children }) => {
  const {
    liveblocks: { enterRoom, leaveRoom }
  } = useStore()

  useEffect(() => {
    enterRoom(id, {
      objects: {},
      annotations: []
    })
    return () => leaveRoom(id)
  }, [enterRoom, leaveRoom])

  return children
}

export { Room, useStore }
