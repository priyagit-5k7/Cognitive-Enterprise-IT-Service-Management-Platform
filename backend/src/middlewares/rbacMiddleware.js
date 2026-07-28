const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    const { permissions, role_name } = req.user;

    // Admin has full access
    if (role_name === 'Admin') {
      return next();
    }

    // Check direct match
    if (permissions.includes(requiredPermission)) {
      return next();
    }

    // Check wildcard match, e.g. "users:*" matches "users:read"
    const [resource, action] = requiredPermission.split(':');
    if (resource) {
      const wildcardPermission = `${resource}:*`;
      if (permissions.includes(wildcardPermission)) {
        return next();
      }
    }

    // Check global wildcard "*"
    if (permissions.includes('*')) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
  };
};

module.exports = checkPermission;
module.exports.checkPermission = checkPermission;
module.exports.requirePermission = checkPermission;
