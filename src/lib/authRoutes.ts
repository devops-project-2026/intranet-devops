export const COMMUNITY_PATH = "/posts";
export const ADMIN_DASHBOARD_PATH = "/admin";
export const LEGACY_DASHBOARD_PATH = "/dashboard";

export function hasAdminRole(roles: string[] = []) {
  return roles.includes("ROLE_ADMIN");
}

export function getHomePath(roles: string[] = []) {
  return hasAdminRole(roles) ? ADMIN_DASHBOARD_PATH : COMMUNITY_PATH;
}

export function getAuthorizedRedirectPath(pathname: string, roles: string[] = []) {
  const isAdmin = hasAdminRole(roles);
  const isAdminPath = pathname === ADMIN_DASHBOARD_PATH || pathname.startsWith(`${ADMIN_DASHBOARD_PATH}/`);

  if (isAdmin) {
    return pathname === LEGACY_DASHBOARD_PATH ? ADMIN_DASHBOARD_PATH : null;
  }

  if (pathname === LEGACY_DASHBOARD_PATH || isAdminPath) {
    return COMMUNITY_PATH;
  }

  return null;
}
