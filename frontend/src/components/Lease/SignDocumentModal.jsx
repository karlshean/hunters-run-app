import { useState, useRef } from 'react';
import { X, Signature, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { leasesAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const SignDocumentModal = ({ isOpen, onClose, signatureRequest, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: review, 2: sign, 3: confirm
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  if (!isOpen || !signatureRequest) return null;

  const handleStartDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    setSignature(signatureData);
    setStep(3);
  };

  const handleSubmitSignature = async () => {
    if (!agreedToTerms || !signature) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      await leasesAPI.signDocument(signatureRequest.id, {
        signature_data: signature,
        agreed_terms: agreedToTerms
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error(error.response?.data?.message || 'Error signing document');
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Signature className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Sign Document</h3>
                <p className="text-sm text-gray-500">{signatureRequest.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step 1: Review Document */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Document Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">{signatureRequest.title}</h4>
                  </div>
                  <span className="text-sm text-gray-500">
                    Due: {formatDate(signatureRequest.due_date)}
                  </span>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Please review the document before signing
                  </p>
                  <button
                    onClick={() => window.open(signatureRequest.file_url, '_blank')}
                    className="btn btn-outline flex items-center mx-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open Document
                  </button>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Before You Sign</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div>
                      <h5 className="text-sm font-medium text-yellow-800">Important Notice</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        By signing this document electronically, you agree that your electronic signature 
                        will have the same legal effect as a handwritten signature. Please ensure you 
                        have read and understood the entire document before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-900">
                    I have read, understood, and agree to the terms and conditions outlined in this document.
                    I consent to signing this document electronically and acknowledge that my electronic 
                    signature will be legally binding.
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!agreedToTerms}
                  className="flex-1 btn btn-primary disabled:opacity-50"
                >
                  Proceed to Sign
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create Signature */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Create Your Signature</h4>
                <p className="text-sm text-gray-600">
                  Please sign in the box below using your mouse or touchscreen
                </p>
              </div>

              {/* Signature Canvas */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full h-32 border border-gray-200 rounded bg-white cursor-crosshair"
                  onMouseDown={handleStartDrawing}
                  onMouseMove={handleDraw}
                  onMouseUp={handleStopDrawing}
                  onMouseLeave={handleStopDrawing}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">Sign above</p>
                  <button
                    onClick={clearSignature}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 btn btn-outline"
                >
                  Back
                </button>
                <button
                  onClick={captureSignature}
                  className="flex-1 btn btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Signature */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Confirm Your Signature</h4>
                <p className="text-sm text-gray-600">
                  Please review your signature and confirm to complete the signing process
                </p>
              </div>

              {/* Signature Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-center">
                  <img 
                    src={signature} 
                    alt="Your signature" 
                    className="mx-auto border border-gray-200 rounded bg-white"
                    style={{ maxHeight: '100px' }}
                  />
                  <p className="text-sm text-gray-600 mt-2">Your electronic signature</p>
                </div>
              </div>

              {/* Final Confirmation */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <h5 className="text-sm font-medium text-green-800">Ready to Sign</h5>
                    <p className="text-sm text-green-700 mt-1">
                      By clicking "Complete Signature" below, you confirm that:
                    </p>
                    <ul className="text-sm text-green-700 mt-2 list-disc list-inside space-y-1">
                      <li>You have read and agree to all terms in the document</li>
                      <li>Your electronic signature is legally binding</li>
                      <li>You are authorized to sign this document</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 btn btn-outline"
                  disabled={loading}
                >
                  Edit Signature
                </button>
                <button
                  onClick={handleSubmitSignature}
                  disabled={loading}
                  className="flex-1 btn btn-primary"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Signature className="h-4 w-4 mr-2" />
                      Complete Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-3 h-3 rounded-full ${
                  step === stepNumber
                    ? 'bg-blue-600'
                    : step > stepNumber
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignDocumentModal;