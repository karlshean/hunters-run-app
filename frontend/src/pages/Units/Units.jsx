import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MapPin, 
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { unitsAPI, propertiesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Units = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    propertyId: searchParams.get('propertyId') || '',
    status: searchParams.get('status') || '',
    unitType: searchParams.get('unitType') || ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [propertiesRes] = await Promise.all([
        propertiesAPI.getProperties()
      ]);
      
      setProperties(propertiesRes.data.data.properties);

      // Load units based on filters
      let unitsRes;
      if (filters.propertyId) {
        unitsRes = await unitsAPI.getUnitsByProperty(filters.propertyId, {
          search: filters.search,
          status: filters.status,
          unitType: filters.unitType
        });
      } else {
        // If we had a general units endpoint
        unitsRes = { data: { data: { units: [] } } };
      }
      
      setUnits(unitsRes.data.data.units);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800';
      case 'vacant': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage individual units across your properties
          </p>
        </div>
        {(user.user_type === 'admin' || user.user_type === 'manager') && (
          <div className="mt-4 sm:mt-0">
            <Link
              to="/units/new"
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
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
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Maintenance</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <select
            value={filters.unitType}
            onChange={(e) => handleFilterChange('unitType', e.target.value)}
            className="form-input"
          >
            <option value="">All Types</option>
            <option value="studio">Studio</option>
            <option value="1br">1 Bedroom</option>
            <option value="2br">2 Bedroom</option>
            <option value="3br">3+ Bedroom</option>
          </select>

          <button
            onClick={() => {
              setFilters({ search: '', propertyId: '', status: '', unitType: '' });
              setSearchParams(new URLSearchParams());
            }}
            className="btn btn-outline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Units List */}
      {!filters.propertyId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Property</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a property from the dropdown above to view its units.
          </p>
        </div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No units found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status || filters.unitType
              ? 'Try adjusting your filters to see more units.'
              : 'This property doesn\'t have any units yet.'}
          </p>
          {(user.user_type === 'admin' || user.user_type === 'manager') && (
            <div className="mt-6">
              <Link
                to="/units/new"
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Units ({units.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {units.map((unit) => (
              <li key={unit.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Home className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="text-lg font-medium text-gray-900">
                          Unit {unit.unit_number}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                          {unit.status}
                        </span>
                        {unit.unit_type && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {unit.unit_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          <span>
                            {unit.property_name}
                            {unit.building_name && ` • Building ${unit.building_name}`}
                          </span>
                        </div>
                        {unit.tenant_name && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>Tenant: {unit.tenant_name}</span>
                          </div>
                        )}
                        {unit.rent_amount && (
                          <div className="flex items-center">
                            <span>${unit.rent_amount}/month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {unit.maintenance_requests > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        <Wrench className="h-3 w-3 mr-1" />
                        {unit.maintenance_requests} requests
                      </span>
                    )}
                    
                    <Link
                      to={`/units/${unit.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                    
                    {(user.user_type === 'admin' || user.user_type === 'manager') && (
                      <Link
                        to={`/units/${unit.id}/edit`}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        title="Edit Unit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Units Summary */}
      {units.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{units.length}</div>
              <div className="text-sm text-gray-500">Total Units</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {units.filter(u => u.status === 'occupied').length}
              </div>
              <div className="text-sm text-gray-500">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {units.filter(u => u.status === 'vacant').length}
              </div>
              <div className="text-sm text-gray-500">Vacant</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {units.filter(u => u.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-500">Maintenance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Units;
