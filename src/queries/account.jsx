/**
 * The signed-in user's own account: edit the profile and change the password.
 * The user object lives in AuthContext (useAuth), not in the query cache, so nothing is
 * invalidated here: after a profile update, hand the returned user to setUser().
 */
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api'

/** mutate(patch) with any of { name, phone, jobTitle }. Resolves with the updated user. */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (patch) => authApi.updateProfile(patch),
  })
}

/** mutate({ currentPassword, newPassword }) */
export function useChangePassword() {
  return useMutation({
    // Only these two fields are sent, even when the form object also holds a "confirm password" value.
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword({ currentPassword, newPassword }),
  })
}
