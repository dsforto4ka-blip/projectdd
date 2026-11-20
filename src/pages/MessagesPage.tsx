import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Shield, Paperclip, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { subscribeChatMessages, uploadWorkspaceFile, formatTimestamp } from '../lib/firestoreService';
import { useAppStore } from '../lib/store';
import type { ChatMessage } from '../types';

export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const requestedChatId = searchParams.get('chat');

  const { userPrivate, firebaseUser } = useAuth();
  const { chats, sendMessage } = useMarketplaceData();
  const demoMessages = useAppStore((s) => s.demoMessages);

  const myChats = useMemo(
    () =>
      chats.filter(
        (c) => userPrivate && (c.clientId === userPrivate.uid || c.freelancerId === userPrivate.uid)
      ),
    [chats, userPrivate]
  );

  const [selectedChatId, setSelectedChatId] = useState<string | null>(requestedChatId || null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeChat =
    myChats.find((c) => c.id === selectedChatId) || myChats[0] || null;

  useEffect(() => {
    if (requestedChatId) setSelectedChatId(requestedChatId);
  }, [requestedChatId]);

  useEffect(() => {
    if (!firebaseUser || !activeChat) return;
    const unsub = subscribeChatMessages(activeChat.id, (msgs) => {
      setLiveMessages(msgs);
    });
    return () => unsub();
  }, [firebaseUser, activeChat]);

  if (!userPrivate) return null;

  const messages = activeChat
    ? firebaseUser
      ? liveMessages
      : demoMessages[activeChat.id] || []
    : [];

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    try {
      if (firebaseUser) {
        const url = await uploadWorkspaceFile(`chats/${activeChat.id}`, file);
        setAttachment({ name: file.name, url });
      } else {
        setAttachment({
          name: file.name,
          url: `https://files.vibeworking.ru/chat/${encodeURIComponent(file.name)}`,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось прикрепить файл.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || (!text.trim() && !attachment)) return;
    setErrorMsg(null);
    try {
      await sendMessage(
        activeChat,
        text.trim() || `Прикреплён файл: ${attachment?.name}`,
        attachment || undefined
      );
      setText('');
      setAttachment(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не удалось отправить сообщение.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white mb-6">
        Сообщения
      </h1>

      {myChats.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl p-10 text-center">
          <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-neutral-900 dark:text-white">
            Диалогов пока нет
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Чаты появляются после приглашения на собеседование или создания контракта.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-2xl overflow-hidden min-h-[540px]">
          {/* Threads Sidebar */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-dark-border divide-y divide-neutral-100 dark:divide-dark-border">
            {myChats.map((room) => {
              const peerName =
                room.clientId === userPrivate.uid ? room.freelancerName : room.clientName;
              const selected = activeChat?.id === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedChatId(room.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    selected
                      ? 'bg-brand-soft dark:bg-brand/15'
                      : 'hover:bg-neutral-50 dark:hover:bg-dark-elevated/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {peerName}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {room.isHired ? 'В работе' : 'Собеседование'}
                    </span>
                  </div>
                  <p className="text-xs text-brand-text dark:text-brand truncate mt-0.5">
                    {room.jobTitle}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-1">
                    {room.lastMessage}
                  </p>
                </button>
              );
            })}
          </aside>

          {/* Active Chat Stream */}
          {activeChat && (
            <div className="lg:col-span-8 flex flex-col">
              <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-dark-border flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {activeChat.clientId === userPrivate.uid
                      ? activeChat.freelancerName
                      : activeChat.clientName}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{activeChat.jobTitle}</p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                  <Shield className="w-3.5 h-3.5 text-brand-text dark:text-brand" aria-hidden="true" />
                  <span>
                    {activeChat.isHired
                      ? 'Контракт активен · Рабочий чат открыт'
                      : 'До найма · Контакты и ссылки скрываются'}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[380px]">
                {messages.map((m) => {
                  const mine = m.senderId === userPrivate.uid;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-brand text-brand-ink font-medium'
                            : 'bg-neutral-100 dark:bg-dark-elevated text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        <p className="leading-relaxed">{m.text}</p>
                        {m.attachmentName && (
                          <a
                            href={m.attachmentUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-block text-xs underline opacity-90"
                          >
                            {m.attachmentName}
                          </a>
                        )}
                      </div>
                      <span className="mt-1 text-[11px] text-neutral-400">
                        {m.senderName} · {formatTimestamp(m.createdAt)}
                        {m.wasFiltered ? ' · Отфильтровано' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="px-5 py-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-t border-rose-200 dark:border-rose-900">
                  {errorMsg}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-neutral-200 dark:border-dark-border flex items-center gap-2"
              >
                <label
                  aria-label="Прикрепить файл"
                  className="p-2.5 rounded-lg border border-neutral-300 dark:border-dark-border text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-elevated cursor-pointer shrink-0"
                >
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  <input type="file" onChange={handleAttach} className="sr-only" />
                </label>

                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    attachment
                      ? `Файл: ${attachment.name} — добавьте комментарий...`
                      : 'Напишите сообщение...'
                  }
                  aria-label="Текст сообщения"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-input text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />

                <button
                  type="submit"
                  aria-label="Отправить сообщение"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Отправить</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
