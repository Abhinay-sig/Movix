let razorpayScriptPromise = null
const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js'
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout is only available in the browser.'))
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay)
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID)
      const script = existingScript || document.createElement('script')

      if (!existingScript) {
        script.id = RAZORPAY_SCRIPT_ID
        script.src = RAZORPAY_SCRIPT_SRC
        script.async = true
        document.body.appendChild(script)
      }

      const handleLoad = () => {
        if (window.Razorpay) resolve(window.Razorpay)
        else reject(new Error('Razorpay checkout failed to load.'))
      }

      const handleError = () => reject(new Error('Unable to load Razorpay checkout right now.'))

      if (window.Razorpay) {
        resolve(window.Razorpay)
        return
      }

      script.addEventListener('load', handleLoad, { once: true })
      script.addEventListener('error', handleError, { once: true })
    })
  }

  return razorpayScriptPromise
}

export async function openRazorpayCheckout(options) {
  const Razorpay = await loadRazorpayCheckout()

  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      ...options,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Razorpay checkout was closed before payment completed.')),
        ...(options.modal || {}),
      },
    })

    instance.on('payment.failed', (event) => {
      const description =
        event?.error?.description || event?.error?.reason || 'Razorpay reported a payment failure.'
      reject(new Error(description))
    })

    instance.open()
  })
}
