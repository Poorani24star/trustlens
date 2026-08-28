// Centralized RBAC configuration.
// All permission checks must go through hasPermission() — never duplicate this logic.

export const rolePermissions = {
  student:            ['dashboard', 'errorDetection', 'reportsHistory', 'profile'],
  faculty:            ['dashboard', 'errorDetection', 'copiedContent', 'reportsHistory', 'profile'],
  researcher:         ['dashboard', 'errorDetection', 'copiedContent', 'reportsHistory', 'profile'],
  faculty_researcher: ['dashboard', 'errorDetection', 'copiedContent', 'reportsHistory', 'profile'],
  admin:              ['adminDashboard', 'userManagement', 'activity', 'knowledgeRepository', 'adminReports', 'profile'],
};

/** Normalize role strings — handles "Faculty / Researcher", "FACULTY_RESEARCHER", "faculty-researcher", "faculty" */
export function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  const clean = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (clean === 'faculty_researcher' || clean === 'faculty' || clean === 'researcher') {
    return 'faculty_researcher';
  }
  return clean;
}

/**
 * Check whether a role has access to a given permission key.
 * @param {string} role       - raw role string (any casing)
 * @param {string} permission - key from rolePermissions (e.g. "copiedContent")
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const normalized = normalizeRole(role);
  return rolePermissions[normalized]?.includes(permission) ?? false;
}
