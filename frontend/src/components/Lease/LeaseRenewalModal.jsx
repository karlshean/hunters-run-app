import { useState } from 'react';
import { X, RefreshCw, Calendar, MessageSquare, Home, DollarSign } from 'lucide-react';
import { leasesAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const LeaseRenewalModal = ({ isOpen, onClose, currentLease, onSuccess }) => {
  const [formData, setFormData] = useState({
    requested_start_date: '',
    requested_term_months: 12,
    message: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentLease) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await leasesAPI.requestRenewal(formData);
      onSuccess();
    } catch (error) {
      console.error('Error submitting renewal request:', error);
      toast.error(error.response?.data?.message || 'Error submitting renewal request');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
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

  const getDefaultStartDate = () => {
    const leaseEnd = new Date(currentLease.end_date);
    return leaseEnd.toISOString().split('T')[0];
  };

  const getMinStartDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Request Lease Renewal</h3>
                <p className="text-sm text-gray-500">Submit a renewal request for your lease</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Lease Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Current Lease</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Home className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Property:</span>
                  <span className="ml-auto font-medium">{currentLease.property_name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600">Unit:</span>
                  <span className="ml-auto font-medium">{currentLease.unit_number}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Current Rent:</span>
                  <span className="ml-auto font-medium">{formatCurrency(currentLease.monthly_rent)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Expires:</span>
                  <span className="ml-auto font-medium">{formatDate(currentLease.end_date)}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Renewal Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Start Date
                </label>
                <input
                  type="date"
                  value={formData.requested_start_date || getDefaultStartDate()}
                  onChange={(e) => setFormData({ ...formData, requested_start_date: e.target.value })}
                  className="form-input w-full"
                  min={getMinStartDate()}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typically begins when current lease expires
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Term
                </label>
                <select
                  value={formData.requested_term_months}
                  onChange={(e) => setFormData({ ...formData, requested_term_months: parseInt(e.target.value) })}
                  className="form-input w-full"
                  required
                >
                  <option value={6}>6 months</option>
                  <option value={12}>12 months (1 year)</option>
                  <option value={18}>18 months</option>
                  <option value={24}>24 months (2 years)</option>
                </select>
              </div>
            </div>

            {/* Message to Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message to Management (Optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="form-input w-full"
                rows={4}
                placeholder="Any special requests, questions about rent changes, or additional comments..."
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.message.length}/1000 characters
              </p>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Please Note:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• This is a request for renewal and does not guarantee approval</li>
                <li>• Management will review your request and contact you within 5-7 business days</li>
                <li>• Rent amount for the renewal term will be determined by management</li>
                <li>• Early submission helps ensure continued occupancy</li>
              </ul>
            </div>

            {/* Expected Timeline */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-900 mb-2">Expected Timeline:</h5>
              <div className="space-y-2 text-sm text-yellow-800">
                <div className="flex justify-between">
                  <span>Request Submitted:</span>
                  <span className="font-medium">Today</span>
                </div>
                <div className="flex justify-between">
                  <span>Management Review:</span>
                  <span className="font-medium">3-5 business days</span>
                </div>
                <div className="flex justify-between">
                  <span>Response Expected:</span>
                  <span className="font-medium">Within 1 week</span>
                </div>
                <div className="flex justify-between">
                  <span>New Lease Preparation:</span>
                  <span className="font-medium">1-2 weeks after approval</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Submit Renewal Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeaseRenewalModal;