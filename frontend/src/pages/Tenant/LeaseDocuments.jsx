import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Signature,
  Eye,
  Home,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { leasesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import SignDocumentModal from '../../components/Lease/SignDocumentModal';
import LeaseRenewalModal from '../../components/Lease/LeaseRenewalModal';
import toast from 'react-hot-toast';

const LeaseDocuments = () => {
  const { user } = useAuth();
  const [currentLease, setCurrentLease] = useState(null);
  const [leaseDocuments, setLeaseDocuments] = useState([]);
  const [signatureRequests, setSignatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  useEffect(() => {
    loadLeaseData();
  }, []);

  const loadLeaseData = async () => {
    try {
      const [leaseRes, documentsRes, signaturesRes] = await Promise.all([
        leasesAPI.getCurrentLease(),
        leasesAPI.getLeaseDocuments(),
        leasesAPI.getSignatureRequests()
      ]);

      setCurrentLease(leaseRes.data.data.lease);
      setLeaseDocuments(documentsRes.data.data.leaseDocuments);
      setSignatureRequests(signaturesRes.data.data.signatureRequests);
    } catch (error) {
      console.error('Error loading lease data:', error);
      toast.error('Error loading lease information');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSign = (signatureRequest) => {
    setShowSignModal(signatureRequest);
  };

  const handleSignSuccess = () => {
    loadLeaseData();
    setShowSignModal(null);
    toast.success('Document signed successfully!');
  };

  const handleRenewalSuccess = () => {
    loadLeaseData();
    setShowRenewalModal(false);
    toast.success('Lease renewal request submitted successfully!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case 'lease': return FileText;
      case 'addendum': return FileText;
      case 'renewal': return RefreshCw;
      case 'amendment': return FileText;
      case 'notice': return AlertTriangle;
      default: return FileText;
    }
  };

  const getDocumentTypeColor = (type) => {
    switch (type) {
      case 'lease': return 'text-blue-600 bg-blue-100';
      case 'addendum': return 'text-purple-600 bg-purple-100';
      case 'renewal': return 'text-green-600 bg-green-100';
      case 'amendment': return 'text-orange-600 bg-orange-100';
      case 'notice': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSignatureStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isLeaseExpiringSoon = (endDate) => {
    const today = new Date();
    const leaseEnd = new Date(endDate);
    const daysUntilExpiry = Math.ceil((leaseEnd - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0; // Within 60 days
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
          <h1 className="text-2xl font-bold text-gray-900">Lease & Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            View your lease information and manage documents
          </p>
        </div>
        {currentLease && isLeaseExpiringSoon(currentLease.end_date) && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowRenewalModal(true)}
              className="btn btn-primary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Request Renewal
            </button>
          </div>
        )}
      </div>

      {/* Current Lease Information */}
      {currentLease ? (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Current Lease</h2>
            {isLeaseExpiringSoon(currentLease.end_date) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <Clock className="h-4 w-4 mr-1" />
                Expiring Soon
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Details */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Home className="h-4 w-4 mr-2" />
                <span>Property & Unit</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentLease.property_name}</p>
                <p className="text-sm text-gray-600">Unit {currentLease.unit_number}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>
                    {currentLease.address_line1}, {currentLease.city}, {currentLease.state} {currentLease.zip_code}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {currentLease.bedrooms} bed, {currentLease.bathrooms} bath • {currentLease.square_footage} sq ft
                </p>
              </div>
            </div>

            {/* Lease Terms */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Lease Terms</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">{formatDate(currentLease.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium text-gray-900">{formatDate(currentLease.end_date)}</p>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>Financial Details</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="font-medium text-gray-900">{formatCurrency(currentLease.monthly_rent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Security Deposit</p>
                  <p className="font-medium text-gray-900">{formatCurrency(currentLease.security_deposit)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">{currentLease.document_count || 0}</p>
                    <p className="text-xs text-blue-700">Documents</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center">
                  <Signature className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">{currentLease.pending_signatures || 0}</p>
                    <p className="text-xs text-yellow-700">Pending Signatures</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {currentLease.status === 'active' ? 'Active' : currentLease.status}
                    </p>
                    <p className="text-xs text-green-700">Status</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active lease found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contact your property manager for assistance with your lease.
          </p>
        </div>
      )}

      {/* Signature Requests */}
      {signatureRequests.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Signature Requests</h3>
            <p className="text-sm text-gray-600">Documents requiring your signature</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {signatureRequests.filter(req => req.status === 'pending').map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Signature className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.title}</p>
                      <p className="text-sm text-gray-500">
                        {request.document_type.charAt(0).toUpperCase() + request.document_type.slice(1)} • 
                        Due: {formatDate(request.due_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(request.file_url, '_blank')}
                      className="btn btn-outline btn-sm flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDocumentSign(request)}
                      className="btn btn-primary btn-sm flex items-center"
                    >
                      <Signature className="h-4 w-4 mr-1" />
                      Sign
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lease Documents */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lease Documents</h3>
          <p className="text-sm text-gray-600">All documents related to your lease</p>
        </div>

        {leaseDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your lease documents will appear here once uploaded by management.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {leaseDocuments.map((document) => {
              const TypeIcon = getDocumentTypeIcon(document.document_type);
              return (
                <div key={document.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${getDocumentTypeColor(document.document_type)}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{document.title}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDocumentTypeColor(document.document_type)}`}>
                            {document.document_type}
                          </span>
                          {document.signed_date ? (
                            <span className="inline-flex items-center text-xs text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Signed {formatDate(document.signed_date)}
                            </span>
                          ) : document.requires_signature ? (
                            <span className="inline-flex items-center text-xs text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Signature Required
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Uploaded {formatDate(document.created_at)}
                            </span>
                          )}
                        </div>
                        {document.description && (
                          <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => window.open(document.file_url, '_blank')}
                        className="btn btn-outline btn-sm flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <a
                        href={document.file_url}
                        download={document.file_name}
                        className="btn btn-outline btn-sm flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSignModal && (
        <SignDocumentModal
          isOpen={!!showSignModal}
          onClose={() => setShowSignModal(null)}
          signatureRequest={showSignModal}
          onSuccess={handleSignSuccess}
        />
      )}

      {showRenewalModal && (
        <LeaseRenewalModal
          isOpen={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          currentLease={currentLease}
          onSuccess={handleRenewalSuccess}
        />
      )}
    </div>
  );
};

export default LeaseDocuments;