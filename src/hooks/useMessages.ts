'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message } from '@/types'
import { toast } from 'sonner'

export function useConversations(userId?: string, role?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    fetchConversations()

    const channel = supabase
      .channel(`conversations-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
      }, () => fetchConversations())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function fetchConversations() {
    setLoading(true)
    const field = role === 'contractor' ? 'contractor_id' : 'supplier_id'
    const otherField = role === 'contractor' ? 'supplier_id' : 'contractor_id'
    const otherTable = role === 'contractor' ? 'supplier' : 'contractor'

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        ${otherTable}:${otherField}(id, company_name_ar, rating_avg, verification_status)
      `)
      .eq(field, userId!)
      .order('last_message_at', { ascending: false })

    if (!error && data) setConversations(data as Conversation[])
    setLoading(false)
  }

  return { conversations, loading, refresh: fetchConversations }
}

export function useMessages(conversationId?: string, currentUserId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return
    fetchMessages()
    markAsRead()

    // Real-time messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, sender:sender_id(id, company_name_ar)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setMessages(prev => [...prev, data as Message])
          scrollToBottom()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function fetchMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, company_name_ar)')
      .eq('conversation_id', conversationId!)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as Message[])
      scrollToBottom()
    }
    setLoading(false)
  }

  async function markAsRead() {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId!)
      .neq('sender_id', currentUserId!)
  }

  async function sendMessage(content: string, type: 'text' | 'offer' = 'text', offerId?: string) {
    if (!content.trim() && type === 'text') return
    setSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        type,
        content,
        offer_id: offerId,
      })

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message: type === 'text' ? content : '📎 عرض سعر',
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId!)

    if (error) toast.error('لم يتم إرسال الرسالة')
    setSending(false)
  }

  async function getOrCreateConversation(contractorId: string, supplierId: string, rfqId?: string) {
    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplierId)
      .single()

    if (existing) return existing.id

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({ contractor_id: contractorId, supplier_id: supplierId, rfq_id: rfqId })
      .select('id')
      .single()

    if (error) { toast.error('حدث خطأ'); return null }
    return data.id
  }

  return {
    messages, loading, sending, bottomRef,
    sendMessage, getOrCreateConversation,
  }
}
