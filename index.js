import { exec } from 'child_process';
import { Conclusion } from '@octokit/webhooks-types';

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  app.on(["pull_request.reopened", "check_suite.requested", "check_run.rerequested"], check);

  async function check(context) {
    const startTime = new Date();
    //clone repsitory
    
    const twistlockResult = await runTwistlockScan();
    const pantsOutput = await runPantsScript();
    
    // What's our pass/fail criteria?
    const success = parseTwistlockOutput(twistlockResult.output);
    
    const conclusion = success ? Conclusion.SUCCESS : Conclusion.FAILURE;
    const summary = success 
      ? "Twistlock scan completed successfully." 
      : "Twistlock scan found critical or high vulnerabilities.";

    const details = formatOutputs(twistlockResult.output, pantsOutput);

    // Now running via functions
    //const pythonPath = '.venv/bin/python3.9';
    //const command = `${pythonPath} pants dependees baseimages/python/3-10-slim-bullseye:3.10-slim-bullseye`;
    // Command to run pants with the specific Python virtual environment

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
            summary: summary,
            text: details,
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

      // run pants
      async function runTwistlockScan() {
        const command = "twistloc {path}"; 
        return runCommand(command);
      }
      // run twistloc
      async function runPantsScript() {
        const command = "pants {path}"; 
        return runCommand(command);
      }
      // the runner
      async function runCommand(command) {
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(`Error running command: ${error.message}`));
              return;
            }
            resolve({ output: stdout, error: stderr });
          });
        });
      }
      // pass/fail CRITERIA
      function parseTwistlockOutput(output) {
        return !output.includes("critical") && !output.includes("high");
      }
      // The output
      function formatOutputs(twistlockOutput, pantsOutput) {
        return `
          ## Twistlock Scan Results
          ${twistlockOutput}
          --------------------------
          ## Pants Script Results
          ${pantsOutput}
        `;
      }
    }
  }

  
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
