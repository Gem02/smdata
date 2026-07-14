const UserModel = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.params.adminUserId; // ✅ extract string, not object

    if (!adminUserId) {
      return res.status(400).json({ message: 'Admin user ID is required' });
    }

    const admin = await UserModel.findById(adminUserId); // ✅ pass string only

    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Unauthorized: Not an admin' });
    }

    req.user = admin;
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ message: 'Server error verifying admin' });
  }
};

const verifySuperAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.params.adminUserId; 

    if (!adminUserId) {
      return res.status(400).json({ message: 'Admin user ID is required' });
    }

    const admin = await UserModel.findById(adminUserId); // ✅ pass string only

    if (!admin || !['super-admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Unauthorized: Not a super admin' });
    }

    req.user = admin;
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ message: 'Server error verifying admin' });
  }
};

const verifyUserParam = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('User param verification error:', err);
    return res.status(500).json({ message: 'Server error verifying user' });
  }
};

module.exports = {
  verifyAdmin, 
  verifySuperAdmin,
  verifyUserParam
};
