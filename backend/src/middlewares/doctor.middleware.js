import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const requireVerifiedDoctor = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "DOCTOR") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can access this resource",
      });
    }

    const doctor = await Doctor.findOne({
      userId: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    if (doctor.verificationStatus !== "VERIFIED") {
      const messages = {
        PENDING:
          "Your doctor verification is pending. Please wait for admin approval.",

        UNDER_REVIEW:
          "Your doctor verification is currently under review.",

        INFO_REQUIRED:
          "Additional information is required to complete your verification.",

        REJECTED:
          "Your doctor verification has been rejected.",

        SUSPENDED:
          "Your doctor account has been suspended.",
      };

      return res.status(403).json({
        success: false,
        message:
          messages[doctor.verificationStatus] ||
          "Doctor verification is required",
        verificationStatus: doctor.verificationStatus,
      });
    }

    req.doctor = doctor;

    next();
  } catch (error) {
    console.error("Doctor verification middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify doctor status",
    });
  }
});

export { requireVerifiedDoctor };