import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { generateToken } from '../middleware/auth.js';

export const register = asyncHandler(async (req, res, next) => {
  const { email, password, role = 'editor', organizationName } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  let organization;
  if (organizationName) {
    organization = await Organization.findOne({ name: organizationName });
    if (!organization) {
      organization = await Organization.create({ name: organizationName });
    }
  } else {
    return next(new AppError('Organization name is required', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists', 400));
  }

  const user = await User.create({
    email,
    password,
    role,
    organizationId: organization._id,
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).populate('organizationId');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid credentials', 401));
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      token,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('organizationId');

  res.json({
    success: true,
    data: { user },
  });
});

