import { useState } from 'react';
import { X, CreditCard, Building, Shield, AlertCircle } from 'lucide-react';
import { paymentsAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const AddPaymentMethodModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: method type, 2: details
  const [formData, setFormData] = useState({
    method_type: '',
    nickname: '',
    account_type: '',
    routing_number: '',
    account_number: '',
    confirm_account_number: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: '',
    is_default: false
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleMethodTypeSelect = (type) => {
    setFormData({ ...formData, method_type: type });
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (formData.method_type === 'ach') {
        if (formData.account_number !== formData.confirm_account_number) {
          toast.error('Account numbers do not match');
          setLoading(false);
          return;
        }
      }

      // In a real implementation, this would integrate with Stripe, Plaid, or another payment processor
      // For now, we'll simulate the payment method creation
      const paymentMethodData = {
        method_type: formData.method_type,
        provider: 'stripe', // This would be determined by the payment processor
        external_id: 'pm_' + Date.now(), // Mock external ID
        nickname: formData.nickname || getDefaultNickname(formData),
        is_default: formData.is_default
      };

      if (formData.method_type === 'ach') {
        paymentMethodData.account_type = formData.account_type;
        paymentMethodData.last_four = formData.account_number.slice(-4);
        paymentMethodData.bank_name = 'Demo Bank'; // In real app, this would come from bank lookup
      } else if (formData.method_type === 'card') {
        paymentMethodData.last_four = formData.card_number.replace(/\s/g, '').slice(-4);
        paymentMethodData.card_brand = detectCardBrand(formData.card_number);
        paymentMethodData.expiry_month = parseInt(formData.expiry_month);
        paymentMethodData.expiry_year = parseInt(formData.expiry_year);
      }

      await paymentsAPI.addPaymentMethod(paymentMethodData);
      onSuccess();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error.response?.data?.message || 'Error adding payment method');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultNickname = (data) => {
    if (data.method_type === 'ach') {
      return `${data.account_type} account ending in ${data.account_number.slice(-4)}`;
    } else if (data.method_type === 'card') {
      return `${detectCardBrand(data.card_number)} ending in ${data.card_number.replace(/\s/g, '').slice(-4)}`;
    }
    return data.method_type.toUpperCase();
  };

  const detectCardBrand = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    return 'unknown';
  };

  const formatCardNumber = (value) => {
    return value
      .replace(/\s/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const validateCardNumber = (number) => {
    const cleaned = number.replace(/\s/g, '');
    return cleaned.length >= 13 && cleaned.length <= 19;
  };

  const validateRoutingNumber = (routing) => {
    return routing.length === 9 && /^\d+$/.test(routing);
  };

  const validateAccountNumber = (account) => {
    return account.length >= 4 && account.length <= 17 && /^\d+$/.test(account);
  };

  const isFormValid = () => {
    if (formData.method_type === 'ach') {
      return (
        validateRoutingNumber(formData.routing_number) &&
        validateAccountNumber(formData.account_number) &&
        formData.account_number === formData.confirm_account_number &&
        formData.account_type
      );
    } else if (formData.method_type === 'card') {
      return (
        validateCardNumber(formData.card_number) &&
        formData.expiry_month &&
        formData.expiry_year &&
        formData.cvv.length >= 3 &&
        formData.cardholder_name
      );
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Add Payment Method</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-6">
                Choose how you'd like to pay your rent
              </p>

              <button
                onClick={() => handleMethodTypeSelect('ach')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg mr-4">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Bank Account (ACH)</h4>
                    <p className="text-sm text-gray-500">Low fee • 1-3 business days</p>
                    <p className="text-xs text-green-600">Fee: $1.95 or 1% (whichever is lower)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleMethodTypeSelect('card')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg mr-4">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Debit/Credit Card</h4>
                    <p className="text-sm text-gray-500">Instant processing</p>
                    <p className="text-xs text-blue-600">Fee: 2.9% of payment amount</p>
                  </div>
                </div>
              </button>

              <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Your payment information is encrypted and secure</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && formData.method_type === 'ach' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  ← Back to payment methods
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="form-input w-full"
                  required
                >
                  <option value="">Select account type</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className={`form-input w-full ${formData.routing_number && !validateRoutingNumber(formData.routing_number) ? 'border-red-300' : ''}`}
                  placeholder="9 digits"
                  maxLength={9}
                  required
                />
                {formData.routing_number && !validateRoutingNumber(formData.routing_number) && (
                  <p className="text-red-500 text-xs mt-1">Routing number must be 9 digits</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '').slice(0, 17) })}
                  className={`form-input w-full ${formData.account_number && !validateAccountNumber(formData.account_number) ? 'border-red-300' : ''}`}
                  placeholder="4-17 digits"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Account Number
                </label>
                <input
                  type="text"
                  value={formData.confirm_account_number}
                  onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value.replace(/\D/g, '').slice(0, 17) })}
                  className={`form-input w-full ${formData.confirm_account_number && formData.account_number !== formData.confirm_account_number ? 'border-red-300' : ''}`}
                  placeholder="Re-enter account number"
                  required
                />
                {formData.confirm_account_number && formData.account_number !== formData.confirm_account_number && (
                  <p className="text-red-500 text-xs mt-1">Account numbers do not match</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="form-input w-full"
                  placeholder="e.g., Main Checking"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Make this my default payment method
                </label>
              </div>

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
                  disabled={loading || !isFormValid()}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Bank Account'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 2 && formData.method_type === 'card' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  ← Back to payment methods
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={formData.card_number}
                  onChange={(e) => setFormData({ ...formData, card_number: formatCardNumber(e.target.value.slice(0, 19)) })}
                  className={`form-input w-full ${formData.card_number && !validateCardNumber(formData.card_number) ? 'border-red-300' : ''}`}
                  placeholder="1234 5678 9012 3456"
                  required
                />
                {formData.card_number && !validateCardNumber(formData.card_number) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid card number</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Month
                  </label>
                  <select
                    value={formData.expiry_month}
                    onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value })}
                    className="form-input w-full"
                    required
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {(i + 1).toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Year
                  </label>
                  <select
                    value={formData.expiry_year}
                    onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value })}
                    className="form-input w-full"
                    required
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  value={formData.cvv}
                  onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="form-input w-full"
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={formData.cardholder_name}
                  onChange={(e) => setFormData({ ...formData, cardholder_name: e.target.value })}
                  className="form-input w-full"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="form-input w-full"
                  placeholder="e.g., Main Credit Card"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Make this my default payment method
                </label>
              </div>

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
                  disabled={loading || !isFormValid()}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Card'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMethodModal;