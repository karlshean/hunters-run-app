import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  Users, 
  Home,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { propertiesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Properties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: ''
  });

  useEffect(() => {
    loadProperties();
  }, [filters]);

  const loadProperties = async () => {
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const response = await propertiesAPI.getProperties(params);
      setProperties(response.data.data.properties);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getOccupancyRate = (property) => {
    if (!property.total_units || property.total_units === 0) return 0;
    return Math.round((property.occupied_units / property.total_units) * 100);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your property portfolio and building layouts
          </p>
        </div>
        {(user.user_type === 'admin' || user.user_type === 'manager') && (
          <div className="mt-4 sm:mt-0">
            <Link
              to="/properties/new"
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-input pl-10"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Under Maintenance</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="form-input"
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment Complex</option>
            <option value="townhouse">Townhouse</option>
            <option value="single_family">Single Family</option>
          </select>

          <button
            onClick={() => setFilters({ search: '', status: '', type: '' })}
            className="btn btn-outline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status || filters.type
              ? 'Try adjusting your filters to see more properties.'
              : 'Get started by adding your first property.'}
          </p>
          {(user.user_type === 'admin' || user.user_type === 'manager') && (
            <div className="mt-6">
              <Link
                to="/properties/new"
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
              {/* Property Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-primary-50 to-primary-100 rounded-t-lg flex items-center justify-center">
                <Building className="h-16 w-16 text-primary-400" />
              </div>

              <div className="p-6">
                {/* Property Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {property.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="truncate">
                        {property.city}, {property.state}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    property.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {property.status}
                  </span>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {property.total_units || 0}
                    </div>
                    <div className="text-sm text-gray-500">Total Units</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {getOccupancyRate(property)}%
                    </div>
                    <div className="text-sm text-gray-500">Occupied</div>
                  </div>
                </div>

                {/* Buildings Info */}
                {property.buildings && property.buildings.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Buildings:</div>
                    <div className="flex flex-wrap gap-2">
                      {property.buildings.map((building, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
                        >
                          Building {building.name || building}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {property.recent_maintenance > 0 && (
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                    <span>{property.recent_maintenance} recent maintenance requests</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <Link
                    to={`/properties/${property.id}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>

                  {(user.user_type === 'admin' || user.user_type === 'manager') && (
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/properties/${property.id}/edit`}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        title="Edit Property"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        title="More Options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {properties.length}
            </div>
            <div className="text-sm text-gray-500">Total Properties</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {properties.reduce((sum, p) => sum + (p.total_units || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Total Units</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {properties.reduce((sum, p) => sum + (p.occupied_units || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Occupied Units</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {properties.length > 0
                ? Math.round(
                    (properties.reduce((sum, p) => sum + (p.occupied_units || 0), 0) /
                     properties.reduce((sum, p) => sum + (p.total_units || 0), 0)) * 100
                  ) || 0
                : 0}%
            </div>
            <div className="text-sm text-gray-500">Overall Occupancy</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
