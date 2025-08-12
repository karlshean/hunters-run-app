import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Camera,
  Upload,
  Edit,
  MessageSquare,
  Star,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceAPI, usersAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MaintenanceRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [maintenanceStaff, setMaintenanceStaff] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  
  const [updateData, setUpdateData] = useState({
    status: '',
    message: '',
    isVisibleToTenant: true,
    images: []
  });
  
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    message: ''
  });
  
  const [ratingData, setRatingData] = useState({
    rating: 5,
    feedback: ''
  });

  useEffect(() => {
    loadRequest();
    if (user.user_type !== 'tenant') {
      loadMaintenanceStaff();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      const response = await maintenanceAPI.getRequest(id);
      setRequest(response.data.data.request);
      setUpdateData(prev => ({
        ...prev,
        status: response.data.data.request.status
      }));
      setAssignmentData(prev => ({
        ...prev,
        assignedTo: response.data.data.request.assigned_to || ''
      }));
    } catch (error) {
      console.error('Error loading request:', error);
      toast.error('Failed to load maintenance request');
      navigate('/maintenance');
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceStaff = async () => {
    try {
      const response = await usersAPI.getMaintenanceStaff();
      setMaintenanceStaff(response.data.data.maintenanceStaff);
    } catch (error) {
      console.error('Error loading maintenance staff:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!updateData.message.trim() && updateData.status === request.status) {
      toast.error('Please add a message or change the status');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', updateData.status);
      formData.append('updateMessage', updateData.message);
      formData.append('isVisibleToTenant', updateData.isVisibleToTenant);
      
      selectedImages.forEach(image => {
        formData.append('images', image.file);
      });

      await maintenanceAPI.updateRequest(id, formData);
      toast.success('Request updated successfully');
      setShowUpdateForm(false);
      setUpdateData({ status: updateData.status, message: '', isVisibleToTenant: true, images: [] });
      setSelectedImages([]);
      loadRequest();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignment = async () => {
    if (!assignmentData.assignedTo) {
      toast.error('Please select a maintenance staff member');
      return;
    }

    setUpdating(true);
    try {
      await maintenanceAPI.assignRequest(id, assignmentData);
      toast.success('Request assigned successfully');
      loadRequest();
    } catch (error) {
      console.error('Error assigning request:', error);
      toast.error('Failed to assign request');
    } finally {
      setUpdating(false);
    }
  };

  const handleRating = async () => {
    setUpdating(true);
    try {
      await maintenanceAPI.rateRequest(id, ratingData);
      toast.success('Rating submitted successfully');
      setShowRatingForm(false);
      loadRequest();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
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
          setSelectedImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeSelectedImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'assigned': return 'badge-info';
      case 'in_progress': return 'badge-info';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-danger-600 bg-danger-50 border-danger-200';
      case 'urgent': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'normal': return 'text-primary-600 bg-primary-50 border-primary-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Request not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mobile-padding">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/maintenance')}
          className="mr-4 p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(request.priority)}`}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              {request.priority}
            </span>
            <span className={`badge ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Request Details</h3>
            </div>
            <div className="card-body space-y-4">
              <p className="text-gray-700">{request.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>
                    {request.property_name}
                    {request.unit_number && ` - Unit ${request.unit_number}`}
                  </span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Created {formatDate(request.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Images */}
          {request.images && request.images.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Photos</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.images.map((image, index) => (
                    <div
                      key={index}
                      className="relative cursor-pointer group"
                      onClick={() => openImageModal(index)}
                    >
                      <img
                        src={image.url}
                        alt={`Request image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border group-hover:opacity-75 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Contact</h3>
            </div>
            <div className="card-body space-y-3">
              {request.tenant_name && user.user_type !== 'tenant' && (
                <div>
                  <div className="flex items-center text-gray-600 mb-1">
                    <User className="h-4 w-4 mr-2" />
                    <span className="font-medium">Tenant</span>
                  </div>
                  <p className="text-gray-900">{request.tenant_name}</p>
                  {request.tenant_phone && (
                    <div className="flex items-center text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-2" />
                      <a href={`tel:${request.tenant_phone}`}>
                        {request.tenant_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {request.assigned_to_name && (
                <div>
                  <div className="flex items-center text-gray-600 mb-1">
                    <User className="h-4 w-4 mr-2" />
                    <span className="font-medium">Assigned To</span>
                  </div>
                  <p className="text-gray-900">{request.assigned_to_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Actions</h3>
            </div>
            <div className="card-body space-y-3">
              {/* Assignment (Managers/Admins only) */}
              {(user.user_type === 'admin' || user.user_type === 'manager') && (
                <div>
                  <label className="form-label">Assign Staff</label>
                  <div className="flex gap-2">
                    <select
                      value={assignmentData.assignedTo}
                      onChange={(e) => setAssignmentData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="form-input flex-1"
                    >
                      <option value="">Select staff</option>
                      {maintenanceStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignment}
                      disabled={updating || !assignmentData.assignedTo}
                      className="btn btn-primary"
                    >
                      {updating ? <LoadingSpinner size="small" /> : 'Assign'}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowUpdateForm(true)}
                className="btn btn-outline w-full flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Add Update
              </button>

              {user.user_type === 'tenant' && 
               request.tenant_id === user.id && 
               request.status === 'completed' && 
               !request.tenant_rating && (
                <button
                  onClick={() => setShowRatingForm(true)}
                  className="btn btn-primary w-full flex items-center justify-center"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Rate Service
                </button>
              )}

              {request.tenant_rating && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < request.tenant_rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">
                      {request.tenant_rating}/5
                    </span>
                  </div>
                  {request.tenant_feedback && (
                    <p className="text-sm text-gray-700">{request.tenant_feedback}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update Form Modal */}
      {showUpdateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">Add Update</h3>
              <button
                onClick={() => setShowUpdateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, status: e.target.value }))}
                  className="form-input"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="form-label">Message</label>
                <textarea
                  value={updateData.message}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="form-input"
                  placeholder="Add details about this update..."
                />
              </div>

              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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

              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.preview}
                        alt={`Preview ${image.name}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute top-1 right-1 p-1 bg-danger-600 text-white rounded-full hover:bg-danger-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowUpdateForm(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="btn btn-primary flex-1"
              >
                {updating ? <LoadingSpinner size="small" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Add Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Form Modal */}
      {showRatingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">Rate Service</h3>
              <button
                onClick={() => setShowRatingForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Rating</label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRatingData(prev => ({ ...prev, rating: i + 1 }))}
                      className="p-1"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          i < ratingData.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Feedback (Optional)</label>
                <textarea
                  value={ratingData.feedback}
                  onChange={(e) => setRatingData(prev => ({ ...prev, feedback: e.target.value }))}
                  rows={3}
                  className="form-input"
                  placeholder="How was the service? Any additional comments..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowRatingForm(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRating}
                disabled={updating}
                className="btn btn-primary flex-1"
              >
                {updating ? <LoadingSpinner size="small" className="mr-2" /> : null}
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && request.images && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="max-w-4xl max-h-full">
            <img
              src={request.images[currentImageIndex]?.url}
              alt={`Request image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceRequestDetail;
