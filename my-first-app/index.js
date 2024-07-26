// // Checks API example
// // See: https://developer.github.com/v3/checks/ to learn more
// import { exec } from 'child_process';

// /**
//  * This is the main entrypoint to your Probot app
//  * @param {import('probot').Probot} app
//  */
// export default (app) => {
//   app.on(["pull_request.reopened","check_suite.requested", "check_run.rerequested"], check);

//   async function check(context) {
//     const startTime = new Date();
//     const command = 'pants dependees baseimages/python/3-10-slim-bullseye:3.10-slim-bullseye';


//     // Do stuff
//     // const params = context.issue({ body: "Hello World!" });
//     // return context.octokit.issues.createComment(params);
//     const { head_branch: headBranch, head_sha: headSha } =
//       context.payload.check_suite;
//     // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
//     return context.octokit.checks.create(
//       context.repo({
//         name: "Check Dockerfile dependents in PR",
//         head_branch: headBranch,
//         head_sha: headSha,
//         status: "completed",
//         started_at: startTime,
//         conclusion: "success",
//         completed_at: new Date(),
//         output: {
//           title: "Probot check!",
//           summary: "The check has passed!",
//         },
//       }),
//     );
//   }

//   // For more information on building apps:
//   // https://probot.github.io/docs/

//   // To get your app running against GitHub, see:
//   // https://probot.github.io/docs/development/
// };
import { exec } from 'child_process';

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  app.on(["pull_request.reopened", "check_suite.requested", "check_run.rerequested"], check);

  async function check(context) {
    const startTime = new Date();

    //clone repsitory
    


    const pythonPath = '.venv/bin/python3.9';
    const command = `${pythonPath} pants dependees baseimages/python/3-10-slim-bullseye:3.10-slim-bullseye`;
    // Command to run pants with the specific Python virtual environment
    
    try {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject({ error, stderr });
            return;
          }
          resolve({ stdout, stderr });
        });
      });

      // Build the summary message
      const summary = stderr ? `Error:\n${stderr}` : `Output:\n${stdout}`;

      let headBranch, headSha;
      if (context.payload.check_suite) {
        headBranch = context.payload.check_suite.head_branch;
        headSha = context.payload.check_suite.head_sha;
      } else if (context.payload.check_run) {
        headBranch = context.payload.check_run.check_suite.head_branch;
        headSha = context.payload.check_run.head_sha;
      } else if (context.payload.pull_request) {
        headBranch = context.payload.pull_request.head.ref;
        headSha = context.payload.pull_request.head.sha;
      }
      // Create the check with the command output
      return context.octokit.checks.create(
        context.repo({
          name: "Check Dockerfile dependents in PR",
          head_branch: headBranch,
          head_sha: headSha,
          status: "completed",
          started_at: startTime,
          conclusion: stderr ? "failure" : "success",
          completed_at: new Date(),
          output: {
            title: "Probot check!",
            summary,
          },
        }),
      );
    } catch (error) {
      return context.octokit.checks.create(
        context.repo({
          name: "Check Dockerfile dependents in PR",
          head_branch: context.payload.check_suite.head_branch,
          head_sha: context.payload.check_suite.head_sha,
          status: "completed",
          started_at: startTime,
          conclusion: "failure",
          completed_at: new Date(),
          output: {
            title: "Probot check failed!",
            summary: `An error occurred:\n${error.stderr || error.message}`,
          },
        }),
      );
    }
  }

  
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
