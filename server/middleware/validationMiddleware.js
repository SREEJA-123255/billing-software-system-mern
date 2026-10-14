// Email format regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Password regex: min 8 characters, at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// Phone regex: exactly 10 digits, optional country code with + prefix
const PHONE_REGEX = /^(?:\+\d{1,3}[\s-]?)?(?:[0-9]{10}|[0-9]{5}[\s-][0-9]{5})$/;
// Allowed roles
const ALLOWED_ROLES = ["ADMIN", "MANAGER", "CASHIER", "STAFF"];
const ALLOWED_STATUSES = ["ACTIVE", "INACTIVE"];

// Validate Login Request
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Please provide a valid email address";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

// Validate User Creation Request
const validateUserCreate = (req, res, next) => {
  const { name, email, phone, password, role, status } = req.body;
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = "Name is required";
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Please provide a valid email address";
  }

  if (!phone || !phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!PHONE_REGEX.test(phone.trim())) {
    errors.phone = "Phone number must be exactly 10 digits";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password =
      "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number";
  }

  if (!role) {
    errors.role = "Role is required";
  } else if (!ALLOWED_ROLES.includes(role)) {
    errors.role = `Role must be one of: ${ALLOWED_ROLES.join(", ")}`;
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

// Validate User Update Request
const validateUserUpdate = (req, res, next) => {
  const { name, email, phone, password, role, status } = req.body;
  const errors = {};

  if (name !== undefined) {
    if (!name.trim()) {
      errors.name = "Name cannot be empty";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
  }

  if (email !== undefined) {
    if (!email.trim()) {
      errors.email = "Email cannot be empty";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please provide a valid email address";
    }
  }

  if (phone !== undefined) {
    if (!phone.trim()) {
      errors.phone = "Phone cannot be empty";
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = "Phone number must be exactly 10 digits";
    }
  }

  if (password) {
    if (!PASSWORD_REGEX.test(password)) {
      errors.password =
        "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number";
    }
  }

  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    errors.role = `Role must be one of: ${ALLOWED_ROLES.join(", ")}`;
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

// Validate Status Toggle Request
const validateStatusToggle = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: { status: "Status is required" }
    });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: { status: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}` }
    });
  }

  next();
};

// Validate Business Settings Request
const validateBusinessSettings = (req, res, next) => {
  const { businessName, address, phone, email, gstNumber } = req.body;
  const errors = {};

  if (!businessName || !businessName.trim()) {
    errors.businessName = "Business name is required";
  }

  if (!address || !address.trim()) {
    errors.address = "Address is required";
  }

  if (!phone || !phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!PHONE_REGEX.test(phone.trim())) {
    errors.phone = "Phone number must be exactly 10 digits";
  }

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Please provide a valid email address";
  }

  // Optional GST validation (Indian GST format: 15 alphanumeric characters: 2 digits, 10 char PAN, 1 digit entity, 1 char Z, 1 check digit)
  if (gstNumber && gstNumber.trim()) {
    const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!GST_REGEX.test(gstNumber.trim().toUpperCase())) {
      errors.gstNumber = "Please provide a valid 15-character GST number (e.g., 29AAAAA0000A1Z5)";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};

module.exports = {
  validateLogin,
  validateUserCreate,
  validateUserUpdate,
  validateStatusToggle,
  validateBusinessSettings
};
