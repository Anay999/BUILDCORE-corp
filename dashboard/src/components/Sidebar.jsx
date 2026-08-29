function Sidebar({
  activePage,
  setActivePage,
  darkMode,
  setDarkMode,
  user,
}) {

  return (

    <div className="sidebar">

      <div className="logo-section">

        <div className="logo-box">
          🏗️
        </div>

        <div>

          <h2>
            BUILDCORE
          </h2>

          <p>
            Construction ERP
          </p>

        </div>

      </div>

      <div className="sidebar-links">

        <button
          className={
            activePage ===
            "dashboard"

              ? "active-link"

              : ""
          }

          onClick={() =>
            setActivePage(
              "dashboard"
            )
          }
        >
          📊 Dashboard
        </button>

        <button
          className={
            activePage ===
            "projects"

              ? "active-link"

              : ""
          }

          onClick={() =>
            setActivePage(
              "projects"
            )
          }
        >
          🏗️ Projects
        </button>

        <button
          className={
            activePage ===
            "team"

              ? "active-link"

              : ""
          }

          onClick={() =>
            setActivePage(
              "team"
            )
          }
        >
          👥 Team
        </button>

        <button
          className={
            activePage ===
            "settings"

              ? "active-link"

              : ""
          }

          onClick={() =>
            setActivePage(
              "settings"
            )
          }
        >
          ⚙️ Settings
        </button>

      </div>

      <div className="sidebar-bottom">

        <div className="user-box">

          <p>
            LOGGED IN AS
          </p>

          <h3>
            {user.name}
          </h3>

          <span>
            {user.role}
          </span>

        </div>

        <button
          className="theme-toggle"
          onClick={() =>
            setDarkMode(!darkMode)
          }
        >

          {darkMode
            ? "☀️ Light Mode"
            : "🌙 Dark Mode"}

        </button>

      </div>

    </div>
  );
}

export default Sidebar;