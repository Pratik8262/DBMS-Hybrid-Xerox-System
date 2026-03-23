/**
 * hooks/usePayment.js
 * TanStack Query mutations for payment flow.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../services/api'

export function usePayment(jobId) {
  return useQuery({
    queryKey: ['payment', jobId],
    queryFn: () => api.get(`/payments/${jobId}`).then(r => r.data.data),
    enabled: !!jobId,
  })
}

/**
 * Step 1: Create a Razorpay order — returns { orderId, amount }
 */
export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ job_id, method = 'upi' }) =>
      api.post('/payments/create-order', { job_id, method }).then(r => r.data.data),
  })
}

/**
 * Step 2: Verify payment after Razorpay checkout.handler fires
 */
export function useVerifyPayment() {
  return useMutation({
    mutationFn: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
      api.post('/payments/verify', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }).then(r => r.data.data),
  })
}

/**
 * Opens the Razorpay checkout modal.
 * @param {Object} orderData - { orderId, amount, userName, userEmail, userPhone }
 * @param {Function} onSuccess - called with Razorpay response object
 * @param {Function} onDismiss - called if user closes modal
 */
export function openRazorpayCheckout({ orderId, amount, userName, userEmail, userPhone }, onSuccess, onDismiss) {
  const options = {
    key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount:      amount * 100,
    currency:    'INR',
    name:        'PrintEasy',
    description: 'Document Printing Service',
    order_id:    orderId,
    prefill: {
      name:    userName  || '',
      email:   userEmail || '',
      contact: userPhone || '',
    },
    theme: { color: '#4F46E5' },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
    },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', (response) => {
    console.error('[Razorpay] Payment failed:', response.error)
  })
  rzp.open()
}
