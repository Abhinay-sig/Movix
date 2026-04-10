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
