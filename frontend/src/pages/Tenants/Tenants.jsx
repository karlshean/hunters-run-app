import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users,
  User,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  Home,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, propertiesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Tenants = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    propertyId: '',
    status: '',
    leaseStatus: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [tenantsRes, propertiesRes] = await Promise.all([
        usersAPI.getUsers({ 
          userType: 'tenant',
          ...filters 
        }),
        propertiesAPI.getProperties()
      ]);

      setTenants(tenantsRes.data.data.users || []);
      setProperties(propertiesRes.data.data.properties || []);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaseStatusColor = (leaseStatus) => {
    switch (leaseStatus) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'renewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTenantStats = () => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'active').length;
    const expiring = tenants.filter(t => t.lease_status === 'expiring_soon').length;
    const overdue = tenants.filter(t => t.payment_status === 'overdue').length;

    return { total, active, expiring, overdue };
  };

  const stats = getTenantStats();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage tenant profiles, leases, and communication
          </p>
        </div>
        {(user.user_type === 'admin' || user.user_type === 'manager') && (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link
              to="/tenants/import"
              className="btn btn-outline flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Import Tenants
            </Link>
            <Link
              to="/tenants/new"
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Link>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiring}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Payment Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-input pl-10"
            />
          </div>
          
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

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filters.leaseStatus}
            onChange={(e) => handleFilterChange('leaseStatus', e.target.value)}
            className="form-input"
          >
            <option value="">All Lease Status</option>
            <option value="active">Active Lease</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="renewed">Recently Renewed</option>
          </select>

          <button
            onClick={() => setFilters({ search: '', propertyId: '', status: '', leaseStatus: '' })}
            className="btn btn-outline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tenants List */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.propertyId || filters.status
              ? 'Try adjusting your filters to see more tenants.'
              : 'Get started by adding your first tenant.'}
          </p>
          {(user.user_type === 'admin' || user.user_type === 'manager') && (
            <div className="mt-6">
              <Link
                to="/tenants/new"
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Tenants ({tenants.length})
            </h3>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property/Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lease
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {tenant.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {tenant.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tenant.property_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Unit {tenant.unit_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(tenant.lease_start)} - {formatDate(tenant.lease_end)}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaseStatusColor(tenant.lease_status)}`}>
                        {tenant.lease_status?.replace('_', ' ') || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${tenant.rent_amount || 0}/month
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/tenants/${tenant.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {(user.user_type === 'admin' || user.user_type === 'manager') && (
                          <>
                            <Link
                              to={`/tenants/${tenant.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button className="text-gray-600 hover:text-gray-900">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {tenant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{tenant.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                          {tenant.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeaseStatusColor(tenant.lease_status)}`}>
                          {tenant.lease_status?.replace('_', ' ') || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/tenants/${tenant.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {(user.user_type === 'admin' || user.user_type === 'manager') && (
                      <Link
                        to={`/tenants/${tenant.id}/edit`}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Property/Unit</div>
                    <div className="text-gray-900">
                      {tenant.property_name} • Unit {tenant.unit_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rent</div>
                    <div className="text-gray-900">${tenant.rent_amount || 0}/month</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Phone</div>
                    <a href={`tel:${tenant.phone}`} className="text-primary-600">
                      {tenant.phone}
                    </a>
                  </div>
                  <div>
                    <div className="text-gray-500">Lease End</div>
                    <div className="text-gray-900">{formatDate(tenant.lease_end)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/tenants/expiring"
            className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <div className="font-medium text-yellow-800">Expiring Leases</div>
              <div className="text-sm text-yellow-600">Review renewal requirements</div>
            </div>
          </Link>
          
          <Link
            to="/tenants/payments"
            className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <CreditCard className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <div className="font-medium text-red-800">Payment Issues</div>
              <div className="text-sm text-red-600">Overdue accounts</div>
            </div>
          </Link>
          
          <Link
            to="/tenants/communication"
            className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Mail className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <div className="font-medium text-blue-800">Mass Communication</div>
              <div className="text-sm text-blue-600">Send announcements</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Tenants;