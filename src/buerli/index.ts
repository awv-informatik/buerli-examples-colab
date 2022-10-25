import { init, SocketIOClient } from '@buerli.io/classcad'
import { BuerliOptions } from '@buerli.io/core'
import { history, solid } from '@buerli.io/headless'
import { suspend, peek, preload } from 'suspend-react'
export * from '@buerli.io/headless'

type Tuple<T = any> = [T] | T[]
type Await<T> = T extends Promise<infer V> ? V : never

export const create = <Return>(impl: typeof solid | typeof history, url: string, config?: Partial<BuerliOptions>) => {
  init((id) => new SocketIOClient(url, id), config)
  const instance = new impl()
  const api = new Promise<Return>((res) => instance.init((api) => res((api as unknown) as Return)))
  return {
    suspend,
    cache: <Keys extends Tuple<unknown>, Fn extends (api: Return, ...keys: Keys) => Promise<unknown>>(callback: Fn, dependencies: Keys) =>
      suspend(async (...keys: Keys) => callback(await api, ...keys) as Await<ReturnType<Fn>>, dependencies),
    run: async <Fn extends (api: Return) => Promise<unknown>>(callback: Fn) => callback(await api) as Await<ReturnType<Fn>>,
    peek: <Keys extends Tuple<unknown>>(dependencies: Keys) => peek(dependencies),
    preload: <Keys extends Tuple<unknown>, Fn extends (api: Return, ...keys: Keys) => Promise<unknown>>(callback: Fn, dependencies: Keys) =>
      preload(async (...keys: Keys) => callback(await api, ...keys), dependencies)
  }
}
