import { useState } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { paymentsAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const MakePaymentModal = ({ isOpen, onClose, balance, paymentMethods, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_method_id: '',
    payment_type: 'rent',
    scheduled_date: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await paymentsAPI.makePayment({
        ...formData,
        amount: parseFloat(formData.amount),
        scheduled_date: formData.scheduled_date || null
      });

      onSuccess();
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error(error.response?.data?.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  const defaultPaymentMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getPaymentMethodDisplay = (method) => {
    if (method.method_type === 'card') {
      return `${method.card_brand?.toUpperCase() || 'Card'} ending in ${method.last_four}`;
    } else if (method.method_type === 'ach') {
      return `${method.bank_name || 'Bank Account'} ending in ${method.last_four}`;
    } else {
      return method.nickname || method.method_type.toUpperCase();
    }
  };

  const calculateFee = (amount, methodType) => {
    const numAmount = parseFloat(amount) || 0;
    switch (methodType) {
      case 'ach':
        return Math.min(1.95, numAmount * 0.01);
      case 'card':
        return numAmount * 0.029;
      case 'paypal':
        return numAmount * 0.035;
      default:
        return 0;
    }
  };

  const selectedMethod = paymentMethods.find(m => m.id === formData.payment_method_id);
  const fee = selectedMethod ? calculateFee(formData.amount, selectedMethod.method_type) : 0;
  const total = (parseFloat(formData.amount) || 0) + fee;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Make Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Balance Overview */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium">{formatCurrency(balance?.current_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overdue:</span>
                <span className="font-medium text-red-600">{formatCurrency(balance?.overdue_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total Due:</span>
                <span className="font-bold text-blue-600">{formatCurrency(balance?.total_balance)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                className="form-input w-full"
                required
              >
                <option value="rent">Rent</option>
                <option value="fee">Fees</option>
                <option value="deposit">Security Deposit</option>
                <option value="utility">Utility</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance?.total_balance || 10000}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="form-input pl-10 w-full"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: balance?.overdue_amount?.toString() || '' })}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={!balance?.overdue_amount}
                >
                  Pay Overdue ({formatCurrency(balance?.overdue_amount)})
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: balance?.total_balance?.toString() || '' })}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  disabled={!balance?.total_balance}
                >
                  Pay Full Balance ({formatCurrency(balance?.total_balance)})
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method_id}
                onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                className="form-input w-full"
                required
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {getPaymentMethodDisplay(method)}
                    {method.is_default && ' (Default)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Payment (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="form-input pl-10 w-full"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to process immediately
              </p>
            </div>

            {/* Fee Information */}
            {formData.amount && selectedMethod && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Processing Fee</span>
                </div>
                <div className="space-y-1 text-xs text-yellow-700">
                  <div className="flex justify-between">
                    <span>Payment Amount:</span>
                    <span>{formatCurrency(formData.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee:</span>
                    <span>{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-1">
                    <span className="font-medium">Total Charge:</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !formData.amount || !formData.payment_method_id}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {formData.scheduled_date ? 'Schedule Payment' : 'Pay Now'}
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

export default MakePaymentModal;