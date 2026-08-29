function Topbar() {

  const today =
    new Date();

  return (

    <div className="topbar">

      <div>

        <p className="topbar-label">
          DASHBOARD
        </p>

        <h1>
          PROJECT OVERVIEW
        </h1>

      </div>

      <div className="topbar-right">

        <p>
          {
            today.toDateString()
          }
        </p>

      </div>

    </div>
  );
}

export default Topbar;