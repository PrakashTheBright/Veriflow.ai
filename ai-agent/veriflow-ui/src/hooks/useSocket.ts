import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface TestStatus {
  status: 'pending' | 'running' | 'passed' | 'failed'
  progress: number
  message: string
  duration?: number
  reportPath?: string
  executionId?: string
}

type TestStatusCallback = (status: TestStatus) => void

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const listenersRef = useRef<Map<string, TestStatusCallback>>(new Map())

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  const subscribeToTest = useCallback((testId: string, callback: TestStatusCallback) => {
    if (!socketRef.current) return

    const eventName = `test:${testId}:status`

    // Remove any previously registered listener for this testId to prevent accumulation.
    // socket.on() is additive — without this guard, multiple calls stack listeners and
    // each socket event fires once per accumulated listener.
    const prev = listenersRef.current.get(testId)
    if (prev) {
      socketRef.current.off(eventName, prev)
      listenersRef.current.delete(testId)
    }

    // Store new callback and register exactly one listener
    listenersRef.current.set(testId, callback)
    socketRef.current.emit('subscribe:test', testId)
    socketRef.current.on(eventName, callback)

    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(eventName, callback)
        socketRef.current.emit('unsubscribe:test', testId)
        listenersRef.current.delete(testId)
      }
    }
  }, [])

  const unsubscribeFromTest = useCallback((testId: string) => {
    if (!socketRef.current) return

    const callback = listenersRef.current.get(testId)
    if (callback) {
      socketRef.current.off(`test:${testId}:status`, callback)
      socketRef.current.emit('unsubscribe:test', testId)
      listenersRef.current.delete(testId)
    }
  }, [])

  return {
    socket: socketRef.current,
    subscribeToTest,
    unsubscribeFromTest,
    isConnected: socketRef.current?.connected ?? false,
  }
}

export default useSocket
