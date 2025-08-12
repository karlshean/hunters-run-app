import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Wrench, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI, maintenanceAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const TenantDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, requestsResponse] = await Promise.all([
        dashboardAPI.getTenantDashboard(),
        maintenanceAPI.getRequests({ limit: 5 })
      ]);
      
      setStats(statsResponse.data.data);
      setRecentRequests(requestsResponse.data.data.requests || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow">
        <div className="px-6 py-8 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Home className="h-8 w-8" />
              </div>
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
              <p className="text-primary-100">
                {stats?.unit ? `Unit ${stats.unit.unit_number} • ${stats.property.name}` : 'Tenant Portal'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    My Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Open Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.openRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.completedRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Urgent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.urgentRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/maintenance/create"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                  <Plus className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">New Request</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Submit a maintenance request
                </p>
              </div>
            </Link>

            <Link
              to="/maintenance"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100">
                  <Wrench className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">My Requests</h3>
                <p className="mt-2 text-sm text-gray-500">
                  View all maintenance requests
                </p>
              </div>
            </Link>

            <Link
              to="/profile"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-600 group-hover:bg-green-100">
                  <User className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">My Profile</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Update your information
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Requests
            </h3>
            <Link
              to="/maintenance"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          {recentRequests.length === 0 ? (
            <div className="text-center py-6">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first maintenance request.
              </p>
              <div className="mt-6">
                <Link
                  to="/maintenance/create"
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {request.title}
                      </h4>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(request.created_at)}
                      </span>
                      {request.category_name && (
                        <span>{request.category_name}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/maintenance/${request.id}`}
                    className="ml-4 text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Property Information */}
      {stats?.property && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Property Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Property Details</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Property:</dt>
                    <dd className="text-gray-900">{stats.property.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Address:</dt>
                    <dd className="text-gray-900">
                      {stats.property.address}, {stats.property.city}, {stats.property.state}
                    </dd>
                  </div>
                  {stats.unit && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Unit:</dt>
                      <dd className="text-gray-900">{stats.unit.unit_number}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Management Contact</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{stats.property.management_phone || 'Contact office'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{stats.property.management_email || 'Contact office'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;
