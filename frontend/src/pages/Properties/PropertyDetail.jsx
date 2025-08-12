import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building, 
  MapPin, 
  Users, 
  Home,
  Wrench,
  Plus,
  Eye,
  Edit,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { propertiesAPI, unitsAPI, maintenanceAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  useEffect(() => {
    loadPropertyData();
  }, [id]);

  const loadPropertyData = async () => {
    try {
      const [propertyRes, buildingsRes, maintenanceRes] = await Promise.all([
        propertiesAPI.getProperty(id),
        propertiesAPI.getBuildings(id),
        maintenanceAPI.getRequests({ propertyId: id, limit: 10 })
      ]);

      setProperty(propertyRes.data.data.property);
      setBuildings(buildingsRes.data.data.buildings);
      setRecentRequests(maintenanceRes.data.data.requests || []);
      
      // Load units for the first building if available
      if (buildingsRes.data.data.buildings.length > 0) {
        const firstBuilding = buildingsRes.data.data.buildings[0];
        setSelectedBuilding(firstBuilding);
        const unitsRes = await unitsAPI.getUnitsByProperty(id, { buildingId: firstBuilding.id });
        setUnits(unitsRes.data.data.units);
      }
    } catch (error) {
      console.error('Error loading property data:', error);
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingUnits = async (building) => {
    try {
      setSelectedBuilding(building);
      const response = await unitsAPI.getUnitsByProperty(id, { buildingId: building.id });
      setUnits(response.data.data.units);
    } catch (error) {
      console.error('Error loading building units:', error);
    }
  };

  const getUnitStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-green-500';
      case 'vacant': return 'bg-gray-300';
      case 'maintenance': return 'bg-yellow-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getOccupancyRate = () => {
    if (!property || !property.total_units) return 0;
    return Math.round((property.occupied_units / property.total_units) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Property not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/properties')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{property.address}, {property.city}, {property.state} {property.zip}</span>
            </div>
          </div>
        </div>
        
        {(user.user_type === 'admin' || user.user_type === 'manager') && (
          <div className="flex items-center space-x-3">
            <Link
              to={`/properties/${id}/edit`}
              className="btn btn-outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Property
            </Link>
            <Link
              to={`/properties/${id}/units/new`}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Link>
          </div>
        )}
      </div>

      {/* Property Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100">
              <Building className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{property.total_units || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupied</p>
              <p className="text-2xl font-bold text-gray-900">{property.occupied_units || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{getOccupancyRate()}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentRequests.filter(r => r.status !== 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Building Selector */}
      {buildings.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Building Layout</h3>
            <p className="text-sm text-gray-500">Select a building to view unit layout</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3 mb-6">
              {buildings.map((building) => (
                <button
                  key={building.id}
                  onClick={() => loadBuildingUnits(building)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedBuilding?.id === building.id
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  Building {building.name}
                </button>
              ))}
            </div>

            {/* Unit Grid Layout */}
            {selectedBuilding && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900">
                    Building {selectedBuilding.name} - Units
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded mr-2"></div>
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-gray-300 rounded mr-2"></div>
                      <span>Vacant</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-yellow-500 rounded mr-2"></div>
                      <span>Maintenance</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-red-500 rounded mr-2"></div>
                      <span>Unavailable</span>
                    </div>
                  </div>
                </div>

                {/* Units Grid - Simulates building layout */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="relative group cursor-pointer"
                      title={`Unit ${unit.unit_number} - ${unit.status}`}
                    >
                      <Link to={`/units/${unit.id}`}>
                        <div className={`
                          aspect-square rounded-lg border-2 border-gray-200 flex items-center justify-center
                          ${getUnitStatusColor(unit.status)} text-white font-semibold text-sm
                          hover:scale-105 transition-transform
                        `}>
                          {unit.unit_number}
                        </div>
                      </Link>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div>Unit {unit.unit_number}</div>
                        <div className="capitalize">{unit.status}</div>
                        {unit.tenant_name && (
                          <div>Tenant: {unit.tenant_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {units.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No units found for this building
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Information & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Details */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Property Details</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Property Type</p>
                <p className="text-sm text-gray-900 capitalize">{property.property_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Year Built</p>
                <p className="text-sm text-gray-900">{property.year_built || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Buildings</p>
                <p className="text-sm text-gray-900">{buildings.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
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
            </div>

            {property.description && (
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-900 mt-1">{property.description}</p>
              </div>
            )}

            {/* Contact Information */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">Management Contact</p>
              <div className="space-y-2">
                {property.management_phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <a href={`tel:${property.management_phone}`} className="hover:text-primary-600">
                      {property.management_phone}
                    </a>
                  </div>
                )}
                {property.management_email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href={`mailto:${property.management_email}`} className="hover:text-primary-600">
                      {property.management_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Maintenance Requests */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Maintenance</h3>
            <Link
              to={`/maintenance?propertyId=${id}`}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          <div className="p-6">
            {recentRequests.length === 0 ? (
              <div className="text-center py-6">
                <Wrench className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No maintenance requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-start space-x-3">
                    <div className={`p-1 rounded-full ${
                      request.priority === 'emergency' 
                        ? 'bg-red-100' 
                        : request.priority === 'urgent'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                    }`}>
                      {request.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : request.priority === 'emergency' || request.priority === 'urgent' ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Wrench className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/maintenance/${request.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
                      >
                        {request.title}
                      </Link>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className="capitalize">{request.status}</span>
                        <span>•</span>
                        <span>Unit {request.unit_number || 'Common Area'}</span>
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
