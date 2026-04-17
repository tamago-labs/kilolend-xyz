"use client";

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'react-feather';
import { AIWalletStatus } from '@/services/aiWalletService';
import { aiChatServiceV2 } from '@/services/AIChatServiceV2';
import {
  ContentCard,
  CardHeader,
  CardTitle, 
} from '../DesktopAgentWalletsV2Page.styles';

interface ActivityLogContentProps {
  aiWalletData: AIWalletStatus | null;
  isLoadingAIWallet: boolean;
}

interface ActivityItem {
  id: string;
  type: 'chat_message';
  timestamp: string;
  title: string;
  description: string;
  metadata: {
    role: string;
    fullContent: string;
    messageId: number;
  };
}

// Styled components for the activity items
const ActivityContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const ActivityItem = styled.div`
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const ActivityIcon = styled.div`
  font-size: 20px;
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityTitle = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  font-size: 14px;
`;

const ActivityDescription = styled.div`
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
  word-break: break-word;
`;

const ActivityTimestamp = styled.div`
  color: #94a3b8;
  font-size: 12px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  gap: 16px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #06C755;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ClearButton = styled.button`
  padding: 8px 16px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  &:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ActivityLogContent: React.FC<ActivityLogContentProps> = ({ 
  aiWalletData, 
  isLoadingAIWallet 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default chain ID (no selector as per requirements)
  const DEFAULT_CHAIN_ID = 8217;

  // Load activities using same pattern as DesktopAIChatPanelV2
  const loadActivities = async () => {
    if (!aiWalletData?.aiWalletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Same API call as DesktopAIChatPanelV2
      const response = await aiChatServiceV2.getMessages(
        aiWalletData.aiWalletAddress, 
        DEFAULT_CHAIN_ID
      );

      console.log("Activity log response:", response);
      
      // Transform chat messages to activity items
      const activityItems: ActivityItem[] = response.messages.map(msg => ({
        id: `activity-${msg.message_id}`,
        type: 'chat_message' as const,
        timestamp: msg.created_at,
        title: msg.role === 'user' ? '💬 You asked a question' : '🤖 AI Agent responded',
        description: msg.content.substring(0, 120) + (msg.content.length > 120 ? '...' : ''),
        metadata: {
          role: msg.role,
          fullContent: msg.content,
          messageId: msg.message_id
        }
      }));
      
      // Sort by timestamp (newest first)
      setActivities(activityItems.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
      
    } catch (error) {
      console.error('Failed to load activity log:', error);
      setError('Failed to load activity log. Please try again later.');
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load once on mount (no auto-refresh)
  useEffect(() => {
    if (aiWalletData?.hasWallet && aiWalletData.aiWalletAddress && !isLoadingAIWallet) {
      loadActivities();
    }
  }, [aiWalletData?.aiWalletAddress, isLoadingAIWallet]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Clear chat history using same API as DesktopAIChatPanelV2
  const handleClearChatHistory = async () => {
    if (!aiWalletData?.aiWalletAddress) return;
    
    setIsClearing(true);
    setError(null);
    
    try {
      // Same API call as DesktopAIChatPanelV2
      await aiChatServiceV2.deleteMessages(aiWalletData.aiWalletAddress, DEFAULT_CHAIN_ID);
      
      // Clear local state
      setActivities([]);
      console.log('Chat history cleared successfully');
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      setError('Failed to clear chat history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Loading state
  if (isLoadingAIWallet || isLoading) {
    return (
      <ContentCard>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <LoadingContainer>
          <LoadingSpinner />
          <div style={{ color: '#64748b', fontSize: '16px' }}>
            Loading activity log...
          </div>
        </LoadingContainer>
      </ContentCard>
    );
  }

  // No AI wallet state
  if (!aiWalletData?.hasWallet) {
    return (
      <ContentCard>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <EmptyState>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Create AI Wallet First
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
            Create an AI wallet to start chatting and see your activity here.
          </p>
        </EmptyState>
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <CardTitle>Activity Log</CardTitle>
        {activities.length > 0 && (
          <ClearButton 
            onClick={handleClearChatHistory}
            disabled={isClearing}
          >
            <Trash2 size={16} />
            {isClearing ? 'Clearing...' : 'Clear Chat History'}
          </ClearButton>
        )}
      </CardHeader>
      
      {error && (
        <ErrorMessage>
          <span>⚠️</span>
          {error}
        </ErrorMessage>
      )}
      
      {activities.length === 0 ? (
        <EmptyState>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            No activity yet
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
            Start chatting with your AI agent to see your activity here.
          </p>
        </EmptyState>
      ) : (
        <ActivityContainer>
          {activities.map(activity => (
            <ActivityItem key={activity.id}>
              <ActivityIcon>
                {activity.metadata.role === 'user' ? '💬' : '🤖'}
              </ActivityIcon>
              <ActivityContent>
                <ActivityTitle>{activity.title}</ActivityTitle>
                <ActivityDescription>{activity.description}</ActivityDescription>
                <ActivityTimestamp>{formatTimestamp(activity.timestamp)}</ActivityTimestamp>
              </ActivityContent>
            </ActivityItem>
          ))}
        </ActivityContainer>
      )}
    </ContentCard>
  );
};