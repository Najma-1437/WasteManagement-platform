const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Converts any Kenyan phone format to +254XXXXXXXXX.
// Passes through anything that doesn't look like a local number.
function normalizePhone(raw) {
  const p = raw.trim().replace(/\s+/g, '');
  if (/^07\d{8}$/.test(p))  return '+254' + p.slice(1); // 07XX → +2547XX
  if (/^2547?\d{8}$/.test(p) && !p.startsWith('+')) return '+' + p; // 254… → +254…
  return p;
}

// Returns the local (07…) counterpart of a +254 number, or the number unchanged.
function localPhone(canonical) {
  return canonical.startsWith('+254') ? '0' + canonical.slice(4) : canonical;
}

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone_number,
      role,
      residence,
      house_number,
      organisation_name,
      organisation,
    } = req.body;

    if (!name || !email || !password || !phone_number || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const allowedRoles = ["collector", "buyer", "coordinator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (role === "collector" && !residence) {
      return res.status(400).json({ error: "Residence is required for collectors" });
    }
    if (role === "buyer" && !organisation_name) {
      return res.status(400).json({ error: "Organisation name is required for buyers" });
    }
    if (role === "coordinator" && !organisation) {
      return res.status(400).json({ error: "Organisation is required for coordinators" });
    }

    const normalizedPhone = normalizePhone(phone_number);
    const localFmt        = localPhone(normalizedPhone);

    const existing = await pool.query(
      "SELECT user_id, email, phone_number FROM users WHERE email = $1 OR phone_number = $2 OR phone_number = $3",
      [email, normalizedPhone, localFmt],
    );
    if (existing.rows.length > 0) {
      const taken = existing.rows[0];
      if (taken.email === email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      return res.status(409).json({ error: "Phone number already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const status = "active";

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, status`,
      [name, email, passwordHash, normalizedPhone, role, status],
    );

    const user = result.rows[0];

    // Insert into role-specific table
    if (role === "collector") {
      await pool.query(
        "INSERT INTO collectors (user_id, residence, house_number) VALUES ($1, $2, $3)",
        [user.user_id, residence, house_number || null],
      );
    } else if (role === "buyer") {
      await pool.query(
        "INSERT INTO buyers (user_id, organisation_name) VALUES ($1, $2)",
        [user.user_id, organisation_name],
      );
    } else if (role === "coordinator") {
      await pool.query(
        "INSERT INTO environmental_coordinators (user_id, organisation) VALUES ($1, $2)",
        [user.user_id, organisation],
      );
    }

    res.status(201).json({
      message:
        role === "buyer"
          ? "Registration successful. Awaiting administrator approval."
          : "Registration successful.",
      user,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const canonical = normalizePhone(identifier);
    const local     = localPhone(canonical);
    const result = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1 OR phone_number = $2 OR LOWER(email) = LOWER($3)",
      [canonical, local, identifier],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.status === "pending") {
      return res
        .status(403)
        .json({ error: "Account pending administrator approval" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    const { accessToken, refreshToken } = generateTokens(
      user.user_id,
      user.role,
    );

    // Store refresh token in refresh_tokens table
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT DO NOTHING`,
      [user.user_id, refreshToken],
    );

    await pool.query("UPDATE users SET updated_at = NOW() WHERE user_id = $1", [
      user.user_id,
    ]);

    res.json({
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const result = await pool.query(
      "SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2",
      [decoded.userId, refreshToken],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [decoded.userId],
    );

    const user = userResult.rows[0];
    const tokens = generateTokens(user.user_id, user.role);

    // Rotate refresh token
    await pool.query(
      "UPDATE refresh_tokens SET token = $1, expires_at = NOW() + INTERVAL '7 days' WHERE user_id = $2 AND token = $3",
      [tokens.refreshToken, user.user_id, refreshToken],
    );

    res.json(tokens);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Refresh token expired, please login again" });
    }
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT user_id, name, email, role, status, created_at FROM users WHERE user_id = $1",
      [req.user.user_id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, me, normalizePhone };
