import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceAPI, propertiesAPI, unitsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const CreateMaintenanceRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  
  const [formData, setFormData] = useState({
    propertyId: '',
    unitId: '',
    categoryId: '',
    title: '',
    description: '',
    priority: 'normal',
    locationDescription: '',
    tenantAvailability: '',
    permissionToEnter: false,
  });
  
  const [errors, setErrors] = useState({});

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesRes, propertiesRes] = await Promise.all([
          maintenanceAPI.getCategories(),
          propertiesAPI.getProperties()
        ]);
        
        setCategories(categoriesRes.data.data.categories);
        setProperties(propertiesRes.data.data.properties);
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load form data');
      }
    };

    loadInitialData();
  }, []);

  // Load units when property changes
  useEffect(() => {
    if (formData.propertyId) {
      loadUnits(formData.propertyId);
    } else {
      setUnits([]);
    }
  }, [formData.propertyId]);

  const loadUnits = async (propertyId) => {
    try {
      const response = await unitsAPI.getUnitsByProperty(propertyId);
      setUnits(response.data.data.units);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('Failed to load units');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageCapture = (e) => {
    const files = Array.from(e.target.files);
    processImages(files);
  };

  const processImages = (files) => {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error(`Image ${file.name} is too large. Max size is 10MB.`);
          return;
        }

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
      } else {
        toast.error(`${file.name} is not an image file`);
      }
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.propertyId) {
      newErrors.propertyId = 'Property is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      // Add images
      images.forEach((image, index) => {
        submitData.append('images', image.file);
      });

      const response = await maintenanceAPI.createRequest(submitData);
      
      toast.success('Maintenance request created successfully!');
      navigate(`/maintenance/${response.data.data.request.id}`);
    } catch (error) {
      console.error('Error creating request:', error);
      const message = error.response?.data?.message || 'Failed to create maintenance request';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-danger-600 bg-danger-50';
      case 'urgent': return 'text-warning-600 bg-warning-50';
      case 'normal': return 'text-primary-600 bg-primary-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-primary-600 bg-primary-50';
    }
  };

  return (
    <div className="max-w-2xl mx-auto mobile-padding">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Maintenance Request</h1>
        <p className="mt-2 text-sm text-gray-600">
          Submit a maintenance request with photos and detailed description
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selection */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Property *</label>
                <select
                  name="propertyId"
                  value={formData.propertyId}
                  onChange={handleInputChange}
                  className={`form-input ${errors.propertyId ? 'border-danger-300' : ''}`}
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.city}, {property.state}
                    </option>
                  ))}
                </select>
                {errors.propertyId && <p className="form-error">{errors.propertyId}</p>}
              </div>

              <div>
                <label className="form-label">Unit</label>
                <select
                  name="unitId"
                  value={formData.unitId}
                  onChange={handleInputChange}
                  className="form-input"
                  disabled={!formData.propertyId}
                >
                  <option value="">Select a unit (optional)</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number} {unit.unit_type && `(${unit.unit_type})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Category</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">Select category (optional)</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'emergency', label: 'Emergency', icon: AlertTriangle },
                    { value: 'urgent', label: 'Urgent', icon: AlertTriangle },
                    { value: 'normal', label: 'Normal', icon: CheckCircle },
                    { value: 'low', label: 'Low', icon: CheckCircle }
                  ].map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.priority === value
                          ? `border-2 ${getPriorityColor(value)}`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={value}
                        checked={formData.priority === value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`form-input ${errors.title ? 'border-danger-300' : ''}`}
                  placeholder="Brief description of the issue"
                />
                {errors.title && <p className="form-error">{errors.title}</p>}
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`form-input ${errors.description ? 'border-danger-300' : ''}`}
                  placeholder="Detailed description of the maintenance issue..."
                />
                {errors.description && <p className="form-error">{errors.description}</p>}
              </div>

              <div>
                <label className="form-label">Location Details</label>
                <input
                  type="text"
                  name="locationDescription"
                  value={formData.locationDescription}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Kitchen sink, Bedroom 1 window, Living room ceiling"
                />
              </div>

              <div>
                <label className="form-label">Your Availability</label>
                <input
                  type="text"
                  name="tenantAvailability"
                  value={formData.tenantAvailability}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Weekdays after 5pm, Weekends anytime"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="permissionToEnter"
                  name="permissionToEnter"
                  checked={formData.permissionToEnter}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="permissionToEnter" className="ml-2 block text-sm text-gray-900">
                  Permission to enter unit if no one is home
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Capture */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
            
            <div className="space-y-4">
              {/* Photo Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={openFileSelector}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photos
                </button>
              </div>

              {/* Hidden File Inputs */}
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

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.preview}
                        alt={`Preview ${image.name}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 p-1 bg-danger-600 text-white rounded-full hover:bg-danger-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                        {image.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500">
                {images.length === 0
                  ? 'Add photos to help maintenance staff understand the issue better'
                  : `${images.length} photo${images.length !== 1 ? 's' : ''} added`}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate('/maintenance')}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" className="mr-2" />
                Creating Request...
              </div>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateMaintenanceRequest;
