/**
 * Sign-in and the signed-in user's own account.
 *
 * REST endpoints your backend should provide:
 *   POST  /auth/login             body { email, password }                 -> { token, user }      401 when wrong
 *   POST  /auth/logout                                                     -> 204
 *   GET   /auth/me                                                         -> user                 401 without a valid token
 *   PATCH /auth/me                body { name?, phone?, jobTitle? }        -> user
 *   POST  /auth/change-password   body { currentPassword, newPassword }    -> 204                  422 { fieldErrors }
 *
 * user = { id, name, email, role: 'admin'|'manager'|'staff', phone, jobTitle, createdAt }
 * Every other request sends the token as  Authorization: Bearer <token>.
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { auth as mock } from './mock/system.js'

export const authApi = {
  login: (credentials) => (USE_MOCK ? mock.login(credentials) : http.post('/auth/login', credentials)),
  logout: () => (USE_MOCK ? mock.logout() : http.post('/auth/logout')),
  me: () => (USE_MOCK ? mock.me() : http.get('/auth/me')),
  updateProfile: (patch) => (USE_MOCK ? mock.updateProfile(patch) : http.patch('/auth/me', patch)),
  changePassword: (data) => (USE_MOCK ? mock.changePassword(data) : http.post('/auth/change-password', data)),
}
