import tl = require("azure-pipelines-task-lib/task");
import path = require("path");

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const axios = require("axios").default;

//Transform string date
function formatString(val: string, customTZ: string): string {
  const matches = val.match(/\$\(Date:([^)]+)\)/g);

  if (matches != null && matches?.length > 0) {
    const pattern = matches[0];
    const display = matches[0].replace("$(Date:", "").replace(")", "");
    const now = dayjs().tz(customTZ).format(display);

    val = val.replace(pattern, now);
  }

  return val;
}

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const customTZ = tl.getPathInput("timezone", true) ?? "";
    const comments = tl.getPathInput("comments", true) ?? "";
    const tags = tl.getPathInput("tags", true) ?? "";
    const baseUrl = tl.getPathInput("baseUrl", true) ?? "";
    const changeStatus = tl.getBoolInput("changeStatus", false);

    const PAT = tl.getVariable("code_management_pat") ?? "";

    const token = Buffer.from(`:${PAT}`).toString("base64");
    const headers = {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json-patch+json",
    };

    const instance = axios.create({
      baseURL: baseUrl,
      headers: headers,
    });

    let req = [
      {
        op: "add",
        path: "/fields/System.History",
        value: formatString(comments, customTZ),
      },
      {
        op: "add",
        path: "/fields/System.Tags",
        value: tags,
      },
    ];

    if (changeStatus) {
      req.push({
        op: "add",
        path: "/fields/System.State",
        value: "Done",
      });
    }

    const branchName = tl.getVariable("Build.SourceBranchName") ?? "";
    console.log(`Branch Name: ${branchName}`);

    const hashSplits = branchName.split("#");
    const dashSplist = hashSplits.length > 1 ? hashSplits[1].split("-") : ["0"];
    const workItemId = dashSplist[0];

    if (workItemId === "0") {
      console.log("Work Item not found!");
      tl.setResult(tl.TaskResult.Cancelled, "Task cancelled!");
      return;
    }

    instance
      .patch(`_apis/wit/workitems/${workItemId}?api-version=7.1-preview.3`, req)
      .then((res: any) => {
        console.log(`Work Item updated: ${res.status}`);
      })
      .catch((error: any) => {
        console.error(error.message);
      });

    tl.setResult(tl.TaskResult.Succeeded, "Task completed!");
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

main().catch((err) => {
  tl.setResult(tl.TaskResult.Failed, err);
});
