import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Settings,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import PaymentMethodCard from '../../components/Payments/PaymentMethodCard';
import MakePaymentModal from '../../components/Payments/MakePaymentModal';
import AddPaymentMethodModal from '../../components/Payments/AddPaymentMethodModal';
import toast from 'react-hot-toast';

const Payments = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [autoPaySettings, setAutoPaySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMakePayment, setShowMakePayment] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    status: '',
    payment_type: ''
  });

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const [balanceRes, methodsRes, historyRes, autoPayRes] = await Promise.all([
        paymentsAPI.getBalance(),
        paymentsAPI.getPaymentMethods(),
        paymentsAPI.getPaymentHistory(),
        paymentsAPI.getAutoPaySettings()
      ]);

      setBalance(balanceRes.data.data.balance);
      setPaymentMethods(methodsRes.data.data.paymentMethods);
      setPaymentHistory(historyRes.data.data.payments);
      setAutoPaySettings(autoPayRes.data.data.autoPaySettings);
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Error loading payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    loadPaymentData();
    setShowMakePayment(false);
    toast.success('Payment submitted successfully!');
  };

  const handlePaymentMethodAdded = () => {
    loadPaymentData();
    setShowAddPaymentMethod(false);
    toast.success('Payment method added successfully!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return Clock;
      case 'pending': return Calendar;
      case 'failed': return AlertTriangle;
      default: return Clock;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your rent payments and payment methods
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button
            onClick={() => setShowAddPaymentMethod(true)}
            className="btn btn-outline flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </button>
          <button
            onClick={() => setShowMakePayment(true)}
            disabled={!paymentMethods.length || !balance?.total_balance}
            className="btn btn-primary flex items-center disabled:opacity-50"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Make Payment
          </button>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(balance?.overdue_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(balance?.current_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Due</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(balance?.total_balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Rent Due */}
      {balance?.next_rent_due && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Next Rent Payment Due: {formatDate(balance.next_rent_due)}
              </p>
              <p className="text-xs text-blue-600">
                Monthly Rent: {formatCurrency(balance?.monthly_rent)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Pay Status */}
      {autoPaySettings && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Auto-Pay is {autoPaySettings.is_active ? 'Active' : 'Inactive'}
                </p>
                {autoPaySettings.is_active && (
                  <p className="text-xs text-green-600">
                    Pays on the {autoPaySettings.payment_day}th of each month
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/payments/autopay"
              className="text-green-600 hover:text-green-700 flex items-center"
            >
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Link>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
            <button
              onClick={() => setShowAddPaymentMethod(true)}
              className="text-blue-600 hover:text-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Method
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment methods</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add a payment method to make payments online
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddPaymentMethod(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  paymentMethod={method}
                  onUpdate={loadPaymentData}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
            <div className="flex items-center space-x-2">
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                className="form-input text-sm"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={historyFilters.payment_type}
                onChange={(e) => setHistoryFilters(prev => ({ ...prev, payment_type: e.target.value }))}
                className="form-input text-sm"
              >
                <option value="">All Types</option>
                <option value="rent">Rent</option>
                <option value="fee">Fees</option>
                <option value="deposit">Deposit</option>
                <option value="utility">Utility</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {paymentHistory.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentHistory.map((payment) => {
                const StatusIcon = getStatusIcon(payment.status);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${payment.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <StatusIcon className={`h-5 w-5 ${payment.status === 'completed' ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.created_at)} • {payment.payment_method_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showMakePayment && (
        <MakePaymentModal
          isOpen={showMakePayment}
          onClose={() => setShowMakePayment(false)}
          balance={balance}
          paymentMethods={paymentMethods}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showAddPaymentMethod && (
        <AddPaymentMethodModal
          isOpen={showAddPaymentMethod}
          onClose={() => setShowAddPaymentMethod(false)}
          onSuccess={handlePaymentMethodAdded}
        />
      )}
    </div>
  );
};

export default Payments;