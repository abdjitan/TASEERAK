// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function fetchNotifications() {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
    setLoading(false)
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function markAllAsRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId!)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
