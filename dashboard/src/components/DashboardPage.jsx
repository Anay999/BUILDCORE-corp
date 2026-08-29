function DashboardPage({
  projects,
}) {

  return (

    <>

      <div className="stats-container">

        <div className="stat-card orange">

          <p>
            TOTAL PROJECTS
          </p>

          <h2>
            {projects.length}
          </h2>

        </div>

        <div className="stat-card green">

          <p>
            COMPLETED
          </p>

          <h2>

            {
              projects.filter(
                (project) =>
                  project.status
                    .toLowerCase() ===
                  "completed"
              ).length
            }

          </h2>

        </div>

        <div className="stat-card blue">

          <p>
            IN PROGRESS
          </p>

          <h2>

            {
              projects.filter(
                (project) =>
                  project.status
                    .toLowerCase() ===
                  "ongoing"
              ).length
            }

          </h2>

        </div>

        <div className="stat-card purple">

          <p>
            TOTAL BUDGET
          </p>

          <h2>

            ₹

            {
              projects.reduce(
                (total, project) =>
                  total +
                  Number(
                    project.budget
                  ),

                0
              )
            }

          </h2>

        </div>

      </div>

    </>
  );
}

export default DashboardPage;