import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle,
  MapPin,
  Building,
  Calendar,
  Phone,
  Camera,
  Navigation,
  Play,
  Pause,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Upload
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const MobileRequestCard = ({ request, onStatusUpdate, onStartWork, activeWork, isActive }) => {
  const [updating, setUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [images, setImages] = useState([]);
  const [updateMessage, setUpdateMessage] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleStatusUpdate = async (status, message = '') => {
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('updateMessage', message || `Status updated to ${status}`);
      formData.append('isVisibleToTenant', true);

      // Add any images
      images.forEach(image => {
        formData.append('images', image.file);
      });

      await maintenanceAPI.updateRequest(request.id, formData);
      onStatusUpdate();
      setShowUpdateForm(false);
      setImages([]);
      setUpdateMessage('');
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleImageCapture = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            file,
            preview: e.target.result,
            name: file.name
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 bg-red-100 border-red-300';
      case 'urgent': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'normal': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'low': return 'text-gray-600 bg-gray-100 border-gray-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {request.priority}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>
          {isActive && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Active</span>
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
        
        <div className="space-y-2 text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{request.property_name}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Unit {request.unit_number || 'Common Area'}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{new Date(request.created_at).toLocaleDateString()}</span>
          </div>
          {request.tenant_phone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <a href={`tel:${request.tenant_phone}`} className="text-blue-600">
                {request.tenant_phone}
              </a>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-700 mb-4">{request.description}</p>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        {request.status === 'assigned' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                handleStatusUpdate('in_progress', 'Started working on this request');
                onStartWork(request);
              }}
              disabled={updating}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50"
            >
              {updating ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Work
            </button>
            <Link
              to={`/maintenance/${request.id}`}
              className="border border-gray-300 text-gray-700 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center"
            >
              View Details
            </Link>
          </div>
        )}
        
        {request.status === 'in_progress' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowUpdateForm(!showUpdateForm)}
                className="bg-gray-600 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Update
              </button>
              <button
                onClick={() => handleStatusUpdate('completed', 'Work completed successfully')}
                disabled={updating}
                className="bg-green-600 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50"
              >
                {updating ? (
                  <LoadingSpinner size="small" className="mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete
              </button>
            </div>

            {showUpdateForm && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Add update message..."
                  className="w-full p-3 border rounded-lg text-sm mb-3"
                  rows={3}
                />
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded text-sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-3 py-2 bg-gray-600 text-white rounded text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </button>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleImageCapture}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageCapture}
                  className="hidden"
                />

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.preview}
                          alt="Preview"
                          className="w-full h-20 object-cover rounded"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUpdateForm(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('in_progress', updateMessage)}
                    disabled={updating || !updateMessage.trim()}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {updating ? <LoadingSpinner size="small" /> : 'Send Update'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center text-sm">
        <Link
          to={`/maintenance/${request.id}`}
          className="text-blue-600 flex items-center"
        >
          View Full Details
        </Link>
        
        {request.property_address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(request.property_address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 flex items-center"
          >
            <Navigation className="h-4 w-4 mr-1" />
            Directions
          </a>
        )}
      </div>
    </div>
  );
};

export default MobileRequestCard;