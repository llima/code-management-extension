import tl = require("azure-pipelines-task-lib/task");
import path = require("path");

import dayjs from 'dayjs';

const axios = require("axios").default;

//Transform string date
function formatString(val: string): string {
  const matches = val.match(/\$\(Date:([^)]+)\)/g);

  if (matches != null && matches?.length > 0) {
    const pattern =  matches[0];
    const display = matches[0].replace('$(Date:', '').replace(')', '');
    const now = dayjs().format(display);

    val = val.replace(pattern, now);
  }

  return val;
}

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const comments = tl.getPathInput("comments", true) ?? "";
    const tags = tl.getPathInput("tags", true) ?? "";
    const baseUrl = tl.getPathInput("baseUrl", true) ?? "";
    
    const PAT = tl.getVariable("code_management_pat") ?? "";

    const token = Buffer.from(`:${PAT}`).toString('base64');
    const headers = {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json-patch+json",
    };

    const instance = axios.create({
      baseURL: baseUrl,
      headers: headers,
    });

    const req = [
      {
        op: "add",
        path: "/fields/System.History",
        value: formatString(comments),
      },
      {
        op: "add",
        path: "/fields/System.Tags",
        value: tags,
      },
    ];

    const branchName = tl.getVariable("Build.SourceBranchName") ?? "";
    console.log(`Branch Name: ${branchName}`);

    const hashSplits = branchName.split('#');
    const dashSplist = hashSplits.length > 1 ? hashSplits[1].split('-') : ["0"];
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
