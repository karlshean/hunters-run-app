import { useState } from 'react';
import { CreditCard, Building, Star, MoreHorizontal, Trash2, Edit, CheckCircle } from 'lucide-react';
import { paymentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PaymentMethodCard = ({ paymentMethod, onUpdate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [updating, setUpdating] = useState(false);

  const getMethodIcon = (methodType) => {
    switch (methodType) {
      case 'ach':
        return Building;
      case 'card':
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getMethodDisplay = () => {
    if (paymentMethod.method_type === 'card') {
      return {
        title: `${paymentMethod.card_brand?.toUpperCase() || 'Card'} •••• ${paymentMethod.last_four}`,
        subtitle: `Expires ${paymentMethod.expiry_month?.toString().padStart(2, '0')}/${paymentMethod.expiry_year}`,
        color: 'blue'
      };
    } else if (paymentMethod.method_type === 'ach') {
      return {
        title: `${paymentMethod.bank_name || 'Bank Account'} •••• ${paymentMethod.last_four}`,
        subtitle: paymentMethod.account_type?.charAt(0).toUpperCase() + paymentMethod.account_type?.slice(1) || 'Account',
        color: 'green'
      };
    } else {
      return {
        title: paymentMethod.nickname || paymentMethod.method_type.toUpperCase(),
        subtitle: `•••• ${paymentMethod.last_four}`,
        color: 'gray'
      };
    }
  };

  const handleSetDefault = async () => {
    if (paymentMethod.is_default) return;
    
    setUpdating(true);
    try {
      // In a real app, you'd have an API endpoint to update payment method
      // For now, we'll simulate this
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payment method set as default');
      onUpdate();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Error setting default payment method');
    } finally {
      setUpdating(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    if (paymentMethod.is_default) {
      toast.error('Cannot delete default payment method');
      return;
    }

    if (!confirm('Are you sure you want to delete this payment method?')) return;

    setUpdating(true);
    try {
      // In a real app, you'd have an API endpoint to delete payment method
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payment method deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Error deleting payment method');
    } finally {
      setUpdating(false);
      setShowMenu(false);
    }
  };

  const display = getMethodDisplay();
  const Icon = getMethodIcon(paymentMethod.method_type);

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${display.color}-100`}>
            <Icon className={`h-5 w-5 text-${display.color}-600`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium text-gray-900">{display.title}</p>
              {paymentMethod.is_default && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-yellow-600 ml-1">Default</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">{display.subtitle}</p>
            {paymentMethod.nickname && (
              <p className="text-xs text-gray-400">{paymentMethod.nickname}</p>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            disabled={updating}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                {!paymentMethod.is_default && (
                  <button
                    onClick={handleSetDefault}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    // In a real app, you'd open an edit modal here
                    toast.info('Edit functionality coming soon');
                  }}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  disabled={updating}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Nickname
                </button>
                {!paymentMethod.is_default && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                    disabled={updating}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Processing fees info */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Processing fee: {
            paymentMethod.method_type === 'ach' 
              ? '$1.95 or 1% (whichever is lower)'
              : paymentMethod.method_type === 'card'
                ? '2.9% of payment amount'
                : 'Varies by payment method'
          }
        </p>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default PaymentMethodCard;