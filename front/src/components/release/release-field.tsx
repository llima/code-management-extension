import React from 'react';

import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";

import './release-field.scss';

import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { Icon, IconSize } from 'azure-devops-ui/Icon';
import { Transform } from '../../services/string';
import { Services } from '../../services/services';
import { BranchServiceId, IBranchService } from '../../services/branch';
import { IBranch } from '../../model/branch';
import { Link, Spinner } from '@fluentui/react';
import { VssPersona } from "azure-devops-ui/VssPersona";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { IListItemDetails, ListItem, ScrollableList } from 'azure-devops-ui/List';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { CreateBuildDefinitionAsync, DeletePipelineAsync, GetBuildStatusAsync, RunBuildAsync } from '../../services/pipeline';
import { IMergeBranch } from '../../model/release';
import { DeleteBranchAsync, GetRepositoryAsync } from '../../services/repository';
import { ProjectStatus } from '../../model/project-status';


interface IReleaseState {
  viewType: number;
  currentBranch: IBranch;
}

class Release extends React.Component<{}, IReleaseState>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
  branchService = Services.getService<IBranchService>(BranchServiceId);

  private items: ArrayItemProvider<IBranch> = new ArrayItemProvider([]);
  private branches: IBranch[] = [];
  private currentWorkItem: any = {};

  private intervalStatus: any;

  constructor(props: {}) {
    super(props);

    this.state = {
      viewType: 0,
      currentBranch: {}
    }

    this.init();
  }  

  async init() {

    var workItem = await this.workItemFormService;
    this.currentWorkItem = await workItem.getFieldValues(["System.Title", "System.Id", "System.WorkItemType"]);
    var id = this.currentWorkItem["System.Id"].toString();

    if (id != 0) {

      var relations = await workItem.getWorkItemRelations()
      for (const relation of relations) {
        var relationId = relation.url.substring(relation.url.lastIndexOf('/') + 1);
        var branch = await this.branchService.getById(relationId);
        if (branch != null) {
          this.branches.push(branch);
        }
      }
      this.items = new ArrayItemProvider(this.branches);

      var name = `rc#${id}-${Transform(this.currentWorkItem["System.Title"].toString())}`;
      var branch = await this.branchService.getById(id);
      var view = 3;

      if (branch == null) {
        var user = DevOps.getUser();
        branch = { id: id, name: name, type: "release", user: user }
        view = 1
      };
      
      if (branch.buildRunId) {
        view = 6;
      }
      
      this.setState({ currentBranch: branch, viewType: view });

      await this.getBuildStatus(this);
    }
    else {
      this.setState({ viewType: 4 })
    }
  }

  async create() {
    const { currentBranch } = this.state;

    const repos = Array.from(
      this.branches.reduce((a, { repository, ...rest }) => {
        return a.set(repository, [rest].concat(a.get(repository) || []));
      }, new Map())
    ).map(([repository, children]) => ({ repository, children }));


    // for (const b of this.branches) {
    //   var mergeBranch = {} as IMergeBranch;
    //   mergeBranch.branch = `${b.type}/${b.name}`;
    //   mergeBranch.repositoryId = b.repository ?? "";
    //   mergeBranch.repositoryUrl = b.repositoryUrl ?? "";

    //   mergeBranches.push(mergeBranch);
    // }
    for (const r of repos) {
      var mergeBranches: IMergeBranch[] = [];
      var repository = await GetRepositoryAsync(r.repository ?? "");

      for (const b of r.children) {
        var mergeBranch = {} as IMergeBranch;
        mergeBranch.branch = `${b.type}/${b.name}`;

        mergeBranch.repositoryId = repository.id;
        mergeBranch.repositoryUrl = repository.webUrl;
  
        mergeBranches.push(mergeBranch);
      }

      var token = DevOps.getConfiguration().witInputs["PATField"].toString();
      var releaseOption = {
        repositoryId: repository.id,
        repositoryUrl: repository.webUrl,
        releaseBranch: `${currentBranch.type}/${currentBranch.name}`,
        basedBranch: "main",
        mergeBranches: mergeBranches,
        user: currentBranch.user,
        PAT: token
      };

      var buildDef = await CreateBuildDefinitionAsync(repository.name, releaseOption);
      currentBranch.buildDefinitionId = buildDef.id;

      var runBuild = await RunBuildAsync(buildDef.id);
      currentBranch.buildRunId = runBuild.id;

      currentBranch.url = `${repository.webUrl}?version=GBrelease/${escape(currentBranch.name ?? "")}`;
      currentBranch.repositoryUrl = repository.webUrl;

      await this.branchService.save(currentBranch);
    }

    this.setState({ viewType: 3 });

    //this.setState({ viewType: 6 });

    // let that = this;
    // that.intervalStatus = setInterval(async function () {
    //   await that.getBuildStatus(that);
    // }, 500);
  }

  async delete() {
    const { currentBranch } = this.state;

    await DeleteBranchAsync(currentBranch);
    this.branchService.remove(currentBranch.id ?? "");

    this.init();
  }

  async getBuildStatus(that: this) {
    const { currentBranch } = this.state;

    if (currentBranch.buildRunId) {
      let status = await GetBuildStatusAsync(currentBranch.buildRunId);
      if (status == ProjectStatus.Succeeded) {
        currentBranch.buildRunId = undefined;

        await DeletePipelineAsync(currentBranch.buildDefinitionId ?? 0);

        await this.branchService.save(currentBranch);
        this.setState({ viewType: 3 });

        clearInterval(that.intervalStatus);
      }
    }
  }

  render() {

    const { viewType, currentBranch } = this.state;

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
              release/{currentBranch.name}
            </h3>
          </div>
          <div className="release--group" style={{ display: "flex", height: "150px" }}>

            <ScrollableList
              itemProvider={this.items}
              renderRow={renderListRow}
              width="100%"
            />

          </div>
          <div className="release--add-button">
            <Button
              text="Cancel"
              onClick={() => this.setState({ viewType: 1 })}
            /> 
            <Button
              text="Create"
              primary={true}
              onClick={() => this.create()}
            />
          </div>
        </div>);
      case 3: // LOADED
        return (<div>
          <div className='release--panel'>
            <span className="flex-row scroll-hidden">
              {Icon({
                className: "icon-margin",
                iconName: "GitLogo",
                key: "GitLogo",
              })}
              <Link
                className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                excludeTabStop
                target="_blank"
                href={currentBranch.url}>
                {currentBranch.name}
              </Link>
            </span>
            <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
              {Icon({
                className: "icon-margin",
                iconName: "Contact",
                key: "branch-code",
              })}
              <span>Generated by </span>
              <VssPersona identityDetailsProvider={{
                getDisplayName() {
                  return currentBranch.user?.displayName;
                },
                getIdentityImageUrl(size: number) {
                  return currentBranch.user?.imageUrl;
                }
              }} size={"extra-small"} />

              <Link
                className="scroll-hidden flex-row flex-baseline branch-link monospaced-text bolt-link subtle"
                excludeTabStop
                target="_blank"
                href={currentBranch.repositoryUrl}
              >
                {Icon({
                  className: "icon-margin",
                  iconName: "OpenSource",
                  key: "branch-name",
                })}
                {currentBranch.repository}
              </Link>
            </span>
          </div>
          <div className="release--add-button release--alert">
            <Button
              text="Delete"
              danger={true}
              onClick={() => this.setState({ viewType: 5 })}
            />
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
      case 6: //RUN BUILD
      return (
        <MessageCard
          className="flex-self-stretch release--alert"
          severity={MessageCardSeverity.Info}
          >
          Creating a release branch, wait please...
        </MessageCard>);
    }
  }
}

export const renderListRow = (
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
              Generated by {item.user?.displayName}
          </span>
        </div>
      </div>
    </ListItem>
  );
};

export default Release;

