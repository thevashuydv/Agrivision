import { useEffect, useState } from 'react'
import { useAuth, SignInButton } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import { parseJson } from '../lib/api'

const MAX_MSGS = 20

type Msg = { role: 'user' | 'assistant'; content: string }

type ChatApiResponse = {
  reply?: string | null
  error?: string
  source?: string
}

type FarmChatProps = { embedded?: boolean }

export function FarmChat({ embedded = false }: FarmChatProps) {
  const { t, i18n } = useTranslation()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: t('chat.welcome') },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isSignedIn) setErr(null)
  }, [isSignedIn])

  async function send() {
    const text = input.trim()
    if (!text || pending) return
    if (!isSignedIn) {
      setErr(t('chat.signInRequired'))
      return
    }
    setErr(null)
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setPending(true)
    const slim = next.slice(-MAX_MSGS)
    try {
      const lang = i18n.language.startsWith('hi') ? 'hi' : 'en'
      const token = (await getToken()) || (await getToken({ skipCache: true }))
      if (!token) {
        setMessages((prev) => prev.slice(0, -1))
        setInput(text)
        setErr(t('chat.tokenWait'))
        setPending(false)
        return
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ messages: slim, language: lang }),
      })
      const body = await parseJson<ChatApiResponse>(res)
      if (res.status === 401) {
        setMessages((prev) => prev.slice(0, -1))
        setInput(text)
        setErr(t('chat.sessionNotVerified'))
        return
      }
      if (res.status === 429) {
        setMessages((prev) => prev.slice(0, -1))
        setInput(text)
        setErr(body.reply || t('chat.rateLimited'))
        return
      }
      if (body.error === 'content_policy' && body.reply) {
        const c = String(body.reply)
        setMessages((prev) => [...prev, { role: 'assistant', content: c }])
        return
      }
      const out = body.reply
      if (!res.ok || out == null || out === '') {
        setMessages((prev) => prev.slice(0, -1))
        setInput(text)
        setErr(t('chat.error'))
        return
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: String(out) }])
    } catch {
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
      setErr(t('chat.error'))
    } finally {
      setPending(false)
    }
  }

  if (!isLoaded) {
    return <div className="rounded-2xl border border-ds-border p-6 text-sm text-ink-faint">…</div>
  }

  return (
    <div
      className={`flex h-[min(28rem,70vh)] flex-col rounded-2xl border border-ds-border bg-void-2/30 shadow-sm ${embedded ? 'border-0 bg-transparent shadow-none' : ''}`}
    >
      {embedded ? null : (
        <div className="border-b border-ds-border px-4 py-2">
          <p className="text-sm font-semibold text-ink">{t('chat.title')}</p>
          {!isSignedIn ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-amber-200/90">{t('chat.signInRequired')}</span>
              <SignInButton mode="modal">
                <button type="button" className="ds-btn-primary rounded-md px-2 py-1 text-xs">
                  {t('auth.signIn')}
                </button>
              </SignInButton>
            </div>
          ) : null}
        </div>
      )}
      {embedded && !isSignedIn && isLoaded ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/35 px-3 py-2 text-xs text-amber-50">
          <span>{t('chat.signInRequired')}</span>
          <SignInButton mode="modal">
            <button type="button" className="ds-btn-primary rounded-md px-2 py-1 text-xs">
              {t('auth.signIn')}
            </button>
          </SignInButton>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-6 rounded-xl border border-indigo-cta/30 bg-indigo-cta/15 px-3 py-2 text-ink'
                : 'mr-6 rounded-xl border border-ds-border bg-void-2/50 px-3 py-2 text-ink/95'
            }
          >
            {m.content}
          </div>
        ))}
        {pending ? <p className="text-xs text-ink-faint">{t('chat.thinking')}</p> : null}
        {err ? <p className="text-xs text-red-300">{err}</p> : null}
      </div>
      <form
        className="border-t border-ds-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="ds-input min-w-0 flex-1 rounded-lg disabled:opacity-50"
            maxLength={2000}
            autoComplete="off"
            disabled={!isSignedIn || pending}
          />
          <button
            type="submit"
            disabled={pending || !isSignedIn}
            className="ds-btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {t('chat.send')}
          </button>
        </div>
      </form>
    </div>
  )
}
