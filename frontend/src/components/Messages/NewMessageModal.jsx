import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, AlertTriangle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI, propertiesAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const NewMessageModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message_text: '',
    category: 'general',
    priority: 'normal',
    property_id: '',
    unit_id: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && user.user_type !== 'tenant') {
      loadProperties();
    }
  }, [isOpen, user.user_type]);

  useEffect(() => {
    if (formData.property_id) {
      loadUnits(formData.property_id);
    } else {
      setUnits([]);
      setFormData(prev => ({ ...prev, unit_id: '' }));
    }
  }, [formData.property_id]);

  const loadProperties = async () => {
    try {
      const response = await propertiesAPI.getProperties();
      setProperties(response.data.data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadUnits = async (propertyId) => {
    try {
      const response = await propertiesAPI.getUnits(propertyId);
      setUnits(response.data.data.units || []);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const messageFormData = new FormData();
      messageFormData.append('subject', formData.subject);
      messageFormData.append('message_text', formData.message_text);
      messageFormData.append('category', formData.category);
      messageFormData.append('priority', formData.priority);
      
      if (user.user_type !== 'tenant') {
        if (formData.property_id) messageFormData.append('property_id', formData.property_id);
        if (formData.unit_id) messageFormData.append('unit_id', formData.unit_id);
      }

      attachments.forEach((file) => {
        messageFormData.append('attachments', file);
      });

      await messagesAPI.createThread(messageFormData);
      onSuccess();
    } catch (error) {
      console.error('Error creating message:', error);
      toast.error(error.response?.data?.message || 'Error creating message');
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">New Message</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient Info for Staff */}
            {user.user_type !== 'tenant' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="form-input w-full"
                  >
                    <option value="">Select property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit (Optional)
                  </label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="form-input w-full"
                    disabled={!formData.property_id}
                  >
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        Unit {unit.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Message Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-input w-full"
                  required
                >
                  <option value="general">General</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="billing">Billing</option>
                  <option value="complaint">Complaint</option>
                  <option value="compliment">Compliment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="form-input w-full"
                  required
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="form-input w-full"
                placeholder="Enter message subject..."
                maxLength={255}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={formData.message_text}
                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                className="form-input w-full"
                rows={4}
                placeholder="Enter your message..."
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachments
              </label>
              
              <div className="flex items-center space-x-2">
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
                  className="btn btn-outline flex items-center"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add Files
                </button>
                
                <span className="text-xs text-gray-500">
                  Images, PDFs, Word docs (max 10MB each)
                </span>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Warning */}
            {formData.priority === 'urgent' && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">Urgent Message</p>
                  <p className="text-xs text-red-700">
                    This message will be marked as urgent and prioritized for immediate attention.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
                disabled={loading || !formData.subject.trim() || !formData.message_text.trim()}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewMessageModal;