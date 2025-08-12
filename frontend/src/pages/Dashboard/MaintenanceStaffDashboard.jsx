import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Building,
  Calendar,
  Phone,
  Camera,
  Navigation,
  User,
  Play,
  Pause,
  Square,
  Timer,
  Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceAPI, dashboardAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import MobileRequestCard from '../../components/Maintenance/MobileRequestCard';

const MaintenanceStaffDashboard = () => {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeWork, setActiveWork] = useState(null);
  const [workTimer, setWorkTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Timer interval
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setWorkTimer(timer => timer + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  const loadDashboardData = async () => {
    try {
      const [requestsRes, statsRes] = await Promise.all([
        maintenanceAPI.getRequests({ assignedTo: user.id, status: 'assigned,in_progress', limit: 20 }),
        dashboardAPI.getMaintenanceDashboard()
      ]);

      setMyRequests(requestsRes.data.data.requests || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWork = (request) => {
    setActiveWork(request);
    setWorkTimer(0);
    setTimerActive(true);
  };

  const pauseWork = () => {
    setTimerActive(false);
  };

  const resumeWork = () => {
    setTimerActive(true);
  };

  const stopWork = () => {
    setActiveWork(null);
    setWorkTimer(0);
    setTimerActive(false);
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('updateMessage', `Status updated to ${status} via mobile interface`);
      formData.append('isVisibleToTenant', true);

      await maintenanceAPI.updateRequest(requestId, formData);
      loadDashboardData();
      
      if (status === 'completed') {
        stopWork();
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="mobile-padding space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
            <p className="text-blue-100">Maintenance Technician</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{myRequests.length}</div>
            <div className="text-sm text-blue-100">Active Jobs</div>
          </div>
        </div>
      </div>

      {/* Active Work Timer */}
      {activeWork && (
        <div className="bg-white rounded-lg border-2 border-blue-300 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">Currently Working</span>
            </div>
            <div className="text-2xl font-mono font-bold text-blue-700">
              {formatTime(workTimer)}
            </div>
          </div>
          
          <div className="mb-3">
            <h3 className="font-medium text-gray-900">{activeWork.title}</h3>
            <p className="text-sm text-gray-600">
              {activeWork.property_name} • Unit {activeWork.unit_number}
            </p>
          </div>

          <div className="flex space-x-2">
            {timerActive ? (
              <button
                onClick={pauseWork}
                className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg flex items-center justify-center"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </button>
            ) : (
              <button
                onClick={resumeWork}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg flex items-center justify-center"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </button>
            )}
            <button
              onClick={stopWork}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center justify-center"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 text-center border">
          <div className="text-2xl font-bold text-blue-600">
            {myRequests.filter(r => r.status === 'assigned').length}
          </div>
          <div className="text-sm text-gray-500">Assigned</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center border">
          <div className="text-2xl font-bold text-purple-600">
            {myRequests.filter(r => r.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
      </div>

      {/* My Work Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">My Work Orders</h3>
          <Link to="/maintenance" className="text-sm text-blue-600">
            View All
          </Link>
        </div>
        
        {myRequests.length === 0 ? (
          <div className="bg-white rounded-lg border p-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No active work orders</p>
            <p className="text-xs text-gray-400">Check back later for new assignments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map((request) => (
              <MobileRequestCard
                key={request.id}
                request={request}
                onStatusUpdate={loadDashboardData}
                onStartWork={startWork}
                activeWork={activeWork}
                isActive={activeWork?.id === request.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <Link
            to="/maintenance"
            className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors"
          >
            <Wrench className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-blue-700">All Requests</div>
          </Link>
          
          <Link
            to="/maintenance/create"
            className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center hover:bg-green-100 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-green-700">Report Issue</div>
          </Link>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-medium text-gray-900">Today's Summary</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Completed Today</span>
            <span className="text-sm font-medium">{stats?.todayCompleted || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Hours Worked</span>
            <span className="text-sm font-medium">{Math.floor(workTimer / 3600)}h {Math.floor((workTimer % 3600) / 60)}m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Avg Rating</span>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium ml-1">{stats?.avgRating || '5.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceStaffDashboard;