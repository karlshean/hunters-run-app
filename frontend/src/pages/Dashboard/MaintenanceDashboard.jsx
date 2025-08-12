import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Users,
  Building,
  Calendar,
  MapPin,
  Plus,
  Eye,
  UserCheck,
  TrendingUp,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceAPI, usersAPI, dashboardAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const MaintenanceDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [filters, setFilters] = useState({
    priority: '',
    property: '',
    search: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, pendingRes, assignedRes, staffRes] = await Promise.all([
        dashboardAPI.getMaintenanceDashboard(),
        maintenanceAPI.getRequests({ 
          status: 'pending,assigned', 
          limit: 20,
          ...filters 
        }),
        maintenanceAPI.getRequests({ 
          status: 'in_progress', 
          limit: 10,
          assignedTo: user.id 
        }),
        usersAPI.getMaintenanceStaff()
      ]);

      setStats(statsRes.data.data);
      
      const requests = pendingRes.data.data.requests;
      setPendingRequests(requests.filter(r => r.status === 'pending'));
      setAssignedRequests(requests.filter(r => r.status === 'assigned' || r.status === 'in_progress'));
      
      setMaintenanceStaff(staffRes.data.data.maintenanceStaff);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId, staffId) => {
    setAssignmentLoading(true);
    try {
      await maintenanceAPI.assignRequest(requestId, {
        assignedTo: staffId,
        message: 'Request assigned via manager dashboard'
      });
      
      // Refresh the data
      loadDashboardData();
    } catch (error) {
      console.error('Error assigning request:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStaffWorkload = (staffId) => {
    return assignedRequests.filter(r => r.assigned_to === staffId).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Assign and track maintenance requests across your properties
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            className="btn btn-outline flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <Link
            to="/maintenance/create"
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Assignment</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.assigned || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.inProgress || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Emergency</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.emergency || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="form-input pl-10"
            />
          </div>
          
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="form-input"
          >
            <option value="">All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.property}
            onChange={(e) => setFilters(prev => ({ ...prev, property: e.target.value }))}
            className="form-input"
          >
            <option value="">All Properties</option>
            <option value="hunters-run">Hunters Run</option>
            <option value="shean-properties">Shean Properties</option>
          </select>

          <button
            onClick={() => setFilters({ priority: '', property: '', search: '' })}
            className="btn btn-outline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unassigned Requests */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Pending Assignment ({pendingRequests.length})
                </h3>
                <Link
                  to="/maintenance?status=pending"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingRequests.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div key={request.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {request.priority}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        
                        <Link
                          to={`/maintenance/${request.id}`}
                          className="text-lg font-medium text-gray-900 hover:text-blue-600 block mb-1"
                        >
                          {request.title}
                        </Link>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {request.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {request.property_name}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Unit {request.unit_number || 'Common Area'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <div className="flex items-center space-x-2">
                          <select
                            className="text-sm border-gray-300 rounded-md"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignRequest(request.id, e.target.value);
                              }
                            }}
                            disabled={assignmentLoading}
                          >
                            <option value="">Assign to...</option>
                            {maintenanceStaff.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} ({getStaffWorkload(staff.id)})
                              </option>
                            ))}
                          </select>
                          
                          <Link
                            to={`/maintenance/${request.id}`}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assigned Requests */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  In Progress ({assignedRequests.length})
                </h3>
                <Link
                  to="/maintenance?status=assigned,in_progress"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {assignedRequests.length === 0 ? (
                <div className="p-6 text-center">
                  <Wrench className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No active assignments</p>
                </div>
              ) : (
                assignedRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            to={`/maintenance/${request.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {request.title}
                          </Link>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {request.assigned_to_name}
                          </span>
                          <span>{request.property_name}</span>
                          <span>Unit {request.unit_number || 'Common'}</span>
                        </div>
                      </div>
                      <Link
                        to={`/maintenance/${request.id}`}
                        className="text-xs text-blue-600 hover:text-blue-500"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Staff Workload */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Staff Workload</h3>
            </div>
            <div className="p-6">
              {maintenanceStaff.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No maintenance staff</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceStaff.map((staff) => {
                    const workload = getStaffWorkload(staff.id);
                    const maxWorkload = Math.max(...maintenanceStaff.map(s => getStaffWorkload(s.id)), 1);
                    const workloadPercentage = (workload / maxWorkload) * 100;
                    
                    return (
                      <div key={staff.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {staff.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                            <p className="text-xs text-gray-500">{workload} active requests</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                workload === 0 
                                  ? 'bg-gray-300'
                                  : workload <= 3 
                                  ? 'bg-green-400'
                                  : workload <= 6
                                  ? 'bg-yellow-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${workloadPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">{workload}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Today's Summary</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Requests Assigned</span>
                <span className="text-sm font-medium text-gray-900">{stats?.todayAssigned || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Completed Today</span>
                <span className="text-sm font-medium text-gray-900">{stats?.todayCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Avg Response Time</span>
                <span className="text-sm font-medium text-gray-900">{stats?.avgResponseTime || '0h'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Completion Rate</span>
                <span className="text-sm font-medium text-gray-900">{stats?.completionRate || '0'}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
