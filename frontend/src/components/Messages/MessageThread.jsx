import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Image,
  X,
  Download,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Archive,
  Flag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const MessageThread = ({ thread, onBack, onThreadUpdate, onNewMessage }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [thread.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (thread.shouldRefresh) {
      loadMessages();
    }
  }, [thread.shouldRefresh]);

  const loadMessages = async () => {
    try {
      const response = await messagesAPI.getThreadMessages(thread.id);
      setMessages(response.data.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && attachments.length === 0) {
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('message_text', newMessage);
      
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });

      const response = await messagesAPI.sendMessage(thread.id, formData);
      
      setMessages(prev => [...prev, response.data.data.message]);
      setNewMessage('');
      setAttachments([]);
      onNewMessage();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleThreadStatusUpdate = async (status) => {
    try {
      await messagesAPI.updateThread(thread.id, { status });
      onThreadUpdate({ ...thread, status });
      setShowMenu(false);
      toast.success(`Thread ${status === 'closed' ? 'closed' : 'updated'} successfully`);
    } catch (error) {
      console.error('Error updating thread:', error);
      toast.error('Error updating thread');
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return Image;
    return Paperclip;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div>
            <h3 className="font-medium text-gray-900">{thread.subject}</h3>
            <p className="text-sm text-gray-500">
              {user.user_type === 'tenant' 
                ? (thread.assigned_name || 'Management')
                : thread.tenant_name
              }
              {thread.property_name && ` • ${thread.property_name}`}
              {thread.unit_number && ` • Unit ${thread.unit_number}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(thread.status)}`}>
            {thread.status}
          </span>
          
          {(user.user_type === 'admin' || user.user_type === 'manager') && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleThreadStatusUpdate('urgent')}
                      className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Mark as Urgent
                    </button>
                    <button
                      onClick={() => handleThreadStatusUpdate('resolved')}
                      className="flex items-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </button>
                    <button
                      onClick={() => handleThreadStatusUpdate('closed')}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Close Thread
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner size="medium" />
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwn = message.sender_id === user.id;
              const attachments = message.attachments ? JSON.parse(message.attachments) : [];
              
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                      ? 'bg-blue-600 text-white' 
                      : message.is_internal 
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-white text-gray-900 shadow'
                  }`}>
                    {/* Message Header */}
                    {!isOwn && (
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span className="text-xs font-medium">{message.sender_name}</span>
                        </div>
                        {message.is_internal && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                            Internal
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.message_text}
                    </p>
                    
                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachments.map((attachment, index) => {
                          const FileIcon = getFileIcon(attachment.mimetype);
                          return (
                            <div key={index} className={`flex items-center space-x-2 p-2 rounded ${
                              isOwn ? 'bg-blue-500' : 'bg-gray-100'
                            }`}>
                              <FileIcon className="h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs truncate">{attachment.originalName}</p>
                                <p className="text-xs opacity-75">{formatFileSize(attachment.size)}</p>
                              </div>
                              <button className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-500 ${
                                isOwn ? 'text-blue-100' : 'text-gray-600'
                              }`}>
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Message Time */}
                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatMessageTime(message.created_at)}
                      {message.is_read && isOwn && (
                        <CheckCircle className="h-3 w-3 inline ml-1" />
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      {thread.status !== 'closed' && (
        <div className="p-4 border-t border-gray-200 bg-white">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
                  <span className="text-sm text-gray-700 truncate max-w-24">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="form-input resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>
            
            <div className="flex items-center space-x-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                disabled={sending}
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <button
                type="submit"
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                className="btn btn-primary p-2 disabled:opacity-50"
              >
                {sending ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default MessageThread;