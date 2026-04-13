export function extractFieldErrors(error) {
  const details = error?.details?.fieldErrors
  if (!details || typeof details !== 'object') return {}

  return Object.fromEntries(
    Object.entries(details)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => Boolean(value))
  )
}

export function withFieldError(baseClass, hasError) {
  return `${baseClass} ${
    hasError
      ? 'border-rose-300 ring-4 ring-rose-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
      : ''
  }`
}

export function normalizeTextInput(value) {
  return String(value ?? '').trim()
}

export function isLettersAndSpaces(value) {
  return /^[A-Za-z ]+$/.test(normalizeTextInput(value))
}

export function validateNameField(value, label = 'Name') {
  const normalized = normalizeTextInput(value)
  if (!normalized) return `${label} is required.`
  if (normalized.length < 3) return `${label} must be at least 3 characters.`
  if (!isLettersAndSpaces(normalized)) {
    return `${label} can contain only alphabets and spaces.`
  }
  return ''
}

export function validateCityField(value, label = 'City') {
  const normalized = normalizeTextInput(value)
  if (!normalized) return `${label} is required.`
  if (normalized.length < 3) return `${label} must be at least 3 characters.`
  if (!isLettersAndSpaces(normalized)) {
    return `${label} can contain only alphabets and spaces.`
  }
  return ''
}

export function validateAddressField(value) {
  const normalized = normalizeTextInput(value)
  if (!normalized) return 'Address is required.'
  if (normalized.length < 5) return 'Address must be at least 5 characters.'
  return ''
}

export function validatePincodeField(value) {
  const normalized = normalizeTextInput(value)
  if (!normalized) return 'Pincode is required.'
  if (!/^\d{6}$/.test(normalized)) {
    return 'Pincode must be exactly 6 digits.'
  }
  return ''
}

export function validatePositiveNumberField(value, label = 'Value') {
  const normalized = String(value ?? '').trim()
  if (!normalized) return `${label} is required.`
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return `${label} must be numeric.`
  if (parsed <= 0) return `${label} must be greater than 0.`
  return ''
}

export function validateTextField(value, label = 'Value', minLength = 3) {
  const normalized = normalizeTextInput(value)
  if (!normalized) return `${label} is required.`
  if (normalized.length < minLength) return `${label} must be at least ${minLength} characters.`
  return ''
}
