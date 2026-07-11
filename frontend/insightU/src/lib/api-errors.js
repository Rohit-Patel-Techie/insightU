// DRF error responses come in a few shapes depending on where they're raised:
//   { "email": ["A user with this email already exists."] }   <- field-specific
//   { "non_field_errors": ["..."] }                             <- serializer-level
//   { "detail": "No active account found with the given credentials" } <- auth/permission errors
//
// This walks a DRF error payload, pushes anything matching a known form field
// onto that field via RHF's setError, and returns a single string for
// anything else (to show in a toast or an <Alert>).
export function applyApiErrorsToForm(error, setError, knownFields = []) {
  const data = error?.response?.data

  if (!data || typeof data !== "object") {
    return error?.message || "Something went wrong. Please try again."
  }

  if (typeof data.detail === "string") {
    return data.detail
  }

  const genericMessages = []

  Object.entries(data).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages.join(" ") : String(messages)

    if (knownFields.includes(field)) {
      setError(field, { type: "server", message })
    } else {
      genericMessages.push(message)
    }
  })

  return genericMessages.length > 0 ? genericMessages.join(" ") : null
}