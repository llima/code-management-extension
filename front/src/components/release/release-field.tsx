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
import { CreateBranchAsync, DeleteBranchAsync, GetRepositoriesAsync } from '../../services/repository';
import { Transform } from '../../services/string';
import { Services } from '../../services/services';
import { BranchServiceId, IBranchService } from '../../services/branch';
import { IBranch } from '../../model/branch';
import { Link, Spinner } from '@fluentui/react';
import { VssPersona } from "azure-devops-ui/VssPersona";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { IListItemDetails, ListItem, ScrollableList } from 'azure-devops-ui/List';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';


interface IReleaseState {
  viewType: number;
  currentBranch: IBranch;
}

class Release extends React.Component<{}, IReleaseState>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
  branchService = Services.getService<IBranchService>(BranchServiceId);

  private branchs: ArrayItemProvider<IBranch> = new ArrayItemProvider([]);

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

    var coisas = await (await this.workItemFormService).getWorkItemRelations();
    console.log(coisas);

    var fields = await (await this.workItemFormService).getFields();
    console.log(fields);

    this.currentWorkItem = await (await this.workItemFormService).getFieldValues(["System.Title", "System.Id", "System.WorkItemType", "System.RelatedLinks"]);
    console.log(this.currentWorkItem);
    
    var id = this.currentWorkItem["System.Id"].toString();

    if (id != 0) {

      this.branchs = new ArrayItemProvider(await this.branchService.getAll());

      var name = `rc#${id}-${Transform(this.currentWorkItem["System.Title"].toString())}`;
      var branch = await this.branchService.getById(id);
      var view = 3;

      if (branch == null) {
        var user = DevOps.getUser();
        branch = { id: id, name: name, type: "release", user: user }
        view = 2
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
      currentBranch.url = `${gitRepo.webUrl}?version=GBrelease/${escape(currentBranch.name ?? "")}`;
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
          <div className="release--loading">
            <Spinner label="loading..." />
          </div>)
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
              itemProvider={this.branchs}
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
              disabled={currentBranch.repository === undefined || currentBranch.repository.trim() == ""}
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
            Generated by {item.user?.displayName}
          </span>
        </div>
      </div>
    </ListItem>
  );
};

export default Release;

