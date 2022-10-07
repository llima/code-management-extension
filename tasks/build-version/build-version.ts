import tl = require("azure-pipelines-task-lib/task");
import path = require("path");

const axios = require("axios").default;

async function main(): Promise<void> {
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));

    const baseUrl = tl.getPathInput("baseUrl", true) ?? "";
    const PAT = tl.getPathInput("PAT") ?? "";
    const versionValue = tl.getPathInput("versionValue", true) ?? "";
    const versionVariable = tl.getPathInput("versionVariable", true) ?? "";
    
    const definitionId = tl.getVariable("System.DefinitionId") ?? "0";

    const token = Buffer.from(`:${PAT}`).toString("base64");
    const headers = {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    };

    const instance = axios.create({
      baseURL: baseUrl,
      headers: headers,
    });

     //Get Pipeline
     instance
     .get(`_apis/build/definitions/${definitionId}?api-version=7.1-preview.7`)
     .then((res: any) => {
       let data = res.data;
       let version = versionValue.replace("-beta", "").replace("-rc", "");
       data.variables[versionVariable].value = version;

       //Update Pipeline
       instance
         .put(
           `_apis/build/definitions/${definitionId}?api-version=7.1-preview.7`,
           data
         )
         .then((res: any) => {
           console.log(`Pipeline updated: ${res.status}`);
         })
         .catch((error: any) => {
           console.error(error.message);
         });
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
