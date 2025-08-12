import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Mail,
  MailOpen,
  Pin,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import NewMessageModal from '../../components/Messages/NewMessageModal';
import MessageThread from '../../components/Messages/MessageThread';
import toast from 'react-hot-toast';

const Messages = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState({ unread_threads: 0, unread_messages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    priority: ''
  });

  useEffect(() => {
    loadThreads();
    loadUnreadCount();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
      if (selectedThread) {
        // Refresh selected thread to get new messages
        setSelectedThread(prev => ({ ...prev, shouldRefresh: true }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [filters]);

  const loadThreads = async () => {
    try {
      const response = await messagesAPI.getThreads(filters);
      setThreads(response.data.data.threads);
    } catch (error) {
      console.error('Error loading message threads:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await messagesAPI.getUnreadCount();
      setUnreadCount(response.data.data);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    // Mark thread as read optimistically
    setThreads(prev => 
      prev.map(t => 
        t.id === thread.id 
          ? { ...t, unread_count: 0 }
          : t
      )
    );
  };

  const handleNewMessage = () => {
    loadThreads();
    loadUnreadCount();
    setShowNewMessage(false);
    toast.success('Message sent successfully!');
  };

  const handleThreadUpdate = (updatedThread) => {
    setThreads(prev =>
      prev.map(thread =>
        thread.id === updatedThread.id ? { ...thread, ...updatedThread } : thread
      )
    );
    if (selectedThread?.id === updatedThread.id) {
      setSelectedThread({ ...selectedThread, ...updatedThread });
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return AlertTriangle;
      case 'high': return AlertTriangle;
      default: return Clock;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'maintenance': return AlertTriangle;
      case 'billing': return DollarSign;
      case 'complaint': return AlertTriangle;
      case 'compliment': return CheckCircle;
      default: return MessageSquare;
    }
  };

  const formatDate = (dateString) => {
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
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-600">
            Communicate with {user.user_type === 'tenant' ? 'property management' : 'tenants and staff'}
            {unreadCount.unread_messages > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount.unread_messages} unread
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowNewMessage(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </button>
        </div>
      </div>

      <div className="flex-1 flex bg-white rounded-lg border overflow-hidden">
        {/* Sidebar - Thread List */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="form-input pl-10 text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="form-input text-sm"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="urgent">Urgent</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="form-input text-sm"
              >
                <option value="">All Categories</option>
                <option value="maintenance">Maintenance</option>
                <option value="billing">Billing</option>
                <option value="general">General</option>
                <option value="complaint">Complaint</option>
                <option value="compliment">Compliment</option>
              </select>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status || filters.category
                    ? 'No messages match your filters'
                    : 'Start a conversation with your first message'}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewMessage(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {threads.map((thread) => {
                  const PriorityIcon = getPriorityIcon(thread.priority);
                  return (
                    <div
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedThread?.id === thread.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {thread.unread_count > 0 ? (
                            <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <MailOpen className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${thread.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {thread.subject}
                              </p>
                              <div className="flex items-center space-x-1 ml-2">
                                {(thread.priority === 'urgent' || thread.priority === 'high') && (
                                  <PriorityIcon className="h-3 w-3 text-red-500" />
                                )}
                                {thread.unread_count > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {thread.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-1">
                              {user.user_type === 'tenant' 
                                ? (thread.assigned_name || 'Management')
                                : thread.tenant_name
                              }
                              {thread.property_name && (
                                <span> • {thread.property_name}</span>
                              )}
                              {thread.unit_number && (
                                <span> • Unit {thread.unit_number}</span>
                              )}
                            </p>
                            
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {thread.last_message}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(thread.last_message_at)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(thread.status)}`}>
                            {thread.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Selected Thread */}
        <div className={`flex-1 flex flex-col ${selectedThread ? 'flex' : 'hidden md:flex'}`}>
          {selectedThread ? (
            <MessageThread
              thread={selectedThread}
              onBack={() => setSelectedThread(null)}
              onThreadUpdate={handleThreadUpdate}
              onNewMessage={() => {
                loadThreads();
                loadUnreadCount();
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No message selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a message from the sidebar to start reading
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <NewMessageModal
          isOpen={showNewMessage}
          onClose={() => setShowNewMessage(false)}
          onSuccess={handleNewMessage}
        />
      )}
    </div>
  );
};

export default Messages;