import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DoctorVerificationHistory } from "../models/doctorVerificationHistory.model.js";
import { User } from "../models/user.model.js";


const getPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({
    verificationStatus: "PENDING",
  })
    .populate({
      path: "userId",
      select: "name email profilePhoto accountStatus role",
    })
    .sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    message: "Pending doctors fetched successfully",
    count: doctors.length,
    data: doctors,
  });
});

const getDoctorDetails = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId)
    .populate({
      path: "userId",
      select: "name email profilePhoto role accountStatus createdAt",
    })
    .populate({
      path: "reviewedBy",
      select: "name email role",
    });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (!doctor.userId || doctor.userId.role !== "DOCTOR") {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Doctor details fetched successfully",
    data: doctor,
  });
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (
    !["PENDING", "UNDER_REVIEW", "INFO_REQUIRED"].includes(
      doctor.verificationStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: `Doctor cannot be approved from ${doctor.verificationStatus} status`,
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.verificationStatus = "VERIFIED";
  doctor.rejectionReason = null;
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();

  await doctor.save();

  await DoctorVerificationHistory.create({
  doctorId: doctor._id,
  performedBy: req.user._id,
  performedByRole: "ADMIN",
  previousStatus,
  newStatus: "VERIFIED",
  reason: null,
});

  return res.status(200).json({
    success: true,
    message: "Doctor verified successfully",
    data: doctor,
  });
});

const rejectDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason is required",
    });
  }

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (
    !["PENDING", "UNDER_REVIEW", "INFO_REQUIRED"].includes(
      doctor.verificationStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: `Doctor cannot be rejected from ${doctor.verificationStatus} status`,
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.verificationStatus = "REJECTED";
  doctor.rejectionReason = rejectionReason.trim();
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();

  await doctor.save();

  await DoctorVerificationHistory.create({
  doctorId: doctor._id,
  performedBy: req.user._id,
  performedByRole: "ADMIN",
  previousStatus,
  newStatus: "REJECTED",
  reason: rejectionReason.trim(),
});

  return res.status(200).json({
    success: true,
    message: "Doctor rejected successfully",
    data: doctor,
  });
});

const getDoctorVerificationHistory = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  const history = await DoctorVerificationHistory.find({
  doctorId: doctor._id,
})
  .populate({
    path: "performedBy",
    select: "name email role",
  })
  .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Doctor verification history fetched successfully",
    count: history.length,
    data: history,
  });
});


const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    totalAdmins,
    activeAccounts,
    suspendedAccounts,
    disabledAccounts,
    pendingDoctors,
    underReviewDoctors,
    infoRequiredDoctors,
    verifiedDoctors,
    rejectedDoctors,
    suspendedDoctors,
    recentRegistrations,
  ] = await Promise.all([
    User.countDocuments({ role: "PATIENT" }),
    Doctor.countDocuments(),
    User.countDocuments({ role: "ADMIN" }),

    User.countDocuments({ accountStatus: "ACTIVE" }),
    User.countDocuments({ accountStatus: "SUSPENDED" }),
    User.countDocuments({ accountStatus: "DISABLED" }),

    Doctor.countDocuments({ verificationStatus: "PENDING" }),
    Doctor.countDocuments({ verificationStatus: "UNDER_REVIEW" }),
    Doctor.countDocuments({ verificationStatus: "INFO_REQUIRED" }),
    Doctor.countDocuments({ verificationStatus: "VERIFIED" }),
    Doctor.countDocuments({ verificationStatus: "REJECTED" }),
    Doctor.countDocuments({ verificationStatus: "SUSPENDED" }),

    User.find()
      .select("name email role accountStatus profilePhoto createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    message: "Admin dashboard statistics fetched successfully",
    data: {
      overview: {
        totalPatients,
        totalDoctors,
        totalAdmins,
      },

      accountStatistics: {
        active: activeAccounts,
        suspended: suspendedAccounts,
        disabled: disabledAccounts,
      },

      doctorVerificationStatistics: {
        pending: pendingDoctors,
        underReview: underReviewDoctors,
        infoRequired: infoRequiredDoctors,
        verified: verifiedDoctors,
        rejected: rejectedDoctors,
        suspended: suspendedDoctors,
      },

      recentRegistrations,
    },
  });
});


const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    role,
    accountStatus,
  } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const filter = {};

  if (role && ["PATIENT", "DOCTOR", "ADMIN"].includes(role)) {
    filter.role = role;
  } else if (role) {
    return res.status(400).json({
      success: false,
      message: "Invalid role filter",
    });
  }

  if (
    accountStatus &&
    ["ACTIVE", "SUSPENDED", "DISABLED"].includes(accountStatus)
  ) {
    filter.accountStatus = accountStatus;
  } else if (accountStatus) {
    return res.status(400).json({
      success: false,
      message: "Invalid account status filter",
    });
  }

  if (search.trim()) {
    const escapedSearch = search.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select("name email role accountStatus profilePhoto createdAt")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    User.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: users,
    pagination: {
      totalUsers,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalUsers / pageSize),
      pageSize,
    },
  });
});


const updateUserAccountStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { accountStatus } = req.body;

  const allowedStatuses = ["ACTIVE", "SUSPENDED", "DISABLED"];

  if (!allowedStatuses.includes(accountStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid account status",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.role === "ADMIN" && user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot change your own account status",
    });
  }

  user.accountStatus = accountStatus;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "User account status updated successfully",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
    },
  });
});



const getAllDoctors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    verificationStatus,
  } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const allowedStatuses = [
    "PENDING",
    "UNDER_REVIEW",
    "INFO_REQUIRED",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
  ];

  const filter = {};

  if (verificationStatus) {
    if (!allowedStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
      });
    }

    filter.verificationStatus = verificationStatus;
  }

  const escapedSearch = search.trim().replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const searchConditions = escapedSearch
    ? [
        { specialization: { $regex: escapedSearch, $options: "i" } },
        { qualification: { $regex: escapedSearch, $options: "i" } },
        { registrationNumber: { $regex: escapedSearch, $options: "i" } },
      ]
    : [];

  if (escapedSearch) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ],
    }).select("_id");

    searchConditions.push({
      userId: { $in: matchingUsers.map((user) => user._id) },
    });
  }

  if (searchConditions.length > 0) {
    filter.$or = searchConditions;
  }

  const [doctors, totalDoctors] = await Promise.all([
    Doctor.find(filter)
      .populate({
        path: "userId",
        select: "name email profilePhoto role accountStatus createdAt",
      })
      .populate({
        path: "reviewedBy",
        select: "name email role",
      })
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Doctor.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Doctors fetched successfully",
    data: doctors,
    pagination: {
      totalDoctors,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalDoctors / pageSize),
      pageSize,
    },
  });
});


const updateDoctorVerificationStatus = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { verificationStatus, reason } = req.body;

  const allowedTransitions = {
    SUSPENDED: "VERIFIED",
    VERIFIED: "SUSPENDED",
  };

  if (!["SUSPENDED", "VERIFIED"].includes(verificationStatus)) {
    return res.status(400).json({
      success: false,
      message: "Status must be SUSPENDED or VERIFIED",
    });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Reason is required",
    });
  }

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  const expectedCurrentStatus = allowedTransitions[verificationStatus];

  if (doctor.verificationStatus !== expectedCurrentStatus) {
    return res.status(400).json({
      success: false,
      message: `Doctor must currently be ${expectedCurrentStatus} to change status to ${verificationStatus}`,
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.verificationStatus = verificationStatus;
  doctor.rejectionReason =
    verificationStatus === "SUSPENDED" ? reason.trim() : null;
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();

  await doctor.save();

  await DoctorVerificationHistory.create({
    doctorId: doctor._id,
    performedBy: req.user._id,
    performedByRole: "ADMIN",
    previousStatus,
    newStatus: verificationStatus,
    reason: reason.trim(),
  });

  return res.status(200).json({
    success: true,
    message: `Doctor verification status updated to ${verificationStatus}`,
    data: doctor,
  });
});



export {
  getPendingDoctors,
  getDoctorDetails,
  approveDoctor,
  rejectDoctor,
  getDoctorVerificationHistory,
  getAdminDashboardStats,
  getAllUsers,
  updateUserAccountStatus,
  getAllDoctors,
  updateDoctorVerificationStatus,
};
