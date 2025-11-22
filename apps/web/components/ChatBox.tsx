'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Paper,
  ScrollArea,
  Group,
  Badge,
  Button,
  Divider,
  Box,
} from '@mantine/core';
import { IconSend, IconMessage } from '@tabler/icons-react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'DRIVER';
  senderName?: string;
  message: string;
  isQuickMessage: boolean;
  isRead: boolean;
  createdAt: string;
}

interface QuickMessage {
  text: string;
}

interface ChatBoxProps {
  opened: boolean;
  onClose: () => void;
  rideId: string;
  userType: 'CUSTOMER' | 'DRIVER';
  token: string;
}

export default function ChatBox({ opened, onClose, rideId, userType, token }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!opened) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
    });

    socketInstance.on('connect', () => {
      // Join room for this user type
      const userId = JSON.parse(atob(token.split('.')[1])).userId;
      socketInstance.emit('join', `${userType.toLowerCase()}:${userId}`);
    });

    socketInstance.on('new_message', (data: any) => {
      // Only add message if it's for this ride
      if (data.rideId === rideId) {
        const newMsg: ChatMessage = {
          id: data.messageId,
          senderId: data.senderId,
          senderType: data.senderType,
          senderName: data.senderName,
          message: data.message,
          isQuickMessage: data.isQuickMessage,
          isRead: false,
          createdAt: data.createdAt,
        };
        setMessages((prev) => [...prev, newMsg]);

        // Mark as read if chat is open
        markAsRead();
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [opened, rideId, token, userType]);

  // Load messages when modal opens
  useEffect(() => {
    if (opened) {
      loadMessages();
      loadQuickMessages();
    }
  }, [opened, rideId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${rideId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadQuickMessages = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/quick-messages?userType=${userType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuickMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading quick messages:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/${rideId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (message: string, isQuickMessage = false) => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${rideId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message, isQuickMessage }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage, false);
  };

  const handleQuickMessage = (message: string) => {
    sendMessage(message, true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconMessage size={20} />
          <Text fw={500}>Messagerie</Text>
        </Group>
      }
      size="lg"
      styles={{
        body: { height: 'calc(80vh - 60px)', display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack gap="md" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Quick Messages */}
        {quickMessages.length > 0 && (
          <Box>
            <Text size="xs" c="dimmed" mb="xs">
              Messages rapides
            </Text>
            <Group gap="xs">
              {quickMessages.map((msg, index) => (
                <Button
                  key={index}
                  size="xs"
                  variant="light"
                  onClick={() => handleQuickMessage(msg)}
                  disabled={loading}
                >
                  {msg}
                </Button>
              ))}
            </Group>
            <Divider my="sm" />
          </Box>
        )}

        {/* Messages */}
        <ScrollArea
          style={{ flex: 1 }}
          viewportRef={viewport}
          styles={{ viewport: { paddingBottom: 10 } }}
        >
          <Stack gap="xs">
            {messages.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" py="xl">
                Aucun message pour le moment
              </Text>
            ) : (
              messages.map((msg) => {
                const isCurrentUser = msg.senderType === userType;
                return (
                  <Box
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Paper
                      p="xs"
                      radius="md"
                      style={{
                        maxWidth: '70%',
                        backgroundColor: isCurrentUser ? '#228be6' : '#f1f3f5',
                        color: isCurrentUser ? 'white' : 'inherit',
                      }}
                    >
                      {!isCurrentUser && msg.senderName && (
                        <Text size="xs" fw={500} mb={4}>
                          {msg.senderName}
                        </Text>
                      )}
                      <Text size="sm" style={{ wordBreak: 'break-word' }}>
                        {msg.message}
                      </Text>
                      <Group gap={4} mt={4} justify="space-between">
                        <Text size="xs" c={isCurrentUser ? 'gray.3' : 'dimmed'}>
                          {formatTime(msg.createdAt)}
                        </Text>
                        {msg.isQuickMessage && (
                          <Badge size="xs" variant="dot" color={isCurrentUser ? 'white' : 'blue'}>
                            Rapide
                          </Badge>
                        )}
                      </Group>
                    </Paper>
                  </Box>
                );
              })
            )}
            <div ref={scrollRef} />
          </Stack>
        </ScrollArea>

        {/* Input */}
        <Group gap="xs" align="flex-end">
          <TextInput
            placeholder="Tapez votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <ActionIcon
            size="lg"
            variant="filled"
            color="blue"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Modal>
  );
}
