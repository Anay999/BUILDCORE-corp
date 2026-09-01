const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { broadcast } = require("../utils/broadcast");

// REGISTER
const registerUser = async (
  req,
  res
) => {

  try {

    const {
      name,
      email,
      password,
    } = req.body;

    // CHECK EXISTING USER
    const userExists =
      await pool.query(
        `
        SELECT * FROM users
        WHERE email = $1
        `,
        [email]
      );

    if (
      userExists.rows.length > 0
    ) {

      return res.status(400).json({
        message:
          "User already exists ❌",
      });
    }

    // HASH PASSWORD
    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    // DEFAULT ROLE
    const role = "employee";

    // INSERT USER
    const newUser =
      await pool.query(

        `
        INSERT INTO users
        (name, email, password, role)

        VALUES ($1, $2, $3, $4)

        RETURNING *
        `,

        [
          name,
          email,
          hashedPassword,
          role,
        ]
      );

    broadcast("user_update", { action: "registered", user: newUser.rows[0] });

    res.status(201).json({

      message:
        "User registered successfully 🎉",

      user:
        newUser.rows[0],
    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({
      message:
        "Server error ❌",
    });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // CHECK USER
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({
        message: "User not found ❌",
      });
    }

    // CHECK PASSWORD
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid password ❌",
      });
    }

    // TOKEN
    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: user.rows[0].role,
      },
      "secretkey",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: user.rows[0],
    });

  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: "Server error ❌",
    });
  }
};
const changePassword = async (
  req,
  res
) => {

  try {

    const {
      email,
      currentPassword,
      newPassword,
    } = req.body;

    // FIND USER
    const user =
      await pool.query(
        `
        SELECT * FROM users
        WHERE email = $1
        `,
        [email]
      );

    if (
      user.rows.length === 0
    ) {

      return res.status(404).json({
        message:
          "User not found",
      });
    }

    // CHECK PASSWORD
    const validPassword =
      await bcrypt.compare(
        currentPassword,
        user.rows[0].password
      );

    if (!validPassword) {

      return res.status(400).json({
        message:
          "Current password incorrect ❌",
      });
    }

    // HASH NEW PASSWORD
    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        salt
      );

    // UPDATE PASSWORD
    await pool.query(
      `
      UPDATE users

      SET password = $1

      WHERE email = $2
      `,
      [
        hashedPassword,
        email,
      ]
    );

    res.json({
      message:
        "Password updated ✅",
    });

  } catch (error) {

    console.log(error.message);
  }
};

module.exports = {
  registerUser,
  loginUser,
  changePassword,
};