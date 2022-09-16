import React from 'react';

import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";

import './feature-field.scss';

import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { Icon } from 'azure-devops-ui/Icon';
import { CreateBranchAsync, DeleteBranchAsync, GetRepositoriesAsync } from '../../services/repository';
import { Transform } from '../../services/string';
import { Services } from '../../services/services';
import { BranchServiceId, IBranchService } from '../../services/branch';
import { IBranch } from '../../model/branch';
import { Link, Spinner } from '@fluentui/react';
import { VssPersona } from "azure-devops-ui/VssPersona";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";


interface IFeatureState {
  viewType: number;
  currentBranch: IBranch;
}

class Feature extends React.Component<{}, IFeatureState>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
  branchService = Services.getService<IBranchService>(BranchServiceId);

  private repositories: Array<IListBoxItem<{}>> = [];
  private currentWorkItem: any = {};

  constructor(props: {}) {
    super(props);

    this.state = {
      viewType: 0,
      currentBranch: {}
    }

    this.init();
  }

  async init() {

    this.currentWorkItem = await (await this.workItemFormService).getFieldValues(["System.Title", "System.Id", "System.WorkItemType"]);
    var id = this.currentWorkItem["System.Id"].toString();

    if (id != 0) {

      (await GetRepositoriesAsync()).forEach(element => {
        this.repositories.push({ id: element.name, text: element.name, iconProps: { iconName: "GitLogo", style: { color: "#f05133" } } })
      });

      var name = `ft#${id}-${Transform(this.currentWorkItem["System.Title"].toString())}`;
      var branch = await this.branchService.getById(id);
      var view = 3;

      if (branch == null) {
        var user = DevOps.getUser();
        branch = { id: id, name: name, type: "feature", user: user, basedOn: "main" }
        view = 1
      };
      this.setState({ currentBranch: branch, viewType: view })
    }
    else {
      this.setState({ viewType: 4 })
    }
  }

  async create() {
    const { currentBranch } = this.state;

    var gitRepo = await CreateBranchAsync(currentBranch);

    if (gitRepo != null) {
      currentBranch.url = `${gitRepo.webUrl}?version=GBfeature/${escape(currentBranch.name ?? "")}`;
      currentBranch.repositoryUrl = gitRepo.webUrl;
      await this.branchService.save(currentBranch);
    }

    this.setState({ viewType: 3 });
  }

  async delete() {
    const { currentBranch } = this.state;
    
    this.setState({ viewType: 0 })
    
    await DeleteBranchAsync(currentBranch);

    this.branchService.remove(currentBranch.id ?? "");
    this.init();
  }

  render() {

    const { viewType, currentBranch } = this.state;

    switch (viewType) {
      case 0://LOADING
        return (
          <div className="feature--loading">
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
        return (<div className="feature--content">
          <div className="feature--group">
            <label className="feature--group-label">
              Repository *
            </label>
            <Dropdown
              ariaLabel="Basic"
              placeholder="Select a repository"
              showPrefix={true}
              items={this.repositories}
              onSelect={(event, item) => {
                this.setState(prevState => ({
                  currentBranch: { ...prevState.currentBranch, repository: item.id }
                }))
              }}
            />
          </div>
          <div className="feature--group">
            <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "feature-name",
              })}
              feature/{currentBranch.name}
            </span>
          </div>
          <div className="feature--add-button">
              <Button
                text="Cancel"
                onClick={() => this.setState({ viewType: 1 })}
              /> 
              <Button
                text="Create"
                primary={true}
                onClick={() => this.create()}
                disabled={currentBranch.repository === undefined || currentBranch.repository.trim() == ""}
              />
          </div>
        </div>);
      case 3: // LOADED
        return (<div>
          <div className='feature--panel'>
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
          <div className="feature--add-button feature--alert">
            <Button
              text="Delete"
              danger={true}
              onClick={() => this.setState({ viewType: 5 })}
            />
          </div>
        </div>);
      case 4: // NO SAVE
        return (<MessageCard
          className="flex-self-stretch feature--alert"
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
            className="flex-self-stretch feature--alert"
            severity={MessageCardSeverity.Error}
          >
            Are you sure?
          </MessageCard>
        );
    }
  }
}

export default Feature;

