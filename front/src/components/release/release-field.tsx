import React from 'react';

import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";

import './release-field.scss';

import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Icon, IconSize } from 'azure-devops-ui/Icon';
import { Transform } from '../../services/string';
import { Services } from '../../services/services';
import { BranchServiceId, IBranchService } from '../../services/branch';
import { IBranch } from '../../model/branch';
import { Link, Spinner } from '@fluentui/react';
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { IListItemDetails, ListItem, ScrollableList } from 'azure-devops-ui/List';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { CreateBuildDefinitionAsync, DeletePipelineAsync, GetBuildStatusAsync, RunBuildAsync } from '../../services/pipeline';
import { GetRepositoryAsync } from '../../services/repository';
import { ProjectStatus } from '../../model/project-status';
import { IBranchRelease, IRelease } from '../../model/release';
import { IGitMergeBranch } from '../../model/git-release';
import { IReleaseService } from '../../services/release';
import { Status, Statuses, StatusSize } from "azure-devops-ui/Status";

interface IReleaseState {
  viewType: number;
  currentRelease: IRelease;
}

class Release extends React.Component<{}, IReleaseState>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
  branchService = Services.getService<IBranchService>(BranchServiceId);
  releaseService = Services.getService<IReleaseService>(BranchServiceId);

  private items: ArrayItemProvider<IBranch> = new ArrayItemProvider([]);
  private itemsView: ArrayItemProvider<IBranchRelease> = new ArrayItemProvider([]);

  private branches: IBranch[] = [];
  private currentWorkItem: any = {};

  constructor(props: {}) {
    super(props);

    this.state = {
      viewType: 0,
      currentRelease: { branches: [] }
    }

    this.init();
  }

  async init() {
    this.branches = [];
    this.items = new ArrayItemProvider([]);
    this.itemsView = new ArrayItemProvider([]);
    
    var workItem = await this.workItemFormService;
    workItem.refresh();

    this.currentWorkItem = await workItem.getFieldValues(["System.Title", "System.Id", "System.WorkItemType"]);
    var id = this.currentWorkItem["System.Id"].toString();

    if (id != 0) {
      var relations = await workItem.getWorkItemRelations();           
      
      for (const relation of relations) {
        var relationId = relation.url.substring(relation.url.lastIndexOf('/') + 1);
        var branch = await this.branchService.getById(relationId);
        if (branch != null) {
          this.branches.push(branch);
        }
      }
      this.items = new ArrayItemProvider(this.branches);

      var name = `rc#${id}-${Transform(this.currentWorkItem["System.Title"].toString())}`;
      var release = await this.releaseService.getById(id);
      var view = 3;

      if (release == null) {
        var user = DevOps.getUser();
        release = { id: id, name: name, user: user, branches: [] };
        view = 1;
      }
      else {        
        //Check Build Status
        let updateStatus = false;

        for (const b of release.branches) {
          if (b.projectStatus == ProjectStatus.Running) {
            let status = await GetBuildStatusAsync(b.buildRunId ?? 0);
            if (status == ProjectStatus.Succeeded) {
              updateStatus = true;
              b.projectStatus = ProjectStatus.Succeeded;

              await DeletePipelineAsync(b.buildDefinitionId ?? 0);
            }
          }          
        }

        if (updateStatus) {
          await this.releaseService.save(release);
        }

        this.itemsView = new ArrayItemProvider(release.branches);        
      };

      this.setState({ currentRelease: release, viewType: view });
    }
    else {
      this.setState({ viewType: 4 })
    }
  }

  async create() {

    const { currentRelease } = this.state;

    const repos = Array.from(
      this.branches.reduce((a, { repository, ...rest }) => {
        return a.set(repository, [rest].concat(a.get(repository) || []));
      }, new Map())
    ).map(([repository, children]) => ({ repository, children }));

    for (const r of repos) {

      var mergeBranches: IGitMergeBranch[] = [];
      var repository = await GetRepositoryAsync(r.repository ?? "");

      for (const b of r.children) {
        var mergeBranch = {} as IGitMergeBranch;
        mergeBranch.branch = `${b.type}/${b.name}`;
        mergeBranch.repositoryId = repository.id;
        mergeBranch.repositoryUrl = repository.webUrl;
        mergeBranches.push(mergeBranch);
      }

      var token = DevOps.getConfiguration().witInputs["PATField"].toString();
      var releaseOption = {
        repositoryId: repository.id,
        repositoryUrl: repository.webUrl,
        releaseBranch: `release/${currentRelease.name}`,
        basedBranch: "main",
        mergeBranches: mergeBranches,
        user: currentRelease.user,
        PAT: token
      };

      var buildDef = await CreateBuildDefinitionAsync(repository.name, releaseOption);
      var runBuild = await RunBuildAsync(buildDef.id);

      currentRelease.branches.push({
        name: currentRelease.name,
        repository: repository.name,
        buildDefinitionId: buildDef.id,
        buildRunId: runBuild.id,
        url: `${repository.webUrl}?version=GBrelease/${escape(currentRelease.name ?? "")}`,
        repositoryUrl: repository.webUrl,
        projectStatus: ProjectStatus.Running
      });

    }

    await this.releaseService.save(currentRelease);

    this.setState({ viewType: 3, currentRelease: currentRelease });
  }

  async delete() {
    // const { currentBranch } = this.state;

    // await DeleteBranchAsync(currentBranch);
    // this.branchService.remove(currentBranch.id ?? "");

    // this.init();
  }

  async getBuildStatus(that: this) {
    // const { currentBranch } = this.state;

    // if (currentBranch.buildRunId) {
    //   let status = await GetBuildStatusAsync(currentBranch.buildRunId);
    //   if (status == ProjectStatus.Succeeded) {
    //     currentBranch.buildRunId = undefined;

    //     await DeletePipelineAsync(currentBranch.buildDefinitionId ?? 0);

    //     await this.branchService.save(currentBranch);
    //     this.setState({ viewType: 3 });

    //     clearInterval(that.intervalStatus);
    //   }
    // }
  }

  async refresh() {
    await this.init();
    this.setState({ viewType: 2 });
  }

  render() {

    const { viewType, currentRelease } = this.state;

    switch (viewType) {
      case 0://LOADING
        return (
          <div className="release--loading">
            <Spinner label="loading..." />
          </div>)
      case 1: // NO DATA
        return (<div>
          <Button
            text="Create"
            subtle={true}
            onClick={() => this.setState({ viewType: 2 })}
          />
          <Card>
            There is no branch linked to this item. Click create to link.
          </Card>
        </div>);
      case 2: // NEW ITEM
        return (<div className="release--content">
          <div className="release--group">
            <h3 className="flex-row flex-center text-ellipsis">
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "release-name",
              })}
              release/{currentRelease.name}
            </h3>
          </div>
          <div className="release--group" style={{ display: "flex", height: "150px" }}>

            { this.items.length > 0 ? 
                <ScrollableList
                  itemProvider={this.items}
                  renderRow={renderBranchListRow}
                  width="100%"
                />
                : <span>No related items were found.</span>
            }
          </div>
          <div className="release--add-button">
            <Button
              className="release--mr-button"
              text="Refresh"
              onClick={() => this.refresh()}
            />
            <Button
              className="release--mr-button"
              text="Cancel"
              onClick={() => this.setState({ viewType: 1 })}
            />
            <Button
              className={`release--mr-button ${this.items.length == 0 ? "disabled" : ""}`}
              text="Create"
              primary={true}
              disabled={this.items.length == 0}
              onClick={() => this.create()}
            />
          </div>
        </div>);
      case 3: // LOADED
        return (<div className="release--content">
          <div className="release--group">
            <h3 className="flex-row flex-center text-ellipsis">
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "release-name",
              })}
              release/{currentRelease.name}
            </h3>
          </div>
          <div className="release--group" style={{ display: "flex", height: "150px" }}>

            <ScrollableList
              itemProvider={this.itemsView}
              renderRow={renderReleaseRow}
              width="100%"
            />

          </div>
          <div className="release--add-button">

          </div>
        </div>);
      case 4: // NO SAVE
        return (<MessageCard
          className="flex-self-stretch release--alert"
          severity={MessageCardSeverity.Warning}
        >
          To create a branch, it is necessary to save the tem to get the Id.
        </MessageCard>);
      case 5: // DELETE
        return (
          <MessageCard
            buttonProps={[
              {
                text: "Yes",
                onClick: () => { this.delete() }
              },
              {
                text: "Cancel",
                onClick: () => this.setState({ viewType: 3 })
              }
            ]}
            className="flex-self-stretch release--alert"
            severity={MessageCardSeverity.Error}
          >
            Are you sure?
          </MessageCard>
        );      
    }
  }
}

export function getStatusIndicator(status?: ProjectStatus): any {
  status = status || ProjectStatus.Running;
  
  switch (status) {
    case ProjectStatus.Failed:
      return Statuses.Failed;
    case ProjectStatus.Running:
      return Statuses.Running;
    case ProjectStatus.Warning:
      return Statuses.Warning;
    case ProjectStatus.Succeeded:
      return Statuses.Success;
  }
}

export const renderBranchListRow = (
  index: number,
  item: IBranch,
  details: IListItemDetails<IBranch>,
  key?: string
): JSX.Element => {
  return (
    <ListItem
      className="master-row"
      key={key || "list-item" + index}
      index={index}
      details={details}
    >
      <div className="list-example-row flex-row h-scroll-hidden">
        <Icon iconName={"GitLogo"} size={IconSize.medium} />
        <div
          style={{ marginLeft: "10px", padding: "10px 0px" }}
          className="flex-column h-scroll-hidden"
        >
          <span className="text-ellipsis">{item.name}</span>
          <span className="fontSizeMS font-size-ms text-ellipsis secondary-text">
            <Link
              className="scroll-hidden flex-row flex-baseline branch-link monospaced-text bolt-link subtle"
              excludeTabStop
              target="_blank"
              href={item.repositoryUrl}
            >
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "branch-name",
              })}
              {item.repository}
            </Link>
          </span>
        </div>
      </div>
    </ListItem>
  );
};

export const renderReleaseRow = (
  index: number,
  item: IBranchRelease,
  details: IListItemDetails<IBranchRelease>,
  key?: string
): JSX.Element => {
  return (
    <ListItem
      className="master-row"
      key={key || "list-item" + index}
      index={index}
      details={details}
    >
      <div className="list-example-row flex-row h-scroll-hidden">
        <Status
                {...getStatusIndicator(item.projectStatus)}
                key="status"
                size={StatusSize.m}
                className="flex-self-center"
              />
        <div
          style={{ marginLeft: "10px", padding: "10px 0px" }}
          className="flex-column h-scroll-hidden"
        >
          <span className="text-ellipsis">{item.name}</span>
          <span className="fontSizeMS font-size-ms text-ellipsis secondary-text">
            <Link
              className="scroll-hidden flex-row flex-baseline branch-link monospaced-text bolt-link subtle"
              excludeTabStop
              target="_blank"
              href={item.repositoryUrl}
            >
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "branch-name",
              })}
              {item.repository}
            </Link>
          </span>
        </div>
      </div>
    </ListItem>
  );
};

export default Release;

