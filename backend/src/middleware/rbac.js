import { AppError } from '../utils/errors.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireMultiTenant = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  req.organizationId = req.user.organizationId;
  next();
};

export const filterByOrganization = (query, organizationId) => {
  return { ...query, organizationId };
};

