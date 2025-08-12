import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Search,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceAPI, propertiesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MaintenanceRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    propertyId: '',
    status: '',
    priority: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    loadRequests();
    if (user.user_type !== 'tenant') {
      loadProperties();
    }
  }, [filters, pagination.page]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await maintenanceAPI.getRequests(params);
      const { requests: newRequests, total, totalPages } = response.data.data;
      
      setRequests(newRequests);
      setPagination(prev => ({
        ...prev,
        total,
        totalPages
      }));
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await propertiesAPI.getProperties();
      setProperties(response.data.data.properties);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      propertyId: '',
      status: '',
      priority: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency':
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="mt-2 text-sm text-gray-600">
            {user.user_type === 'tenant' 
              ? 'View and manage your maintenance requests'
              : 'Monitor and manage all maintenance requests'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <Link to="/maintenance/create" className="btn btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="form-label">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="form-input pl-10"
                    placeholder="Search requests..."
                  />
                </div>
              </div>

              {user.user_type !== 'tenant' && (
                <div>
                  <label className="form-label">Property</label>
                  <select
                    value={filters.propertyId}
                    onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                    className="form-input"
                  >
                    <option value="">All Properties</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="form-input"
                >
                  <option value="">All Priorities</option>
                  <option value="emergency">Emergency</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="btn btn-outline w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="h-5 w-5 text-warning-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-gray-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">
                {requests.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">
                {requests.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-danger-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Emergency</p>
              <p className="text-lg font-semibold text-gray-900">
                {requests.filter(r => r.priority === 'emergency').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <AlertTriangle className="h-full w-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user.user_type === 'tenant' 
                ? 'You haven\'t submitted any maintenance requests yet.'
                : 'No maintenance requests match your current filters.'
              }
            </p>
            <div className="mt-6">
              <Link to="/maintenance/create" className="btn btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create New Request
              </Link>
            </div>
          </div>
        ) : (
          <>
            {requests.map((request) => (
              <div key={request.id} className="card hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                          {getPriorityIcon(request.priority)}
                          <span className="ml-1 capitalize">{request.priority}</span>
                        </span>
                        <span className={`badge ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        <Link 
                          to={`/maintenance/${request.id}`}
                          className="hover:text-primary-600 transition-colors"
                        >
                          {request.title}
                        </Link>
                      </h3>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {request.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {request.property_name}
                            {request.unit_number && ` - Unit ${request.unit_number}`}
                          </span>
                        </div>
                        
                        {request.tenant_name && user.user_type !== 'tenant' && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>{request.tenant_name}</span>
                          </div>
                        )}
                        
                        {request.assigned_to_name && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>Assigned: {request.assigned_to_name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {request.category_name && (
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${request.category_color}20`,
                            color: request.category_color 
                          }}
                        >
                          {request.category_name}
                        </span>
                      )}
                      
                      <button
                        onClick={() => navigate(`/maintenance/${request.id}`)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <ChevronDown className="h-5 w-5 transform rotate-270" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="btn btn-outline disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="btn btn-outline disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MaintenanceRequests;
